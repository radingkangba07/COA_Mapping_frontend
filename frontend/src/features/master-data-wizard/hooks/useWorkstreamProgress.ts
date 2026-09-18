/* ============================================================================
   useWorkstreamProgress.ts  ·  Server-persisted StepRail progress
   ----------------------------------------------------------------------------
   Backs every wizard screen's StepRail with the workstream's own real
   position and completion record (GET/PATCH /api/v1/workstreams/...) instead
   of each screen guessing "done" from which step it happens to be — see
   entity-pack.service.ts's Workstream stage progress section.

   `refetchOnMount: 'always'` + `staleTime: 0` (same pattern as
   useOrgProjectFiles) so a refresh, a new tab, or a different browser always
   re-derives the rail from the server, never from anything local.
   ========================================================================= */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppError } from '@/shared/types/result.types';
import {
  completeWorkstreamStage,
  getWorkstreamProgress,
  type WorkstreamProgress,
} from '../services/entity-pack.service';
import type { StepId } from '../types/wizard.types';

export interface WorkstreamProgressViewModel {
  /** The workstream's own current stage, straight from the server — null only before the first fetch resolves. */
  readonly currentStage: StepId | null;
  /** Every step whose own `is_completed` flag is true — never derived from position. */
  readonly completedStepIds: ReadonlySet<StepId>;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
  /** Marks `stepId` complete and advances the workstream's current_stage — awaits the server before the caller navigates on. */
  readonly completeStep: (stepId: StepId) => Promise<void>;
  readonly isCompleting: boolean;
}

function queryKeyFor(workstreamId: string) {
  return ['workstream-progress', workstreamId] as const;
}

async function fetchProgress(workstreamId: string): Promise<WorkstreamProgress> {
  const result = await getWorkstreamProgress(workstreamId);
  if (!result.ok) throw result.error;
  return result.data;
}

export function useWorkstreamProgress(workstreamId: string): WorkstreamProgressViewModel {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeyFor(workstreamId),
    queryFn: () => fetchProgress(workstreamId),
    enabled: workstreamId.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const completedStepIds = useMemo(
    () => new Set((query.data?.stages ?? []).filter((s) => s.isCompleted).map((s) => s.name as StepId)),
    [query.data],
  );

  const mutation = useMutation({
    mutationFn: async (stepId: StepId): Promise<void> => {
      // Fetches fresh rather than reading the useQuery's own (possibly still
      // in-flight, or momentarily stale) `data` — a step could otherwise be
      // completed the instant this hook mounts, before that query has ever
      // resolved once, and the render-scoped `query.data` closure this used
      // to read would still be undefined at that exact moment. staleTime: 0
      // on the query above means this call is never satisfied by a
      // meaningfully-stale cache entry either.
      const progress = await queryClient.ensureQueryData({
        queryKey: queryKeyFor(workstreamId),
        queryFn: () => fetchProgress(workstreamId),
      });
      const stage = progress.stages.find((s) => s.name === stepId);
      if (!stage) {
        throw { code: 'STAGE_NOT_FOUND', message: `No workstream stage named "${stepId}"` } satisfies AppError;
      }
      const result = await completeWorkstreamStage(workstreamId, stage.id);
      if (!result.ok) throw result.error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyFor(workstreamId) });
    },
  });

  return {
    currentStage: (query.data?.currentStage as StepId | null) ?? null,
    completedStepIds,
    isLoading: query.isLoading,
    error: (query.error as AppError | null) ?? null,
    refetch: () => void query.refetch(),
    completeStep: (stepId: StepId) => mutation.mutateAsync(stepId),
    isCompleting: mutation.isPending,
  };
}
