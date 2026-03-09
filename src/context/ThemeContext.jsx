// ─────────────────────────────────────────────────────────────────
// BBA-Data – ThemeContext (Dark/Light mode)
// Conforme WCAG 2.1 AA pour l'accessibilité
// ─────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const ACCENT_COLORS = {
  blue:   { primary: '#3b82f6', hover: '#2563eb', light: '#eff6ff', ring: '#3b82f6' },
  violet: { primary: '#8b5cf6', hover: '#7c3aed', light: '#f5f3ff', ring: '#8b5cf6' },
  emerald:{ primary: '#10b981', hover: '#059669', light: '#ecfdf5', ring: '#10b981' },
  rose:   { primary: '#f43f5e', hover: '#e11d48', light: '#fff1f2', ring: '#f43f5e' },
  amber:  { primary: '#f59e0b', hover: '#d97706', light: '#fffbeb', ring: '#f59e0b' },
  cyan:   { primary: '#06b6d4', hover: '#0891b2', light: '#ecfeff', ring: '#06b6d4' },
};

// Full shade palettes for overriding Tailwind's blue-* classes globally
const ACCENT_PALETTES = {
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
    800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
  },
  violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
    400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
    800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065',
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
    400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
    800: '#065f46', 900: '#064e3b', 950: '#022c22',
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
    400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
    800: '#9f1239', 900: '#881337', 950: '#4c0519',
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
    400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
    800: '#92400e', 900: '#78350f', 950: '#451a03',
  },
  cyan: {
    50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
    400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
    800: '#155e75', 900: '#164e63', 950: '#083344',
  },
};

export { ACCENT_COLORS };

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bbadata-mode') || 'system';
    }
    return 'system';
  });

  const [accentColor, setAccentColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bbadata-accent') || 'blue';
    }
    return 'blue';
  });

  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bbadata-fontsize') || 'normal';
    }
    return 'normal';
  });

  // Resolve effective theme (light/dark) from mode
  const resolveTheme = useCallback((m) => {
    if (m === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return m;
  }, []);

  const [theme, setThemeState] = useState(() => resolveTheme(mode));

  // Apply dark/light class
  useEffect(() => {
    const root = document.documentElement;
    const resolved = resolveTheme(mode);
    setThemeState(resolved);

    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('bbadata-mode', mode);
  }, [mode, resolveTheme]);

  // Listen for OS theme changes when in system mode
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = resolveTheme('system');
      setThemeState(resolved);
      const root = document.documentElement;
      resolved === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, resolveTheme]);

  // Apply accent color CSS variables (both custom + override Tailwind blue-*)
  useEffect(() => {
    const root = document.documentElement;
    const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;
    const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.blue;

    root.style.setProperty('--accent-primary', colors.primary);
    root.style.setProperty('--accent-hover', colors.hover);
    root.style.setProperty('--accent-light', colors.light);
    root.style.setProperty('--accent-ring', colors.ring);

    // Override Tailwind blue-* shades so all blue-* classes follow the accent
    for (const [shade, hex] of Object.entries(palette)) {
      root.style.setProperty(`--accent-blue-${shade}`, hex);
    }

    localStorage.setItem('bbadata-accent', accentColor);
  }, [accentColor]);

  // Apply font size
  useEffect(() => {
    const root = document.documentElement;
    const sizes = { small: '14px', normal: '16px', large: '18px' };
    root.style.fontSize = sizes[fontSize] || '16px';
    localStorage.setItem('bbadata-fontsize', fontSize);
  }, [fontSize]);

  const toggleTheme = () => setMode((m) => {
    if (m === 'light') return 'dark';
    if (m === 'dark') return 'system';
    return 'light'; // system → light
  });

  return (
    <ThemeContext.Provider value={{
      theme, mode, setMode, toggleTheme,
      accentColor, setAccentColor,
      fontSize, setFontSize,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
