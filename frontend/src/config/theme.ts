import { useAppStore } from '@/shared/store/app.store';
import type { Theme } from '@/shared/store/app.store';

export type { Theme };

// ─── Color Palettes ─────────────────────────────────────────────────────────

export const lightColors = {
  background: '#FFFFFF',
  foreground: '#09090B',
  surface: '#F4F4F5',
  surfaceHighlight: '#FAFAFA',
  // Was '#A0A0A0' — didn't match this app's own `--color-border` Tailwind
  // token (`global.css`, light: `#E4E4E7`), which every `border-border`
  // className-based consumer already correctly resolves to. Only inline
  // `style={{ borderColor: colors.border }}` consumers (colors.* is a JS
  // proxy, not a CSS var, so Tailwind's token doesn't reach them) were
  // rendering the wrong, more-saturated gray — invisible in dark mode,
  // where this token already correctly matched `#3E3E42` either way.
  border: '#E4E4E7',
  input: '#A0A0A0',
  ring: '#2563EB',
  primary: '#003399',
  primaryForeground: '#FFFFFF',
  secondary: '#F4F4F5',
  secondaryForeground: '#18181B',
  accent: '#2563EB',
  accentForeground: '#FFFFFF',
  muted: '#F4F4F5',
  // Was '#9E9E9E' — same class of bug as `border` above: didn't match
  // this app's own `--color-muted-foreground` Tailwind token
  // (`global.css`, light: `#6B6B73`), so inline `style={{ color:
  // colors.mutedForeground }}` consumers rendered visibly lighter/grayer
  // text than a `text-muted-foreground` className consumer sitting right
  // next to them. Dark mode already matched (`#858585` either way).
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
  chip: '#DBEAFE',
  chipForeground: '#1D4ED8',
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
  chip: '#1E3A5F',
  chipForeground: '#93C5FD',
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

// ─── Shadows ────────────────────────────────────────────────────────────────

/** Soft card elevation — matches ScopeSectionCard on the New Project screen. */
export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
} as const;

// ─── Master-Data-Wizard Semantic States ─────────────────────────────────────
// State→{fg,bg} Tailwind className lookup for the wizard's four semantic
// families (impact/find/metricTone/prov). fg classes reuse the base color
// tokens above directly; bg classes use the tint tokens registered in
// tailwind.config.js/global.css. These are plain class name strings, not
// colors — the underlying CSS vars swap with the app's dark-mode class, so
// no `mode` argument is needed here.

export type SemanticFamily = 'impact' | 'find' | 'metricTone' | 'prov';

interface SemanticClassNames {
  fg: string;
  bg: string;
}

const SEMANTIC_CLASSES: Record<SemanticFamily, Record<string, SemanticClassNames>> = {
  impact: {
    blocker: { fg: 'text-destructive', bg: 'bg-impact-blocker' },
    review: { fg: 'text-warning', bg: 'bg-impact-review' },
    warning: { fg: 'text-accent', bg: 'bg-impact-warning' },
    clean: { fg: 'text-success', bg: 'bg-impact-clean' },
    resolved: { fg: 'text-success', bg: 'bg-impact-resolved' },
    na: { fg: 'text-muted-foreground', bg: 'bg-surface' },
  },
  find: {
    dup: { fg: 'text-destructive', bg: 'bg-find-dup' },
    warn: { fg: 'text-warning', bg: 'bg-find-warn' },
    info: { fg: 'text-accent', bg: 'bg-find-info' },
    ok: { fg: 'text-success', bg: 'bg-find-ok' },
  },
  metricTone: {
    blocker: { fg: 'text-destructive', bg: '' },
    warn: { fg: 'text-warning', bg: '' },
    neutral: { fg: 'text-foreground', bg: '' },
    ok: { fg: 'text-success', bg: '' },
    info: { fg: 'text-accent', bg: '' },
    muted: { fg: 'text-muted-foreground', bg: 'bg-surface' },
  },
  prov: {
    fact: { fg: 'text-muted-foreground', bg: 'bg-surface' },
    ai: { fg: 'text-accent', bg: '' },
    action: { fg: 'text-primary', bg: '' },
  },
};

/** Tailwind fg/bg classNames for a semantic state; throws on an unknown
 *  state — an unstyled severity is a bug, not a default. */
export function semanticClass(family: SemanticFamily, state: string): SemanticClassNames {
  const hit = SEMANTIC_CLASSES[family][state];
  if (!hit) throw new Error(`theme: unknown ${family} state "${state}"`);
  return hit;
}

