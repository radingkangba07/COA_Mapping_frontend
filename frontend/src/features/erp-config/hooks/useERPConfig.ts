import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ERPSystem } from '../types/erp-config.types';
import type { AppError } from '@/shared/types/result.types';
import { httpClient } from '@/shared/services/http/http.instance';
import { toAppError } from '@/shared/services/http/http.client';
import { getERPSystems } from '../services/erp-config.service';
import { useERPConfigStore } from '../store/erp-config.store';
import {
  selectERPSystems,
  selectSelectedERP,
  selectERPConfigLoading,
  selectERPConfigError,
} from '../store/erp-config.selectors';

// ─── Return Type ────────────────────────────────────────────────────────────

interface ERPConfigViewModel {
  readonly erpSystems: ERPSystem[];
  readonly selectedERP: ERPSystem | null;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
  readonly selectERP: (erp: ERPSystem | null) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useERPConfig(): ERPConfigViewModel {
  const cachedSystems = useERPConfigStore(selectERPSystems);
  const selectedERP = useERPConfigStore(selectSelectedERP);
  const storeLoading = useERPConfigStore(selectERPConfigLoading);
  const storeError = useERPConfigStore(selectERPConfigError);

  const query = useQuery({
    queryKey: ['erp-systems'] as const,
    queryFn: async (): Promise<ERPSystem[]> => {
      const result = await getERPSystems(httpClient);

      if (!result.ok) {
        throw result.error;
      }

      useERPConfigStore.getState().setERPSystems(result.data);
      return result.data;
    },
  });

  const queryError: AppError | null =
    query.error != null
      ? toAppError(query.error)
      : null;

  const isLoading = query.isLoading || storeLoading;
  const error = storeError ?? queryError;

  const selectERPAction = useCallback(
    (erp: ERPSystem | null): void => {
      useERPConfigStore.getState().setSelectedERP(erp);
    },
    [],
  );

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    erpSystems: query.data ?? cachedSystems,
    selectedERP,
    isLoading,
    error,
    refetch,
    selectERP: selectERPAction,
  };
}
