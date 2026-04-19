import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { listMappingSuggestions } from '@/features/migration/services/suggestions.service';
import type {
  SuggestionGroup,
  SuggestionQueryOptions,
} from '@/features/migration/types/suggestion.types';
import type { AppError } from '@/shared/types/result.types';

export interface UseMappingSuggestionsOptions extends SuggestionQueryOptions {
  readonly enabled?: boolean;
}

export interface UseMappingSuggestionsReturn {
  readonly suggestions: readonly SuggestionGroup[];
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => Promise<UseQueryResult<readonly SuggestionGroup[], AppError>>;
}

export function mappingSuggestionsQueryKey(
  projectId: string,
  filters: SuggestionQueryOptions,
): readonly unknown[] {
  return [
    'mapping-suggestions',
    projectId,
    {
      status: filters.status ?? null,
      sourceType: filters.sourceType ?? null,
      skip: filters.skip ?? null,
      limit: filters.limit ?? null,
    },
  ] as const;
}

/**
 * Fetch grouped mapping suggestions for a project. Fires on mount by default
 * (auto-load); callers can gate with `enabled: false` if they need to wait.
 */
export function useMappingSuggestions(
  projectId: string,
  opts?: UseMappingSuggestionsOptions,
): UseMappingSuggestionsReturn {
  const enabled = (opts?.enabled ?? true) && projectId.length > 0;
  const filters: SuggestionQueryOptions = {
    ...(opts?.status !== undefined ? { status: opts.status } : {}),
    ...(opts?.sourceType !== undefined ? { sourceType: opts.sourceType } : {}),
    ...(opts?.skip !== undefined ? { skip: opts.skip } : {}),
    ...(opts?.limit !== undefined ? { limit: opts.limit } : {}),
  };

  const query = useQuery<readonly SuggestionGroup[], AppError>({
    queryKey: mappingSuggestionsQueryKey(projectId, filters),
    queryFn: async (): Promise<readonly SuggestionGroup[]> => {
      const result = await listMappingSuggestions(httpClient, projectId, filters);
      if (!result.ok) {
        throw result.error;
      }
      return result.data;
    },
    enabled,
  });

  return {
    suggestions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}
