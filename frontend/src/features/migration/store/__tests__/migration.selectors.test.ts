import {
  selectCurrentStep,
  selectCanProceed,
  selectSourceERP,
  selectTargetERP,
  selectTypeMappingSummary,
  selectMappingStats,
  selectFilteredMappings,
  selectAllConfirmed,
} from '@/features/migration/store/migration.selectors';
import type { MigrationStore } from '@/features/migration/store/migration.store';
import type { GroupedMapping, AccountMapping } from '@/features/migration/types/mapping.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockState(overrides: Partial<MigrationStore> = {}): MigrationStore {
  return {
    currentStep: 0,
    completedSteps: [],
    sourceERP: null,
    targetERP: null,
    sourceFile: null,
    targetFile: null,
    mappingFile: null,
    sourceData: [],
    targetData: [],
    mappingData: [],
    typeMappingRows: [],
    hasUnsavedChanges: false,
    hasUnsavedTypeMappings: false,
    targetTypes: [],
    groupedMappings: [],
    confidenceFilter: null,
    confirmedHigh: false,
    confirmedMedium: false,
    confirmedLow: false,
    deletedAccounts: [],
    projectId: null,
    isLoading: false,
    error: null,
    setStep: jest.fn(),
    completeStep: jest.fn(),
    setSourceERP: jest.fn(),
    setTargetERP: jest.fn(),
    setSourceData: jest.fn(),
    setTargetData: jest.fn(),
    setMappingData: jest.fn(),
    setTypeMappingRows: jest.fn(),
    hydrateTypeMappingRows: jest.fn(),
    updateTypeMappingRow: jest.fn(),
    addTypeMappingRow: jest.fn(),
    deleteTypeMappingRow: jest.fn(),
    markChangesSaved: jest.fn(),
    markTypeMappingsSaved: jest.fn(),
    setGroupedMappings: jest.fn(),
    updateTypeMapping: jest.fn(),
    updateAccountName: jest.fn(),
    setConfidenceFilter: jest.fn(),
    confirmConfidenceLevel: jest.fn(),
    deleteAccount: jest.fn(),
    restoreAccount: jest.fn(),
    clearTargetERP: jest.fn(),
    clearSourceFile: jest.fn(),
    clearTargetFile: jest.fn(),
    clearMappingFile: jest.fn(),
    setTargetTypes: jest.fn(),
    setProjectId: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    reset: jest.fn(),
    ...overrides,
  } as MigrationStore;
}

function createAccount(overrides: Partial<AccountMapping> = {}): AccountMapping {
  return {
    source_number: '1000',
    source_name: 'Cash',
    target_name: 'Cash Account',
    score: 85,
    remark: '',
    ...overrides,
  };
}

function createGroup(overrides: Partial<GroupedMapping> = {}): GroupedMapping {
  return {
    source_type: 'Asset',
    target_type: 'Assets',
    confidence: 90,
    accounts: [],
    ...overrides,
  };
}

// ─── selectCurrentStep ──────────────────────────────────────────────────────

describe('selectCurrentStep', () => {
  it('returns the current step from state', () => {
    const state = createMockState({ currentStep: 3 });
    expect(selectCurrentStep(state)).toBe(3);
  });
});

// ─── selectCanProceed ───────────────────────────────────────────────────────

describe('selectCanProceed', () => {
  it('returns true when currentStep is in completedSteps', () => {
    const state = createMockState({ currentStep: 1, completedSteps: [0, 1, 2] });
    expect(selectCanProceed(state)).toBe(true);
  });

  it('returns false when currentStep is not in completedSteps', () => {
    const state = createMockState({ currentStep: 3, completedSteps: [0, 1] });
    expect(selectCanProceed(state)).toBe(false);
  });

  it('returns false when completedSteps is empty', () => {
    const state = createMockState({ currentStep: 0, completedSteps: [] });
    expect(selectCanProceed(state)).toBe(false);
  });
});

// ─── selectSourceERP / selectTargetERP ──────────────────────────────────────

describe('selectSourceERP', () => {
  it('returns null when no ERP selected', () => {
    const state = createMockState();
    expect(selectSourceERP(state)).toBeNull();
  });

  it('returns the selected source ERP', () => {
    const erp = { id: 'sap', name: 'SAP', vendor: 'SAP SE', description: 'SAP ERP', fields: [] };
    const state = createMockState({ sourceERP: erp as MigrationStore['sourceERP'] });
    expect(selectSourceERP(state)).toBe(erp);
  });
});

describe('selectTargetERP', () => {
  it('returns null when no ERP selected', () => {
    const state = createMockState();
    expect(selectTargetERP(state)).toBeNull();
  });

  it('returns the selected target ERP', () => {
    const erp = { id: 'xero', name: 'Xero', vendor: 'Xero Ltd', description: 'Xero Accounting', fields: [] };
    const state = createMockState({ targetERP: erp as MigrationStore['targetERP'] });
    expect(selectTargetERP(state)).toBe(erp);
  });
});

