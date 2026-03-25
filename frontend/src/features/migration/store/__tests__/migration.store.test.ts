import { useMigrationStore } from '@/features/migration/store/migration.store';
import type { ERPSystem } from '@/features/migration/types/erp.types';
import type { UploadedFile, TypeMappingRow } from '@/features/migration/types/migration.types';
import type { GroupedMapping, ConfidenceLevel } from '@/features/migration/types/mapping.types';
import { createFileId } from '@/shared/types/common.types';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const mockERP: ERPSystem = {
  id: 'sap',
  name: 'SAP',
  description: 'SAP ERP',
  fields: [],
};

const mockTargetERP: ERPSystem = {
  id: 'xero',
  name: 'Xero',
  description: 'Xero Accounting',
  fields: [],
};

const mockFile: UploadedFile = {
  name: 'test.xlsx',
  rowCount: 10,
  fileId: createFileId('file-1'),
};

const mockSourceData: Record<string, unknown>[] = [
  { account: '1000', name: 'Cash' },
  { account: '2000', name: 'Receivables' },
];

const mockTypeMappingRows: TypeMappingRow[] = [
  { id: 'row-1', sourceType: 'Asset', targetType: 'Assets', isCustom: false },
  { id: 'row-2', sourceType: 'Liability', targetType: 'Liabilities', isCustom: false },
];

