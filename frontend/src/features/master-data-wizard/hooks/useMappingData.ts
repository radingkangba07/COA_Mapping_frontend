/* ============================================================================
   useMappingData.ts  ·  Real column-mappings load for FieldMappingScreen
   ----------------------------------------------------------------------------
   Same public shape as useEntityPackPreview.ts (which FieldMappingScreen.tsx
   previously called) — {pack, isLoading, error, refetch} — but `pack` here
   is only ever `{mapping}`, since FieldMappingScreen only ever reads `pack.mapping`
   from the full EntityPack. Swapping the call site is a one-line change.
   Reads the run_id wizard.store recorded after Step 1's upload (DA-401) —
   no run_id yet means no query fires, matching TanStack Query's own
   `enabled` convention rather than firing a request that can't succeed.
   No status param: the real backend has no server-side status filter (see
   mapping.service.ts's doc comment) — the 5 filter tabs are a client-side
   filter over the mapped `status`, same as every other card filter here.

   Polling while empty: the mappings response carries no run-level status
   field, so there's no direct signal for "the run just hasn't finished
   profiling yet" vs. "this run genuinely has nothing to map." A run with
   any profiled fields always produces at least one proposal (auto-propose
   iterates every field_profiles row), so an empty response only really
   means "not complete yet" — confirmed live: the mappings GET can land
   milliseconds before the async profiling worker flips the run to
   complete, and TanStack Query then caches that empty result with nothing
   to trigger a refetch once the worker catches up. Poll on a short
   interval while the result is empty, bounded by `dataUpdateCount` (not
   extra state) so it naturally stops for a genuinely-empty run instead of
   polling forever.
   ========================================================================= */

import { useQuery } from '@tanstack/react-query';
import { buildEntityKey, useWizardStore } from '../store/wizard.store';
import { httpClient } from '@/shared/services/http/http.instance';
import { getColumnMappings, type ColumnMappingsResult } from '../services/mapping.service';
import type { EntityId, EntityMapping } from '../dp-kit/types/entity';
import type { AppError } from '@/shared/types/result.types';
import { isAppError } from '@/shared/types/result.types';

interface UseMappingDataResult {
  readonly pack: { mapping: EntityMapping } | null;
  /** Seed for `useBookmarks` — `EntityMapping.proposals` can't carry this
   *  itself (generated type, see mapping.service.ts's doc comment 9). */
  readonly bookmarkedIds: ReadonlySet<string>;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
}

const EMPTY_RESULT_POLL_MS = 2000;
const MAX_EMPTY_RESULT_POLLS = 10;
const EMPTY_BOOKMARKED_IDS: ReadonlySet<string> = new Set();

function isEmptyMapping(mapping: EntityMapping | undefined): boolean {
  if (!mapping) return true;
  // An all-'Blocked' result means _auto_propose ran before the target-field
  // catalogue was seeded. Treat it as empty so the poll interval keeps firing
  // until real proposals arrive.
  const actionable = (mapping.proposals ?? []).filter((p) => p.status !== 'Blocked').length;
  return actionable === 0 && (mapping.missingTargets?.length ?? 0) === 0;
}

export function useMappingData(entityId: EntityId): UseMappingDataResult {
  const parentProjectId = useWizardStore((s) => s.parentProjectId);
  // Keyed by project+entity (see wizard.store.ts's buildEntityKey), same
  // convention SourceDataProfileScreen already reads pipelineRunIdByEntity
  // with — setPipelineRunId only ever writes this composite key.
  const runId = useWizardStore((s) => s.pipelineRunIdByEntity[buildEntityKey(parentProjectId ?? '', entityId)]);

  const query = useQuery({
    queryKey: ['column-mappings', entityId, runId] as const,
    queryFn: async (): Promise<ColumnMappingsResult> => {
      if (!runId) throw { code: 'NO_PIPELINE_RUN', message: 'No pipeline run yet for this entity' } satisfies AppError;
      const result = await getColumnMappings(httpClient, runId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: runId !== undefined,
    refetchInterval: (q) =>
      isEmptyMapping(q.state.data?.mapping) && q.state.dataUpdateCount < MAX_EMPTY_RESULT_POLLS ? EMPTY_RESULT_POLL_MS : false,
  });

  const queryError: AppError | null =
    query.error != null
      ? isAppError(query.error)
        ? query.error
        : { code: 'column_mappings_unknown_error', message: String(query.error) }
      : null;

  return {
    pack: query.data ? { mapping: query.data.mapping } : null,
    bookmarkedIds: query.data?.bookmarkedIds ?? EMPTY_BOOKMARKED_IDS,
    isLoading: query.isLoading,
    error: queryError,
    refetch: () => { void query.refetch(); },
  };
}
