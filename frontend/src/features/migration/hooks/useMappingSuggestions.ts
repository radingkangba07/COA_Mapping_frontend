import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { listMappingSuggestions } from '@/features/migration/services/suggestions.service';
import type {
  SuggestionGroup,
  SuggestionListResponse,
  SuggestionQueryOptions,
} from '@/features/migration/types/suggestion.types';
import type { AppError } from '@/shared/types/result.types';

export interface UseMappingSuggestionsOptions extends SuggestionQueryOptions {
  readonly enabled?: boolean;
}

export interface UseMappingSuggestionsReturn {
  readonly suggestions: readonly SuggestionGroup[];
  readonly total: number;
  readonly skip: number;
  readonly limit: number;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => Promise<UseQueryResult<SuggestionListResponse, AppError>>;
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
 * Fetch paginated mapping suggestions for a project. Fires on mount by default
 * (auto-load); callers can gate with `enabled: false` if they need to wait.
 *
 * The backend returns `{ total, skip, limit, groups }`. `total` is the true
 * suggestion count after filters (use this for "N rows" labels and page math —
 * not `groups.length`, which is the grouped view of the current page).
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

  const query = useQuery<SuggestionListResponse, AppError>({
    queryKey: mappingSuggestionsQueryKey(projectId, filters),
    queryFn: async (): Promise<SuggestionListResponse> => {
      const result = await listMappingSuggestions(httpClient, projectId, filters);
      if (!result.ok) {
        throw result.error;
      }
      return result.data;
    },
    enabled,
  });

  const data = query.data;
  return {
    suggestions: data?.groups ?? [],
    total: data?.total ?? 0,
    skip: data?.skip ?? (opts?.skip ?? 0),
    limit: data?.limit ?? (opts?.limit ?? 0),
    isLoading: query.isLoading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}
