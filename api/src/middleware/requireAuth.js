const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

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

    const user = userResult.rows[0];
    // Shared auth guard: every authenticated route must reject soft-deleted accounts.
    if (user.deleted_at !== null) {
      return res.status(401).json({ error: 'Account deleted' });
    }

    req.userId = user.id;
    req.userRole = user.role === 'admin' ? 'admin' : 'user';
    req.user = user;
    next();
  } catch (err) {
    console.error('[requireAuth] failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth, verifyAuthToken, getJwtSecret, AUTH_COOKIE_NAME };
