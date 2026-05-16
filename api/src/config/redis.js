/**
 * Redis client configuration.
 *
 * Uses ioredis for connection pooling, auto-reconnect, and Cluster support.
 * Falls back gracefully when Redis is unavailable — the app continues to
 * function without caching (cache misses return null, writes are no-ops).
 *
 * Environment variables:
 *   REDIS_URL          — Full Redis connection string (e.g. redis://localhost:6379)
 *   REDIS_HOST         — Host (default: 127.0.0.1)
 *   REDIS_PORT         — Port (default: 6379)
 *   REDIS_PASSWORD     — Password (optional)
 *   REDIS_DB           — DB index (default: 0)
 *   REDIS_KEY_PREFIX   — Prefix for all keys (default: cookmate:)
 */
const Redis = require('ioredis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || null;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'cookmate:';

let redis;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    keyPrefix: REDIS_KEY_PREFIX,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
} else {
  redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    db: REDIS_DB,
    keyPrefix: REDIS_KEY_PREFIX,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
}

let connected = false;

redis.on('connect', () => {
  connected = true;
  logger.info('[redis] Connected');
});

let errorLogged = false;
redis.on('error', (err) => {
  connected = false;
  if (!errorLogged) {
    errorLogged = true;
    logger.warn({ err: err.message }, '[redis] Connection error (app will function without cache)');
  }
});

redis.on('close', () => {
  connected = false;
});

/**
 * Attempt to connect to Redis. Non-blocking — if Redis is unreachable,
 * the app still starts and operates without caching.
 */
async function connectRedis() {
  try {
    await redis.connect();
  } catch (err) {
    logger.warn({ err: err.message }, '[redis] Initial connection failed — caching disabled');
  }
}

function isRedisConnected() {
  return connected;
}

module.exports = { redis, connectRedis, isRedisConnected, REDIS_KEY_PREFIX };
