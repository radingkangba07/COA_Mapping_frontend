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
  { id: 'row-1', sourceType: 'Asset', targetTypes: ['Assets'], isCustom: false },
  { id: 'row-2', sourceType: 'Liability', targetTypes: ['Liabilities'], isCustom: false },
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

    it('updateTypeMappingRow updates targetTypes and marks hasUnsavedChanges', () => {
      const { setTypeMappingRows, updateTypeMappingRow } = useMigrationStore.getState();

      setTypeMappingRows(mockTypeMappingRows);
      updateTypeMappingRow('row-1', { targetTypes: ['Fixed Assets', 'Other Assets'] });

      const state = useMigrationStore.getState();
      const updated = state.typeMappingRows.find((r) => r.id === 'row-1');
      expect(updated?.targetTypes).toEqual(['Fixed Assets', 'Other Assets']);
      expect(state.hasUnsavedChanges).toBe(true);
    });

    it('updateTypeMappingRow updates sourceType and marks hasUnsavedChanges', () => {
      const { setTypeMappingRows, updateTypeMappingRow } = useMigrationStore.getState();

      setTypeMappingRows(mockTypeMappingRows);
      updateTypeMappingRow('row-1', { sourceType: 'Revenue' });

      const state = useMigrationStore.getState();
      const updated = state.typeMappingRows.find((r) => r.id === 'row-1');
      expect(updated?.sourceType).toBe('Revenue');
      expect(state.hasUnsavedChanges).toBe(true);
    });

    it('addTypeMappingRow adds a custom row with empty targetTypes', () => {
      const { setTypeMappingRows, addTypeMappingRow } = useMigrationStore.getState();

      setTypeMappingRows(mockTypeMappingRows);
      addTypeMappingRow();

      const state = useMigrationStore.getState();
      expect(state.typeMappingRows).toHaveLength(3);
      const newRow = state.typeMappingRows[2];
      expect(newRow?.isCustom).toBe(true);
      expect(newRow?.sourceType).toBe('');
      expect(newRow?.targetTypes).toEqual([]);
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
      updateTypeMappingRow('row-1', { sourceType: 'Revenue' });
      expect(useMigrationStore.getState().hasUnsavedChanges).toBe(true);

      markChangesSaved();
      expect(useMigrationStore.getState().hasUnsavedChanges).toBe(false);
    });
  });

  describe('hasUnsavedTypeMappings', () => {
    it('starts false', () => {
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(false);
    });

    it('is set true by setTypeMappingRows', () => {
      useMigrationStore.getState().setTypeMappingRows(mockTypeMappingRows);
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(true);
    });

    it('is NOT set true by hydrateTypeMappingRows', () => {
      // Hydration paths (server fetch, file upload) populate the rows without
      // marking the table dirty — only explicit user edits should flip this.
      useMigrationStore.getState().hydrateTypeMappingRows(mockTypeMappingRows);
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(false);
      expect(useMigrationStore.getState().typeMappingRows).toEqual(mockTypeMappingRows);
    });

    it('hydrateTypeMappingRows preserves existing dirty flag when true', () => {
      const store = useMigrationStore.getState();
      store.setTypeMappingRows(mockTypeMappingRows);
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(true);

      // Hydration must not silently clear the dirty flag either; the contract
      // is "no effect on dirty", not "flip to false".
      store.hydrateTypeMappingRows(mockTypeMappingRows);
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(true);
    });

    it('is set true by addTypeMappingRow', () => {
      useMigrationStore.getState().addTypeMappingRow();
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(true);
    });

    it('is set true by updateTypeMappingRow', () => {
      const store = useMigrationStore.getState();
      store.setTypeMappingRows(mockTypeMappingRows);
      store.markTypeMappingsSaved();
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(false);

      store.updateTypeMappingRow('row-1', { targetTypes: ['X'] });
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(true);
    });

    it('is set true by deleteTypeMappingRow', () => {
      const store = useMigrationStore.getState();
      store.setTypeMappingRows(mockTypeMappingRows);
      store.markTypeMappingsSaved();

      store.deleteTypeMappingRow('row-1');
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(true);
    });

    it('markTypeMappingsSaved flips it back to false', () => {
      const store = useMigrationStore.getState();
      store.setTypeMappingRows(mockTypeMappingRows);
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(true);

      store.markTypeMappingsSaved();
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(false);
    });

    it('reset() resets hasUnsavedTypeMappings to false', () => {
      const store = useMigrationStore.getState();
      store.setTypeMappingRows(mockTypeMappingRows);
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(true);

      store.reset();
      expect(useMigrationStore.getState().hasUnsavedTypeMappings).toBe(false);
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

    it('updateAccountName preserves the original score when target name is non-empty', () => {
      const { setGroupedMappings, updateAccountName } = useMigrationStore.getState();

      setGroupedMappings(mockGroupedMappings);
      const originalScore = useMigrationStore.getState().groupedMappings.find(
        (g) => g.source_type === 'Asset',
      )?.accounts[0]?.score;
      updateAccountName('Asset', 0, 'Petty Cash', 'TestUser');

      const group = useMigrationStore.getState().groupedMappings.find(
        (g) => g.source_type === 'Asset',
      );
      expect(group?.accounts[0]?.score).toBe(originalScore);
    });

    it('updateAccountName preserves the original score when target name is empty', () => {
      const { setGroupedMappings, updateAccountName } = useMigrationStore.getState();

      setGroupedMappings(mockGroupedMappings);
      const originalScore = useMigrationStore.getState().groupedMappings.find(
        (g) => g.source_type === 'Asset',
      )?.accounts[0]?.score;
      updateAccountName('Asset', 0, '', 'TestUser');

      const group = useMigrationStore.getState().groupedMappings.find(
        (g) => g.source_type === 'Asset',
      );
      expect(group?.accounts[0]?.score).toBe(originalScore);
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
    it('deleteAccount tombstones the row in place with is_active=false and marks unsaved', () => {
      const { setGroupedMappings, deleteAccount } = useMigrationStore.getState();

      setGroupedMappings(mockGroupedMappings);
      deleteAccount('Asset', 'Cash');

      const state = useMigrationStore.getState();
      const assetGroup = state.groupedMappings.find((g) => g.source_type === 'Asset');
      // Row stays in the group — Save will ship it with is_active:false.
      expect(assetGroup?.accounts).toHaveLength(2);
      const tombstoned = assetGroup?.accounts.find((a) => a.source_name === 'Cash');
      expect(tombstoned?.is_active).toBe(false);
      expect(state.hasUnsavedChanges).toBe(true);
    });

    it('restoreAccount flips is_active back to true', () => {
      const { setGroupedMappings, deleteAccount, restoreAccount } =
        useMigrationStore.getState();

      setGroupedMappings(mockGroupedMappings);
      deleteAccount('Asset', 'Cash');
      restoreAccount(0);

      const state = useMigrationStore.getState();
      const assetGroup = state.groupedMappings.find((g) => g.source_type === 'Asset');
      const cash = assetGroup?.accounts.find((a) => a.source_name === 'Cash');
      expect(cash?.is_active).toBe(true);
      // Score + target_name must be preserved — we didn't splice and re-create.
      expect(cash?.source_number).toBe('1000');
    });
  });

  describe('downstream invalidation', () => {
    function setupFullyCompletedStore() {
      const store = useMigrationStore.getState();
      // Set data before completing each step to avoid triggering invalidation
      store.setSourceERP(mockERP);
      store.setTargetERP(mockTargetERP);
      store.completeStep(0);
      store.setStep(1);
      store.setSourceData(mockFile, mockSourceData);
      store.setTargetData(mockFile, [{ account: '3000', name: 'Equity' }]);
      store.setMappingData(
        { name: 'mapping.csv', rowCount: 5, fileId: createFileId('mapping-1') },
        [{ source: 'Asset', target: 'Assets' }],
      );
      store.completeStep(1);
      store.setStep(2);
      store.setTypeMappingRows(mockTypeMappingRows);
      store.setTargetTypes(['Assets', 'Liabilities']);
      store.completeStep(2);
      store.setStep(3);
      store.setGroupedMappings(mockGroupedMappings);
      store.confirmConfidenceLevel('high');
      store.completeStep(3);
      return store;
    }

    it('changing source ERP invalidates steps 1+ and clears downstream data', () => {
      setupFullyCompletedStore();
      const newERP: ERPSystem = { id: 'quickbooks', name: 'QuickBooks', description: 'QB', fields: [] };

      useMigrationStore.getState().setSourceERP(newERP);

      const state = useMigrationStore.getState();
      expect(state.currentStep).toBe(0);
      expect(state.completedSteps).toEqual([0]);
      expect(state.sourceERP).toEqual(newERP);
      expect(state.sourceFile).toBeNull();
      expect(state.sourceData).toEqual([]);
      expect(state.targetFile).toBeNull();
      expect(state.typeMappingRows).toEqual([]);
      expect(state.targetTypes).toEqual([]);
      expect(state.groupedMappings).toEqual([]);
      expect(state.confirmedHigh).toBe(false);
    });

    it('changing target ERP invalidates steps 1+ and clears downstream data', () => {
      setupFullyCompletedStore();
      const newERP: ERPSystem = { id: 'dynamics365', name: 'Dynamics 365', description: 'D365', fields: [] };

      useMigrationStore.getState().setTargetERP(newERP);

      const state = useMigrationStore.getState();
      expect(state.currentStep).toBe(0);
      expect(state.completedSteps).toEqual([0]);
      expect(state.targetERP).toEqual(newERP);
      expect(state.sourceFile).toBeNull();
      expect(state.typeMappingRows).toEqual([]);
      expect(state.groupedMappings).toEqual([]);
    });

    it('re-uploading source file invalidates steps 2+ and resets currentStep', () => {
      setupFullyCompletedStore();
      const newFile: UploadedFile = { name: 'new-source.xlsx', rowCount: 5, fileId: createFileId('file-2') };
      const newData = [{ account: '9000', name: 'Revenue' }];

      useMigrationStore.getState().setSourceData(newFile, newData);

      const state = useMigrationStore.getState();
      expect(state.currentStep).toBe(1);
      expect(state.completedSteps).toEqual([0, 1]);
      expect(state.sourceFile).toEqual(newFile);
      expect(state.sourceData).toEqual(newData);
      expect(state.typeMappingRows).toEqual([]);
      expect(state.targetTypes).toEqual([]);
      expect(state.groupedMappings).toEqual([]);
      expect(state.confirmedHigh).toBe(false);
    });

    it('re-uploading target file invalidates steps 2+', () => {
      setupFullyCompletedStore();
      const newFile: UploadedFile = { name: 'new-target.xlsx', rowCount: 3, fileId: createFileId('file-3') };

      useMigrationStore.getState().setTargetData(newFile, []);

      const state = useMigrationStore.getState();
      expect(state.currentStep).toBe(1);
      expect(state.completedSteps).toEqual([0, 1]);
      expect(state.typeMappingRows).toEqual([]);
      expect(state.groupedMappings).toEqual([]);
    });

    it('re-uploading mapping file invalidates steps 2+', () => {
      setupFullyCompletedStore();
      const newFile: UploadedFile = { name: 'new-mapping.csv', rowCount: 2, fileId: createFileId('file-4') };

      useMigrationStore.getState().setMappingData(newFile, []);

      const state = useMigrationStore.getState();
      expect(state.currentStep).toBe(1);
      expect(state.completedSteps).toEqual([0, 1]);
      expect(state.typeMappingRows).toEqual([]);
    });

    it('first-time upload does not invalidate any steps', () => {
      const store = useMigrationStore.getState();
      // No steps completed yet
      store.setSourceData(mockFile, mockSourceData);

      const state = useMigrationStore.getState();
      expect(state.completedSteps).toEqual([]);
      expect(state.sourceFile).toEqual(mockFile);
      expect(state.sourceData).toEqual(mockSourceData);
    });

    it('first-time ERP selection does not invalidate any steps', () => {
      const store = useMigrationStore.getState();
      // No steps completed yet
      store.setSourceERP(mockERP);

      const state = useMigrationStore.getState();
      expect(state.completedSteps).toEqual([]);
      expect(state.sourceERP).toEqual(mockERP);
    });

    it('setting same ERP does not invalidate (hydration restore)', () => {
      setupFullyCompletedStore();

      // Re-set the same ERP (simulates hydration restoring the value)
      useMigrationStore.getState().setSourceERP(mockERP);

      const state = useMigrationStore.getState();
      expect(state.completedSteps).toEqual([0, 1, 2, 3]);
      expect(state.sourceFile).not.toBeNull();
      expect(state.typeMappingRows).toEqual(mockTypeMappingRows);
      expect(state.groupedMappings).toHaveLength(2);
    });

    it('setting same file does not invalidate (hydration restore)', () => {
      setupFullyCompletedStore();

      // Re-set the same file (simulates hydration restoring)
      useMigrationStore.getState().setSourceData(mockFile, mockSourceData);

      const state = useMigrationStore.getState();
      expect(state.completedSteps).toEqual([0, 1, 2, 3]);
      expect(state.typeMappingRows).toEqual(mockTypeMappingRows);
      expect(state.groupedMappings).toHaveLength(2);
    });

    it('invalidateFromStep directly clears steps and data from given step', () => {
      setupFullyCompletedStore();

      useMigrationStore.getState().invalidateFromStep(2);

      const state = useMigrationStore.getState();
      expect(state.completedSteps).toEqual([0, 1]);
      expect(state.sourceFile).not.toBeNull(); // step 1 data preserved
      expect(state.typeMappingRows).toEqual([]);
      expect(state.groupedMappings).toEqual([]);
      expect(state.confirmedHigh).toBe(false);
    });

    it('invalidateFromStep(1) clears files and all downstream data', () => {
      setupFullyCompletedStore();

      useMigrationStore.getState().invalidateFromStep(1);

      const state = useMigrationStore.getState();
      expect(state.completedSteps).toEqual([0]);
      expect(state.sourceFile).toBeNull();
      expect(state.targetFile).toBeNull();
      expect(state.mappingFile).toBeNull();
      expect(state.typeMappingRows).toEqual([]);
      expect(state.groupedMappings).toEqual([]);
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
      expect(state.confirmedHigh).toBe(false);
      expect(state.confirmedMedium).toBe(false);
      expect(state.confirmedLow).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('reset() preserves confidenceFilter so it survives hydration cycles', () => {
      const store = useMigrationStore.getState();
      store.setConfidenceFilter('high');
      store.reset();
      expect(useMigrationStore.getState().confidenceFilter).toBe('high');
    });
  });

  describe('confidenceFilter', () => {
    it('setConfidenceFilter stores the selected level', () => {
      useMigrationStore.getState().setConfidenceFilter('medium');
      expect(useMigrationStore.getState().confidenceFilter).toBe('medium');
    });

    it('setConfidenceFilter accepts null to clear the filter', () => {
      const store = useMigrationStore.getState();
      store.setConfidenceFilter('high');
      store.setConfidenceFilter(null);
      expect(useMigrationStore.getState().confidenceFilter).toBeNull();
    });

    it('setProjectId clears confidenceFilter when switching to a new project', () => {
      const store = useMigrationStore.getState();
      store.setProjectId('project-a');
      store.setConfidenceFilter('low');
      store.setProjectId('project-b');
      expect(useMigrationStore.getState().confidenceFilter).toBeNull();
    });

    it('setProjectId does NOT clear confidenceFilter when setting the same project', () => {
      const store = useMigrationStore.getState();
      store.setProjectId('project-a');
      store.setConfidenceFilter('high');
      store.setProjectId('project-a');
      expect(useMigrationStore.getState().confidenceFilter).toBe('high');
    });
  });
});
