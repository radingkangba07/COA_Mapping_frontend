import { getPageNumbers, type PageToken } from '@/shared/utils/pagination.utils';

describe('getPageNumbers', () => {
  it('returns empty for a single page or none', () => {
    expect(getPageNumbers(0, 1)).toEqual([]);
    expect(getPageNumbers(0, 0)).toEqual([]);
  });

  it('walks the 10-page sequence: window of 3, page 1 always reachable, last always visible', () => {
    expect(getPageNumbers(0, 10)).toEqual([0, 1, 2, 'ellipsis', 9]); // page 1: 1 2 3 … 10
    expect(getPageNumbers(1, 10)).toEqual([0, 1, 2, 3, 'ellipsis', 9]); // page 2: 1 2 3 4 … 10 (page 1 folded in, adjacent)
    expect(getPageNumbers(2, 10)).toEqual([0, 'ellipsis', 2, 3, 4, 'ellipsis', 9]); // page 3: 1 … 3 4 5 … 10
    expect(getPageNumbers(3, 10)).toEqual([0, 'ellipsis', 3, 4, 5, 'ellipsis', 9]); // page 4: 1 … 4 5 6 … 10
    expect(getPageNumbers(4, 10)).toEqual([0, 'ellipsis', 4, 5, 6, 'ellipsis', 9]); // page 5: 1 … 5 6 7 … 10
  });

  it('plateaus on the last three pages once the window reaches the end', () => {
    expect(getPageNumbers(7, 10)).toEqual([0, 'ellipsis', 7, 8, 9]); // page 8: 1 … 8 9 10
    expect(getPageNumbers(8, 10)).toEqual([0, 'ellipsis', 7, 8, 9]); // page 9: 1 … 8 9 10
    expect(getPageNumbers(9, 10)).toEqual([0, 'ellipsis', 7, 8, 9]); // page 10: 1 … 8 9 10
  });

  it('shows every page plainly for very small totals', () => {
    expect(getPageNumbers(0, 2)).toEqual([0, 1]);
    expect(getPageNumbers(1, 2)).toEqual([0, 1]);
    expect(getPageNumbers(0, 3)).toEqual([0, 1, 2]);
    expect(getPageNumbers(2, 3)).toEqual([0, 1, 2]);
  });

  it('collapses total=4 down to every page, folding page 1 in with no ellipsis', () => {
    expect(getPageNumbers(0, 4)).toEqual([0, 1, 2, 'ellipsis', 3]); // page 1: 1 2 3 … 4
    expect(getPageNumbers(1, 4)).toEqual([0, 1, 2, 3]); // page 2: 1 2 3 4
    expect(getPageNumbers(2, 4)).toEqual([0, 1, 2, 3]); // page 3: 1 2 3 4
    expect(getPageNumbers(3, 4)).toEqual([0, 1, 2, 3]); // page 4: 1 2 3 4
  });

  it('never duplicates page 1 when the window itself already starts there', () => {
    expect(getPageNumbers(2, 3)).toEqual([0, 1, 2]); // page 3 of 3: no dup
    expect(getPageNumbers(1, 2)).toEqual([0, 1]); // page 2 of 2: no dup
  });

  it('holds these invariants for every current/total pair across a wide range of totals — this is what makes it N-agnostic, not hardcoded to any one page count', () => {
    for (let total = 2; total <= 60; total++) {
      for (let current = 0; current < total; current++) {
        const tokens = getPageNumbers(current, total);
        const pages = tokens.filter((t): t is number => t !== 'ellipsis');

        // No duplicate page numbers, and every one is in range.
        expect(new Set(pages).size).toBe(pages.length);
        pages.forEach((p) => {
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThan(total);
        });

        // Numbers stay in ascending order (ellipses aside).
        const isAscending = pages.reduce<{ prev: number; ok: boolean }>(
          (acc, p) => ({ prev: p, ok: acc.ok && p > acc.prev }),
          { prev: -1, ok: true },
        ).ok;
        expect(isAscending).toBe(true);

        // Page 1 and the last page are always reachable in a single click.
        expect(pages).toContain(0);
        expect(pages).toContain(total - 1);

        // The current page itself is always one of the rendered buttons.
        expect(pages).toContain(current);

        // An 'ellipsis' is never adjacent to another 'ellipsis', and never
        // the first or last token (nothing to hide before page 1 / after last).
        expect(tokens[0]).not.toBe('ellipsis');
        expect(tokens[tokens.length - 1]).not.toBe('ellipsis');
        const hasAdjacentEllipses = tokens.reduce<{ prev: PageToken | null; found: boolean }>(
          (acc, t) => ({ prev: t, found: acc.found || (t === 'ellipsis' && acc.prev === 'ellipsis') }),
          { prev: null, found: false },
        ).found;
        expect(hasAdjacentEllipses).toBe(false);
      }
    }
  });
});
