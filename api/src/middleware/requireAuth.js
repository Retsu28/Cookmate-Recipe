const jwt = require('jsonwebtoken');

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
 * Attaches `req.userId` on success, responds 401 on failure.
 */
function requireAuth(req, res, next) {
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  const token = match?.[1] || cookieToken;

  if (!token) return res.status(401).json({ error: 'Missing auth token.' });

  try {
    const payload = verifyAuthToken(token);
    req.userId = Number(payload.sub);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth, verifyAuthToken, getJwtSecret, AUTH_COOKIE_NAME };
