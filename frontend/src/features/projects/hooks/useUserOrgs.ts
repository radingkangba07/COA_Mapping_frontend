import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { getUserOrgs } from '../services/user-orgs.service';
import type { ProjectGroup } from '../types/projects.types';
import type { AppError } from '@/shared/types/result.types';

interface UseUserOrgsResult {
  orgs: ProjectGroup[];
  isLoading: boolean;
  error: AppError | null;
}

export function useUserOrgs(enabled = true): UseUserOrgsResult {
  const query = useQuery({
    queryKey: ['user-orgs'],
    enabled,
    queryFn: async () => {
      const result = await getUserOrgs(httpClient);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });

  return {
    orgs: query.data ?? [],
    isLoading: query.isLoading,
    error: (query.error as AppError | null) ?? null,
  };
}