/**
 * Percentage-tinted `rgba(...)` string for a token-derived hex colour —
 * the same computation `dp-kit/native/dp-theme.ts`'s `badgeTint()` does,
 * but with a configurable percentage instead of a fixed 13%. `dp-theme.ts`
 * is generated and read-only (see CLAUDE.md's dp-kit rules), and the
 * reference specifies a different tint percentage per element (8%, 9%,
 * 10%, 12%, 13%, 14% all appear across this screen) — this lets each
 * consumer ask for its own literal reference value instead of every
 * tinted surface sharing `badgeTint`'s one fixed number. Still never
 * hardcodes a colour itself: the hex always comes from the caller
 * (`colors.*`/`semantic()`), this only computes the alpha mix.
 */
export function tint(hex: string, percent: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.replace('#', ''));
  if (!m || m[1] === undefined) return hex;
  const n = parseInt(m[1], 16);
  const alpha = percent / 100;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
