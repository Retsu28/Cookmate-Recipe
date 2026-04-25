import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostLoginSplash, setShowPostLoginSplash] = useState(false);

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
    try {
      await authService.logout();
      setUser(null);
      setShowPostLoginSplash(false);
    } catch (e) {
      console.error('Failed to clear user session', e);
    }
  };

  const finishPostLoginSplash = () => {
    setShowPostLoginSplash(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      isLoading, 
      login, 
      logout,
      showPostLoginSplash,
      finishPostLoginSplash,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
