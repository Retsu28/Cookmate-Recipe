const crypto = require('crypto');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

const { pool } = require('../config/db');
const { getJwtSecret, AUTH_COOKIE_NAME } = require('../middleware/requireAuth');
const { issueRefreshToken, rotateRefreshToken, revokeRefreshToken, REFRESH_COOKIE_NAME } = require('../config/refreshToken');
const { verifyGoogleIdToken } = require('../config/googleAuth');
const { verifyFirebaseIdToken, getFirebaseAuth } = require('../config/firebaseAdmin');
const { sendMail } = require('../config/mailer');

const SIGNUP_EMAIL_RE = /^[^\s@]+@gmail\.com$/i;
const LOGIN_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';
const JWT_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DUPLICATE_SIGNUP_MESSAGE = 'An account with this Gmail already exists.';

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function normalizeFullName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.full_name || row.email.split('@')[0],
    avatar_url: row.avatar_url || null,
    notifications_enabled: row.notifications_enabled !== false,
    role: row.role === 'admin' ? 'admin' : 'user',
    cooking_skill_level: row.cooking_skill_level || null,
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: JWT_COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function isFirebaseAdminConfigError(err) {
  const message = String(err?.message || '');
  return (
    message.includes('Missing Firebase Admin credentials') ||
    message.includes('FIREBASE_SERVICE_ACCOUNT is not valid JSON') ||
    message.includes('Failed to parse private key') ||
    message.includes('Invalid PEM formatted message') ||
    err?.code === 'app/invalid-credential'
  );
}

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({ error: 'Full name, Gmail, and password are required.' });
    }
    if (!SIGNUP_EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Email must be a @gmail.com address.' });
    }
    if (password.length < MIN_PASSWORD_LEN) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` });
    }

    const cleanName = normalizeFullName(name);
    const normalizedEmail = normalizeEmail(email);

    const duplicate = await pool.query(
      'SELECT 1 FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (duplicate.rowCount > 0) {
      return res.status(409).json({
        code: 'auth/email-already-in-use',
        error: 'An account with this email already exists.',
      });
    }

    const nameDup = await pool.query(
      'SELECT 1 FROM users WHERE LOWER(BTRIM(full_name)) = $1 LIMIT 1',
      [cleanName.toLowerCase()]
    );

    if (nameDup.rowCount > 0) {
      return res.status(409).json({
        code: 'auth/name-already-in-use',
        error: 'An account with this full name already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const insert = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, full_name, avatar_url, notifications_enabled, role`,
      [normalizedEmail, passwordHash, cleanName]
    );

    const user = toPublicUser(insert.rows[0]);
    const token = signToken(user);
    setAuthCookie(res, token);
    await issueRefreshToken(insert.rows[0].id, res);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({
        code: 'auth/email-already-in-use',
        error: 'An account with this email already exists.',
      });
    }
    logger.error('[auth/signup] failed:', err);
    return res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
};

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_LOCK_MINUTES = 15;

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!LOGIN_EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const result = await pool.query(
      'SELECT id, email, full_name, avatar_url, notifications_enabled, role, password_hash, failed_login_attempts, locked_until FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const row = result.rows[0];

    // Check account lockout
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(row.locked_until) - new Date()) / 60000);
      return res.status(429).json({
        error: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
      });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      const newAttempts = (row.failed_login_attempts || 0) + 1;
      const shouldLock = newAttempts >= LOGIN_MAX_ATTEMPTS;
      await pool.query(
        `UPDATE users
         SET failed_login_attempts = $1,
             locked_until = $2
         WHERE id = $3`,
        [
          shouldLock ? 0 : newAttempts,
          shouldLock ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000) : null,
          row.id,
        ]
      );
      if (shouldLock) {
        return res.status(429).json({
          error: `Too many failed attempts. Account locked for ${LOGIN_LOCK_MINUTES} minutes.`,
        });
      }
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    // Successful login — clear lockout counters
    if (row.failed_login_attempts > 0 || row.locked_until) {
      await pool.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
        [row.id]
      );
    }

    const user = toPublicUser(row);
    const token = signToken(user);
    setAuthCookie(res, token);
    await issueRefreshToken(row.id, res);
    return res.json({ token, user });
  } catch (err) {
    logger.error('[auth/login] failed:', err);
    return res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
};

