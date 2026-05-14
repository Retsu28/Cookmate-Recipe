const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const logger = require('../config/logger');

const USER_CACHE_TTL_MS = 30_000;
const userCache = new Map();

function getCachedUser(userId) {
  const entry = userCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { userCache.delete(userId); return null; }
  return entry.user;
}

function setCachedUser(userId, user) {
  userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
  if (userCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of userCache) { if (now > v.expiresAt) userCache.delete(k); }
  }
}

const AUTH_COOKIE_NAME = 'cookmate.auth.token';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'JWT_SECRET is missing or too short. Set it in your .env file (see .env.example).'
    );
  }
  return secret;
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

/**
 * Express middleware — extracts JWT from Authorization header or cookie.
 * Attaches `req.userId` and `req.userRole` on success, responds 401 on failure.
 */
async function requireAuth(req, res, next) {
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  const token = match?.[1] || cookieToken;

  if (!token) return res.status(401).json({ error: 'Missing auth token.' });

  try {
    const payload = verifyAuthToken(token);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    let user = getCachedUser(userId);
    if (!user) {
      let userResult;
      try {
        userResult = await pool.query(
          'SELECT id, role, deleted_at FROM users WHERE id = $1 LIMIT 1',
          [userId]
        );
      } catch (err) {
        if (err?.code !== '42703') throw err;
        userResult = await pool.query(
          'SELECT id, role, NULL AS deleted_at FROM users WHERE id = $1 LIMIT 1',
          [userId]
        );
      }

      if (userResult.rowCount === 0) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }

      user = userResult.rows[0];
      setCachedUser(userId, user);
    }
    // Shared auth guard: every authenticated route must reject soft-deleted accounts.
    if (user.deleted_at !== null) {
      return res.status(401).json({ error: 'Account deleted' });
    }

    req.userId = user.id;
    req.userRole = user.role === 'admin' ? 'admin' : 'user';
    req.user = user;

    // Fire-and-forget: update last_active_at for accurate online status
    // user.id is validated as a positive integer above, safe to interpolate
    pool.query(
      `UPDATE users SET last_active_at = NOW() WHERE id = ${user.id}`
    ).catch(() => {});

    next();
  } catch (err) {
    logger.error('[requireAuth] failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth, verifyAuthToken, getJwtSecret, AUTH_COOKIE_NAME };
