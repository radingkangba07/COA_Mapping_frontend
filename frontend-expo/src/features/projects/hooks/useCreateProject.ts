import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/useToast';
import { httpClient } from '@/shared/services/http/http.instance';
import { createProject } from '../services/projects.service';
import type { Project, ProjectCreate } from '../types/projects.types';

export function useCreateProject(onSuccess: () => void) {
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProjectCreate): Promise<Project> => {
      const result = await createProject(httpClient, data);
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
