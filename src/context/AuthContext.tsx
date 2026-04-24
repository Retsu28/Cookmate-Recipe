import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, type AuthUser } from '@/services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Hydrate from the cached user so the UI renders immediately on reload,
    // then refresh from PostgreSQL via /api/auth/me so the display name always
    // reflects the latest full_name stored in the database.
    const cached = authService.getCurrentUser();
    setUser(cached);

    let cancelled = false;
    authService
      .me()
      .then((fresh) => {
        if (cancelled) return;
        if (fresh) setUser(fresh);
        else if (cached) setUser(null); // token rejected by server
      })
      .catch(() => {
        /* network error — keep cached user so offline reads still work */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setUser(res.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await authService.signup(name, email, password);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, login, signup, logout }),
    [user, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
