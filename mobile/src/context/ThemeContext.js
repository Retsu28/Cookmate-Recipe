import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { getColors } from '../theme';

const STORAGE_KEY = 'cookmate.theme.mode';
const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && (stored === 'light' || stored === 'dark')) {
          setMode(stored);
        }
      } catch {
      } finally {
        if (active) {
          setIsReady(true);
        }
      }
    };

    loadTheme();

    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback(async (nextMode) => {
    if (nextMode !== 'light' && nextMode !== 'dark') {
      return;
    }

    setMode(nextMode);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    await setTheme(nextMode);
  }, [mode, setTheme]);

  const colors = useMemo(() => getColors(mode), [mode]);

  const navigationTheme = useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [colors, mode]);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      colors,
      setTheme,
      toggleTheme,
      navigationTheme,
      isReady,
    }),
    [colors, isReady, mode, navigationTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return ctx;
}

export default ThemeContext;
