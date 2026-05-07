import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { getClientOrgs } from '../services/org.service';
import type { ClientOrg } from '../types/org.types';
import type { OrgId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import { isAppError } from '@/shared/types/result.types';

interface UseClientOrgsResult {
  readonly clientOrgs: ClientOrg[];
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
}

export function useClientOrgs(parentOrgId: OrgId | null): UseClientOrgsResult {
  const query = useQuery({
    queryKey: ['orgs', parentOrgId, 'clients'] as const,
    enabled: parentOrgId !== null,
    queryFn: async (): Promise<ClientOrg[]> => {
      const result = await getClientOrgs(httpClient, parentOrgId!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
      if (!result.ok) throw result.error;
      return result.data;
    },
  });

  const queryError: AppError | null =
    query.error != null
      ? isAppError(query.error) ? query.error : toAppError(query.error)
      : null;

  return {
    clientOrgs: query.data ?? [],
    isLoading: query.isLoading,
    error: queryError,
    refetch: () => { void query.refetch(); },
  };
}
