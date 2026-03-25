import { validateMappings } from '@/features/migration/services/validation.service';
import type { GroupedMapping } from '@/features/migration/types/mapping.types';
import type { ERPSystem } from '@/features/migration/types/erp.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<{
  source_number: string;
  source_name: string;
  target_name: string;
  score: number;
  remark: string;
}> = {}): GroupedMapping['accounts'][number] {
  return {
    source_number: '1000',
    source_name: 'Cash',
    target_name: 'Cash and Equivalents',
    score: 95,
    remark: '',
    ...overrides,
  };
}

function makeGroup(overrides: Partial<{
  source_type: string;
  target_type: string;
  confidence: number;
  accounts: GroupedMapping['accounts'];
}> = {}): GroupedMapping {
  return {
    source_type: 'Asset',
    target_type: 'Other Asset',
    confidence: 90,
    accounts: [makeAccount()],
    ...overrides,
  };
}

function makeERP(overrides: Partial<ERPSystem> = {}): ERPSystem {
  return {
    id: 'netsuite',
    name: 'Oracle NetSuite',
    description: 'Cloud ERP',
    fields: [
      { id: 'account_name', name: 'Account Name', type: 'string', required: true },
      { id: 'account_number', name: 'Account Number', type: 'string', required: false },
    ],
    ...overrides,
  };
}

// ─── validateMappings ───────────────────────────────────────────────────────

describe('validateMappings', () => {
  describe('missing target type', () => {
    it('detects empty target_type as an error (T170)', () => {
      const groups = [makeGroup({ target_type: '' })];
      const result = validateMappings(groups, makeERP());

      const typeErrors = result.issues.filter(
        (i) => i.severity === 'error' && i.message.includes('no target type mapping'),
      );
      expect(typeErrors).toHaveLength(1);
      expect(typeErrors[0]?.groupIndex).toBe(0);
      expect(typeErrors[0]?.sourceType).toBe('Asset');
    });
  });

  describe('missing target name', () => {
    it('detects empty target_name as an error (T170)', () => {
      const groups = [makeGroup({
        accounts: [makeAccount({ target_name: '' })],
      })];
      const result = validateMappings(groups, makeERP());

      const nameErrors = result.issues.filter(
        (i) => i.severity === 'error' && i.message.includes('no target mapping'),
      );
      expect(nameErrors).toHaveLength(1);
      expect(nameErrors[0]?.accountIndex).toBe(0);
      expect(nameErrors[0]?.sourceNumber).toBe('1000');
    });

    it('detects "unmatched" target_name as an error (T170)', () => {
      const groups = [makeGroup({
        accounts: [makeAccount({ target_name: 'unmatched' })],
      })];
      const result = validateMappings(groups, makeERP());

      const nameErrors = result.issues.filter(
        (i) => i.severity === 'error' && i.message.includes('no target mapping'),
      );
      expect(nameErrors).toHaveLength(1);
    });
  });

  describe('low confidence warnings', () => {
    it('flags accounts with score below 70 as a warning (T170)', () => {
      const groups = [makeGroup({
        accounts: [makeAccount({ score: 50, target_name: 'Some Target' })],
      })];
      const result = validateMappings(groups, makeERP());

      const lowConf = result.issues.filter(
        (i) => i.severity === 'warning' && i.message.includes('low confidence'),
      );
      expect(lowConf).toHaveLength(1);
      expect(lowConf[0]?.message).toContain('50');
    });

    it('does not flag accounts at exactly 70 as low confidence', () => {
      const groups = [makeGroup({
        accounts: [makeAccount({ score: 70, target_name: 'Some Target' })],
      })];
      const result = validateMappings(groups, makeERP());

      const lowConf = result.issues.filter(
        (i) => i.severity === 'warning' && i.message.includes('low confidence'),
      );
      expect(lowConf).toHaveLength(0);
    });
  });

  describe('duplicate target mapping warnings', () => {
    it('warns when multiple accounts map to the same target within a group (T170)', () => {
      const groups = [makeGroup({
        accounts: [
          makeAccount({ source_number: '1000', target_name: 'Cash' }),
          makeAccount({ source_number: '1001', target_name: 'Cash' }),
        ],
      })];
      const result = validateMappings(groups, makeERP());

      const dupes = result.issues.filter(
        (i) => i.severity === 'warning' && i.message.includes('mapped to 2 source accounts'),
      );
      expect(dupes).toHaveLength(1);
    });

    it('detects duplicates case-insensitively', () => {
      const groups = [makeGroup({
        accounts: [
          makeAccount({ target_name: 'Cash' }),
          makeAccount({ target_name: 'cash' }),
        ],
      })];
      const result = validateMappings(groups, makeERP());

      const dupes = result.issues.filter(
        (i) => i.severity === 'warning' && i.message.includes('mapped to 2'),
      );
      expect(dupes).toHaveLength(1);
    });
  });

  describe('required target ERP fields not mapped', () => {
    it('warns when a required field has no source type mapped to it (T170)', () => {
      const erp = makeERP({
        fields: [
          { id: 'revenue', name: 'Revenue', type: 'string', required: true },
          { id: 'expense', name: 'Expense', type: 'string', required: true },
        ],
      });
      const groups = [makeGroup({ target_type: 'Revenue' })];
      const result = validateMappings(groups, erp);

      const unmapped = result.issues.filter(
        (i) => i.severity === 'warning' && i.message.includes('Expense'),
      );
      expect(unmapped).toHaveLength(1);
      expect(unmapped[0]?.groupIndex).toBe(-1);
    });

    it('does not warn for non-required fields', () => {
      const erp = makeERP({
        fields: [
          { id: 'notes', name: 'Notes', type: 'string', required: false },
        ],
      });
      const groups = [makeGroup()];
      const result = validateMappings(groups, erp);

      const unmapped = result.issues.filter(
        (i) => i.message.includes('Notes'),
      );
      expect(unmapped).toHaveLength(0);
    });
  });

  describe('isValid flag', () => {
    it('is true when there are no errors, only warnings (T170)', () => {
      const groups = [makeGroup({
        accounts: [makeAccount({ score: 50, target_name: 'Some Target' })],
      })];
      const result = validateMappings(groups, makeERP());

      expect(result.warningCount).toBeGreaterThan(0);
      expect(result.isValid).toBe(true);
    });

    it('is false when errors exist (T170)', () => {
      const groups = [makeGroup({
        accounts: [makeAccount({ target_name: '' })],
      })];
      const result = validateMappings(groups, makeERP());

      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.isValid).toBe(false);
    });
  });

  describe('error and warning counts', () => {
    it('counts errors and warnings correctly (T170)', () => {
      const groups = [makeGroup({
        target_type: '',
        accounts: [
          makeAccount({ target_name: '', source_number: '1000' }),
          makeAccount({ score: 50, target_name: 'Low Conf', source_number: '1001' }),
        ],
      })];
      const result = validateMappings(groups, makeERP());

      const errors = result.issues.filter((i) => i.severity === 'error');
      const warnings = result.issues.filter((i) => i.severity === 'warning');

      expect(result.errorCount).toBe(errors.length);
      expect(result.warningCount).toBe(warnings.length);
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.warningCount).toBeGreaterThan(0);
    });
  });

  describe('empty input', () => {
    it('handles empty groupedMappings gracefully (T170)', () => {
      const result = validateMappings([], makeERP());

      expect(result.issues.length).toBeGreaterThanOrEqual(0);
      expect(result.errorCount).toBe(0);
      expect(result.isValid).toBe(true);
    });
  });
});
