/* ============================================================================
   useImportJob.ts  ·  Poll a Test Import (step 7) / Final Import (step 8) job
   ----------------------------------------------------------------------------
   Mirrors features/migration/hooks/useJobStream.ts's external shape
   (status / lastEvent / error / reconnect) so the job-status pattern stays
   recognisable across the app, but POLLS rather than streaming: there is no
   WebSocket contract for these jobs, and — see services/import-job.service.ts
   — no REST endpoint either yet. Steps 7-8 are not final in the design
   handover (docs/handover/README.md, "Scope"). This hook is wired to the
   eventual contract shape so swapping in a real implementation only touches
   the service function, not this hook or its callers.
   ========================================================================= */

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import type { AppError } from '@/shared/types/result.types';
import type { ImportJobEvent } from '../types/import-job.types';
import { getImportJobStatus } from '../services/import-job.service';

const POLL_INTERVAL_MS = 2000;

export type ImportJobPollStatus = 'idle' | 'polling' | 'stopped';

export interface UseImportJobReturn {
  readonly status: ImportJobPollStatus;
  readonly lastEvent: ImportJobEvent | null;
  readonly error: AppError | null;
  readonly reconnect: () => void;
}

/** `jobId` is null until the caller has actually started a run. */
export function useImportJob(
  orgProjectId: string,
  entityId: string,
  jobId: string | null,
): UseImportJobReturn {
  const [attempt, setAttempt] = useState(0);

  const query = useQuery({
    queryKey: ['import-job', orgProjectId, entityId, jobId, attempt] as const,
    queryFn: async (): Promise<ImportJobEvent> => {
      const result = await getImportJobStatus(httpClient, orgProjectId, entityId, jobId as string);
      if (!result.ok) {
        throw result.error;
      }
      return result.data;
    },
    enabled: jobId !== null,
    retry: false,
    refetchInterval: (q): number | false => {
      const data = q.state.data;
      if (!data) return POLL_INTERVAL_MS;
      return data.status === 'succeeded' || data.status === 'failed' ? false : POLL_INTERVAL_MS;
    },
  });

  const reconnect = useCallback((): void => {
    setAttempt((a) => a + 1);
  }, []);

  const status: ImportJobPollStatus = jobId === null ? 'idle' : query.isError ? 'stopped' : 'polling';

  return {
    status,
    lastEvent: query.data ?? null,
    error: (query.error as AppError | null) ?? null,
    reconnect,
  };
}
