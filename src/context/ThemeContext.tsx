'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export type UiPreset = 'bento-clean' | 'warm-paper' | 'glass-teal' | 'neu-classic';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  uiPreset: UiPreset;
  setUiPreset: (preset: UiPreset) => void;
}

const VALID_PRESETS: UiPreset[] = ['bento-clean', 'warm-paper', 'glass-teal', 'neu-classic'];

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  uiPreset: 'bento-clean',
  setUiPreset: () => {},
});

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  defaultPreset = 'bento-clean',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultPreset?: UiPreset;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [uiPreset, setUiPresetState] = useState<UiPreset>(defaultPreset);

  useEffect(() => {
    // Check localStorage for an explicit user preference; default strictly to 'light'
    const savedTheme = localStorage.getItem('sipjam_theme') as Theme | null;
    if (savedTheme === 'dark') {
      setThemeState('dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      // Default to light mode (ignore OS dark mode preference per requirement)
      setThemeState('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }

    const savedPreset = localStorage.getItem('sipjam_ui_preset') as UiPreset | null;
    const activePreset = savedPreset && VALID_PRESETS.includes(savedPreset) ? savedPreset : defaultPreset;
    setUiPresetState(activePreset);
    document.documentElement.dataset.uiPreset = activePreset;
  }, [defaultPreset]);

  const setUiPreset = (nextPreset: UiPreset) => {
    setUiPresetState(nextPreset);
    document.documentElement.dataset.uiPreset = nextPreset;
    localStorage.setItem('sipjam_ui_preset', nextPreset);
  };

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setThemeState(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('sipjam_theme', nextTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('sipjam_theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, uiPreset, setUiPreset }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
