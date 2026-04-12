import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { getUserOrgs } from '../services/org.service';
import { createCompanyId } from '@/shared/types/common.types';
import type { ProjectGroup } from '../types/projects.types';
import type { AppError } from '@/shared/types/result.types';

interface UseUserOrgsResult {
  orgs: ProjectGroup[];
  isLoading: boolean;
  error: AppError | null;
}

export function useUserOrgs(enabled = true): UseUserOrgsResult {
  const query = useQuery({
    // Shares cache with useOrgsViewModel — same endpoint, same key.
    queryKey: ['orgs', 'me'] as const,
    enabled,
    queryFn: async () => {
      const result = await getUserOrgs(httpClient);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });

  const groups: ProjectGroup[] = (query.data ?? []).map((org) => ({
    companyId: createCompanyId(org.id),
    companyName: org.name,
    projects: [],
  }));

  return {
    orgs: groups,
    isLoading: query.isLoading,
    error: (query.error as AppError | null) ?? null,
  };
}
