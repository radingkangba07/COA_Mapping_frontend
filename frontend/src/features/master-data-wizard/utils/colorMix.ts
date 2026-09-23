/**
 * Percentage-tinted `rgba(...)` string for a token-derived hex colour —
 * the same computation `config/theme.ts`'s `badgeTint()` does, but with a
 * configurable percentage instead of a fixed 13%. The reference specifies a
 * different tint percentage per element (8%, 9%, 10%, 12%, 13%, 14% all
 * appear across this screen) — this lets each consumer ask for its own
 * literal reference value instead of every tinted surface sharing
 * `badgeTint`'s one fixed number. Still never hardcodes a colour itself:
 * the hex always comes from the caller (`colors.*`/`semantic()`), this only
 * computes the alpha mix.
 */
export function tint(hex: string, percent: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.replace('#', ''));
  if (!m || m[1] === undefined) return hex;
  const n = parseInt(m[1], 16);
  const alpha = percent / 100;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Opaque RGB blend of two hex colours — `baseHex` shifted `alpha` of the
 * way toward `tintHex`. Shared by `FieldsTable.tsx` (row highlight tint,
 * and darkening the header text a step past `mutedForeground` — the
 * reference's own literal `color:var(--muted)` reads too light against
 * this app's actual muted value at typical zoom, per explicit user
 * request) and `MappingTableHeader.tsx` (same header-text darkening, kept
 * identical between the two tables by sharing this one definition rather
 * than each maintaining its own copy).
 */
export function mixHex(baseHex: string, tintHex: string, alpha: number): string {
  const parse = (hex: string): readonly [number, number, number] | null => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.replace('#', ''));
    if (!m || m[1] === undefined) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const base = parse(baseHex);
  const tintRgb = parse(tintHex);
  if (!base || !tintRgb) return baseHex;
  const [baseR, baseG, baseB] = base;
  const [tintR, tintG, tintB] = tintRgb;
  const mix = (b: number, t: number) => Math.round(b * (1 - alpha) + t * alpha);
  return `rgb(${mix(baseR, tintR)}, ${mix(baseG, tintG)}, ${mix(baseB, tintB)})`;
}
