export type PageToken = number | 'ellipsis';

/** `current`/return values are 0-indexed page numbers; `total` is page count. */
export function getPageNumbers(current: number, total: number): PageToken[] {
  if (total <= 1) return [];
  const p = current + 1; // 1-indexed current page
  const n = total;

  const merge = p >= n - 2;
  const windowStart = merge ? Math.max(1, n - 2) : p;
  const windowEnd = merge ? n : p + 2;

  const tokens: PageToken[] = [];
  if (windowStart === 2) {
    tokens.push(0); // page 1 is adjacent to the window — fold it in, no ellipsis needed
  } else if (windowStart > 2) {
    tokens.push(0, 'ellipsis');
  }
  for (let page = windowStart; page <= windowEnd; page++) tokens.push(page - 1);
  if (windowEnd < n) tokens.push('ellipsis', n - 1);
  return tokens;
}
