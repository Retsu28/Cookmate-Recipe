/**
 * Application-level cache utility backed by Redis.
 *
 * Provides get/set/del/invalidatePattern helpers with automatic JSON
 * serialisation. When Redis is unavailable, all operations gracefully
 * return null or no-op — existing controller logic remains unaffected.
 *
 * Usage (in any controller or service):
 *   const cache = require('../config/cache');
 *   const data = await cache.get('recipes:featured');
 *   if (!data) {
 *     const fresh = await db.query(...);
 *     await cache.set('recipes:featured', fresh, 300); // 5 min TTL
 *   }
 */
const { redis, isRedisConnected } = require('./redis');
const logger = require('./logger');

/**
 * Get a cached value by key.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function get(key) {
  if (!isRedisConnected()) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn({ err: err.message, key }, '[cache] get failed');
    return null;
  }
}

/**
 * Set a cache value with optional TTL (seconds).
 * @param {string} key
 * @param {any} value — will be JSON.stringified
 * @param {number} [ttlSeconds=300] — time-to-live in seconds (default 5 min)
 */
async function set(key, value, ttlSeconds = 300) {
  if (!isRedisConnected()) return;
  try {
    const serialised = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redis.set(key, serialised, 'EX', ttlSeconds);
    } else {
      await redis.set(key, serialised);
    }
  } catch (err) {
    logger.warn({ err: err.message, key }, '[cache] set failed');
  }
}

/**
 * Delete a specific cache key.
 * @param {string} key
 */
async function del(key) {
  if (!isRedisConnected()) return;
  try {
    await redis.del(key);
  } catch (err) {
    logger.warn({ err: err.message, key }, '[cache] del failed');
  }
}

/**
 * Invalidate all keys matching a pattern (e.g. 'recipes:*').
 * Uses SCAN for safe iteration on large key spaces.
 * @param {string} pattern — glob pattern without the key prefix
 */
async function invalidatePattern(pattern) {
  if (!isRedisConnected()) return;
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const pipeline = redis.pipeline();
    let count = 0;

    await new Promise((resolve, reject) => {
      stream.on('data', (keys) => {
        keys.forEach((key) => {
          // ioredis scanStream returns keys without prefix when keyPrefix is set
          pipeline.del(key);
          count++;
        });
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    if (count > 0) {
      await pipeline.exec();
      logger.info({ pattern, count }, '[cache] invalidatePattern');
    }
  } catch (err) {
    logger.warn({ err: err.message, pattern }, '[cache] invalidatePattern failed');
  }
}

/**
 * Cache-aside helper: get from cache or compute and store.
 * @param {string} key
 * @param {Function} computeFn — async function that returns the value
 * @param {number} [ttlSeconds=300]
 * @returns {Promise<any>}
 */
async function getOrSet(key, computeFn, ttlSeconds = 300) {
  const cached = await get(key);
  if (cached !== null) return cached;

  const value = await computeFn();
  await set(key, value, ttlSeconds);
  return value;
}

module.exports = { get, set, del, invalidatePattern, getOrSet };
