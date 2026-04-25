# CookMate Express API

Single backend API for both the React web app and Expo mobile app.

## Quick Start (Local Development)

```bash
cd api
npm install
cp .env.example .env   # edit .env with your real values
npm run dev             # starts on http://localhost:5000
```

Verify it works:
```bash
curl http://localhost:5000/api/health
# → { "status": "ok", "message": "Express API is running" }
```

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with `--watch` (auto-restart on changes) |
| `npm start` | Production start |

## Environment Variables

See [`.env.example`](.env.example) for all available variables.

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | No | PostgreSQL port (default: 5432) |
| `DB_USER` | Yes | PostgreSQL user |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `DB_NAME` | Yes | PostgreSQL database name |
| `JWT_SECRET` | Yes | JWT signing secret (min 16 chars) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `GEMINI_API_KEY` | No | Google Gemini AI API key |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user (auth required) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/recipes` | List all recipes |
| GET | `/api/recipes/featured` | Featured recipes |
| GET | `/api/recipes/recent` | Recent recipes |
| GET | `/api/recipes/:id` | Recipe detail |
| GET | `/api/ingredients` | List ingredients |
| GET | `/api/meal-planner/:userId` | Get meal plan |
| POST | `/api/meal-planner/assign` | Assign meal to plan |
| GET | `/api/shopping-list/generate/:userId` | Generate shopping list |
| GET | `/api/notifications/:userId` | Get notifications |
| GET | `/api/profile/:userId` | Get user profile |
| PUT | `/api/profile/:userId` | Update user profile |
| GET | `/api/inventory/:userId` | Get kitchen inventory |
| POST | `/api/ml/recommend/by-ingredients` | ML recipe recommendations |

---

## AWS EC2 Deployment

### 1. Provision EC2 Instance

- **AMI**: Amazon Linux 2 or Ubuntu 22.04
- **Instance type**: t3.micro (free tier) or t3.small
- **Security group**: Open ports **22** (SSH), **5000** (API), and optionally **80/443** for Nginx

### 2. Install Node.js

```bash
# Amazon Linux 2
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Clone & Install

```bash
git clone <your-repo-url> /home/ec2-user/cookmate
cd /home/ec2-user/cookmate/api
npm install --production
```

### 4. Configure Environment

```bash
cp .env.example .env
nano .env
# Set real values:
#   NODE_ENV=production
#   PORT=5000
#   DB_HOST=<your-rds-or-db-host>
#   DB_PASSWORD=<secure-password>
#   JWT_SECRET=<generate-a-64-char-hex>
#   CORS_ORIGINS=https://your-web-domain.com
```

### 5. Start with PM2 (Recommended)

```bash
sudo npm install -g pm2
pm2 start src/server.js --name cookmate-api
pm2 save
pm2 startup   # auto-start on reboot
```

### 6. Optional: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.cookmate.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable SSL with Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.cookmate.com
```

### 7. Point Clients to Production API

**React Web** (`.env.production`):
```
VITE_API_BASE_URL=https://api.cookmate.com
```

**Expo Mobile** (`app.json`):
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://api.cookmate.com"
    }
  }
}
```
