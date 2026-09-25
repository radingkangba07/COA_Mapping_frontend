import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildEntityKey, useWizardStore } from '../store/wizard.store';
import { httpClient } from '@/shared/services/http/http.instance';
import { triggerTestImport, getTestRun } from '../services/test_import.service';
import type { TestRunDto, TestRunStatus } from '../services/test_import.service';
import type { EntityId } from '../dp-kit/types/entity';
import type { AppError } from '@/shared/types/result.types';
import { isAppError } from '@/shared/types/result.types';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

function isTerminal(status: TestRunStatus): boolean {
  return status === 'complete' || status === 'failed';
}

export interface UseTestImportResult {
  readonly testRun: TestRunDto | null;
  readonly isLoading: boolean;
  readonly isTriggering: boolean;
  readonly error: AppError | null;
  readonly triggerRun: () => void;
}

export function useTestImport(entityId: EntityId): UseTestImportResult {
  const parentProjectId = useWizardStore((s) => s.parentProjectId);
  const runId = useWizardStore(
    (s) => s.pipelineRunIdByEntity[buildEntityKey(parentProjectId ?? '', entityId)],
  );
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['test-run', entityId, runId] as const,
    // getTestRun returns ok(null) on 404 (no run yet) — null is a valid data
    // state meaning "idle", not an error. Only real API failures throw here.
    queryFn: async (): Promise<TestRunDto | null> => {
      if (!runId) {
        throw { code: 'NO_PIPELINE_RUN', message: 'No pipeline run yet for this entity' } satisfies AppError;
      }
      const result = await getTestRun(httpClient, runId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: runId !== undefined,
    // Only poll while a run exists and is in a non-terminal state. A null
    // result (no run yet) or a terminal status both stop the interval.
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status || isTerminal(status)) return false;
      return q.state.dataUpdateCount < MAX_POLLS ? POLL_INTERVAL_MS : false;
    },
  });

  const mutation = useMutation({
    mutationFn: async (): Promise<TestRunDto> => {
      if (!runId) {
        throw { code: 'NO_PIPELINE_RUN', message: 'No pipeline run yet for this entity' } satisfies AppError;
      }
      const result = await triggerTestImport(httpClient, runId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['test-run', entityId, runId], data);
    },
  });

  const queryError: AppError | null =
    query.error != null
      ? isAppError(query.error)
        ? query.error
        : { code: 'test_run_unknown_error', message: String(query.error) }
      : null;

  const mutationError: AppError | null =
    mutation.error != null
      ? isAppError(mutation.error)
        ? mutation.error
        : { code: 'trigger_test_run_error', message: String(mutation.error) }
      : null;

  return {
    // Prefer live query data once the query has run (even null = no run yet).
    // Fall back to mutation.data only while the initial GET hasn't resolved
    // yet (query.data === undefined), so the POST response is shown
    // immediately rather than waiting for the first poll to complete.
    testRun: query.data !== undefined ? query.data : (mutation.data ?? null),
    isLoading: query.isLoading,
    isTriggering: mutation.isPending,
    error: mutationError ?? queryError,
    triggerRun: () => {
      void mutation.mutate();
    },
  };
}