exports.me = async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const result = await pool.query(
      'SELECT id, email, full_name, avatar_url, notifications_enabled, role, cooking_skill_level FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: toPublicUser(result.rows[0]) });
  } catch (err) {
    logger.error('[auth/me] failed:', err);
    return res.status(500).json({ error: 'Failed to load user profile.' });
  }
};

exports.logout = async (req, res) => {
  const oldRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (oldRefreshToken) await revokeRefreshToken(oldRefreshToken);
  clearAuthCookie(res);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  return res.status(204).send();
};

exports.refresh = async (req, res) => {
  const oldToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!oldToken) return res.status(401).json({ error: 'No refresh token.' });
  try {
    const userId = await rotateRefreshToken(oldToken, res);
    if (!userId) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
      return res.status(401).json({ error: 'Refresh token invalid or expired.' });
    }
    const result = await pool.query(
      'SELECT id, email, full_name, avatar_url, notifications_enabled, role, cooking_skill_level FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (result.rowCount === 0) return res.status(401).json({ error: 'User not found.' });
    const user = toPublicUser(result.rows[0]);
    const token = signToken(user);
    setAuthCookie(res, token);
    return res.json({ token, user });
  } catch (err) {
    logger.error('[auth/refresh] failed:', err);
    return res.status(500).json({ error: 'Failed to refresh token.' });
  }
};

exports.passwordResetStatus = async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (typeof email !== 'string' || !LOGIN_EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const result = await pool.query(
      'SELECT id, firebase_uid FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No CookMate account was found for this email.' });
    }

    let firebaseUser;
    try {
      firebaseUser = await getFirebaseAuth().getUserByEmail(normalizedEmail);
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        return res.status(409).json({
          error:
            'This email exists in CookMate but not in Firebase Auth, so Firebase cannot send a password reset email. Please create/sign in with this Gmail using Firebase first.',
        });
      }
      if (isFirebaseAdminConfigError(err)) {
        logger.error('[auth/password-reset-status] Firebase Admin config failed:', err);
        return res.status(500).json({
          error:
            'Firebase Admin is not configured correctly on the API server. Check api/.env or api/firebase-service-account.json.',
        });
      }
      logger.error('[auth/password-reset-status] Firebase lookup failed:', err);
      return res.status(500).json({ error: 'Could not verify this email with Firebase Auth.' });
    }

    if (!result.rows[0].firebase_uid) {
      await pool.query('UPDATE users SET firebase_uid = $1, email_verified = $2 WHERE id = $3', [
        firebaseUser.uid,
        firebaseUser.emailVerified === true,
        result.rows[0].id,
      ]);
    } else if (result.rows[0].firebase_uid !== firebaseUser.uid) {
      return res.status(409).json({
        error: 'This CookMate account is linked to a different Firebase user. Please contact support.',
      });
    }

    return res.json({ canReset: true });
  } catch (err) {
    logger.error('[auth/password-reset-status] failed:', err);
    return res.status(500).json({ error: 'Could not verify this account for password reset.' });
  }
};

/**
 * POST /api/auth/google
 * Body: { credential: string }  — a Google Identity Services ID token.
 *
 * Verifies the ID token server-side against GOOGLE_CLIENT_ID. On success,
 * finds the user by normalized email or creates one (random bcrypt hash,
 * since we never use a password for Google-auth accounts). Issues the same
 * JWT + auth cookie the email/password flow uses.
 */
