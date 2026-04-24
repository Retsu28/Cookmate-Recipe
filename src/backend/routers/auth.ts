/**
 * CookMate — Authentication router.
 *
 * Real endpoints that talk to PostgreSQL:
 *   POST /api/auth/signup  -> inserts into `users` and returns { token, user }
 *   POST /api/auth/login   -> verifies password and returns { token, user }
 *   GET  /api/auth/me      -> returns the authenticated user from the JWT
 *
 * Security:
 *  - Passwords are hashed with bcryptjs (10 salt rounds).
 *  - JWT secret is read from process.env.JWT_SECRET (see .env.example).
 *  - Public signup email must end with @gmail.com (per product requirement).
 *  - Login accepts any valid email so seeded system accounts can sign in.
 *  - Password must be at least 8 characters.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

const router = Router();

const SIGNUP_EMAIL_RE = /^[^\s@]+@gmail\.com$/i;
const LOGIN_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';
const JWT_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const AUTH_COOKIE_NAME = 'cookmate.auth.token';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    // Fail loudly in dev so the developer sets a proper secret.
    throw new Error(
      'JWT_SECRET is missing or too short. Set it in your .env file (see .env.example).'
    );
  }
  return secret;
}

interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

function toPublicUser(row: {
  id: number;
  email: string;
  full_name: string | null;
  role?: string | null;
}): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.full_name || row.email.split('@')[0],
    role: row.role === 'admin' ? 'admin' : 'user',
  };
}

function signToken(user: PublicUser): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export interface AuthTokenPayload {
  sub: string | number;
  email?: string;
  role?: string;
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret()) as unknown as AuthTokenPayload;
}

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: JWT_COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

// ---------- POST /api/auth/signup ----------
router.post('/signup', async (req: Request, res: Response) => {
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
  } catch (err: unknown) {
    // Unique violation on email
    const pgErr = err as { code?: string };
    if (pgErr?.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('[auth/signup] failed:', err);
    return res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

// ---------- POST /api/auth/login ----------
router.post('/login', async (req: Request, res: Response) => {
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

    const row = result.rows[0] as {
      id: number;
      email: string;
      full_name: string | null;
      role: string | null;
      password_hash: string;
    };
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
});

// ---------- GET /api/auth/me ----------
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[AUTH_COOKIE_NAME];
  const token = match?.[1] || cookieToken;
  if (!token) return res.status(401).json({ error: 'Missing auth token.' });
  try {
    const payload = verifyAuthToken(token);
    (req as Request & { userId?: number }).userId = Number(payload.sub);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: number }).userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });
  const result = await pool.query(
    'SELECT id, email, full_name, role FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: toPublicUser(result.rows[0]) });
});

router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.status(204).send();
});

export default router;
