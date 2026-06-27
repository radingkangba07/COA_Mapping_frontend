import { useCallback, useEffect } from 'react';
import { httpClient } from '@/shared/services/http/http.instance';
import { useERPConfig } from '@/features/erp-config/hooks/useERPConfig';
import type {
  ConnectionMethod,
  ProjectScopeDraft,
  ProjectScopeSeed,
} from '../types/project-scope.types';
import { useProjectScopeStore } from '../store/project-scope.store';
import {
  selectCanCreateProject,
  selectConnectionReady,
  selectDraft,
  selectIsSavingDraft,
  selectMethod,
  selectSource,
  selectTarget,
} from '../store/project-scope.selectors';

// ─── ViewModel Contract ─────────────────────────────────────────────────────

export interface ProjectScopeViewModel {
  // Draft state
  readonly draft: ProjectScopeDraft;
  readonly source: string | null;
  readonly target: string | null;
  readonly method: ConnectionMethod;
  readonly connectionReady: boolean;
  readonly isSavingDraft: boolean;

  // ERP list + resolved display names
  readonly erpSystems: ReturnType<typeof useERPConfig>['erpSystems'];
  readonly sourceName: string | null;
  readonly targetName: string | null;

  // Derived gating
  readonly isCompatible: boolean;
  readonly createDisabled: boolean;

  // Action callbacks
  readonly setSource: (id: string | null) => void;
  readonly setTarget: (id: string | null) => void;
  readonly setMethod: (m: ConnectionMethod) => void;
  readonly saveDraft: () => Promise<void>;
  readonly create: () => Promise<void>;
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
  const method = useProjectScopeStore(selectMethod);
  const connectionReady = useProjectScopeStore(selectConnectionReady);
  const isSavingDraft = useProjectScopeStore(selectIsSavingDraft);
  const canCreate = useProjectScopeStore(selectCanCreateProject);

  // ─── ERP list ──────────────────────────────────────────────────────────────
  const { erpSystems } = useERPConfig();

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

  const setMethod = useCallback((m: ConnectionMethod): void => {
    useProjectScopeStore.getState().setMethod(m);
  }, []);

  const saveDraft = useCallback(async (): Promise<void> => {
    await useProjectScopeStore.getState().saveDraft(httpClient);
  }, []);

  // TODO(DA-144): deferred POST /projects create — no-op placeholder for now.
  const create = useCallback(async (): Promise<void> => {}, []);

  return {
    draft,
    source,
    target,
    method,
    connectionReady,
    isSavingDraft,
    erpSystems,
    sourceName,
    targetName,
    isCompatible,
    createDisabled,
    setSource,
    setTarget,
    setMethod,
    saveDraft,
    create,
  };
}
