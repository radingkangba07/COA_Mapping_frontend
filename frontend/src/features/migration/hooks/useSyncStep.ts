import { useCallback } from 'react';
import { updateProject } from '@/features/projects/services/projects.service';
import { httpClient } from '@/shared/services/http/http.instance';
import { createProjectId } from '@/shared/types/common.types';
import { useMigrationStore } from '../store/migration.store';

export function useSyncStep(): (nextStep: number) => void {
  const projectId = useMigrationStore((s) => s.projectId);

  return useCallback(
    (nextStep: number) => {
      if (projectId) {
        updateProject(httpClient, createProjectId(projectId), {
          currentStep: nextStep,
        }).catch(() => {});
      }
    },
    [projectId],
  );
}
