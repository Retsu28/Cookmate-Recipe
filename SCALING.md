# CookMate — Horizontal Scaling & Infrastructure Guide

> This document describes CookMate's scalability architecture, Redis caching layer, BullMQ message queues, and horizontal scaling strategies.

---

## Architecture Overview

```text
                        ┌─────────────────────┐
                        │   Load Balancer      │
                        │  (Nginx / AWS ALB)   │
                        └──────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼──────┐  ┌─────────▼──────┐  ┌─────────▼──────┐
    │  Express API   │  │  Express API   │  │  Express API   │
    │  Instance #1   │  │  Instance #2   │  │  Instance #N   │
    └────────┬───────┘  └────────┬───────┘  └────────┬───────┘
             │                   │                   │
    ┌────────▼───────────────────▼───────────────────▼────────┐
    │                     Redis Cluster                         │
    │   ┌─────────────┐   ┌─────────────┐   ┌──────────────┐ │
    │   │   Cache     │   │  BullMQ     │   │  Session /   │ │
    │   │  (ioredis)  │   │  Queues     │   │  Rate Limit  │ │
    │   └─────────────┘   └─────────────┘   └──────────────┘ │
    └─────────────────────────────┬───────────────────────────┘
                                  │
    ┌─────────────────────────────▼───────────────────────────┐
    │                  PostgreSQL (Primary)                     │
    │                  + Read Replicas (optional)               │
    └──────────────────────────────────────────────────────────┘
```

---

## Redis Caching Layer

### Configuration

File: `api/src/config/redis.js`

| Env Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | — | Full connection string (takes precedence) |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Auth password |
| `REDIS_DB` | `0` | Database index |
| `REDIS_KEY_PREFIX` | `cookmate:` | Namespace prefix for all keys |

### Graceful Fallback

Redis is **optional**. When unavailable:
- `cache.get()` returns `null` (cache miss)
- `cache.set()` / `cache.del()` are no-ops
- Controllers continue to query PostgreSQL directly
- BullMQ workers log a warning and skip

No user-facing behavior changes.

### Cache Utility API

File: `api/src/config/cache.js`

```js
const cache = require('../config/cache');

// Simple get/set
const data = await cache.get('recipes:featured');
await cache.set('recipes:featured', freshData, 300); // 5 min TTL

// Cache-aside pattern (get or compute)
const result = await cache.getOrSet('user:123:profile', async () => {
  return await pool.query('SELECT ... FROM users WHERE id = $1', [123]);
}, 60);

// Invalidation
await cache.del('recipes:featured');
await cache.invalidatePattern('recipes:*'); // SCAN-based bulk invalidation
```

### Recommended Cache Points

| Resource | Key Pattern | TTL | Invalidation Trigger |
|---|---|---|---|
| Featured recipes | `recipes:featured` | 5 min | Recipe publish/unpublish |
| Recipe detail | `recipe:{id}` | 10 min | Recipe update |
| User profile | `user:{id}:profile` | 60s | Profile update |
| Home sections | `home:sections` | 3 min | Recipe publish |
| Rate limit status | `rl:{userId}:camera` | 24h | AI camera use |
| ML model status | `ml:model-status` | 15 min | Model retrain |

---

## BullMQ Message Queues

### Configuration

File: `api/src/queues/index.js`

| Env Variable | Default | Description |
|---|---|---|
| `REDIS_URL` / `REDIS_HOST` / `REDIS_PORT` | (same as cache) | BullMQ uses the same Redis |
| `BULL_CONCURRENCY` | `3` | Workers per queue |

### Queue Definitions

| Queue Name | Purpose | Concurrency |
|---|---|---|
| `cookmate:email` | Transactional email delivery | 3 |
| `cookmate:image` | Background removal / sticker generation | 2 |
| `cookmate:notification` | Push notification fan-out | 3 |
| `cookmate:analytics` | Deferred analytics writes | 3 |

### Worker Processors

```text
api/src/queues/
├── index.js                      # Queue + Worker setup
└── processors/
    ├── emailProcessor.js         # Sends email via mailer service
    ├── imageProcessor.js         # CPU-heavy image tasks
    ├── notificationProcessor.js  # Push notification delivery
    └── analyticsProcessor.js     # Non-critical DB writes
```

### Job Lifecycle

```text
Controller → queue.add(jobData) → Redis → Worker picks up → Processor runs → Done/Retry
```

Jobs automatically retry on failure (BullMQ default: 3 attempts with exponential backoff).

### Enqueueing Jobs (Example)

```js
const { emailQueue } = require('../queues');

// Non-blocking: returns immediately, email sent in background
await emailQueue.add('welcome-email', {
  to: user.email,
  subject: 'Welcome to CookMate!',
  html: welcomeTemplate(user.full_name),
});
```

---

## Horizontal Scaling Strategy

### Stateless API Instances

CookMate's Express API is designed to be **stateless**:

- **Auth**: JWT tokens are self-contained — no server-side session store needed
- **File uploads**: Stored in Cloudinary (not local filesystem in production)
- **Rate limiting**: Can be backed by Redis (`express-rate-limit` + `rate-limit-redis`) for shared state across instances
- **WebSocket (Socket.io)**: Uses Redis adapter for cross-instance event broadcasting