exports.google = async (req, res) => {
  try {
    const { credential } = req.body ?? {};
    if (typeof credential !== 'string' || !credential) {
      return res.status(400).json({ error: 'Missing Google credential.' });
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(credential);
    } catch (err) {
      logger.warn('[auth/google] token verification failed:', err?.message);
      return res.status(401).json({ error: 'Invalid Google sign-in.' });
    }

    const email = typeof payload?.email === 'string' ? payload.email : '';
    if (!email || payload.email_verified === false) {
      return res.status(401).json({ error: 'Google account email is not verified.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const fullName = normalizeFullName(
      typeof payload.name === 'string' && payload.name.trim()
        ? payload.name
        : normalizedEmail.split('@')[0]
    );

    const existing = await pool.query(
      'SELECT id, email, full_name, avatar_url, notifications_enabled, role FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
      [normalizedEmail]
    );

    let row;
    if (existing.rowCount > 0) {
      row = existing.rows[0];
    } else {
      // Create a new account. password_hash is NOT NULL — store a random
      // bcrypt hash so password login can't be used (user must re-auth via Google).
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, BCRYPT_ROUNDS);
      const inserted = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING id, email, full_name, avatar_url, notifications_enabled, role`,
        [normalizedEmail, passwordHash, fullName]
      );
      row = inserted.rows[0];
    }

    const user = toPublicUser(row);
    const token = signToken(user);
    setAuthCookie(res, token);
    await issueRefreshToken(row.id, res);
    return res.json({ token, user });
  } catch (err) {
    logger.error('[auth/google] failed:', err);
    return res.status(500).json({ error: 'Something went wrong signing you in with Google.' });
  }
};

/**
 * POST /api/auth/firebase
 * Body: { idToken: string, name?: string }
 *
 * Exchanges a Firebase ID token (issued by the web/mobile Firebase SDK
 * after signInWithEmailAndPassword / Google / etc.) for the existing
 * CookMate JWT session. The first time a Firebase user is seen we
 * find-or-create the matching PostgreSQL row and link it via
 * users.firebase_uid.
 *
 * Existing email/password users are migrated automatically on first
 * Firebase login: we match by normalized email and write firebase_uid
 * + email_verified into their row. Their password_hash stays untouched.
 */
exports.firebase = async (req, res) => {
  try {
    const { idToken, name } = req.body ?? {};
    if (typeof idToken !== 'string' || !idToken) {
      return res.status(400).json({ error: 'Missing Firebase ID token.' });
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(idToken);
    } catch (err) {
      logger.warn('[auth/firebase] token verification failed:', err?.code || err?.message);
      if (isFirebaseAdminConfigError(err)) {
        return res.status(500).json({
          error:
            'Firebase Admin is not configured correctly on the API server. Add a service account for project cookmate-9272d, then restart the API server.',
        });
      }
      if (err?.code === 'auth/argument-error') {
        return res.status(401).json({ error: 'Firebase ID token was missing or malformed.' });
      }
      if (err?.code === 'auth/id-token-expired') {
        return res.status(401).json({ error: 'Firebase session expired. Please try again.' });
      }
      if (err?.code === 'auth/invalid-argument' || err?.code === 'auth/invalid-id-token') {
        return res.status(401).json({
          error:
            'Firebase token could not be verified. Make sure the API service account belongs to project cookmate-9272d.',
        });
      }
      return res.status(401).json({ error: 'Invalid or expired Firebase session.' });
    }

    const firebaseUid = decoded.uid;
    const email = typeof decoded.email === 'string' ? decoded.email : '';
    if (!email) {
      return res.status(401).json({ error: 'Firebase token has no email claim.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const emailVerified = decoded.email_verified === true;
    const fullName = normalizeFullName(
      typeof name === 'string' && name.trim()
        ? name
        : typeof decoded.name === 'string' && decoded.name.trim()
        ? decoded.name
        : normalizedEmail.split('@')[0]
    );

    // 1) Try by firebase_uid (returning user already linked).
    let row;
    const byUid = await pool.query(
      'SELECT id, email, full_name, avatar_url, notifications_enabled, role, firebase_uid FROM users WHERE firebase_uid = $1 LIMIT 1',
      [firebaseUid]
    );
    if (byUid.rowCount > 0) {
      row = byUid.rows[0];
      // Keep email_verified and email in sync with Firebase.
      await pool.query(
        'UPDATE users SET email_verified = $1, email = $2 WHERE id = $3',
        [emailVerified, normalizedEmail, row.id]
      );
    } else {
      // 2) Match an existing legacy account by email and link it.
      const byEmail = await pool.query(
        'SELECT id, email, full_name, avatar_url, notifications_enabled, role, firebase_uid FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
        [normalizedEmail]
      );
      if (byEmail.rowCount > 0) {
        row = byEmail.rows[0];
        if (row.firebase_uid && row.firebase_uid !== firebaseUid) {
          return res.status(409).json({
            code: 'auth/email-already-in-use',
            error: 'An account with this email already exists.',
          });
        }
        await pool.query(
          'UPDATE users SET firebase_uid = $1, email_verified = $2 WHERE id = $3',
          [firebaseUid, emailVerified, row.id]
        );
      } else {
        // 3) Brand-new user — create one. password_hash is NULL because
        //    Firebase owns the password from now on.
        const nameDup = await pool.query(
          'SELECT 1 FROM users WHERE LOWER(BTRIM(full_name)) = $1 LIMIT 1',
          [fullName.toLowerCase()]
        );
        if (nameDup.rowCount > 0) {
          await getFirebaseAuth().deleteUser(firebaseUid).catch(() => {});
          return res.status(409).json({
            code: 'auth/name-already-in-use',
            error: 'An account with this full name already exists.',
          });
        }

        let inserted;
        try {
          inserted = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role, firebase_uid, email_verified)
             VALUES ($1, NULL, $2, 'user', $3, $4)
             RETURNING id, email, full_name, avatar_url, notifications_enabled, role`,
            [normalizedEmail, fullName, firebaseUid, emailVerified]
          );
        } catch (insertErr) {
          if (insertErr?.code === '23505') {
            await getFirebaseAuth().deleteUser(firebaseUid).catch(() => {});
            return res.status(409).json({
              code: 'auth/email-already-in-use',
              error: 'An account with this email already exists.',
            });
          }
          throw insertErr;
        }
        row = inserted.rows[0];
      }
    }

    const user = toPublicUser(row);
    const token = signToken(user);
    setAuthCookie(res, token);
    await issueRefreshToken(row.id, res);
    return res.json({ token, user, emailVerified });
  } catch (err) {
    logger.error('[auth/firebase] failed:', err);
    return res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
};

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_SECONDS = 3600;

