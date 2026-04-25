import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, type AuthUser } from '@/services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  showPostLoginSplash: boolean;
  showLogoutSplash: boolean;
  isLoggingOut: boolean;
  finishPostLoginSplash: () => void;
  finishLogoutSplash: () => void;
  refreshUser: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostLoginSplash, setShowPostLoginSplash] = useState(false);
  const [showLogoutSplash, setShowLogoutSplash] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const cached = authService.getCurrentUser();
    setUser(cached);

    let cancelled = false;
    authService
      .me()
      .then((fresh) => {
        if (cancelled) return;
        if (fresh) setUser(fresh);
        else if (cached) setUser(null);
      })
      .catch(() => {
        /* network error: keep cached user so offline reads still work */
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setUser(res.user);
    setShowPostLoginSplash(true);
    return res.user;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await authService.signup(name, email, password);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    setShowLogoutSplash(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setShowPostLoginSplash(false);
      setIsLoggingOut(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await authService.me();
    setUser(fresh);
    return fresh;
  }, []);

  const finishPostLoginSplash = useCallback(() => {
    setShowPostLoginSplash(false);
  }, []);

  const finishLogoutSplash = useCallback(() => {
    setShowLogoutSplash(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      showPostLoginSplash,
      showLogoutSplash,
      isLoggingOut,
      finishPostLoginSplash,
      finishLogoutSplash,
      refreshUser,
      login,
      signup,
      logout,
    }),
    [
      user,
      isLoading,
      showPostLoginSplash,
      showLogoutSplash,
      isLoggingOut,
      finishPostLoginSplash,
      finishLogoutSplash,
      refreshUser,
      login,
      signup,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
