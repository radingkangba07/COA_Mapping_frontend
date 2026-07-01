import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import { useERPConfig } from '@/features/erp-config/hooks/useERPConfig';
import type {
  ConnectionMethod,
  ProjectScopeDraft,
  ProjectScopeSeed,
} from '../types/project-scope.types';
import type { ProjectCreate } from '../types/projects.types';
import { createProject } from '../services/projects.service';
import { useProjectScopeStore } from '../store/project-scope.store';
import {
  selectCanCreateProject,
  selectConnectionReady,
  selectDraft,
  selectIsSavingDraft,
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
export function buildCreatePayload(draft: ProjectScopeDraft): ProjectCreate {
  return {
    // manual name from entry modal -> draft.name -> create payload (NO generation)
    name: draft.name,
    description: draft.description !== '' ? draft.description : undefined,
    companyId: draft.companyId ?? undefined,
    // The create endpoint requires org_id; the company id doubles as the org
    // id here, mirroring the existing useCreateProject fallback.
    orgId: draft.companyId ?? undefined,
    sourceErp: draft.source ?? undefined,
    targetErp: draft.target ?? undefined,
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
  readonly source: string | null;
  readonly target: string | null;
  readonly sourceMethod: ConnectionMethod;
  readonly targetMethod: ConnectionMethod;
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
  readonly setSource: (id: string | null) => void;
  readonly setTarget: (id: string | null) => void;
  readonly setSourceMethod: (m: ConnectionMethod) => void;
  readonly setTargetMethod: (m: ConnectionMethod) => void;
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
  const connectionReady = useProjectScopeStore(selectConnectionReady);
  const isSavingDraft = useProjectScopeStore(selectIsSavingDraft);
  const canCreate = useProjectScopeStore(selectCanCreateProject);

  const toast = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  // ─── ERP list ──────────────────────────────────────────────────────────────
  const { erpSystems, isLoading: isLoadingErps } = useERPConfig();

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
      const payload = buildCreatePayload(useProjectScopeStore.getState().draft);
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
  }, [createDisabled, toast, queryClient]);

  return {
    draft,
    // manual name/description from entry modal -> draft (NO generation)
    name: draft.name,
    description: draft.description,
    // company carried from entry modal -> draft.companyId -> create payload
    companyId: draft.companyId,
    source,
    target,
    sourceMethod,
    targetMethod,
    connectionReady,
    isSavingDraft,
    isCreating,
    erpSystems,
    isLoadingErps,
    sourceName,
    targetName,
    isCompatible,
    createDisabled,
    setSource,
    setTarget,
    setSourceMethod,
    setTargetMethod,
    saveDraft,
    create,
  };
}
