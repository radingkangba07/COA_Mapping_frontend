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

  const toProjectGroup = (org: Pick<Org | ClientOrg, 'id' | 'name' | 'orgType'>): ProjectGroup => ({
    companyId: createCompanyId(org.id),
    companyName: org.name,
    companyOrgType: org.orgType,
    projects: [],
  });

  // ProjectGroup[] for backwards-compatible use in NewProjectDialog/ProjectForm.
  // Include employer orgs first, then any managed client companies.
  const managedClientOrgs = clientOrgsQuery.data ?? [];
  const visibleClientOrgs = managedClientOrgs.length > 0 ? managedClientOrgs : clientOrgs;
  const groups: ProjectGroup[] = employerOrgs.length > 0 || visibleClientOrgs.length > 0
    ? [
        ...employerOrgs.map(toProjectGroup),
        ...visibleClientOrgs.map(toProjectGroup),
      ]
    : allOrgs.map(toProjectGroup);

  return {
    orgs: groups,
    employerOrgs,
    clientOrgs,
    isLoading: query.isLoading || clientOrgsQuery.isLoading,
    error: ((query.error ?? clientOrgsQuery.error) as AppError | null) ?? null,
  };
}
