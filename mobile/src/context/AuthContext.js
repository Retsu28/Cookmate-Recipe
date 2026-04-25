import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
    } catch (e) {
      console.error('Failed to store user session', e);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (e) {
      console.error('Failed to clear user session', e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      isLoading, 
      login, 
      logout,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
