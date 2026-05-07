import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { getClientOrgs, getUserOrgs } from '../services/org.service';
import { createCompanyId } from '@/shared/types/common.types';
import type { ProjectGroup } from '../types/projects.types';
import type { ClientOrg, Org } from '../types/org.types';
import type { AppError } from '@/shared/types/result.types';

interface UseUserOrgsResult {
  orgs: ProjectGroup[];
  employerOrgs: Org[];
  clientOrgs: Org[];
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

  const allOrgs = query.data ?? [];
  const employerOrgs = allOrgs.filter((o) => o.orgType === 'employer');
  const clientOrgs = allOrgs.filter((o) => o.orgType === 'client');
  const parentOrgId = employerOrgs[0]?.id ?? null;

  const clientOrgsQuery = useQuery({
    queryKey: ['orgs', parentOrgId, 'clients'] as const,
    enabled: enabled && parentOrgId !== null,
    queryFn: async (): Promise<ClientOrg[]> => {
      const result = await getClientOrgs(httpClient, parentOrgId!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
      if (!result.ok) throw result.error;
      return result.data;
    },
  });

  const toProjectGroup = (org: Pick<Org | ClientOrg, 'id' | 'name'>): ProjectGroup => ({
    companyId: createCompanyId(org.id),
    companyName: org.name,
    projects: [],
  });

  // ProjectGroup[] for backwards-compatible use in NewProjectDialog/ProjectForm.
  // Employer admins should only see client companies here; the employer org itself
  // is not a project company.
  const managedClientOrgs = clientOrgsQuery.data ?? [];
  const groups: ProjectGroup[] = managedClientOrgs.length > 0
    ? managedClientOrgs.map(toProjectGroup)
    : clientOrgs.length > 0
      ? clientOrgs.map(toProjectGroup)
      : employerOrgs.length > 0 ? [] : allOrgs.map(toProjectGroup);

  return {
    orgs: groups,
    employerOrgs,
    clientOrgs,
    isLoading: query.isLoading || clientOrgsQuery.isLoading,
    error: ((query.error ?? clientOrgsQuery.error) as AppError | null) ?? null,
  };
}
