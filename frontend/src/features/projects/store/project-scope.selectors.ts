import type { AppError } from '@/shared/types/result.types';
import type {
  AggregationMode,
  ConnectionMethod,
  MCPConnection,
  ProjectScopeDraft,
  ProjectScopeMember,
  ProjectScopeStore,
  RequestStatus,
} from '../types/project-scope.types';

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

export const selectSourceMethod = (state: ProjectScopeStore): ConnectionMethod =>
  state.draft.sourceMethod;

export const selectTargetMethod = (state: ProjectScopeStore): ConnectionMethod =>
  state.draft.targetMethod;

export const selectConnection = (state: ProjectScopeStore): MCPConnection =>
  state.draft.connection;

export const selectMembers = (
  state: ProjectScopeStore,
): readonly ProjectScopeMember[] => state.draft.members;

export const selectSelectedMasterData = (
  state: ProjectScopeStore,
): readonly string[] => state.draft.scope.selectedMasterData;

export const selectSelectedOpeningBalances = (
  state: ProjectScopeStore,
): readonly string[] => state.draft.scope.selectedOpeningBalances;

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
  const needsMcp = draft.sourceMethod === 'mcp' || draft.targetMethod === 'mcp';
  const connectionSatisfied = !needsMcp || connectionReady;

  return hasCompany && hasBothErps && erpsDistinct && connectionSatisfied;
};
