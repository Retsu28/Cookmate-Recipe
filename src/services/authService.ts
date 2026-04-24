/**
 * CookMate authentication service (Web).
 *
 * Calls the real Express backend in `src/backend/routers/auth.ts`,
 * which persists users in PostgreSQL (users table).
 *
 * Storage:
 *  - The JWT is kept in localStorage for now so the SPA can read it
 *    across reloads. This is still a compromise; for production,
 *    prefer an httpOnly cookie set by the server. Swap is isolated to
 *    this file plus the AuthContext.
 */

const AUTH_TOKEN_KEY = 'cookmate.auth.token';
const AUTH_USER_KEY = 'cookmate.auth.user';

export interface AuthUser {
  id?: number;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

function persist(result: AuthResult) {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
  } catch {
    /* storage unavailable — ignore */
  }
}

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await parseJsonOrThrow(res)) as AuthResult;
    persist(data);
    return data;
  },

  async signup(name: string, email: string, password: string): Promise<AuthResult> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = (await parseJsonOrThrow(res)) as AuthResult;
    persist(data);
    return data;
  },

  async logout(): Promise<void> {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {
      /* ignore */
    }
  },

  /**
   * Fetch the authenticated user from PostgreSQL via GET /api/auth/me.
   *
   * Keeps the cached user in localStorage in sync with whatever the
   * database currently holds (e.g. if the full_name was updated). Throws
   * on network errors so callers can decide whether to clear the session
   * on 401 / 404 responses.
   */
  async me(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 404) {
      // Stale / invalid session — drop it so the app returns to login.
      await this.logout();
      return null;
    }

    const data = (await parseJsonOrThrow(res)) as { user: AuthUser };
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    } catch {
      /* storage unavailable — ignore */
    }
    return data.user;
  },

  getCurrentUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
};

export default authService;
