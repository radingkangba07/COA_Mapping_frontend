import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Org, OrgType } from '../types/org.types';
import type { OrgId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';
import { isAppError } from '@/shared/types/result.types';
import { httpClient } from '@/shared/services/http/http.instance';
import { toAppError } from '@/shared/services/http/http.client';
import { getUserOrgs } from '../services/org.service';
import { useAppStore } from '@/shared/store/app.store';
import { selectActiveOrgId } from '@/shared/store/app.selectors';

// ─── Return Type ────────────────────────────────────────────────────────────

interface OrgsViewModel {
  readonly orgs: Org[];
  readonly employerOrgs: Org[];
  readonly clientOrgs: Org[];
  readonly activeOrg: Org | null;
  readonly activeOrgId: OrgId | null;
  readonly activeOrgType: OrgType | null;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly setActiveOrg: (orgId: OrgId | null) => void;
  readonly refetch: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOrgsViewModel(): OrgsViewModel {
  const activeOrgId = useAppStore(selectActiveOrgId);

  const query = useQuery({
    queryKey: ['orgs', 'me'] as const,
    queryFn: async (): Promise<Org[]> => {
      const result = await getUserOrgs(httpClient);

      if (!result.ok) {
        throw result.error;
      }

      return result.data;
    },
  });

  const queryError: AppError | null =
    query.error != null
      ? isAppError(query.error) ? query.error : toAppError(query.error)
      : null;

  const orgs = query.data ?? [];
  const employerOrgs = orgs.filter((o) => o.orgType === 'employer');
  const clientOrgs = orgs.filter((o) => o.orgType === 'client');
  const firstOrgId = employerOrgs[0]?.id ?? orgs[0]?.id ?? null;

  // Default to first employer org when no active org is set and orgs are loaded
  useEffect(() => {
    if (activeOrgId === null && firstOrgId !== null) {
      useAppStore.getState().setActiveOrg(firstOrgId);
    }
  }, [activeOrgId, firstOrgId]);

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? null;
  const activeOrgType: OrgType | null = activeOrg?.orgType ?? null;

  const setActiveOrg = useCallback((orgId: OrgId | null): void => {
    useAppStore.getState().setActiveOrg(orgId);
  }, []);

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    orgs,
    employerOrgs,
    clientOrgs,
    activeOrg,
    activeOrgId,
    activeOrgType,
    isLoading: query.isLoading,
    error: queryError,
    setActiveOrg,
    refetch,
  };
}
