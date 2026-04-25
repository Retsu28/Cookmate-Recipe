const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { getJwtSecret, AUTH_COOKIE_NAME } = require('../middleware/requireAuth');

const SIGNUP_EMAIL_RE = /^[^\s@]+@gmail\.com$/i;
const LOGIN_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';
const JWT_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!SIGNUP_EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Email must be a @gmail.com address.' });
    }
    if (password.length < MIN_PASSWORD_LEN) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` });
    }
    const cleanName =
      typeof name === 'string' && name.trim() ? name.trim() : email.trim().split('@')[0];

    const normalizedEmail = email.trim().toLowerCase();
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
      return res.status(409).json({ error: 'An account with this email already exists.' });
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

    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
      'SELECT id, email, full_name, role, password_hash FROM users WHERE LOWER(email) = $1 LIMIT 1',
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
