import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Org } from '../types/org.types';
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
  readonly activeOrg: Org | null;
  readonly activeOrgId: OrgId | null;
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
  const firstOrgId = orgs[0]?.id ?? null;

  // Default to first org when no active org is set and orgs are loaded
  useEffect(() => {
    if (activeOrgId === null && firstOrgId !== null) {
      useAppStore.getState().setActiveOrg(firstOrgId);
    }
  }, [activeOrgId, firstOrgId]);

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? null;

  const setActiveOrg = useCallback((orgId: OrgId | null): void => {
    useAppStore.getState().setActiveOrg(orgId);
  }, []);

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    orgs,
    activeOrg,
    activeOrgId,
    isLoading: query.isLoading,
    error: queryError,
    setActiveOrg,
    refetch,
  };
}