const mockGroupedMappings: GroupedMapping[] = [
  {
    source_type: 'Asset',
    target_type: 'Assets',
    confidence: 95,
    accounts: [
      { source_number: '1000', source_name: 'Cash', target_name: 'Cash and Bank', score: 92, remark: 'Auto' },
      { source_number: '1100', source_name: 'AR', target_name: 'Accounts Receivable', score: 88, remark: 'Auto' },
    ],
  },
  {
    source_type: 'Liability',
    target_type: 'Liabilities',
    confidence: 80,
    accounts: [
      { source_number: '2000', source_name: 'AP', target_name: 'Accounts Payable', score: 90, remark: 'Auto' },
    ],
  },
];

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useMigrationStore', () => {
  beforeEach(() => {
    useMigrationStore.getState().reset();
  });

  describe('step navigation', () => {
    it('setStep changes currentStep', () => {
      const { setStep } = useMigrationStore.getState();

      setStep(2);

      expect(useMigrationStore.getState().currentStep).toBe(2);
    });

    it('completeStep adds step to completedSteps', () => {
      const { completeStep } = useMigrationStore.getState();

      completeStep(1);

      expect(useMigrationStore.getState().completedSteps).toEqual([1]);
    });

    it('completeStep does not add duplicate steps', () => {
      const { completeStep } = useMigrationStore.getState();

      completeStep(1);
      completeStep(1);
      completeStep(2);

      expect(useMigrationStore.getState().completedSteps).toEqual([1, 2]);
    });
  });

  describe('ERP selection', () => {
    it('setSourceERP sets the source ERP', () => {
      const { setSourceERP } = useMigrationStore.getState();

      setSourceERP(mockERP);

      expect(useMigrationStore.getState().sourceERP).toEqual(mockERP);
    });

    it('setTargetERP sets the target ERP', () => {
      const { setTargetERP } = useMigrationStore.getState();

      setTargetERP(mockTargetERP);

      expect(useMigrationStore.getState().targetERP).toEqual(mockTargetERP);
    });

    it('clearTargetERP resets targetERP to null', () => {
      const { setTargetERP, clearTargetERP } = useMigrationStore.getState();

      setTargetERP(mockTargetERP);
      clearTargetERP();

      expect(useMigrationStore.getState().targetERP).toBeNull();
    });
  });

  describe('file data', () => {
    it('setSourceData sets both sourceFile and sourceData', () => {
      const { setSourceData } = useMigrationStore.getState();

      setSourceData(mockFile, mockSourceData);

      const state = useMigrationStore.getState();
      expect(state.sourceFile).toEqual(mockFile);
      expect(state.sourceData).toEqual(mockSourceData);
    });

    it('clearSourceFile clears both sourceFile and sourceData', () => {
      const { setSourceData, clearSourceFile } = useMigrationStore.getState();

      setSourceData(mockFile, mockSourceData);
      clearSourceFile();

      const state = useMigrationStore.getState();
      expect(state.sourceFile).toBeNull();
      expect(state.sourceData).toEqual([]);
    });
  });

  describe('type mapping CRUD', () => {
    it('setTypeMappingRows sets the rows', () => {
      const { setTypeMappingRows } = useMigrationStore.getState();

      setTypeMappingRows(mockTypeMappingRows);

      expect(useMigrationStore.getState().typeMappingRows).toEqual(mockTypeMappingRows);
    });

    it('updateTypeMappingRow updates field and marks hasUnsavedChanges', () => {
      const { setTypeMappingRows, updateTypeMappingRow } = useMigrationStore.getState();

      setTypeMappingRows(mockTypeMappingRows);
      updateTypeMappingRow('row-1', 'targetType', 'Fixed Assets');

      const state = useMigrationStore.getState();
      const updated = state.typeMappingRows.find((r) => r.id === 'row-1');
      expect(updated?.targetType).toBe('Fixed Assets');
      expect(state.hasUnsavedChanges).toBe(true);
    });

    it('addTypeMappingRow adds a custom row', () => {
      const { setTypeMappingRows, addTypeMappingRow } = useMigrationStore.getState();

      setTypeMappingRows(mockTypeMappingRows);
      addTypeMappingRow();

      const state = useMigrationStore.getState();
      expect(state.typeMappingRows).toHaveLength(3);
      const newRow = state.typeMappingRows[2];
      expect(newRow?.isCustom).toBe(true);
      expect(newRow?.sourceType).toBe('');
      expect(newRow?.targetType).toBe('');
      expect(state.hasUnsavedChanges).toBe(true);
    });

    it('deleteTypeMappingRow removes the row by id', () => {
      const { setTypeMappingRows, deleteTypeMappingRow } = useMigrationStore.getState();

      setTypeMappingRows(mockTypeMappingRows);
      deleteTypeMappingRow('row-1');

      const state = useMigrationStore.getState();
      expect(state.typeMappingRows).toHaveLength(1);
      expect(state.typeMappingRows[0]?.id).toBe('row-2');
      expect(state.hasUnsavedChanges).toBe(true);
    });

    it('markChangesSaved resets hasUnsavedChanges', () => {
      const { setTypeMappingRows, updateTypeMappingRow, markChangesSaved } =
        useMigrationStore.getState();

      setTypeMappingRows(mockTypeMappingRows);
      updateTypeMappingRow('row-1', 'sourceType', 'Revenue');
      expect(useMigrationStore.getState().hasUnsavedChanges).toBe(true);

      markChangesSaved();
      expect(useMigrationStore.getState().hasUnsavedChanges).toBe(false);
    });
  });

  describe('account mapping', () => {
    it('setGroupedMappings sets the mappings', () => {
      const { setGroupedMappings } = useMigrationStore.getState();

      setGroupedMappings(mockGroupedMappings);

      expect(useMigrationStore.getState().groupedMappings).toEqual(mockGroupedMappings);
    });

    it('updateTypeMapping changes target_type for a source group', () => {
      const { setGroupedMappings, updateTypeMapping } = useMigrationStore.getState();

      setGroupedMappings(mockGroupedMappings);
      updateTypeMapping('Asset', 'Fixed Assets');

      const group = useMigrationStore.getState().groupedMappings.find(
        (g) => g.source_type === 'Asset',
      );
      expect(group?.target_type).toBe('Fixed Assets');
    });

    it('updateAccountName sets target_name, user_changed, and changed_at', () => {
      const { setGroupedMappings, updateAccountName } = useMigrationStore.getState();

      setGroupedMappings(mockGroupedMappings);
      updateAccountName('Asset', 0, 'Petty Cash', 'TestUser');

      const group = useMigrationStore.getState().groupedMappings.find(
        (g) => g.source_type === 'Asset',
      );
      const account = group?.accounts[0];
      expect(account?.target_name).toBe('Petty Cash');
      expect(account?.user_changed).toBe(true);
      expect(account?.changed_by_name).toBe('TestUser');
      expect(account?.changed_at).toBeDefined();
    });
  });

  describe('confidence filter', () => {
    it('setConfidenceFilter sets the filter value', () => {
      const { setConfidenceFilter } = useMigrationStore.getState();

      setConfidenceFilter('high');

      expect(useMigrationStore.getState().confidenceFilter).toBe('high');
    });

    it('setConfidenceFilter accepts null to clear', () => {
      const { setConfidenceFilter } = useMigrationStore.getState();

      setConfidenceFilter('medium');
      setConfidenceFilter(null);

      expect(useMigrationStore.getState().confidenceFilter).toBeNull();
    });
  });

  describe('confirmConfidenceLevel', () => {
    it.each<[ConfidenceLevel, keyof ReturnType<typeof useMigrationStore.getState>]>([
      ['high', 'confirmedHigh'],
      ['medium', 'confirmedMedium'],
      ['low', 'confirmedLow'],
    ])('sets confirmed%s when level is "%s"', (level, stateKey) => {
      const { confirmConfidenceLevel } = useMigrationStore.getState();

      confirmConfidenceLevel(level);

      expect(useMigrationStore.getState()[stateKey]).toBe(true);
    });
  });

  describe('delete/restore accounts', () => {
    it('deleteAccount moves account to deletedAccounts and splices from group', () => {
      const { setGroupedMappings, deleteAccount } = useMigrationStore.getState();

      setGroupedMappings(mockGroupedMappings);
      deleteAccount('Asset', 0);

      const state = useMigrationStore.getState();
      const assetGroup = state.groupedMappings.find((g) => g.source_type === 'Asset');
      expect(assetGroup?.accounts).toHaveLength(1);
      expect(state.deletedAccounts).toHaveLength(1);
      expect(state.deletedAccounts[0]?.sourceNumber).toBe('1000');
      expect(state.deletedAccounts[0]?.sourceName).toBe('Cash');
    });

    it('restoreAccount moves account back with score=0 and remark=Restored', () => {
      const { setGroupedMappings, deleteAccount, restoreAccount } =
        useMigrationStore.getState();

      setGroupedMappings(mockGroupedMappings);
      deleteAccount('Asset', 0);
      restoreAccount(0);

      const state = useMigrationStore.getState();
      expect(state.deletedAccounts).toHaveLength(0);

      const assetGroup = state.groupedMappings.find((g) => g.source_type === 'Asset');
      const restoredAccount = assetGroup?.accounts[assetGroup.accounts.length - 1];
      expect(restoredAccount?.source_number).toBe('1000');
      expect(restoredAccount?.source_name).toBe('Cash');
      expect(restoredAccount?.score).toBe(0);
      expect(restoredAccount?.remark).toBe('Restored');
    });
  });

  describe('reset', () => {
    it('returns to initial state', () => {
      const { setStep, setSourceERP, setSourceData, setGroupedMappings, reset } =
        useMigrationStore.getState();

      setStep(3);
      setSourceERP(mockERP);
      setSourceData(mockFile, mockSourceData);
      setGroupedMappings(mockGroupedMappings);

      reset();

      const state = useMigrationStore.getState();
      expect(state.currentStep).toBe(0);
      expect(state.completedSteps).toEqual([]);
      expect(state.sourceERP).toBeNull();
      expect(state.targetERP).toBeNull();
      expect(state.sourceFile).toBeNull();
      expect(state.sourceData).toEqual([]);
      expect(state.groupedMappings).toEqual([]);
      expect(state.confidenceFilter).toBeNull();
      expect(state.confirmedHigh).toBe(false);
      expect(state.confirmedMedium).toBe(false);
      expect(state.confirmedLow).toBe(false);
      expect(state.deletedAccounts).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
