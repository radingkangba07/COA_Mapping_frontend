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

  console.log('[useHydrateProject] init', { projectId, storeProjectId, alreadyLoaded });

  const [isHydrating, setIsHydrating] = useState(!alreadyLoaded);
  const [error, setError] = useState<AppError | null>(null);
  const hydratedProjectRef = useRef<string | null>(alreadyLoaded ? (projectId as string) : null);
  const { showWarning } = useToast();

  const hydrate = useCallback(async (): Promise<void> => {
    console.log('[useHydrateProject] hydrate START', { projectId });
    setIsHydrating(true);
    setError(null);
    try {
      const store = useMigrationStore.getState();
      const erpSystems = useERPConfigStore.getState().erpSystems;
      console.log('[useHydrateProject] store BEFORE hydration', {
        sourceERP: store.sourceERP?.id ?? null,
        targetERP: store.targetERP?.id ?? null,
        currentStep: store.currentStep,
        completedSteps: store.completedSteps,
        erpSystemsCount: erpSystems.length,
      });
      const result = await hydrateProject(httpClient, projectId, store, erpSystems);
      if (!result.ok) {
        console.log('[useHydrateProject] hydration FAILED', result.error);
        setError(result.error);
      } else {
        const storeAfter = useMigrationStore.getState();
        console.log('[useHydrateProject] store AFTER hydration', {
          sourceERP: storeAfter.sourceERP?.id ?? null,
          targetERP: storeAfter.targetERP?.id ?? null,
          currentStep: storeAfter.currentStep,
          completedSteps: storeAfter.completedSteps,
        });
        if (result.warnings) {
          for (const w of result.warnings) {
            showWarning('File data unavailable', w);
          }
        }
      }
    } catch {
      console.log('[useHydrateProject] hydration EXCEPTION');
      setError({ code: 'HYDRATION_ERROR', message: 'Failed to load project data' });
    }
    hydratedProjectRef.current = projectId as string;
    setIsHydrating(false);
  }, [projectId, showWarning]);

  useEffect(() => {
    if (hydratedProjectRef.current === (projectId as string)) {
      console.log('[useHydrateProject] SKIPPED — already hydrated', { projectId });
      setIsHydrating(false);
      return;
    }
    console.log('[useHydrateProject] TRIGGERING hydration', { projectId, ref: hydratedProjectRef.current });
    void hydrate();
  }, [projectId, hydrate]);

  const retry = useCallback((): void => {
    hydratedProjectRef.current = null;
    void hydrate();
  }, [hydrate]);

  return { isHydrating, error, retry };
}
