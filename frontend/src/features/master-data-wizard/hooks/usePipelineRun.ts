/* ============================================================================
   usePipelineRun.ts  ·  Create the Step 1 pipeline run
   ----------------------------------------------------------------------------
   Wraps services/pipeline.service.ts's createPipelineRun (POST /api/v1/
   pipeline/runs) in a TanStack Query mutation — same shape as
   useSourceFileUpload.ts, this feature's own established pattern for a
   real (non-fixture) write.
   ========================================================================= */

import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/useToast';
import { httpClient } from '@/shared/services/http/http.instance';
import type { AppError } from '@/shared/types/result.types';
import { createPipelineRun, type CreatePipelineRunOptions, type PipelineRun } from '../services/pipeline.service';

export interface PipelineRunViewModel {
  readonly createRun: (options: CreatePipelineRunOptions) => void;
  readonly run: PipelineRun | null;
  readonly isCreating: boolean;
  readonly error: AppError | null;
}

export function usePipelineRun(): PipelineRunViewModel {
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: async (options: CreatePipelineRunOptions): Promise<PipelineRun> => {
      const result = await createPipelineRun(httpClient, options);
      if (!result.ok) {
        throw result.error;
      }
      return result.data;
    },
    onError: (error: AppError) => {
      toast.showError('Could not start the mapping pipeline', error.message);
    },
  });

  // mutation.mutate is referentially stable across renders (TanStack Query
  // guarantees this) — returned directly, not wrapped in a fresh arrow
  // function, since MasterDataUploadScreen.tsx puts createRun in a
  // useEffect dependency array: a new reference every render would refire
  // that effect every render, re-triggering the mutation in an infinite
  // loop.
  return {
    createRun: mutation.mutate,
    run: mutation.data ?? null,
    isCreating: mutation.isPending,
    error: (mutation.error as AppError | null) ?? null,
  };
}
