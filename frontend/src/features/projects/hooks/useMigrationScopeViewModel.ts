import { useCallback, useMemo } from 'react';
import {
  CHART_OF_ACCOUNTS_ID,
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
  selectSourceMethod,
  selectTargetMethod,
  selectSelectedMasterData,
  selectSelectedOpeningBalances,
} from '../store/project-scope.selectors';

export interface MasterDataRowVM {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly dataConversion: boolean;
  readonly mdm: boolean;
  readonly disabled: boolean;
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
  // The Chart of Accounts row is gated on a successful test connection — but
  // ONLY when at least one side actually uses MCP. A CSV-only project has no
  // test connection, so CoA must not be permanently disabled.
  const connectionReady = useProjectScopeStore(selectConnectionReady);
  const sourceMethod = useProjectScopeStore(selectSourceMethod);
  const targetMethod = useProjectScopeStore(selectTargetMethod);
  const usesMcp = sourceMethod === 'mcp' || targetMethod === 'mcp';
  const coaGated = usesMcp && !connectionReady;

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
        disabled: item.id === CHART_OF_ACCOUNTS_ID && coaGated,
      })),
    [selected, coaGated],
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
