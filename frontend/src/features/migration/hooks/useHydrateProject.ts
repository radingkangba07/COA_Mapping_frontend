import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProjectId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';
import { hydrateProject } from '../services/hydration.service';
import { httpClient } from '@/shared/services/http/http.instance';
import { useMigrationStore } from '../store/migration.store';

export interface UseHydrateProjectReturn {
  readonly isHydrating: boolean;
  readonly error: AppError | null;
  readonly retry: () => void;
}

export function useHydrateProject(projectId: ProjectId): UseHydrateProjectReturn {
  const [isHydrating, setIsHydrating] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const hydratedProjectRef = useRef<string | null>(null);

  const hydrate = useCallback(async (): Promise<void> => {
    setIsHydrating(true);
    setError(null);
    try {
      const store = useMigrationStore.getState();
      const result = await hydrateProject(httpClient, projectId, store);
      if (!result.ok) {
        setError(result.error);
      }
    } catch {
      setError({ code: 'HYDRATION_ERROR', message: 'Failed to load project data' });
    }
    hydratedProjectRef.current = projectId as string;
    setIsHydrating(false);
  }, [projectId]);

  useEffect(() => {
    if (hydratedProjectRef.current === (projectId as string)) {
      setIsHydrating(false);
      return;
    }
    void hydrate();
  }, [projectId, hydrate]);

  const retry = useCallback((): void => {
    hydratedProjectRef.current = null;
    void hydrate();
  }, [hydrate]);

  return { isHydrating, error, retry };
}
