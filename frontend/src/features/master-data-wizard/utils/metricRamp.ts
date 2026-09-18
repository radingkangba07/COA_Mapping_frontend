/**
 * Deliberate, narrowly-scoped exception to the "colour only via semantic()"
 * rule — approved for the Null Rows / Confidence pills only (2026-08-24).
 *
 * The reference (source-data-profile.page.html, renderVals()/chip()) colours
 * these two pills with a continuous OKLCH gradient driven directly by the
 * numeric value, not a discrete taxonomy state — there is no `semantic()`
 * equivalent for "a colour that is a function of an arbitrary 0-100 number".
 * dp-theme.ts is generated from dp-taxonomies.json's fixed enums and is
 * read-only, so a continuous ramp cannot be added there; this file exists
 * instead of hand-editing it. It should be folded into the generated theme
 * once INTEGRATION.md §7 / DA-334 gets a real sign-off on a ramp capability —
 * until then this is the only place in the wizard allowed to compute a raw
 * colour outside semantic().
 *
 * Formulas below are copied exactly from the reference's own chip()/nullChip
 * logic, only translated from CSS oklch() (which iOS/Android cannot parse —
 * only RN-Web's browser layer understands it) into real sRGB via the
 * standard OKLab conversion (Björn Ottosson / CSS Color 4 spec), so the same
 * two gradient stops render identically on native and web.
 */

interface RampColors {
  readonly start: string;
  readonly end: string;
  readonly fg: string;
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** OKLCH -> sRGB, returned as "rgb(r, g, b)". */
function oklch(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (c: number): number => {
    const clamped = clamp01(c);
    const v = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(clamp01(v) * 255);
  };

  return `rgb(${toSrgb(rLin)}, ${toSrgb(gLin)}, ${toSrgb(bLin)})`;
}

/** Confidence pill — hue 255 (blue), matches reference's chip(v, 255). */
export function confidenceRamp(confidence: number | undefined): RampColors {
  const t = clamp01((confidence ?? 0) / 100);
  const L = 0.93 - t * 0.52;
  const L2 = L - 0.07;
  const C = 0.018 + t * 0.135;
  return {
    start: oklch(L, C, 255),
    end: oklch(L2, C, 255),
    fg: L < 0.62 ? '#ffffff' : '#ffffff',
  };
}

/** Null Rows pill — hue 62 (brown), matches reference's nullChip. */
export function nullRowsRamp(nullCount: number, rowCount: number): RampColors {
  const nullPct = rowCount > 0 ? (nullCount / rowCount) * 100 : 0;
  const t = clamp01(nullPct / 100);
  const L = 0.58 - t * 0.26;
  const C = 0.05 + t * 0.05;
  return {
    start: oklch(L, C, 62),
    end: oklch(L - 0.07, C, 62),
    fg: '#ffffff',
  };
}
