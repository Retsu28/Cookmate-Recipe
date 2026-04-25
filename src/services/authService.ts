/**
 * CookMate authentication service (Web).
 *
 * Calls the Express API backend via the centralized api client.
 * The API base URL is controlled by VITE_API_BASE_URL.
 *
 * Storage:
 *  - The JWT is kept in localStorage for now so the SPA can read it
 *    across reloads. This is still a compromise; for production,
 *    prefer an httpOnly cookie set by the server. Swap is isolated to
 *    this file plus the AuthContext.
 */

import api from '@/services/api';

const AUTH_TOKEN_KEY = 'cookmate.auth.token';
const AUTH_USER_KEY = 'cookmate.auth.user';
const ADMIN_EMAIL = 'admin@cookmate.com';

export interface AuthUser {
  id?: number;
  name: string;
  email: string;
  role?: 'user' | 'admin';
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return user?.role === 'admin' || user?.email?.trim().toLowerCase() === ADMIN_EMAIL;
}

function normalizeUser(user: AuthUser): AuthUser {
  return isAdminUser(user) ? { ...user, role: 'admin' } : user;
}

function persist(result: AuthResult) {
  const user = normalizeUser(result.user);
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable — ignore */
  }
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    const data = await api.post<AuthResult>('/api/auth/login', { email, password });
    const result = { ...data, user: normalizeUser(data.user) };
    persist(result);
    return result;
  },

  async signup(name: string, email: string, password: string): Promise<AuthResult> {
    const data = await api.post<AuthResult>('/api/auth/signup', { name, email, password });
    const result = { ...data, user: normalizeUser(data.user) };
    persist(result);
    return result;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* network unavailable: still clear local state */
    }

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
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const data = await api.get<{ user: AuthUser }>('/api/auth/me', headers);
      const user = normalizeUser(data.user);
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } catch {
        /* storage unavailable — ignore */
      }
      return user;
    } catch (err) {
      // Stale / invalid session — drop it so the app returns to login.
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('404'))) {
        await this.logout();
        return null;
      }
      throw err;
    }
  },

  getCurrentUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? normalizeUser(JSON.parse(raw) as AuthUser) : null;
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
