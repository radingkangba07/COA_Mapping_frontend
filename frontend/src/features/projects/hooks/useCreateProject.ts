import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/useToast';
import { httpClient } from '@/shared/services/http/http.instance';
import { useAppStore } from '@/shared/store/app.store';
import { selectActiveOrgId } from '@/shared/store/app.selectors';
import { createProject } from '../services/projects.service';
import type { Project, ProjectCreate } from '../types/projects.types';

export function useCreateProject(onSuccess: () => void) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const activeOrgId = useAppStore(selectActiveOrgId);

  return useMutation({
    mutationFn: async (data: ProjectCreate): Promise<Project> => {
      // Ensure org_id is always present — use the form-selected org first,
      // then fall back to the active workspace org from the global store.
      const payload: ProjectCreate = {
        ...data,
        orgId: data.orgId ?? data.companyId ?? activeOrgId ?? undefined,
      };
      const result = await createProject(httpClient, payload);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      toast.showSuccess('Project created successfully');
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.showError(error.message || 'Failed to create project');
    },
  });
}
