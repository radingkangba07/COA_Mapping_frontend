import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import {
  masterDataColumnKey,
  MASTER_DATA_COLUMN_SEPARATOR,
  selectMasterDataCount,
  selectOpeningBalancesCount,
  selectSelectedMasterData,
} from '@/features/projects/store/project-scope.selectors';
import {
  CHART_OF_ACCOUNTS_ID,
  MASTER_DATA_ITEMS,
  OPENING_BALANCE_ITEMS,
} from '@/features/projects/components/MigrationScope.config';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('migration-scope selectors', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
  });

  describe('config invariants', () => {
    it('has 9 master-data items and 5 opening-balance items', () => {
      expect(MASTER_DATA_ITEMS.length).toBe(9);
      expect(OPENING_BALANCE_ITEMS.length).toBe(5);
    });
  });

  describe('masterDataColumnKey encoding', () => {
    it('encodes id and column with the separator', () => {
      expect(masterDataColumnKey(CHART_OF_ACCOUNTS_ID, 'dataConversion')).toBe(
        `${CHART_OF_ACCOUNTS_ID}${MASTER_DATA_COLUMN_SEPARATOR}dataConversion`,
      );
      expect(masterDataColumnKey('customers', 'mdm')).toBe(
        `customers${MASTER_DATA_COLUMN_SEPARATOR}mdm`,
      );
    });
  });

  describe('selectMasterDataCount', () => {
    it('counts distinct items even when both columns of one item are toggled', () => {
      const store = useProjectScopeStore.getState();
      store.toggleMasterData(
        masterDataColumnKey(CHART_OF_ACCOUNTS_ID, 'dataConversion'),
      );
      store.toggleMasterData(masterDataColumnKey(CHART_OF_ACCOUNTS_ID, 'mdm'));

      // Both columns belong to one item -> distinct count is 1.
      expect(selectSelectedMasterData(useProjectScopeStore.getState())).toEqual(
        [
          masterDataColumnKey(CHART_OF_ACCOUNTS_ID, 'dataConversion'),
          masterDataColumnKey(CHART_OF_ACCOUNTS_ID, 'mdm'),
        ],
      );
      expect(selectMasterDataCount(useProjectScopeStore.getState())).toBe(1);
    });

    it('increments to 2 when a second distinct item is toggled', () => {
      const store = useProjectScopeStore.getState();
      store.toggleMasterData(
        masterDataColumnKey(CHART_OF_ACCOUNTS_ID, 'dataConversion'),
      );
      store.toggleMasterData(masterDataColumnKey(CHART_OF_ACCOUNTS_ID, 'mdm'));
      store.toggleMasterData(masterDataColumnKey('customers', 'dataConversion'));

      expect(selectMasterDataCount(useProjectScopeStore.getState())).toBe(2);
    });

    it('is 0 initially', () => {
      expect(selectMasterDataCount(useProjectScopeStore.getState())).toBe(0);
    });
  });

  describe('selectOpeningBalancesCount', () => {
    it('reflects toggleOpeningBalances', () => {
      const store = useProjectScopeStore.getState();
      expect(selectOpeningBalancesCount(useProjectScopeStore.getState())).toBe(
        0,
      );

      store.toggleOpeningBalances('gl-balances');
      expect(selectOpeningBalancesCount(useProjectScopeStore.getState())).toBe(
        1,
      );

      store.toggleOpeningBalances('ar-balances');
      expect(selectOpeningBalancesCount(useProjectScopeStore.getState())).toBe(
        2,
      );

      // Toggling the same id off decrements the count.
      store.toggleOpeningBalances('gl-balances');
      expect(selectOpeningBalancesCount(useProjectScopeStore.getState())).toBe(
        1,
      );
    });
  });
});
