import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { isAppError } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';
import { getActiveMigrations } from '../services/migration-list.service';
import type { MigrationCardData } from '../components/MigrationCard';

interface MigrationListViewModel {
  readonly migrations: readonly MigrationCardData[];
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
}

export function useMigrationListViewModel(): MigrationListViewModel {
  const query = useQuery({
    queryKey: ['projects', 'active-migrations'],
    queryFn: async () => {
      const result = await getActiveMigrations(httpClient);
      if (!result.ok) {
        throw result.error;
      }
      return result.data;
    },
  });

  const error: AppError | null =
    query.error != null && isAppError(query.error)
      ? query.error
      : query.error != null
        ? { code: 'UNKNOWN', message: 'Failed to load migrations' }
        : null;

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    migrations: query.data ?? [],
    isLoading: query.isLoading,
    error,
    refetch,
  };
}
