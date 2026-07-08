import { useAppStore } from '@/shared/store/app.store';

// ─── Color Palettes ─────────────────────────────────────────────────────────

export const lightColors = {
  background: '#FFFFFF',
  foreground: '#09090B',
  surface: '#F4F4F5',
  surfaceHighlight: '#FAFAFA',
  border: '#A0A0A0',
  input: '#A0A0A0',
  ring: '#2563EB',
  primary: '#003399',
  primaryForeground: '#FFFFFF',
  secondary: '#F4F4F5',
  secondaryForeground: '#18181B',
  accent: '#2563EB',
  accentForeground: '#FFFFFF',
  muted: '#F4F4F5',
  mutedForeground: '#9E9E9E',
  destructive: '#D72222',
  destructiveForeground: '#FAFAFA',
  success: '#15803D',
  successForeground: '#FFFFFF',
  warning: '#B45309',
  warningForeground: '#FFFFFF',
  card: '#FFFFFF',
  cardForeground: '#09090B',
  popover: '#FFFFFF',
  popoverForeground: '#09090B',
} as const;

export const darkColors = {
  background: '#1E1E1E',
  foreground: '#D4D4D4',
  surface: '#252526',
  surfaceHighlight: '#2D2D2D',
  border: '#3E3E42',
  input: '#3C3C3C',
  ring: '#007ACC',
  primary: '#4D7FCC',
  primaryForeground: '#FFFFFF',
  secondary: '#2D2D2D',
  secondaryForeground: '#D4D4D4',
  accent: '#007ACC',
  accentForeground: '#FFFFFF',
  muted: '#2D2D2D',
  mutedForeground: '#858585',
  destructive: '#F44747',
  destructiveForeground: '#FFFFFF',
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#CCA700',
  warningForeground: '#FFFFFF',
  card: '#252526',
  cardForeground: '#D4D4D4',
  popover: '#252526',
  popoverForeground: '#D4D4D4',
} as const;

type ColorTokens = keyof typeof lightColors;
type Colors = Record<ColorTokens, string>;

// ─── Reactive Proxy ─────────────────────────────────────────────────────────

function currentPalette(): Colors {
  return useAppStore.getState().theme === 'dark' ? darkColors : lightColors;
}

// Proxy target is a spread of lightColors so that ownKeys/has/Object.keys work
// without custom traps. The get trap overrides all reads to be theme-aware.
export const colors: Colors = new Proxy({ ...lightColors }, {
  get(_target, prop: string | symbol): unknown {
    if (typeof prop === 'symbol') return undefined;
    const palette = currentPalette();
    if (prop in palette) {
      return palette[prop as keyof Colors];
    }
    return undefined;
  },
});

// ─── Typography ─────────────────────────────────────────────────────────────

export const typography = {
  fonts: {
    heading: 'Chivo',
    body: 'Inter',
    mono: 'JetBrainsMono',
  },
  scale: {
    h1: { fontSize: 36, fontWeight: '700' as const, letterSpacing: -0.5 },
    h2: { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.3 },
    h3: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
    small: { fontSize: 12, fontWeight: '400' as const },
    mono: { fontSize: 12, fontWeight: '400' as const },
  },
} as const;

// ─── Spacing ────────────────────────────────────────────────────────────────

export const spacing = {
  sectionGap: 48,
  componentGap: 24,
  internalPadding: 24,
} as const;

// ─── Border Radius ──────────────────────────────────────────────────────────

export const radius = {
  DEFAULT: 8,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ─── Theme Bundle ───────────────────────────────────────────────────────────

export const theme = {
  colors,
  typography,
  spacing,
  radius,
} as const;