// ─── selectTypeMappingSummary ───────────────────────────────────────────────

describe('selectTypeMappingSummary', () => {
  it('returns zeros for empty typeMappingRows', () => {
    const state = createMockState({ typeMappingRows: [] });
    expect(selectTypeMappingSummary(state)).toEqual({
      total: 0,
      matched: 0,
      allMatched: false,
    });
  });

  it('counts total and matched rows correctly', () => {
    const state = createMockState({
      typeMappingRows: [
        { id: '1', sourceType: 'Asset', targetTypes: ['Assets'], isCustom: false },
        { id: '2', sourceType: 'Liability', targetTypes: [], isCustom: false },
        { id: '3', sourceType: 'Revenue', targetTypes: ['Income'], isCustom: false },
      ],
    });
    const result = selectTypeMappingSummary(state);
    expect(result.total).toBe(3);
    expect(result.matched).toBe(2);
    expect(result.allMatched).toBe(false);
  });

  it('sets allMatched true when all rows have at least one targetType', () => {
    const state = createMockState({
      typeMappingRows: [
        { id: '1', sourceType: 'Asset', targetTypes: ['Assets'], isCustom: false },
        {
          id: '2',
          sourceType: 'Liability',
          targetTypes: ['Liabilities', 'Other Liability'],
          isCustom: false,
        },
      ],
    });
    const result = selectTypeMappingSummary(state);
    expect(result.total).toBe(2);
    expect(result.matched).toBe(2);
    expect(result.allMatched).toBe(true);
  });
});

// ─── selectMappingStats ─────────────────────────────────────────────────────

describe('selectMappingStats', () => {
  it('returns all zeros for empty groupedMappings', () => {
    const state = createMockState({ groupedMappings: [] });
    const result = selectMappingStats(state);
    expect(result).toEqual({
      totalTypes: 0,
      totalAccounts: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      confirmedCount: 0,
    });
  });

  it('counts confidence levels correctly across multiple groups', () => {
    const state = createMockState({
      groupedMappings: [
        createGroup({
          source_type: 'Asset',
          accounts: [
            createAccount({ score: 95 }),
            createAccount({ score: 85 }),
            createAccount({ score: 50 }),
          ],
        }),
        createGroup({
          source_type: 'Liability',
          accounts: [
            createAccount({ score: 100 }),
            createAccount({ score: 75 }),
            createAccount({ score: 30 }),
          ],
        }),
      ],
    });

    const result = selectMappingStats(state);
    expect(result.totalTypes).toBe(2);
    expect(result.totalAccounts).toBe(6);
    expect(result.highConfidence).toBe(2);
    expect(result.mediumConfidence).toBe(2);
    expect(result.lowConfidence).toBe(2);
  });

  it('counts confirmed accounts (user_changed = true)', () => {
    const state = createMockState({
      groupedMappings: [
        createGroup({
          accounts: [
            createAccount({ score: 95, user_changed: true }),
            createAccount({ score: 80, user_changed: false }),
            createAccount({ score: 60, user_changed: true }),
          ],
        }),
      ],
    });

    expect(selectMappingStats(state).confirmedCount).toBe(2);
  });

  it('handles a single account correctly', () => {
    const state = createMockState({
      groupedMappings: [
        createGroup({
          accounts: [createAccount({ score: 92 })],
        }),
      ],
    });

    const result = selectMappingStats(state);
    expect(result.totalTypes).toBe(1);
    expect(result.totalAccounts).toBe(1);
    expect(result.highConfidence).toBe(1);
    expect(result.mediumConfidence).toBe(0);
    expect(result.lowConfidence).toBe(0);
  });

  it('classifies all accounts as high when all scores >= 90', () => {
    const state = createMockState({
      groupedMappings: [
        createGroup({
          accounts: [
            createAccount({ score: 95 }),
            createAccount({ score: 90 }),
            createAccount({ score: 100 }),
          ],
        }),
      ],
    });

    const result = selectMappingStats(state);
    expect(result.highConfidence).toBe(3);
    expect(result.mediumConfidence).toBe(0);
    expect(result.lowConfidence).toBe(0);
  });

  it('treats score of exactly 90 as high confidence', () => {
    const state = createMockState({
      groupedMappings: [
        createGroup({
          accounts: [createAccount({ score: 90 })],
        }),
      ],
    });

    expect(selectMappingStats(state).highConfidence).toBe(1);
  });

  it('treats score of exactly 70 as medium confidence', () => {
    const state = createMockState({
      groupedMappings: [
        createGroup({
          accounts: [createAccount({ score: 70 })],
        }),
      ],
    });

    expect(selectMappingStats(state).mediumConfidence).toBe(1);
  });

  it('treats score of 69 as low confidence', () => {
    const state = createMockState({
      groupedMappings: [
        createGroup({
          accounts: [createAccount({ score: 69 })],
        }),
      ],
    });

    expect(selectMappingStats(state).lowConfidence).toBe(1);
  });
});

