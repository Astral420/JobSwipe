/**
 * theme.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all colours used across (tabs).
 *
 * HOW TO SWITCH MODES
 * ───────────────────
 * Option A – manual toggle (e.g. a Settings switch):
 *   import { setThemeMode } from '@/theme';
 *   setThemeMode('light');   // or 'dark'
 *
 * Option B – follow the device's system preference automatically:
 *   In your root component (_layout.tsx or App.tsx) add:
 *
 *     import { useColorScheme } from 'react-native';
 *     import { setThemeMode } from '@/theme';
 *
 *     export default function RootLayout() {
 *       const scheme = useColorScheme();          // 'light' | 'dark' | null
 *       setThemeMode(scheme === 'light' ? 'light' : 'dark');
 *       ...
 *     }
 *
 * Option C – React hook (re-renders consumers automatically):
 *   import { useTheme } from '@/theme';
 *   const T = useTheme();
 *
 * All three options share the same token names so no other file needs editing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';

// ─── Token definitions ────────────────────────────────────────────────────────

export type ThemeTokens = {
  // Backgrounds
  bg:          string;   // page background
  surface:     string;   // card / input background
  surfaceHigh: string;   // slightly elevated surface (nested cards, chips)

  // Borders
  border:      string;   // default border (with colour tint)
  borderFaint: string;   // very subtle divider

  // Brand / accent
  primary:     string;   // purple accent
  primaryDark: string;   // darker purple (pressed states, gradients)
  pink:        string;   // secondary accent (hot-pink / rose)

  // Semantic colours  (same in both modes)
  success:      string;
  successLight: string;
  warning:      string;
  warningLight: string;
  danger:       string;
  dangerBg:     string;
  gold:         string;

  // Text
  textPrimary: string;
  textSub:     string;   // secondary / muted text
  textHint:    string;   // placeholders, timestamps

  // Misc
  white:       string;
  tabActive:   string;   // bottom-tab active icon/label
  tabInactive: string;   // bottom-tab inactive icon/label
  tabBar:      string;   // bottom-tab bar background
};

// ─── Dark palette ─────────────────────────────────────────────────────────────
const dark: ThemeTokens = {
  bg:           '#0f0a1e',
  surface:      '#16102a',
  surfaceHigh:  '#1e1535',

  border:       'rgba(168,85,247,0.18)',
  borderFaint:  'rgba(255,255,255,0.07)',

  primary:      '#a855f7',
  primaryDark:  '#7c3aed',
  pink:         '#ec4899',

  success:      '#22c55e',
  successLight: 'rgba(34,197,94,0.12)',
  warning:      '#f59e0b',
  warningLight: 'rgba(245,158,11,0.12)',
  danger:       '#f87171',
  dangerBg:     'rgba(239,68,68,0.08)',
  gold:         '#f59e0b',

  textPrimary:  '#ffffff',
  textSub:      'rgba(255,255,255,0.55)',
  textHint:     'rgba(255,255,255,0.35)',

  white:        '#ffffff',
  tabActive:    '#e91e8c',
  tabInactive:  'rgba(255,255,255,0.38)',
  tabBar:       '#130d22',
};

// ─── Light palette ────────────────────────────────────────────────────────────
const light: ThemeTokens = {
  bg:           '#f5f3ff',
  surface:      '#ffffff',
  surfaceHigh:  '#ede9fe',

  border:       'rgba(139,92,246,0.22)',
  borderFaint:  'rgba(0,0,0,0.07)',

  primary:      '#7c3aed',
  primaryDark:  '#5b21b6',
  pink:         '#db2777',

  success:      '#16a34a',
  successLight: 'rgba(22,163,74,0.10)',
  warning:      '#d97706',
  warningLight: 'rgba(217,119,6,0.10)',
  danger:       '#dc2626',
  dangerBg:     'rgba(220,38,38,0.07)',
  gold:         '#d97706',

  textPrimary:  '#1e1035',
  textSub:      'rgba(30,16,53,0.55)',
  textHint:     'rgba(30,16,53,0.38)',

  white:        '#ffffff',
  tabActive:    '#7c3aed',
  tabInactive:  'rgba(30,16,53,0.38)',
  tabBar:       '#ffffff',
};

// ─── Runtime state ────────────────────────────────────────────────────────────
export type ThemeMode = 'dark' | 'light';

let _mode: ThemeMode = 'light';
let _listeners: Array<() => void> = [];

/**
 * Imperatively switch the theme for all consumers.
 * Call from a Settings toggle or from a useColorScheme() effect.
 */
export function setThemeMode(mode: ThemeMode) {
  if (mode === _mode) return;
  _mode = mode;
  _listeners.forEach(fn => fn());
}

export function getThemeMode(): ThemeMode {
  return _mode;
}

/**
 * Returns the current theme tokens object.
 * Use this in StyleSheet.create() calls that live outside a component
 * (e.g. module-level `const s = StyleSheet.create(...)`).
 *
 * NOTE: module-level StyleSheets are computed once at import time.
 * If you need styles to react to theme changes at runtime, use the
 * `useTheme()` hook inside your component and apply styles inline.
 */
export function getTheme(): ThemeTokens {
  return _mode === 'light' ? light : dark;
}

/**
 * React hook — returns live theme tokens and re-renders the component
 * whenever setThemeMode() is called.
 */
export function useTheme(): ThemeTokens {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender(n => n + 1);
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter(l => l !== listener);
    };
  }, []);

  return _mode === 'light' ? light : dark;
}

// ─── Default export (light theme snapshot — useful for quick compat) ──────────
export default light as ThemeTokens;
