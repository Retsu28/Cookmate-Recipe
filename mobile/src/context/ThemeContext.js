import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { getColors } from '../theme';
import { getDynamicFontSizes } from '../theme/typography';

const STORAGE_KEY = 'cookmate.theme.mode';
const FONT_SIZE_KEY = 'cookmate:fontSize';
const ThemeContext = createContext(undefined);

function getSystemColorScheme() {
  return Appearance.getColorScheme() || 'light';
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('system');
  const [systemScheme, setSystemScheme] = useState(getSystemColorScheme());
  const [fontSize, setFontSize] = useState('medium');
  const [isReady, setIsReady] = useState(false);

  // Computed effective mode (resolved system preference)
  const effectiveMode = useMemo(() => {
    if (mode === 'system') {
      return systemScheme;
    }
    return mode;
  }, [mode, systemScheme]);

  // Load theme and font size from AsyncStorage
  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        const [storedMode, storedFontSize] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(FONT_SIZE_KEY),
        ]);
        
        if (active) {
          if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
            setMode(storedMode);
          }
          if (storedFontSize === 'small' || storedFontSize === 'medium' || storedFontSize === 'large') {
            setFontSize(storedFontSize);
          }
          setIsReady(true);
        }
      } catch {
        if (active) setIsReady(true);
      }
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || 'light');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const setTheme = useCallback(async (nextMode) => {
    if (nextMode !== 'light' && nextMode !== 'dark' && nextMode !== 'system') {
      return;
    }

    setMode(nextMode);

    try {
      // Persist under both keys so the Profile > Appearance UI
      // and any AuthThemeToggle stay in sync.
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY, nextMode),
        AsyncStorage.setItem('cookmate:theme', nextMode),
      ]);
    } catch {
    }
  }, []);

  const setFontSizePreference = useCallback(async (nextSize) => {
    if (nextSize !== 'small' && nextSize !== 'medium' && nextSize !== 'large') {
      return;
    }

    setFontSize(nextSize);

    try {
      await AsyncStorage.setItem(FONT_SIZE_KEY, nextSize);
    } catch {
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    // Toggle between light/dark, or switch from system to light
    let nextMode;
    if (mode === 'system') {
      nextMode = 'light';
    } else {
      nextMode = effectiveMode === 'dark' ? 'light' : 'dark';
    }
    await setTheme(nextMode);
  }, [mode, effectiveMode, setTheme]);

  const colors = useMemo(() => getColors(effectiveMode), [effectiveMode]);

  // Dynamic font sizes based on user preference
  const fontSizes = useMemo(() => getDynamicFontSizes(fontSize), [fontSize]);

  const navigationTheme = useMemo(() => {
    const base = effectiveMode === 'dark' ? DarkTheme : DefaultTheme;

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
  }, [colors, effectiveMode]);

  const value = useMemo(
    () => ({
      mode,                 // 'light' | 'dark' | 'system'
      effectiveMode,        // 'light' | 'dark' (resolved system preference)
      isDark: effectiveMode === 'dark',
      colors,
      fontSize,             // 'small' | 'medium' | 'large'
      fontSizes,            // Dynamic font size object { xs, sm, base, md, lg, xl, '2xl', '3xl' }
      setTheme,
      setFontSize: setFontSizePreference,
      toggleTheme,
      navigationTheme,
      isReady,
    }),
    [colors, effectiveMode, fontSize, fontSizes, isReady, mode, navigationTheme, setFontSizePreference, setTheme, toggleTheme]
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
