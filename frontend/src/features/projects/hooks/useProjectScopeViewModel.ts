import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import { getERPById } from '@/shared/constants/erp-systems';
import { useERPConfig } from '@/features/erp-config/hooks/useERPConfig';
import {
  CONNECTION_METHODS,
  type ConnectionMethod,
  type MCPConnection,
  type ProjectScopeDraft,
  type ProjectScopeSeed,
} from '../types/project-scope.types';
import type { ProjectCreate, ProjectGroup } from '../types/projects.types';
import type { OrgId } from '@/shared/types/common.types';
import { createProject } from '../services/projects.service';
import { useUserOrgs } from './useUserOrgs';
import { useProjectScopeStore } from '../store/project-scope.store';
import {
  selectCanCreateProject,
  selectConnection,
  selectConnectionReady,
  selectDraft,
  selectIsSavingDraft,
  selectMembersCount,
  selectSource,
  selectSourceMethod,
  selectTarget,
  selectTargetMethod,
} from '../store/project-scope.selectors';

// ─── Pure Payload Builder ───────────────────────────────────────────────────

/**
 * Maps the company + ERP identity portion of the scope draft into the
 * deferred Create payload. Pure + exported for unit testing.
 *
 * company carried from entry modal -> draft.companyId -> create payload
 */
// Translates dropdown values (CONNECTION_METHODS) to backend catalog ids.
const _CONNECTION_METHOD_MAP: Record<ConnectionMethod, string> = {
  [CONNECTION_METHODS.CSV]: 'csv_file',
  [CONNECTION_METHODS.MCP]: 'mcp_server',
};

export function buildCreatePayload(draft: ProjectScopeDraft): ProjectCreate {
  return {
    name: draft.name,
    action: 'create',
    description: draft.description !== '' ? draft.description : undefined,
    companyId: draft.companyId ?? undefined,
    orgId: draft.companyId ?? undefined,
    sourceErp: draft.source ?? undefined,
    targetErp: draft.target ?? undefined,
    sourceProductId: draft.source ?? undefined,
    targetProductId: draft.target ?? undefined,
    // Each product belongs to exactly one vendor, so the backend vendor key is
    // derived from the selected product — action=create requires both.
    sourceVendorId: draft.source ? getERPById(draft.source)?.vendorId : undefined,
    targetVendorId: draft.target ? getERPById(draft.target)?.vendorId : undefined,
    sourceConnectionMethodId: draft.sourceMethod
      ? (_CONNECTION_METHOD_MAP[draft.sourceMethod] ?? draft.sourceMethod)
      : undefined,
    targetConnectionMethodId: draft.targetMethod
      ? (_CONNECTION_METHOD_MAP[draft.targetMethod] ?? draft.targetMethod)
      : undefined,
    masterDataSelections: (() => {
      if (draft.scope.selectedMasterData.length === 0) return undefined;
      // selectedMasterData stores column-keyed entries ("chart-of-accounts:dataConversion").
      // The API expects one entry per item ID, so strip the column suffix and deduplicate.
      const uniqueIds = [
        ...new Set(
          draft.scope.selectedMasterData
            .map((key) => key.split(':')[0])
            .filter((id): id is string => id !== undefined),
        ),
      ];
      return uniqueIds.map((id) => ({ data_type: id, selected: true }));
    })(),
    openingBalanceSelections:
      draft.scope.selectedOpeningBalances.length > 0
        ? draft.scope.selectedOpeningBalances.map((id) => ({ account_type: id, include: true }))
        : undefined,
    members: undefined, // members are added after project creation
  };
}

// ─── ViewModel Contract ─────────────────────────────────────────────────────

export interface ProjectScopeViewModel {
  // Draft state
  readonly draft: ProjectScopeDraft;
  // manual name from entry modal -> draft.name (NO generation); description likewise
  readonly name: string;
  readonly description: string;
  readonly companyId: string | null;
  // On-page entry: company picker options + create-company gating (DA-3).
  readonly companyOptions: readonly ProjectGroup[];
  readonly parentOrgId: OrgId | null;
  readonly memberCount: number;
  readonly source: string | null;
  readonly target: string | null;
  // Per-side connection method + single shared connection + its readiness gate.
  readonly sourceMethod: ConnectionMethod;
  readonly targetMethod: ConnectionMethod;
  readonly connection: MCPConnection;
  readonly connectionReady: boolean;
  readonly isSavingDraft: boolean;
  readonly isCreating: boolean;

  // ERP list + resolved display names
  readonly erpSystems: ReturnType<typeof useERPConfig>['erpSystems'];
  readonly isLoadingErps: boolean;
  readonly sourceName: string | null;
  readonly targetName: string | null;

  // Derived gating
  readonly isCompatible: boolean;
  readonly createDisabled: boolean;