function generateResetToken() {
  return crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Generates a secure token (expires in 1 hour), stores it in the DB,
 * and emails a branded reset link. Silently succeeds even if email isn't
 * registered so we don't leak account existence.
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (typeof email !== 'string' || !LOGIN_EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const userResult = await pool.query(
      'SELECT id, firebase_uid FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (userResult.rowCount === 0) {
      return res.json({ sent: true });
    }

    try {
      await getFirebaseAuth().getUserByEmail(normalizedEmail);
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        return res.json({ sent: true });
      }
      throw err;
    }

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_SECONDS * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens (email, token, expires_at)
       VALUES ($1, $2, $3)`,
      [normalizedEmail, token, expiresAt]
    );

    const baseUrl = process.env.WEB_APP_URL || 'http://localhost:5173';
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await sendMail({
      to: normalizedEmail,
      subject: 'Reset your CookMate password',
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1c1917;background:#fafaf9;border-radius:16px;border:1px solid #e7e5e4;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
            <div style="width:36px;height:36px;background:#f97316;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;">&#127860;</div>
            <h2 style="color:#f97316;margin:0;font-size:20px;font-weight:800;letter-spacing:-0.02em;">CookMate</h2>
          </div>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Hello,</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.5;">We received a request to reset your CookMate password. Tap the button below to choose a new one. This link expires in <strong>1 hour</strong> for security.</p>
          <a href="${resetLink}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;margin:4px 0 18px;">Reset password</a>
          <p style="font-size:13px;color:#78716c;line-height:1.5;margin:0;">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
          <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0;">
          <p style="font-size:12px;color:#a8a29e;margin:0;">CookMate Team</p>
        </div>
      `,
    });

    return res.json({ sent: true });
  } catch (err) {
    logger.error('[auth/forgot-password] failed:', err);
    return res.status(500).json({ error: 'Could not send the reset email. Please try again.' });
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 *
 * Verifies the token (1-hour expiry, single-use), updates the password
 * in Firebase Auth via Admin SDK, marks the token used, and syncs the local
 * PostgreSQL password_hash.
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body ?? {};
    if (typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ error: 'Reset token is required.' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LEN) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` });
    }

    const result = await pool.query(
      `SELECT email, expires_at, used
       FROM password_reset_tokens
       WHERE token = $1 LIMIT 1`,
      [token.trim()]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link.' });
    }

    const { email, expires_at, used } = result.rows[0];
    if (used || new Date() > new Date(expires_at)) {
      return res.status(400).json({ error: 'This reset link has expired or already been used.' });
    }

    // Always update the local password_hash first (works for all auth types)
    const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE LOWER(BTRIM(email)) = $2',
      [newHash, email]
    );

    // Best-effort Firebase password sync — skip gracefully if Admin SDK not configured
    try {
      const firebaseUser = await getFirebaseAuth().getUserByEmail(email);
      await getFirebaseAuth().updateUser(firebaseUser.uid, { password });
    } catch (fbErr) {
      logger.warn('[auth/reset-password] Firebase sync skipped:', fbErr?.code || fbErr?.message);
    }

    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = $1',
      [token.trim()]
    );

    return res.json({ success: true });
  } catch (err) {
    logger.error('[auth/reset-password] failed:', err);
    return res.status(500).json({ error: 'Could not reset your password. Please try again.' });
  }
};

