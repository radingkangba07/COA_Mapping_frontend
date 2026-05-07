import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Project } from '../types/projects.types';
import type { ProjectId, OrgId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';
import { httpClient } from '@/shared/services/http/http.instance';
import { toAppError } from '@/shared/services/http/http.client';
import { getProjects } from '../services/projects.service';
import { useProjectsStore } from '../store/projects.store';
import {
  selectSelectedProject,
  selectProjectsLoading,
  selectProjectsError,
} from '../store/projects.selectors';
import { useAppStore } from '@/shared/store/app.store';
import { selectActiveOrgId } from '@/shared/store/app.selectors';

// ─── Return Type ────────────────────────────────────────────────────────────

interface ProjectsViewModel {
  readonly projects: Project[];
  readonly total: number;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
  readonly selectProject: (id: ProjectId | null) => void;
  readonly selectedProject: ProjectId | null;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useProjectsViewModel(orgIdOverride?: OrgId): ProjectsViewModel {
  const selectedProject = useProjectsStore(selectSelectedProject);
  const storeLoading = useProjectsStore(selectProjectsLoading);
  const storeError = useProjectsStore(selectProjectsError);
  const activeOrgId = useAppStore(selectActiveOrgId);

  const effectiveOrgId = orgIdOverride ?? activeOrgId;

  const query = useQuery({
    queryKey: ['projects', effectiveOrgId] as const,
    queryFn: async (): Promise<{ projects: Project[]; total: number }> => {
      const result = await getProjects(httpClient, 0, 100, effectiveOrgId ?? undefined);

      if (!result.ok) {
        throw result.error;
      }

      return result.data;
    },
    enabled: !!effectiveOrgId,
  });

  const queryError: AppError | null =
    query.error != null
      ? toAppError(query.error)
      : null;

  const isLoading = query.isLoading || storeLoading;
  const error = storeError ?? queryError;

  const selectProjectAction = useCallback(
    (id: ProjectId | null): void => {
      useProjectsStore.getState().setSelectedProject(id);
    },
    [],
  );

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    projects: query.data?.projects ?? [],
    total: query.data?.total ?? 0,
    isLoading,
    error,
    refetch,
    selectProject: selectProjectAction,
    selectedProject,
  };
}
