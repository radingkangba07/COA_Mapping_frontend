export const colors = {
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
} as const;

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

export const spacing = {
  sectionGap: 48,
  componentGap: 24,
  internalPadding: 24,
} as const;

export const radius = {
  DEFAULT: 8,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  radius,
} as const;
