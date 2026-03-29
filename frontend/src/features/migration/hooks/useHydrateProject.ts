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
  const hasHydrated = useRef(false);
  const storeProjectId = useMigrationStore((s) => s.projectId);

  const hydrate = useCallback(async (): Promise<void> => {
    setIsHydrating(true);
    setError(null);
    const store = useMigrationStore.getState();
    const result = await hydrateProject(httpClient, projectId, store);
    if (!result.ok) {
      setError(result.error);
    }
    setIsHydrating(false);
  }, [projectId]);

  useEffect(() => {
    if (hasHydrated.current && storeProjectId === (projectId as string)) {
      setIsHydrating(false);
      return;
    }
    hasHydrated.current = true;
    void hydrate();
  }, [projectId, hydrate, storeProjectId]);

  const retry = useCallback((): void => {
    hasHydrated.current = false;
    void hydrate();
  }, [hydrate]);

  return { isHydrating, error, retry };
}
