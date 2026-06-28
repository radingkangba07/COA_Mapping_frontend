import { act, renderHook } from '@testing-library/react-native';
import { useMigrationScopeViewModel } from '@/features/projects/hooks/useMigrationScopeViewModel';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import { CHART_OF_ACCOUNTS_ID } from '@/features/projects/components/MigrationScope.config';

// ─── Helpers ────────────────────────────────────────────────────────────────

function findRow(
  rows: ReturnType<typeof useMigrationScopeViewModel>['masterData'],
  id: string,
): (typeof rows)[number] {
  const row = rows.find((r) => r.id === id);
  if (row === undefined) {
    throw new Error(`Master-data row "${id}" not found`);
  }
  return row;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useMigrationScopeViewModel', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
  });

  it('exposes initial totals and zero counts', () => {
    const { result } = renderHook(() => useMigrationScopeViewModel());

    expect(result.current.masterDataCount).toBe(0);
    expect(result.current.masterDataTotal).toBe(9);
    expect(result.current.openingBalancesCount).toBe(0);
    expect(result.current.openingBalancesTotal).toBe(5);
  });

  it('toggling dataConversion flips the row and bumps the master-data count', () => {
    const { result } = renderHook(() => useMigrationScopeViewModel());

    act(() => {
      result.current.toggleMasterDataColumn(
        CHART_OF_ACCOUNTS_ID,
        'dataConversion',
      );
    });

    const row = findRow(result.current.masterData, CHART_OF_ACCOUNTS_ID);
    expect(row.dataConversion).toBe(true);
    expect(row.mdm).toBe(false);
    expect(result.current.masterDataCount).toBe(1);
  });

  it('toggling the same row mdm keeps the distinct count at 1', () => {
    const { result } = renderHook(() => useMigrationScopeViewModel());

    act(() => {
      result.current.toggleMasterDataColumn(
        CHART_OF_ACCOUNTS_ID,
        'dataConversion',
      );
    });
    act(() => {
      result.current.toggleMasterDataColumn(CHART_OF_ACCOUNTS_ID, 'mdm');
    });

    const row = findRow(result.current.masterData, CHART_OF_ACCOUNTS_ID);
    expect(row.dataConversion).toBe(true);
    expect(row.mdm).toBe(true);
    expect(result.current.masterDataCount).toBe(1);
  });

  it('toggling an opening balance bumps the opening-balances count', () => {
    const { result } = renderHook(() => useMigrationScopeViewModel());

    act(() => {
      result.current.toggleOpeningBalance('gl-balances');
    });

    const ob = result.current.openingBalances.find(
      (item) => item.id === 'gl-balances',
    );
    expect(ob?.selected).toBe(true);
    expect(result.current.openingBalancesCount).toBe(1);
  });

  describe('chart-of-accounts gating', () => {
    it('gates the COA row until the connection is ready', () => {
      const { result } = renderHook(() => useMigrationScopeViewModel());

      expect(result.current.connectionReady).toBe(false);
      expect(findRow(result.current.masterData, CHART_OF_ACCOUNTS_ID).disabled).toBe(
        true,
      );

      act(() => {
        useProjectScopeStore.getState().setConnectionReady(true);
      });

      expect(result.current.connectionReady).toBe(true);
      expect(findRow(result.current.masterData, CHART_OF_ACCOUNTS_ID).disabled).toBe(
        false,
      );
    });

    it('never disables a non-COA row regardless of connection state', () => {
      const { result } = renderHook(() => useMigrationScopeViewModel());

      expect(findRow(result.current.masterData, 'customers').disabled).toBe(
        false,
      );

      act(() => {
        useProjectScopeStore.getState().setConnectionReady(true);
      });

      expect(findRow(result.current.masterData, 'customers').disabled).toBe(
        false,
      );
    });
  });
});
