const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { getJwtSecret, AUTH_COOKIE_NAME } = require('../middleware/requireAuth');
const { verifyGoogleIdToken } = require('../config/googleAuth');
const { verifyFirebaseIdToken, getFirebaseAuth } = require('../config/firebaseAdmin');

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
    role: row.role === 'admin' ? 'admin' : 'user',
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
      return res.status(409).json({ error: DUPLICATE_SIGNUP_MESSAGE });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const insert = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, full_name, role`,
      [normalizedEmail, passwordHash, cleanName]
    );

    const user = toPublicUser(insert.rows[0]);
    const token = signToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: DUPLICATE_SIGNUP_MESSAGE });
    }
    console.error('[auth/signup] failed:', err);
    return res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
};

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
      'SELECT id, email, full_name, role, password_hash FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const row = result.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const user = toPublicUser(row);
    const token = signToken(user);
    setAuthCookie(res, token);
    return res.json({ token, user });
  } catch (err) {
    console.error('[auth/login] failed:', err);
    return res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
};

exports.me = async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const result = await pool.query(
    'SELECT id, email, full_name, role FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: toPublicUser(result.rows[0]) });
};

exports.logout = (_req, res) => {
  clearAuthCookie(res);
  return res.status(204).send();
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
        console.error('[auth/password-reset-status] Firebase Admin config failed:', err);
        return res.status(500).json({
          error:
            'Firebase Admin is not configured correctly on the API server. Check api/.env or api/firebase-service-account.json.',
        });
      }
      console.error('[auth/password-reset-status] Firebase lookup failed:', err);
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
    console.error('[auth/password-reset-status] failed:', err);
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
      console.warn('[auth/google] token verification failed:', err?.message);
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
      'SELECT id, email, full_name, role FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
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
         RETURNING id, email, full_name, role`,
        [normalizedEmail, passwordHash, fullName]
      );
      row = inserted.rows[0];
    }

    const user = toPublicUser(row);
    const token = signToken(user);
    setAuthCookie(res, token);
    return res.json({ token, user });
  } catch (err) {
    console.error('[auth/google] failed:', err);
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
      console.warn('[auth/firebase] token verification failed:', err?.code || err?.message);
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
      'SELECT id, email, full_name, role, firebase_uid FROM users WHERE firebase_uid = $1 LIMIT 1',
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
        'SELECT id, email, full_name, role FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
        [normalizedEmail]
      );
      if (byEmail.rowCount > 0) {
        row = byEmail.rows[0];
        await pool.query(
          'UPDATE users SET firebase_uid = $1, email_verified = $2 WHERE id = $3',
          [firebaseUid, emailVerified, row.id]
        );
      } else {
        // 3) Brand-new user — create one. password_hash is NULL because
        //    Firebase owns the password from now on.
        const inserted = await pool.query(
          `INSERT INTO users (email, password_hash, full_name, role, firebase_uid, email_verified)
           VALUES ($1, NULL, $2, 'user', $3, $4)
           RETURNING id, email, full_name, role`,
          [normalizedEmail, fullName, firebaseUid, emailVerified]
        );
        row = inserted.rows[0];
      }
    }

    const user = toPublicUser(row);
    const token = signToken(user);
    setAuthCookie(res, token);
    return res.json({ token, user, emailVerified });
  } catch (err) {
    console.error('[auth/firebase] failed:', err);
    return res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
};