### Running Multiple Instances

#### Option A: PM2 Cluster Mode (Single Server)

```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'cookmate-api',
    script: 'src/server.js',
    instances: 'max',       // Use all CPU cores
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' }
  }]
};

pm2 start ecosystem.config.js
```

#### Option B: Docker + Load Balancer (Multi-Server)

```dockerfile
# api/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ src/
EXPOSE 5000
CMD ["node", "src/server.js"]
```

```yaml
# docker-compose.scale.yml
services:
  api:
    build: ./api
    deploy:
      replicas: 4
      resources:
        limits:
          memory: 512M
    environment:
      - REDIS_URL=redis://redis:6379
      - DB_HOST=postgres
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: Cookmate
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api

volumes:
  redis_data:
  pg_data:
```

#### Option C: Cloud Auto-Scaling (AWS / GCP / Railway)

| Platform | Strategy |
|---|---|
| **AWS ECS/Fargate** | Task definition with auto-scaling policy (CPU > 70% → scale out) |
| **Google Cloud Run** | Automatic scaling 0→N based on request concurrency |
| **Railway** | Deploy from Git, horizontal scaling via replicas slider |
| **Render** | Auto-scaling on Pro plan with health check endpoint |

### Socket.io with Redis Adapter

For WebSocket events to broadcast across multiple API instances:

```js
// In realtime/plannerSocket.js (production enhancement)
const { createAdapter } = require('@socket.io/redis-adapter');
const { redis } = require('../config/redis');

const pubClient = redis.duplicate();
const subClient = redis.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

This ensures `planner:plans_changed` events reach all connected clients regardless of which instance they're connected to.

### Database Scaling

| Strategy | When | How |
|---|---|---|
| **Connection pooling** | Always | `pg Pool` with `DB_POOL_MAX=20` per instance |
| **Read replicas** | > 1000 RPM | Route read queries to replica; writes to primary |
| **PgBouncer** | > 5 instances | Connection multiplexer between app and PostgreSQL |
| **Partitioning** | > 10M rows | Partition `recipe_viewed`, `notifications`, `login_attempts` by date |

### Separate Worker Processes

For heavy workloads, run queue workers as separate processes:

```bash
# Start API server only (no workers)
DISABLE_QUEUE_WORKERS=true node src/server.js

# Start dedicated worker process
node src/queues/workerProcess.js
```

This lets you scale API instances independently from worker instances.

---

## Performance Benchmarks (Expected)

| Metric | Without Redis/Queues | With Redis + 4 Instances |
|---|---|---|
| Recipe listing (cold) | ~50ms | ~50ms (first hit) |
| Recipe listing (cached) | ~50ms | ~3ms |
| AI Camera analysis | ~4s (blocking) | ~4s (async via queue) |
| Email delivery | ~800ms (blocking) | ~0ms (queued, async) |
| Concurrent users | ~200 | ~2000+ |

---

## Monitoring & Observability

### Health Endpoint

`GET /api/health` returns:
```json
{ "status": "ok", "uptime": 12345.67, "timestamp": "2026-05-16T..." }
```

### Redis Health Check (add to health endpoint if needed)

```js
const { isRedisConnected } = require('./config/redis');
// Include in health response: "redis": isRedisConnected() ? "connected" : "disconnected"
```

### BullMQ Dashboard (optional)

Install `bull-board` for a web UI to monitor queue jobs:
```bash
npm install @bull-board/express @bull-board/api
```

### Structured Logging

All services use `pino` for JSON-structured logging, compatible with:
- **Datadog** / **New Relic** log ingestion
- **AWS CloudWatch** / **GCP Cloud Logging**
- **Grafana Loki** for self-hosted stacks

---

## Quick Start (Local Redis)

```bash
# 1. Install Redis (Windows via WSL or Docker)
docker run -d --name cookmate-redis -p 6379:6379 redis:7-alpine

# 2. Add to api/.env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# 3. Install new dependencies
cd api && npm install

# 4. Start the API (Redis connects automatically)
npm run dev
```

If Redis is not running, the app starts normally with a warning:
```
[redis] Initial connection failed — caching disabled
[server] Queue workers not started — Redis may be unavailable
```

---

## Summary

| Component | Technology | Purpose |
|---|---|---|
| **Cache** | Redis + ioredis | Response caching, rate-limit state, session store |
| **Message Queue** | BullMQ (Redis-backed) | Async email, image processing, notifications, analytics |
| **Load Balancing** | Nginx / ALB / Cloud LB | Distribute traffic across API instances |
| **Process Manager** | PM2 / Docker | Run multiple API instances per server |
| **Connection Pool** | pg Pool / PgBouncer | Efficient DB connections across instances |
| **WebSocket Scaling** | @socket.io/redis-adapter | Cross-instance Socket.io event broadcast |
| **Monitoring** | Pino + health endpoint | Structured logs + readiness checks |

> **Important:** All additions are backward-compatible. The app functions identically without Redis — caching is a transparent performance layer, and queue processors are future hooks that don't alter existing controller logic.
