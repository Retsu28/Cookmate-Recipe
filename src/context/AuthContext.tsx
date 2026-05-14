import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, type AuthUser } from '@/services/authService';
import settingsService from '@/services/settingsService';

/* ------------------------------------------------------------------ */
/*  Restore saved appearance (theme + fontSize) from the API into      */
/*  localStorage + DOM so every page — including Onboarding — uses     */
/*  the user's preferences even after a cache clear.                   */
/* ------------------------------------------------------------------ */
async function restoreAppearance(userId: number) {
  try {
    const prefs = await settingsService.getSettings(String(userId), 'appearance');
    const theme = typeof prefs?.theme === 'string' ? prefs.theme : null;
    const fontSize = typeof prefs?.fontSize === 'string' ? prefs.fontSize : null;
    if (theme) {
      localStorage.setItem('cookmate:theme', theme);
      document.documentElement.classList.remove('light', 'dark');
      if (theme === 'dark') document.documentElement.classList.add('dark');
      else if (theme === 'light') document.documentElement.classList.add('light');
    }
    if (fontSize) {
      localStorage.setItem('cookmate:fontSize', fontSize);
      document.documentElement.setAttribute('data-font-size', fontSize);
    }
  } catch {
    /* network error — keep whatever is already in localStorage */
  }
}

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
  loginWithGoogle: (credential: string) => Promise<AuthUser>;
  loginWithSession: (user: AuthUser, token: string) => void;
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
        if (fresh) {
          setUser(fresh);
          if (fresh.id) restoreAppearance(fresh.id);
        } else if (cached) setUser(null);
      })
      .catch(() => {
        /* network error: keep cached user so offline reads still work */
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        authService.me().then((fresh) => {
          if (fresh) setUser(fresh);
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setUser(res.user);
    if (res.user.id) restoreAppearance(res.user.id);
    setShowPostLoginSplash(true);
    return res.user;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await authService.signup(name, email, password);
    setUser(res.user);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await authService.googleLogin(credential);
    setUser(res.user);
    if (res.user.id) restoreAppearance(res.user.id);
    setShowPostLoginSplash(true);
    return res.user;
  }, []);

  const loginWithSession = useCallback((sessionUser: AuthUser, token: string) => {
    try {
      localStorage.setItem('cookmate.auth.token', token);
      localStorage.setItem('cookmate.auth.user', JSON.stringify(sessionUser));
    } catch { /* noop */ }
    setUser(sessionUser);
    if (sessionUser.id) restoreAppearance(sessionUser.id);
    setShowPostLoginSplash(true);
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
      loginWithGoogle,
      loginWithSession,
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
      loginWithGoogle,
      loginWithSession,
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
