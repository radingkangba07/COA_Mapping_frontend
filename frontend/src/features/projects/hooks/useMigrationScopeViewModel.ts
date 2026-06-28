import { useCallback, useMemo } from 'react';
import {
  MASTER_DATA_ITEMS,
  type MasterDataColumn,
} from '../components/MigrationScope.config';
import { useProjectScopeStore } from '../store/project-scope.store';
import {
  masterDataColumnKey,
  selectMasterDataCount,
  selectSelectedMasterData,
} from '../store/project-scope.selectors';

export interface MasterDataRowVM {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly dataConversion: boolean;
  readonly mdm: boolean;
}

export interface MigrationScopeViewModel {
  readonly masterData: readonly MasterDataRowVM[];
  readonly masterDataTotal: number;
  readonly masterDataCount: number;
  readonly toggleMasterDataColumn: (
    id: string,
    column: MasterDataColumn,
  ) => void;
}

export function useMigrationScopeViewModel(): MigrationScopeViewModel {
  const selected = useProjectScopeStore(selectSelectedMasterData);
  const masterDataCount = useProjectScopeStore(selectMasterDataCount);

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

  const toggleMasterDataColumn = useCallback(
    (id: string, column: MasterDataColumn): void => {
      useProjectScopeStore
        .getState()
        .toggleMasterData(masterDataColumnKey(id, column));
    },
    [],
  );

  return {
    masterData,
    masterDataTotal: MASTER_DATA_ITEMS.length,
    masterDataCount,
    toggleMasterDataColumn,
  };
}
