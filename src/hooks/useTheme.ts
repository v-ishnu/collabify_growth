'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'cg-theme';

function applyDomTheme(value: ThemePreference) {
  if (typeof document === 'undefined') return;
  if (value === 'light' || value === 'dark') {
    document.documentElement.setAttribute('data-theme', value);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>('system');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeState(saved);
        applyDomTheme(saved);
      }
    } catch {
      // Ignore storage unavailability.
    }
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    applyDomTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage unavailability.
    }
  }, []);

  return { theme, setTheme };
}

