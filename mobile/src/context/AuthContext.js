import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostLoginSplash, setShowPostLoginSplash] = useState(false);
  const [showLogoutSplash, setShowLogoutSplash] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      let cachedUser = null;
      try {
        cachedUser = await authService.getCurrentUser();
        if (cachedUser) {
          setUser(cachedUser);
        }

        const freshUser = await authService.me();
        if (freshUser) {
          setUser(freshUser);
        } else if (cachedUser) {
          setUser(null);
        }
      } catch (e) {
        console.error('Failed to load session', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = async (nextUser) => {
    try {
      setUser(nextUser);
      setShowPostLoginSplash(true);
    } catch (e) {
      console.error('Failed to store user session', e);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    setShowLogoutSplash(true);
    try {
      await authService.logout();
    } catch (e) {
      console.error('Failed to clear user session', e);
    } finally {
      setUser(null);
      setShowPostLoginSplash(false);
      setIsLoggingOut(false);
    }
  };

  const refreshUser = async () => {
    const freshUser = await authService.me();
    setUser(freshUser);
    return freshUser;
  };

  const finishPostLoginSplash = () => {
    setShowPostLoginSplash(false);
  };

  const finishLogoutSplash = () => {
    setShowLogoutSplash(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      isLoading, 
      login, 
      logout,
      refreshUser,
      showPostLoginSplash,
      showLogoutSplash,
      isLoggingOut,
      finishPostLoginSplash,
      finishLogoutSplash,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
