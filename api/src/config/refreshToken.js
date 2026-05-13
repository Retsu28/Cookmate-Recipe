const crypto = require('crypto');
const { pool } = require('./db');

const REFRESH_TOKEN_BYTES = 40;
const REFRESH_TOKEN_DAYS = 30;
const REFRESH_COOKIE_NAME = 'rt';

function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  };
}

async function issueRefreshToken(userId, res) {
  const token = generateRefreshToken();
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );

  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
  return token;
}

async function rotateRefreshToken(oldToken, res) {
  const hash = hashToken(oldToken);
  const result = await pool.query(
    `SELECT id, user_id, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [hash]
  );

  if (result.rowCount === 0) return null;
  const row = result.rows[0];

  if (row.revoked_at || new Date(row.expires_at) < new Date()) {
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [row.user_id]);
    return null;
  }

  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [row.id]);

  const newToken = generateRefreshToken();
  const newHash = hashToken(newToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [row.user_id, newHash, expiresAt]
  );

  res.cookie(REFRESH_COOKIE_NAME, newToken, refreshCookieOptions());
  return row.user_id;
}

async function revokeRefreshToken(token) {
  if (!token) return;
  const hash = hashToken(token);
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
    [hash]
  );
}

async function purgeExpiredRefreshTokens() {
  await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL');
}

module.exports = {
  REFRESH_COOKIE_NAME,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  purgeExpiredRefreshTokens,
};