  // Action callbacks
  readonly setName: (value: string) => void;
  readonly setDescription: (value: string) => void;
  readonly setCompanyId: (id: string | null) => void;
  readonly setSource: (id: string | null) => void;
  readonly setTarget: (id: string | null) => void;
  readonly setSourceMethod: (m: ConnectionMethod) => void;
  readonly setTargetMethod: (m: ConnectionMethod) => void;
  readonly updateConnection: (patch: Partial<MCPConnection>) => void;
  readonly setConnectionReady: (ready: boolean) => void;
  readonly saveDraft: () => Promise<void>;
  readonly create: () => Promise<boolean>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useProjectScopeViewModel(
  seed: ProjectScopeSeed,
): ProjectScopeViewModel {
  // Seed the draft once on mount from entry-modal route params.
  // Depend on primitive seed fields (not the object) to avoid re-seeding loops.
  const { companyId, name, description } = seed;
  useEffect(() => {
    useProjectScopeStore.getState().initFromSeed({ companyId, name, description });
    // Seeding once on mount is the intent — exclude seed fields from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Store slices ──────────────────────────────────────────────────────────
  const draft = useProjectScopeStore(selectDraft);
  const source = useProjectScopeStore(selectSource);
  const target = useProjectScopeStore(selectTarget);
  const sourceMethod = useProjectScopeStore(selectSourceMethod);
  const targetMethod = useProjectScopeStore(selectTargetMethod);
  const connection = useProjectScopeStore(selectConnection);
  const connectionReady = useProjectScopeStore(selectConnectionReady);
  const isSavingDraft = useProjectScopeStore(selectIsSavingDraft);
  const memberCount = useProjectScopeStore(selectMembersCount);
  const canCreate = useProjectScopeStore(selectCanCreateProject);

  const toast = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  // ─── ERP list ──────────────────────────────────────────────────────────────
  const { erpSystems, isLoading: isLoadingErps } = useERPConfig();

  // ─── Company options (on-page entry) ─────────────────────────────────────────
  const { orgs: companyOptions, employerOrgs } = useUserOrgs(true);
  const parentOrgId = employerOrgs[0]?.id ?? null;

  const resolveName = useCallback(
    (id: string | null): string | null => {
      if (id === null) {
        return null;
      }
      const match = erpSystems.find((erp) => erp.id === id);
      return match?.name ?? id;
    },
    [erpSystems],
  );

  const sourceName = resolveName(source);
  const targetName = resolveName(target);

  // ─── Derived gating ──────────────────────────────────────────────────────────
  const isCompatible = source !== null && target !== null && source !== target;
  const createDisabled = !canCreate;

  // ─── Action callbacks ───────────────────────────────────────────────────────
  const setName = useCallback((value: string): void => {
    useProjectScopeStore.getState().setName(value);
  }, []);

  const setDescription = useCallback((value: string): void => {
    useProjectScopeStore.getState().setDescription(value);
  }, []);

  const setCompanyId = useCallback((id: string | null): void => {
    useProjectScopeStore.getState().setCompanyId(id);
  }, []);

  const setSource = useCallback((id: string | null): void => {
    useProjectScopeStore.getState().setSource(id);
  }, []);

  const setTarget = useCallback((id: string | null): void => {
    useProjectScopeStore.getState().setTarget(id);
  }, []);

  const setSourceMethod = useCallback((m: ConnectionMethod): void => {
    useProjectScopeStore.getState().setSourceMethod(m);
  }, []);

  const setTargetMethod = useCallback((m: ConnectionMethod): void => {
    useProjectScopeStore.getState().setTargetMethod(m);
  }, []);

  const updateConnection = useCallback(
    (patch: Partial<MCPConnection>): void => {
      useProjectScopeStore.getState().updateConnection(patch);
    },
    [],
  );

  const setConnectionReady = useCallback((ready: boolean): void => {
    useProjectScopeStore.getState().setConnectionReady(ready);
  }, []);

  const saveDraft = useCallback(async (): Promise<void> => {
    const res = await useProjectScopeStore.getState().saveDraft(httpClient);
    if (res.ok) {
      toast.showSuccess('Draft saved');
    } else {
      toast.showError(res.error.message ?? 'Failed to save draft');
    }
  }, [toast]);

  const create = useCallback(async (): Promise<boolean> => {
    if (createDisabled) {
      return false;
    }
    setIsCreating(true);
    try {
      const draft = useProjectScopeStore.getState().draft;
      const base = buildCreatePayload(draft);
      // Fall back to the user's employer org when no company was selected on entry
      const effectiveOrgId = draft.companyId ?? (parentOrgId as string | null) ?? undefined;
      const payload: typeof base = { ...base, orgId: base.orgId ?? effectiveOrgId };
      const result = await createProject(httpClient, payload);
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ['projects'] });
        toast.showSuccess('Project created');
        useProjectScopeStore.getState().reset();
        return true;
      }
      toast.showError(result.error.message ?? 'Failed to create project');
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [createDisabled, toast, queryClient, parentOrgId]);

  return {
    draft,
    // manual name/description from entry modal -> draft (NO generation)
    name: draft.name,
    description: draft.description,
    // company carried from entry modal -> draft.companyId -> create payload
    companyId: draft.companyId,
    companyOptions,
    parentOrgId,
    memberCount,
    source,
    target,
    sourceMethod,
    targetMethod,
    connection,
    connectionReady,
    isSavingDraft,
    isCreating,
    erpSystems,
    isLoadingErps,
    sourceName,
    targetName,
    isCompatible,
    createDisabled,
    setName,
    setDescription,
    setCompanyId,
    setSource,
    setTarget,
    setSourceMethod,
    setTargetMethod,
    updateConnection,
    setConnectionReady,
    saveDraft,
    create,
  };
}
