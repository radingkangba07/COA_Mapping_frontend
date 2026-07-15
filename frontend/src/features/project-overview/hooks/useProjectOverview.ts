import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { toAppError } from '@/shared/services/http/http.client';
import { getProjectOverview } from '../services/project-overview.service';
import { toProjectOverview } from '../mappers/toProjectOverview';
import type { ProjectOverview } from '../types/project-overview.types';
import type { AppError } from '@/shared/types/result.types';

// ─── Return Type ─────────────────────────────────────────────────────────────

interface ProjectOverviewViewModel {
  readonly overview: ProjectOverview | null;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectOverview(projectId: string): ProjectOverviewViewModel {
  const query = useQuery({
    queryKey: ['project-overview', projectId] as const,
    queryFn: async (): Promise<ProjectOverview> => {
      const dto = await getProjectOverview(httpClient, projectId);
      return toProjectOverview(dto);
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    overview: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error != null ? toAppError(query.error) : null,
    refetch,
  };
}