// ─── Master-Data-Wizard Semantic Colours (raw hex) ──────────────────────────
// Ported 1:1 from the former dp-kit/native/dp-theme.ts (itself generated
// from css/dp-tokens.css) — needed by components that pass a colour into
// React Native's `style` prop directly (SVG fills, badgeTint/tint-derived
// backgrounds) rather than a NativeWind className, where semanticClass()
// above doesn't apply. If the taxonomy adds a state, add it to both this
// and SEMANTIC_CLASSES.

interface SemanticColorPair {
  fg: string;
  bg: string;
}

type SemanticColorTable = Record<SemanticFamily, Record<string, SemanticColorPair>>;

const semanticColorsLight: SemanticColorTable = {
  impact: {
    blocker: { fg: '#D72222', bg: 'rgba(215, 34, 34, 0.13)' },
    review: { fg: '#B45309', bg: 'rgba(180, 83, 9, 0.15)' },
    warning: { fg: '#2563EB', bg: 'rgba(37, 99, 235, 0.13)' },
    clean: { fg: '#15803D', bg: 'rgba(21, 128, 61, 0.13)' },
    resolved: { fg: '#15803D', bg: 'rgba(21, 128, 61, 0.13)' },
    na: { fg: '#71717A', bg: '#F4F4F5' },
  },
  find: {
    dup: { fg: '#D72222', bg: 'rgba(215, 34, 34, 0.12)' },
    warn: { fg: '#B45309', bg: 'rgba(180, 83, 9, 0.14)' },
    info: { fg: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' },
    ok: { fg: '#15803D', bg: 'rgba(21, 128, 61, 0.12)' },
  },
  metricTone: {
    blocker: { fg: '#D72222', bg: 'transparent' },
    warn: { fg: '#B45309', bg: 'transparent' },
    neutral: { fg: '#09090B', bg: 'transparent' },
    ok: { fg: '#15803D', bg: 'transparent' },
    info: { fg: '#2563EB', bg: 'transparent' },
    muted: { fg: '#71717A', bg: '#F4F4F5' },
  },
  prov: {
    fact: { fg: '#71717A', bg: '#F4F4F5' },
    ai: { fg: '#2563EB', bg: 'transparent' },
    action: { fg: '#003399', bg: 'transparent' },
  },
} as const;

const semanticColorsDark: SemanticColorTable = {
  impact: {
    blocker: { fg: '#F44747', bg: 'rgba(244, 71, 71, 0.13)' },
    review: { fg: '#CCA700', bg: 'rgba(204, 167, 0, 0.15)' },
    warning: { fg: '#007ACC', bg: 'rgba(0, 122, 204, 0.13)' },
    clean: { fg: '#22C55E', bg: 'rgba(34, 197, 94, 0.13)' },
    resolved: { fg: '#22C55E', bg: 'rgba(34, 197, 94, 0.13)' },
    na: { fg: '#858585', bg: '#252526' },
  },
  find: {
    dup: { fg: '#F44747', bg: 'rgba(244, 71, 71, 0.12)' },
    warn: { fg: '#CCA700', bg: 'rgba(204, 167, 0, 0.14)' },
    info: { fg: '#007ACC', bg: 'rgba(0, 122, 204, 0.12)' },
    ok: { fg: '#22C55E', bg: 'rgba(34, 197, 94, 0.12)' },
  },
  metricTone: {
    blocker: { fg: '#F44747', bg: 'transparent' },
    warn: { fg: '#CCA700', bg: 'transparent' },
    neutral: { fg: '#D4D4D4', bg: 'transparent' },
    ok: { fg: '#22C55E', bg: 'transparent' },
    info: { fg: '#007ACC', bg: 'transparent' },
    muted: { fg: '#858585', bg: '#252526' },
  },
  prov: {
    fact: { fg: '#858585', bg: '#252526' },
    ai: { fg: '#007ACC', bg: 'transparent' },
    action: { fg: '#4D7FCC', bg: 'transparent' },
  },
} as const;

const SEMANTIC_COLORS: Record<Theme, SemanticColorTable> = {
  light: semanticColorsLight,
  dark: semanticColorsDark,
};

/** Foreground/background hex pair for a semantic state, for RN inline
 *  `style` consumers where a Tailwind className (semanticClass() above)
 *  doesn't apply. Throws on an unknown state — an unstyled severity is a
 *  bug, not a default. */
export function semantic(family: SemanticFamily, state: string, mode: Theme = 'light'): SemanticColorPair {
  const hit = SEMANTIC_COLORS[mode][family][state];
  if (!hit) throw new Error(`theme: unknown ${family} state "${state}"`);
  return hit;
}

/** Tint used by count badges: the state's own ink at 13% opacity. */
export function badgeTint(fg: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(fg.replace('#', ''));
  if (!m || m[1] === undefined) return fg;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.13)`;
}

// ─── Theme Bundle ───────────────────────────────────────────────────────────

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  cardShadow,
} as const;
