import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProjectId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';
import { hydrateProject } from '../services/hydration.service';
import { httpClient } from '@/shared/services/http/http.instance';
import { useMigrationStore } from '../store/migration.store';
import { useERPConfigStore } from '@/features/erp-config/store/erp-config.store';
import { useToast } from '@/shared/hooks/useToast';

export interface UseHydrateProjectReturn {
  readonly isHydrating: boolean;
  readonly error: AppError | null;
  readonly retry: () => void;
}

export function useHydrateProject(projectId: ProjectId): UseHydrateProjectReturn {
  const storeProjectId = useMigrationStore((s) => s.projectId);
  const alreadyLoaded = storeProjectId === (projectId as string);

  const [isHydrating, setIsHydrating] = useState(!alreadyLoaded);
  const [error, setError] = useState<AppError | null>(null);
  const hydratedProjectRef = useRef<string | null>(alreadyLoaded ? (projectId as string) : null);
  // Prevent concurrent hydrations: a second call while one is in-flight would
  // also call store.reset(), wiping ephemeral UI state (e.g. confidenceFilter).
  const hydratingInProgressRef = useRef(false);
  const { showWarning } = useToast();
  // Keep showWarning in a ref so hydrate's useCallback deps stay stable across
  // renders — otherwise every toast re-render recreates hydrate, re-fires the
  // effect, and races with the in-flight hydration.
  const showWarningRef = useRef(showWarning);
  showWarningRef.current = showWarning;

  const hydrate = useCallback(async (): Promise<void> => {
    if (hydratingInProgressRef.current) {
      console.log('[useHydrateProject] hydrate called but already in progress — skipped');
      return;
    }
    console.log('[useHydrateProject] hydrate START', { projectId });
    hydratingInProgressRef.current = true;
    setIsHydrating(true);
    setError(null);
    try {
      const store = useMigrationStore.getState();
      const erpSystems = useERPConfigStore.getState().erpSystems;
      const result = await hydrateProject(httpClient, projectId, store, erpSystems);
      if (!result.ok) {
        setError(result.error);
      } else {
        if (result.warnings) {
          for (const w of result.warnings) {
            showWarningRef.current('File data unavailable', w);
          }
        }
      }
    } catch {
      setError({ code: 'HYDRATION_ERROR', message: 'Failed to load project data' });
    }
    hydratingInProgressRef.current = false;
    hydratedProjectRef.current = projectId as string;
    setIsHydrating(false);
  }, [projectId]); // showWarning removed — accessed via ref

  useEffect(() => {
    if (hydratedProjectRef.current === (projectId as string)) {
      setIsHydrating(false);
      return;
    }
    void hydrate();
  }, [projectId, hydrate]);

  const retry = useCallback((): void => {
    hydratedProjectRef.current = null;
    hydratingInProgressRef.current = false;
    void hydrate();
  }, [hydrate]);

  return { isHydrating, error, retry };
}
