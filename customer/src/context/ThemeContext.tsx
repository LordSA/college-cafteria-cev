'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'device' | 'dark' | 'light';
export type ActiveTheme = 'dark' | 'light';

interface ThemeContextType {
  themeMode: ThemeMode;
  activeTheme: ActiveTheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('device');
  const [systemIsDark, setSystemIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('cafeteria_theme_preference') as ThemeMode | null;
      if (stored === 'device' || stored === 'dark' || stored === 'light') {
        setThemeModeState(stored);
      }
    } catch {
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemIsDark(media.matches);

      const listener = (e: MediaQueryListEvent) => {
        setSystemIsDark(e.matches);
      };

      media.addEventListener('change', listener);
      return () => {
        media.removeEventListener('change', listener);
      };
    }

    return undefined;
  }, []);

  const activeTheme: ActiveTheme = themeMode === 'device' ? (systemIsDark ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return;
    const root = document.documentElement;
    if (activeTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [activeTheme, mounted]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem('cafeteria_theme_preference', mode);
    } catch {
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ themeMode, activeTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      themeMode: 'device' as ThemeMode,
      activeTheme: 'light' as ActiveTheme,
      setThemeMode: () => {},
    };
  }
  return context;
}
