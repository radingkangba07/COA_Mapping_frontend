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
      store.setConnectionReady(true);
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        false,
      );
    });

    it('is false when one ERP is missing', () => {
      const store = useProjectScopeStore.getState();
      store.initFromSeed({ companyId: 'co-1', name: 'P' });
      store.setSource('sap');
      store.setConnectionReady(true);
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        false,
      );
    });

    it('is false when source equals target', () => {
      const store = useProjectScopeStore.getState();
      store.initFromSeed({ companyId: 'co-1', name: 'P' });
      store.setSource('sap');
      store.setTarget('sap');
      store.setConnectionReady(true);
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        false,
      );
    });

    it('is false when method is mcp and connection is not ready', () => {
      seedValid();
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        false,
      );
    });

    it('is true when company + distinct ERPs + connectionReady (mcp)', () => {
      seedValid();
      useProjectScopeStore.getState().setConnectionReady(true);
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        true,
      );
    });

    it('is true for csv method without connectionReady', () => {
      seedValid();
      useProjectScopeStore.getState().setMethod('csv');
      expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(
        true,
      );
    });
  });
});
