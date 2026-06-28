import type { AppError } from '@/shared/types/result.types';
import type { MasterDataColumn } from '../components/MigrationScope.config';
import type {
  AggregationMode,
  ConnectionMethod,
  MCPConnection,
  ProjectScopeDraft,
  ProjectScopeMember,
  ProjectScopeStore,
  RequestStatus,
} from '../types/project-scope.types';

// ─── Master Data Column Encoding ──────────────────────────────────────────────

export const MASTER_DATA_COLUMN_SEPARATOR = ':';

export const masterDataColumnKey = (
  id: string,
  column: MasterDataColumn,
): string => `${id}${MASTER_DATA_COLUMN_SEPARATOR}${column}`;

export const selectDraft = (state: ProjectScopeStore): ProjectScopeDraft =>
  state.draft;

export const selectCompanyId = (state: ProjectScopeStore): string | null =>
  state.draft.companyId;

export const selectName = (state: ProjectScopeStore): string =>
  state.draft.name;

export const selectDescription = (state: ProjectScopeStore): string =>
  state.draft.description;

export const selectSource = (state: ProjectScopeStore): string | null =>
  state.draft.source;

export const selectTarget = (state: ProjectScopeStore): string | null =>
  state.draft.target;

export const selectMethod = (state: ProjectScopeStore): ConnectionMethod =>
  state.draft.method;

export const selectConnection = (state: ProjectScopeStore): MCPConnection =>
  state.draft.connection;

export const selectMembers = (
  state: ProjectScopeStore,
): readonly ProjectScopeMember[] => state.draft.members;

export const selectSelectedMasterData = (
  state: ProjectScopeStore,
): readonly string[] => state.draft.scope.selectedMasterData;

export const selectMasterDataCount = (state: ProjectScopeStore): number =>
  new Set(
    state.draft.scope.selectedMasterData.map(
      (key) => key.split(MASTER_DATA_COLUMN_SEPARATOR)[0],
    ),
  ).size;

export const selectSelectedOpeningBalances = (
  state: ProjectScopeStore,
): readonly string[] => state.draft.scope.selectedOpeningBalances;

export const selectOpeningBalancesCount = (state: ProjectScopeStore): number =>
  state.draft.scope.selectedOpeningBalances.length;

export const selectAggregation = (
  state: ProjectScopeStore,
): AggregationMode => state.draft.scope.aggregation;

export const selectConnectionReady = (state: ProjectScopeStore): boolean =>
  state.connectionReady;

export const selectTestStatus = (state: ProjectScopeStore): RequestStatus =>
  state.testStatus;

export const selectFetchStatus = (state: ProjectScopeStore): RequestStatus =>
  state.fetchStatus;

export const selectIsSavingDraft = (state: ProjectScopeStore): boolean =>
  state.isSavingDraft;

export const selectScopeError = (
  state: ProjectScopeStore,
): AppError | null => state.error;

export const selectCanCreateProject = (state: ProjectScopeStore): boolean => {
  const { draft, connectionReady } = state;
  const hasCompany = draft.companyId !== null && draft.companyId !== '';
  const hasBothErps = draft.source !== null && draft.target !== null;
  const erpsDistinct = draft.source !== draft.target;
  const connectionSatisfied = draft.method === 'csv' || connectionReady;

  return hasCompany && hasBothErps && erpsDistinct && connectionSatisfied;
};
