import {
  calculateAccountScore,
  matchTypesToTargets,
} from '@/features/migration/services/fuzzy.service';
import type { TypeMappingRow } from '@/features/migration/types/migration.types';

// ─── calculateAccountScore ─────────────────────────────────────────────────

describe('calculateAccountScore', () => {
  describe('exact match (score = 100)', () => {
    it('returns 100 for identical strings', () => {
      expect(calculateAccountScore('Cash', 'Cash')).toBe(100);
    });

    it('returns 100 for case-insensitive exact match', () => {
      expect(calculateAccountScore('CASH', 'cash')).toBe(100);
    });

    it('returns 100 when only whitespace differs', () => {
      expect(calculateAccountScore('  Cash  ', ' Cash ')).toBe(100);
    });

    it('returns 100 for multi-word exact match', () => {
      expect(
        calculateAccountScore('Accounts Receivable', 'accounts receivable'),
      ).toBe(100);
    });
  });

  describe('all words found (score = 95)', () => {
    it('returns 95 when all source words appear in target with extra words', () => {
      expect(
        calculateAccountScore('Accounts Receivable', 'Accounts Receivable Trade'),
      ).toBe(95);
    });

    it('returns 95 for case-insensitive all-words match', () => {
      expect(
        calculateAccountScore('CASH EQUIVALENTS', 'Cash Equivalents Short Term'),
      ).toBe(95);
    });
  });

  describe('partial overlap (score = 60-90)', () => {
    it('returns a score between 60 and 90 for partial word overlap', () => {
      const score = calculateAccountScore(
        'Accounts Receivable Trade',
        'Accounts Payable Trade',
      );
      expect(score).toBeGreaterThanOrEqual(60);
      expect(score).toBeLessThanOrEqual(90);
    });

    it('never exceeds 90 when not all source words match', () => {
      // When 2 of 3 source words match, partial formula applies (capped at 90)
      const score = calculateAccountScore(
        'Revenue Sales Markup',
        'Revenue Sales Other',
      );
      expect(score).toBeGreaterThanOrEqual(60);
      expect(score).toBeLessThanOrEqual(90);
    });

    it('returns 95 (all-words) when all source words appear in target', () => {
      // All 3 source words found in target triggers all-words path, not partial
      const score = calculateAccountScore(
        'Revenue Sales Income',
        'Revenue Sales Income Other',
      );
      expect(score).toBe(95);
    });

    it('scores higher with more common words', () => {
      const low = calculateAccountScore(
        'Revenue Sales Income Tax',
        'Revenue Expense Loss Tax',
      );
      const high = calculateAccountScore(
        'Revenue Sales Income Tax',
        'Revenue Sales Income Other',
      );
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('containment (score = 80)', () => {
    it('returns 80 when target contains source as substring', () => {
      expect(calculateAccountScore('Cash', 'PettyCash')).toBe(80);
    });

    it('returns 80 when source contains target as substring', () => {
      expect(calculateAccountScore('PettyCash', 'Cash')).toBe(80);
    });

    it('returns 80 for case-insensitive containment', () => {
      expect(calculateAccountScore('DEPRECIATION', 'accumulated_depreciation')).toBe(80);
    });
  });

  describe('known target (score = 70)', () => {
    it('prefers higher-scoring match over known-target check', () => {
      // "Petty Fund" vs "Cash" has no word overlap or containment,
      // but "Cash" is in knownTargets, so known-target (70) applies
      const knownTargets = ['Cash', 'Inventory', 'Receivables'];
      expect(
        calculateAccountScore('Petty Fund', 'Cash', knownTargets),
      ).toBe(70);
    });

    it('returns 70 for a target that is known but has no word or containment overlap', () => {
      const knownTargets = ['Cash', 'Inventory', 'Receivables'];
      expect(
        calculateAccountScore('xyz abc', 'Inventory', knownTargets),
      ).toBe(70);
    });

    it('does not return 70 when target is absent from known list', () => {
      const knownTargets = ['Cash', 'Inventory'];
      const score = calculateAccountScore('xyz abc', 'Unknown Account', knownTargets);
      expect(score).not.toBe(70);
    });
  });

  describe('fallback (score = 40)', () => {
    it('returns 40 when no matching strategy applies', () => {
      expect(calculateAccountScore('xyz', 'abc')).toBe(40);
    });

    it('returns 40 for completely unrelated multi-word names', () => {
      expect(
        calculateAccountScore('Alpha Beta', 'Gamma Delta'),
      ).toBe(40);
    });
  });

  describe('zero score', () => {
    it('returns 0 for empty target name', () => {
      expect(calculateAccountScore('Cash', '')).toBe(0);
    });

    it('returns 0 for "unmatched" target', () => {
      expect(calculateAccountScore('Cash', 'unmatched')).toBe(0);
    });
  });

  describe('edge cases (T176)', () => {
    it('handles empty source name gracefully', () => {
      const score = calculateAccountScore('', 'Cash');
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('handles both empty strings', () => {
      expect(calculateAccountScore('', '')).toBe(0);
    });

    it('handles extra internal whitespace via word splitting', () => {
      // splitWords normalizes multiple spaces, so all source words are found
      // in target, triggering the all-words path (95) not exact match (100)
      expect(
        calculateAccountScore('Accounts   Receivable', 'Accounts Receivable'),
      ).toBe(95);
    });

    it('handles leading and trailing whitespace', () => {
      expect(
        calculateAccountScore('  Revenue  ', '  revenue  '),
      ).toBe(100);
    });

    it('is case insensitive throughout scoring', () => {
      const lower = calculateAccountScore('accounts payable', 'trade payable');
      const mixed = calculateAccountScore('Accounts Payable', 'Trade Payable');
      expect(lower).toBe(mixed);
    });

    it('handles single character strings', () => {
      expect(calculateAccountScore('a', 'a')).toBe(100);
      expect(calculateAccountScore('a', 'b')).toBe(40);
    });

    it('handles very long strings', () => {
      const longSource = 'word '.repeat(50).trim();
      const longTarget = 'word '.repeat(50).trim();
      expect(calculateAccountScore(longSource, longTarget)).toBe(100);
    });

    it('returns undefined-safe result with no target account names', () => {
      const score = calculateAccountScore('xyz', 'abc', undefined);
      expect(score).toBe(40);
    });

    it('returns undefined-safe result with empty target account names', () => {
      const score = calculateAccountScore('xyz', 'abc', []);
      expect(score).toBe(40);
    });
  });
});

// ─── matchTypesToTargets ───────────────────────────────────────────────────

describe('matchTypesToTargets', () => {
  describe('exact matches', () => {
    it('maps identical type lists with exact matches', () => {
      const types = ['Asset', 'Liability', 'Equity'];
      const result = matchTypesToTargets(types, types);

      expect(result).toHaveLength(3);
      result.forEach((row, i) => {
        expect(row.sourceType).toBe(types[i]);
        expect(row.targetType).toBe(types[i]);
        expect(row.isCustom).toBe(false);
        expect(row.id).toBe(String(i));
      });
    });

    it('matches case-insensitively', () => {
      const source = ['ASSET', 'LIABILITY'];
      const target = ['Asset', 'Liability'];
      const result = matchTypesToTargets(source, target);

      expect(result[0]?.targetType).toBe('Asset');
      expect(result[1]?.targetType).toBe('Liability');
    });
  });

  describe('containment matches', () => {
    it('matches when source type is contained in target type', () => {
      const source = ['Revenue'];
      const target = ['Operating Revenue', 'Expense'];
      const result = matchTypesToTargets(source, target);

      expect(result[0]?.targetType).toBe('Operating Revenue');
    });

    it('matches when target type is contained in source type', () => {
      const source = ['Non-Current Asset'];
      const target = ['Asset', 'Liability'];
      const result = matchTypesToTargets(source, target);

      expect(result[0]?.targetType).toBe('Asset');
    });
  });

  describe('word overlap matches', () => {
    it('matches by common words when no exact or containment match exists', () => {
      const source = ['Current Asset'];
      const target = ['Fixed Asset', 'Revenue'];
      const result = matchTypesToTargets(source, target);

      expect(result[0]?.targetType).toBe('Fixed Asset');
    });
  });

  describe('no match found', () => {
    it('returns empty targetType when no match is possible', () => {
      const source = ['Alpha'];
      const target = ['Beta'];
      const result = matchTypesToTargets(source, target);

      expect(result[0]?.targetType).toBe('');
    });
  });

  describe('ERP type list integration', () => {
    const sapTypes = [
      'Asset',
      'Liability',
      'Equity',
      'Revenue',
      'Expense',
    ] as const;

    const netsuiteTypes = [
      'Other Asset',
      'Other Current Liability',
      'Equity',
      'Income',
      'Expense',
    ] as const;

    it('maps SAP types to NetSuite types with best effort', () => {
      const result = matchTypesToTargets(sapTypes, netsuiteTypes);

      expect(result).toHaveLength(5);
      expect(result[0]?.sourceType).toBe('Asset');
      expect(result[0]?.targetType).toBe('Other Asset');

      expect(result[2]?.sourceType).toBe('Equity');
      expect(result[2]?.targetType).toBe('Equity');

      expect(result[4]?.sourceType).toBe('Expense');
      expect(result[4]?.targetType).toBe('Expense');
    });

    it('produces TypeMappingRow with correct shape', () => {
      const result = matchTypesToTargets(sapTypes, netsuiteTypes);

      result.forEach((row) => {
        expect(row).toHaveProperty('id');
        expect(row).toHaveProperty('sourceType');
        expect(row).toHaveProperty('targetType');
        expect(row).toHaveProperty('isCustom');
        expect(typeof row.id).toBe('string');
        expect(typeof row.sourceType).toBe('string');
        expect(typeof row.targetType).toBe('string');
        expect(row.isCustom).toBe(false);
      });
    });

    it('assigns sequential string IDs starting from 0', () => {
      const result = matchTypesToTargets(sapTypes, netsuiteTypes);
      result.forEach((row, i) => {
        expect(row.id).toBe(String(i));
      });
    });
  });

  describe('edge cases (T176)', () => {
    it('returns empty array for empty source types', () => {
      const result = matchTypesToTargets([], ['Asset', 'Liability']);
      expect(result).toEqual([]);
    });

    it('returns rows with empty targetType for empty target types', () => {
      const result = matchTypesToTargets(['Asset', 'Liability'], []);
      expect(result).toHaveLength(2);
      result.forEach((row) => {
        expect(row.targetType).toBe('');
      });
    });

    it('returns empty array when both arrays are empty', () => {
      const result = matchTypesToTargets([], []);
      expect(result).toEqual([]);
    });

    it('handles single item source array', () => {
      const result = matchTypesToTargets(['Asset'], ['Asset', 'Liability']);
      expect(result).toHaveLength(1);
      expect(result[0]?.targetType).toBe('Asset');
    });

    it('handles single item target array', () => {
      const result = matchTypesToTargets(['Asset', 'Liability'], ['Asset']);
      expect(result).toHaveLength(2);
      expect(result[0]?.targetType).toBe('Asset');
    });

    it('handles duplicate source types', () => {
      const result = matchTypesToTargets(['Asset', 'Asset'], ['Asset']);
      expect(result).toHaveLength(2);
      expect(result[0]?.targetType).toBe('Asset');
      expect(result[1]?.targetType).toBe('Asset');
    });

    it('handles whitespace in type names', () => {
      const result = matchTypesToTargets(
        ['  Asset  '],
        ['Asset'],
      );
      expect(result[0]?.targetType).toBe('Asset');
    });

    it('handles types with all same confidence scores', () => {
      const source = ['Foo', 'Bar', 'Baz'];
      const target = ['Foo', 'Bar', 'Baz'];
      const result = matchTypesToTargets(source, target);

      result.forEach((row) => {
        expect(row.sourceType).toBe(row.targetType);
      });
    });
  });
});
