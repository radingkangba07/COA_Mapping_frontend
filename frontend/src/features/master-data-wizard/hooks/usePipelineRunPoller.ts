import { useQuery } from '@tanstack/react-query';
import { getPipelineRun, type PipelineRun } from '../services/entity-pack.service';
import type { AppError } from '@/shared/types/result.types';
import { isAppError } from '@/shared/types/result.types';

const TERMINAL_STATUSES = new Set(['complete', 'error', 'failed']);

interface UsePipelineRunPollerResult {
  readonly run: PipelineRun | null;
  readonly isPolling: boolean;
  readonly error: AppError | null;
}

export function usePipelineRunPoller(runId: string | null): UsePipelineRunPollerResult {
  const query = useQuery({
    queryKey: ['pipeline-run', runId] as const,
    enabled: runId !== null,
    queryFn: async (): Promise<PipelineRun> => {
      const result = await getPipelineRun(runId as string);
      if (!result.ok) throw result.error;
      return result.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'pending' || status === 'running') return 3000;
      return false;
    },
  });

  const run = query.data ?? null;

  const queryError: AppError | null =
    query.error != null
      ? isAppError(query.error)
        ? query.error
        : { code: 'pipeline_run_unknown_error', message: String(query.error) }
      : null;

  return {
    run,
    isPolling: run !== null && !TERMINAL_STATUSES.has(run.status),
    error: queryError,
  };
}