// ─── selectFilteredMappings ─────────────────────────────────────────────────

describe('selectFilteredMappings', () => {
  const groupedMappings: GroupedMapping[] = [
    createGroup({
      source_type: 'Asset',
      accounts: [
        createAccount({ score: 95 }),
        createAccount({ score: 80 }),
        createAccount({ score: 50 }),
      ],
    }),
    createGroup({
      source_type: 'Liability',
      accounts: [
        createAccount({ score: 92 }),
        createAccount({ score: 72 }),
      ],
    }),
    createGroup({
      source_type: 'Expense',
      accounts: [
        createAccount({ score: 40 }),
      ],
    }),
  ];

  it('returns all groups when confidenceFilter is null', () => {
    const state = createMockState({ groupedMappings, confidenceFilter: null });
    const result = selectFilteredMappings(state);
    expect(result).toEqual(groupedMappings);
  });

  it('returns empty array for empty groupedMappings', () => {
    const state = createMockState({ groupedMappings: [], confidenceFilter: 'high' });
    expect(selectFilteredMappings(state)).toEqual([]);
  });

  it('filters to only high confidence accounts (>= 90)', () => {
    const state = createMockState({ groupedMappings, confidenceFilter: 'high' });
    const result = selectFilteredMappings(state);

    expect(result).toHaveLength(2);
    expect(result[0]?.accounts).toHaveLength(1);
    expect(result[0]?.accounts[0]?.score).toBe(95);
    expect(result[1]?.accounts).toHaveLength(1);
    expect(result[1]?.accounts[0]?.score).toBe(92);
  });

  it('filters to only medium confidence accounts (>= 70 and < 90)', () => {
    const state = createMockState({ groupedMappings, confidenceFilter: 'medium' });
    const result = selectFilteredMappings(state);

    expect(result).toHaveLength(2);
    expect(result[0]?.accounts).toHaveLength(1);
    expect(result[0]?.accounts[0]?.score).toBe(80);
    expect(result[1]?.accounts).toHaveLength(1);
    expect(result[1]?.accounts[0]?.score).toBe(72);
  });

  it('filters to only low confidence accounts (< 70)', () => {
    const state = createMockState({ groupedMappings, confidenceFilter: 'low' });
    const result = selectFilteredMappings(state);

    expect(result).toHaveLength(2);
    expect(result[0]?.accounts).toHaveLength(1);
    expect(result[0]?.accounts[0]?.score).toBe(50);
    expect(result[1]?.accounts).toHaveLength(1);
    expect(result[1]?.accounts[0]?.score).toBe(40);
  });

  it('removes groups with no matching accounts after filtering', () => {
    const state = createMockState({ groupedMappings, confidenceFilter: 'high' });
    const result = selectFilteredMappings(state);
    const sourceTypes = result.map((g) => g.source_type);

    expect(sourceTypes).not.toContain('Expense');
  });
});

// ─── selectAllConfirmed ─────────────────────────────────────────────────────

describe('selectAllConfirmed', () => {
  it('returns false when none confirmed', () => {
    const state = createMockState({
      confirmedHigh: false,
      confirmedMedium: false,
      confirmedLow: false,
    });
    expect(selectAllConfirmed(state)).toBe(false);
  });

  it('returns false when only high confirmed', () => {
    const state = createMockState({
      confirmedHigh: true,
      confirmedMedium: false,
      confirmedLow: false,
    });
    expect(selectAllConfirmed(state)).toBe(false);
  });

  it('returns false when only high and medium confirmed', () => {
    const state = createMockState({
      confirmedHigh: true,
      confirmedMedium: true,
      confirmedLow: false,
    });
    expect(selectAllConfirmed(state)).toBe(false);
  });

  it('returns true only when all three levels are confirmed', () => {
    const state = createMockState({
      confirmedHigh: true,
      confirmedMedium: true,
      confirmedLow: true,
    });
    expect(selectAllConfirmed(state)).toBe(true);
  });

  it('returns false when only low is missing', () => {
    const state = createMockState({
      confirmedHigh: true,
      confirmedMedium: true,
      confirmedLow: false,
    });
    expect(selectAllConfirmed(state)).toBe(false);
  });

  it('returns false when only medium is missing', () => {
    const state = createMockState({
      confirmedHigh: true,
      confirmedMedium: false,
      confirmedLow: true,
    });
    expect(selectAllConfirmed(state)).toBe(false);
  });
});
