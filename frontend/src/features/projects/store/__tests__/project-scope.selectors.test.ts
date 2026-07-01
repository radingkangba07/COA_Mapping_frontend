import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import {
  selectAggregation,
  selectCanCreateProject,
  selectSelectedMasterData,
  selectSelectedOpeningBalances,
} from '@/features/projects/store/project-scope.selectors';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('project-scope selectors', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
  });

  describe('scope slice selectors', () => {
    it('returns selected master data after mutation', () => {
      useProjectScopeStore.getState().setMasterData(['accounts']);
      expect(
        selectSelectedMasterData(useProjectScopeStore.getState()),
      ).toEqual(['accounts']);
    });

    it('returns selected opening balances after mutation', () => {
      useProjectScopeStore.getState().setOpeningBalances(['balances']);
      expect(
        selectSelectedOpeningBalances(useProjectScopeStore.getState()),
      ).toEqual(['balances']);
    });

    it('returns aggregation mode after mutation', () => {
      useProjectScopeStore.getState().setAggregation('byParent');
      expect(selectAggregation(useProjectScopeStore.getState())).toBe(
        'byParent',
      );
    });
  });

  describe('selectCanCreateProject', () => {
    // seedValid leaves both sides at their 'csv' default, so the gate depends
    // only on company + distinct ERPs.
    const seedValid = (): void => {
      const store = useProjectScopeStore.getState();
      store.initFromSeed({ companyId: 'co-1', name: 'P' });
      store.setSource('sap');
      store.setTarget('xero');
    };

    it('is false when company is missing', () => {
      const store = useProjectScopeStore.getState();
      store.setSource('sap');
      store.setTarget('xero');
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        false,
      );
    });

    it('is false when one ERP is missing', () => {
      const store = useProjectScopeStore.getState();
      store.initFromSeed({ companyId: 'co-1', name: 'P' });
      store.setSource('sap');
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        false,
      );
    });

    it('is false when source equals target', () => {
      const store = useProjectScopeStore.getState();
      store.initFromSeed({ companyId: 'co-1', name: 'P' });
      store.setSource('sap');
      store.setTarget('sap');
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        false,
      );
    });

    it('is false when source method is mcp and source connection is not ready', () => {
      seedValid();
      useProjectScopeStore.getState().setSourceMethod('mcp');
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        false,
      );
    });

    it('is true when an mcp side has the shared connection ready (other side csv)', () => {
      seedValid();
      useProjectScopeStore.getState().setSourceMethod('mcp');
      useProjectScopeStore.getState().setConnectionReady(true);
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        true,
      );
    });

    it('is true for the default csv/csv combination without any test connection', () => {
      seedValid();
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        true,
      );
    });
  });
});
