const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { pool } = require('../config/db');
const logger = require('../config/logger');

const APP_NAME = 'CookMate';
const MFA_WINDOW = 1; // ±1 interval (30s) tolerance
const MAX_VERIFY_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function getMfaRow(userId) {
  const result = await pool.query(
    'SELECT mfa_enabled, mfa_secret, failed_login_attempts, locked_until FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  return result.rowCount > 0 ? result.rows[0] : null;
}

/**
 * GET /api/mfa/status
 * Returns current MFA enabled state for the authenticated user.
 */
exports.status = async (req, res) => {
  try {
    const row = await getMfaRow(req.userId);
    if (!row) return res.status(404).json({ error: 'User not found.' });
    return res.json({ mfa_enabled: row.mfa_enabled === true });
  } catch (err) {
    logger.error('[mfa/status] failed:', err);
    return res.status(500).json({ error: 'Failed to load MFA status.' });
  }
};

/**
 * POST /api/mfa/setup
 * Generates a new TOTP secret (not yet saved to DB), returns the
 * otpauth:// URI and a base64-encoded QR code PNG data URL.
 * The secret is only persisted once the user confirms with a valid code
 * via POST /api/mfa/enable.
 */
exports.setup = async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT email, full_name FROM users WHERE id = $1 LIMIT 1',
      [req.userId]
    );
    if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found.' });

    const { email } = userResult.rows[0];

    const secret = speakeasy.generateSecret({
      name: `${APP_NAME} (${email})`,
      issuer: APP_NAME,
      length: 20,
    });

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCode: qrDataUrl,
    });
  } catch (err) {
    logger.error('[mfa/setup] failed:', err);
    return res.status(500).json({ error: 'Failed to generate MFA setup. Please try again.' });
  }
};

/**
 * POST /api/mfa/enable
 * Body: { secret: string, token: string }
 * Verifies the 6-digit TOTP token against the provided secret, then
 * saves mfa_secret + mfa_enabled=true to the user row.
 */
exports.enable = async (req, res) => {
  try {
    const { secret, token } = req.body ?? {};

    if (typeof secret !== 'string' || !secret.trim()) {
      return res.status(400).json({ error: 'MFA secret is required.' });
    }
    if (typeof token !== 'string' || !/^\d{6}$/.test(token.trim())) {
      return res.status(400).json({ error: 'A valid 6-digit code is required.' });
    }

    const valid = speakeasy.totp.verify({
      secret: secret.trim(),
      encoding: 'base32',
      token: token.trim(),
      window: MFA_WINDOW,
    });

    if (!valid) {
      return res.status(401).json({ error: 'Invalid authenticator code. Please try again.' });
    }

    await pool.query(
      'UPDATE users SET mfa_enabled = TRUE, mfa_secret = $1 WHERE id = $2',
      [secret.trim(), req.userId]
    );

    logger.info({ userId: req.userId }, '[mfa/enable] MFA enabled');
    return res.json({ success: true, message: 'MFA has been enabled on your account.' });
  } catch (err) {
    logger.error('[mfa/enable] failed:', err);
    return res.status(500).json({ error: 'Failed to enable MFA. Please try again.' });
  }
};

/**
 * POST /api/mfa/disable
 * Body: { token: string }
 * Verifies the current TOTP token and disables MFA on the account.
 */
exports.disable = async (req, res) => {
  try {
    const { token } = req.body ?? {};

    if (typeof token !== 'string' || !/^\d{6}$/.test(token.trim())) {
      return res.status(400).json({ error: 'A valid 6-digit code is required.' });
    }

    const row = await getMfaRow(req.userId);
    if (!row) return res.status(404).json({ error: 'User not found.' });
    if (!row.mfa_enabled || !row.mfa_secret) {
      return res.status(400).json({ error: 'MFA is not enabled on this account.' });
    }

    const valid = speakeasy.totp.verify({
      secret: row.mfa_secret,
      encoding: 'base32',
      token: token.trim(),
      window: MFA_WINDOW,
    });

    if (!valid) {
      return res.status(401).json({ error: 'Invalid authenticator code. Please try again.' });
    }

    await pool.query(
      'UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = $1',
      [req.userId]
    );

    logger.info({ userId: req.userId }, '[mfa/disable] MFA disabled');
    return res.json({ success: true, message: 'MFA has been disabled on your account.' });
  } catch (err) {
    logger.error('[mfa/disable] failed:', err);
    return res.status(500).json({ error: 'Failed to disable MFA. Please try again.' });
  }
};

/**
 * POST /api/mfa/verify
 * Body: { userId: number, token: string }
 * Public endpoint (no auth required) — used at login time when MFA is
 * required. Verifies the TOTP code and, on success, issues the full
 * JWT session via the same helpers as the login controller.
 */
exports.verify = async (req, res) => {
  try {
    const { userId, token } = req.body ?? {};

    if (!userId || typeof token !== 'string' || !/^\d{6}$/.test(token.trim())) {
      return res.status(400).json({ error: 'User ID and a valid 6-digit code are required.' });
    }

    const result = await pool.query(
      `SELECT id, email, full_name, avatar_url, notifications_enabled, role,
              mfa_enabled, mfa_secret, failed_login_attempts, locked_until
       FROM users WHERE id = $1 LIMIT 1`,
      [Number(userId)]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid session. Please sign in again.' });
    }

    const row = result.rows[0];

    if (!row.mfa_enabled || !row.mfa_secret) {
      return res.status(400).json({ error: 'MFA is not enabled for this account.' });
    }

    // Check lockout
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(row.locked_until) - new Date()) / 60000);
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
      });
    }

    const valid = speakeasy.totp.verify({
      secret: row.mfa_secret,
      encoding: 'base32',
      token: token.trim(),
      window: MFA_WINDOW,
    });

    if (!valid) {
      const newAttempts = (row.failed_login_attempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_VERIFY_ATTEMPTS;
      await pool.query(
        `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
        [
          shouldLock ? 0 : newAttempts,
          shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
          row.id,
        ]
      );
      if (shouldLock) {
        return res.status(429).json({
          error: `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.`,
        });
      }
      return res.status(401).json({ error: 'Invalid authenticator code. Please try again.' });
    }

    // Clear lockout counters on success
    if (row.failed_login_attempts > 0 || row.locked_until) {
      await pool.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
        [row.id]
      );
    }

    // Issue full session
    const jwt = require('jsonwebtoken');
    const { getJwtSecret, AUTH_COOKIE_NAME } = require('../middleware/requireAuth');
    const { issueRefreshToken } = require('../config/refreshToken');

    const publicUser = {
      id: row.id,
      email: row.email,
      name: row.full_name || row.email.split('@')[0],
      avatar_url: row.avatar_url || null,
      notifications_enabled: row.notifications_enabled !== false,
      role: row.role === 'admin' ? 'admin' : 'user',
      cooking_skill_level: row.cooking_skill_level || null,
    };

    const jwtToken = jwt.sign(
      { sub: row.id, email: row.email, role: row.role },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.cookie(AUTH_COOKIE_NAME, jwtToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    await issueRefreshToken(row.id, res);

    logger.info({ userId: row.id }, '[mfa/verify] MFA verified successfully');
    return res.json({ token: jwtToken, user: publicUser });
  } catch (err) {
    logger.error('[mfa/verify] failed:', err);
    return res.status(500).json({ error: 'MFA verification failed. Please try again.' });
  }
};
