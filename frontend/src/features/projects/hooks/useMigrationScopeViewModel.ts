import { useCallback, useMemo } from 'react';
import {
  MASTER_DATA_ITEMS,
  OPENING_BALANCE_ITEMS,
  type MasterDataColumn,
} from '../components/MigrationScope.config';
import { useProjectScopeStore } from '../store/project-scope.store';
import {
  masterDataColumnKey,
  selectMasterDataCount,
  selectOpeningBalancesCount,
  selectConnectionReady,
  selectSelectedMasterData,
  selectSelectedOpeningBalances,
} from '../store/project-scope.selectors';

export interface MasterDataRowVM {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly dataConversion: boolean;
  readonly mdm: boolean;
}

export interface OpeningBalanceRowVM {
  readonly id: string;
  readonly label: string;
  readonly selected: boolean;
}

export interface MigrationScopeViewModel {
  readonly masterData: readonly MasterDataRowVM[];
  readonly masterDataTotal: number;
  readonly masterDataCount: number;
  readonly toggleMasterDataColumn: (
    id: string,
    column: MasterDataColumn,
  ) => void;
  readonly openingBalances: readonly OpeningBalanceRowVM[];
  readonly openingBalancesTotal: number;
  readonly openingBalancesCount: number;
  readonly toggleOpeningBalance: (id: string) => void;
  readonly connectionReady: boolean;
}

export function useMigrationScopeViewModel(): MigrationScopeViewModel {
  const selected = useProjectScopeStore(selectSelectedMasterData);
  const masterDataCount = useProjectScopeStore(selectMasterDataCount);
  const selectedOB = useProjectScopeStore(selectSelectedOpeningBalances);
  const openingBalancesCount = useProjectScopeStore(
    selectOpeningBalancesCount,
  );
  // Retained for the Create-project gate and features/migration's fetch flow.
  const connectionReady = useProjectScopeStore(selectConnectionReady);

  const masterData = useMemo<readonly MasterDataRowVM[]>(
    () =>
      MASTER_DATA_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        dataConversion: selected.includes(
          masterDataColumnKey(item.id, 'dataConversion'),
        ),
        mdm: selected.includes(masterDataColumnKey(item.id, 'mdm')),
      })),
    [selected],
  );

  const openingBalances = useMemo<readonly OpeningBalanceRowVM[]>(
    () =>
      OPENING_BALANCE_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        selected: selectedOB.includes(item.id),
      })),
    [selectedOB],
  );

  const toggleMasterDataColumn = useCallback(
    (id: string, column: MasterDataColumn): void => {
      useProjectScopeStore
        .getState()
        .toggleMasterData(masterDataColumnKey(id, column));
    },
    [],
  );

  const toggleOpeningBalance = useCallback((id: string): void => {
    useProjectScopeStore.getState().toggleOpeningBalances(id);
  }, []);

  return {
    masterData,
    masterDataTotal: MASTER_DATA_ITEMS.length,
    masterDataCount,
    toggleMasterDataColumn,
    openingBalances,
    openingBalancesTotal: OPENING_BALANCE_ITEMS.length,
    openingBalancesCount,
    toggleOpeningBalance,
    connectionReady,
  };
}
