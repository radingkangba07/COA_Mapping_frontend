import type { AppError } from '@/shared/types/result.types';
import {
  MASTER_DATA_ITEMS,
  OPENING_BALANCE_ITEMS,
} from '../components/MigrationScope.config';
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

// LEGACY selectors — retained ONLY for the untouchable features/migration
// consumer (useFetchFromErp). Map onto the source side (DA-48).
export const selectMethod = (state: ProjectScopeStore): ConnectionMethod =>
  state.draft.method;

export const selectConnection = (state: ProjectScopeStore): MCPConnection =>
  state.draft.sourceConnection;

export const selectSourceMethod = (
  state: ProjectScopeStore,
): ConnectionMethod => state.draft.sourceMethod;

export const selectTargetMethod = (
  state: ProjectScopeStore,
): ConnectionMethod => state.draft.targetMethod;

export const selectSourceConnection = (
  state: ProjectScopeStore,
): MCPConnection => state.draft.sourceConnection;

export const selectTargetConnection = (
  state: ProjectScopeStore,
): MCPConnection => state.draft.targetConnection;

export const selectMembers = (
  state: ProjectScopeStore,
): readonly ProjectScopeMember[] => state.draft.members;

export const selectMembersCount = (state: ProjectScopeStore): number =>
  state.draft.members.length;

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

// LEGACY gate selector — retained for features/migration's useFetchFromErp.
export const selectConnectionReady = (state: ProjectScopeStore): boolean =>
  state.connectionReady;

export const selectSourceConnectionReady = (
  state: ProjectScopeStore,
): boolean => state.sourceConnectionReady;

export const selectTargetConnectionReady = (
  state: ProjectScopeStore,
): boolean => state.targetConnectionReady;

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
  const { draft, sourceConnectionReady, targetConnectionReady } = state;
  const hasCompany = draft.companyId !== null && draft.companyId !== '';
  const hasBothErps = draft.source !== null && draft.target !== null;
  const erpsDistinct = draft.source !== draft.target;
  // Each side independently satisfies the gate: CSV needs no test connection,
  // MCP requires that side's successful test connection (DA-48).
  const sourceSatisfied =
    draft.sourceMethod === 'csv' || sourceConnectionReady;
  const targetSatisfied =
    draft.targetMethod === 'csv' || targetConnectionReady;

  return (
    hasCompany &&
    hasBothErps &&
    erpsDistinct &&
    sourceSatisfied &&
    targetSatisfied
  );
};

// ─── Project Summary Aggregation ──────────────────────────────────────────────

export interface ProjectScopeSummary {
  readonly source: string | null;
  readonly target: string | null;
  readonly sourceMethod: ConnectionMethod;
  readonly targetMethod: ConnectionMethod;
  readonly masterDataCount: number;
  readonly masterDataTotal: number;
  readonly openingBalancesCount: number;
  readonly openingBalancesTotal: number;
  readonly members: number;
}

export const selectProjectSummary = (
  state: ProjectScopeStore,
): ProjectScopeSummary => ({
  source: state.draft.source,
  target: state.draft.target,
  sourceMethod: state.draft.sourceMethod,
  targetMethod: state.draft.targetMethod,
  masterDataCount: selectMasterDataCount(state),
  masterDataTotal: MASTER_DATA_ITEMS.length,
  openingBalancesCount: selectOpeningBalancesCount(state),
  openingBalancesTotal: OPENING_BALANCE_ITEMS.length,
  members: state.draft.members.length,
});
