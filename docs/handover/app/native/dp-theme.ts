/* ============================================================================
   dp-theme.ts  ·  GENERATED from css/dp-tokens.css — do not hand-edit
   ----------------------------------------------------------------------------
   Regenerate:  python3 build/gen_native_theme.py

   REACT NATIVE / EXPO consumers only. The web CSS files cannot be imported in
   React Native, so this module carries the SAME palettes and the SAME semantic
   state -> colour mapping as dp-semantics.css, with color-mix() precomputed.

   THE RULE IS UNCHANGED: components declare MEANING, never colour.

       <Badge {...semantic('impact', 'blocker', theme)}>2 blockers</Badge>   ✓
       <Badge color="#D72222">                                               ✗

   If a state you need is missing here, it is missing from the taxonomy —
   add it there (config/dp-taxonomies.json + dp-semantics.css), regenerate,
   and both web and native pick it up. Never add a one-off colour locally.
   ========================================================================= */

const light = {
  palette: {
    bg: '#FFFFFF',
    fg: '#09090B',
    surface: '#F4F4F5',
    surfaceHi: '#FAFAFA',
    border: '#E4E4E7',
    muted: '#71717A',
    card: '#FFFFFF',
    primary: '#003399',
    primaryFg: '#FFFFFF',
    accent: '#2563EB',
    chip: '#DBEAFE',
    chipFg: '#1D4ED8',
    success: '#15803D',
    warning: '#B45309',
    error: '#D72222',
  },
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

const dark = {
  palette: {
    bg: '#1E1E1E',
    fg: '#D4D4D4',
    surface: '#252526',
    surfaceHi: '#2D2D2D',
    border: '#3E3E42',
    muted: '#858585',
    card: '#252526',
    primary: '#4D7FCC',
    accent: '#007ACC',
    chip: '#1E3A5F',
    chipFg: '#93C5FD',
    success: '#22C55E',
    warning: '#CCA700',
    error: '#F44747',
  },
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

export const dpTheme = { light, dark } as const;

export type DpThemeMode = keyof typeof dpTheme;
export type SemanticFamily = 'impact' | 'find' | 'metricTone' | 'prov';

/** Foreground/background pair for a semantic state. Unknown states throw:
 *  an unstyled severity is a bug, not a default. */
export function semantic(
  family: SemanticFamily,
  state: string,
  mode: DpThemeMode = 'light',
): { fg: string; bg: string } {
  const fam = dpTheme[mode][family] as Record<string, { fg: string; bg: string }>;
  const hit = fam[state];
  if (!hit) throw new Error(`dp-theme: unknown ${family} state "${state}"`);
  return hit;
}

/** Tint used by count badges (data-badge="true" on the web): the state's own
 *  ink at 13%. */
export function badgeTint(fg: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(fg.replace('#', ''));
  if (!m) return fg;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.13)`;
}
