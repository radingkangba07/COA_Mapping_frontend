import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Project } from '../types/projects.types';
import type { ProjectId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';
import { httpClient } from '@/shared/services/http/http.instance';
import { toAppError } from '@/shared/services/http/http.client';
import { getProject } from '../services/projects.service';

// ─── Return Type ────────────────────────────────────────────────────────────

interface ProjectDetailViewModel {
  readonly project: Project | null;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useProjectDetail(
  projectId: ProjectId | null,
): ProjectDetailViewModel {
  const query = useQuery({
    queryKey: ['projects', projectId] as const,
    queryFn: async (): Promise<Project> => {
      if (projectId === null) {
        throw new Error('projectId is required');
      }
      const result = await getProject(httpClient, projectId);

      if (!result.ok) {
        throw result.error;
      }

      return result.data;
    },
    enabled: projectId !== null,
  });

  const error: AppError | null =
    query.error != null
      ? toAppError(query.error)
      : null;

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    project: query.data ?? null,
    isLoading: query.isLoading,
    error,
    refetch,
  };
}
