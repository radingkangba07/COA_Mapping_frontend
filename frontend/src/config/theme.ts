import { useAppStore } from '@/shared/store/app.store';

// ─── Color Palettes ─────────────────────────────────────────────────────────

export const lightColors = {
  background: '#FFFFFF',
  foreground: '#09090B',
  surface: '#F4F4F5',
  surfaceHighlight: '#FAFAFA',
  border: '#E4E4E7',
  input: '#E4E4E7',
  ring: '#2563EB',
  primary: '#18181B',
  primaryForeground: '#FAFAFA',
  secondary: '#F4F4F5',
  secondaryForeground: '#18181B',
  accent: '#2563EB',
  accentForeground: '#FFFFFF',
  muted: '#F4F4F5',
  mutedForeground: '#6B6B73',
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
  background: '#0B1120',
  foreground: '#F0F0F3',
  surface: '#1E293B',
  surfaceHighlight: '#263348',
  border: '#334155',
  input: '#334155',
  ring: '#2563EB',
  primary: '#F0F0F3',
  primaryForeground: '#0B1120',
  secondary: '#1E293B',
  secondaryForeground: '#F0F0F3',
  accent: '#2563EB',
  accentForeground: '#FFFFFF',
  muted: '#1E293B',
  mutedForeground: '#94A3B8',
  destructive: '#EF4444',
  destructiveForeground: '#FAFAFA',
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  card: '#161E30',
  cardForeground: '#F0F0F3',
  popover: '#161E30',
  popoverForeground: '#F0F0F3',
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
