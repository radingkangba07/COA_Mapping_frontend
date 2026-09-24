import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildEntityKey, useWizardStore } from '../store/wizard.store';
import { httpClient } from '@/shared/services/http/http.instance';
import {
  triggerImportRun,
  getImportRun,
  getImportRunBatches,
  getImportRunErrors,
  getImportRunRecords,
  getImportRunConnectorRequests,
} from '../services/test_import.service';
import type {
  ImportRunDto,
  ImportRunStatus,
  ImportBatchItem,
  ImportErrorDto,
  ImportRecordDto,
  ConnectorRequestDto,
} from '../services/test_import.service';
import type { EntityId } from '../dp-kit/types/entity';
import type { AppError } from '@/shared/types/result.types';
import { isAppError } from '@/shared/types/result.types';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60;

function isTerminal(status: ImportRunStatus): boolean {
  return status === 'complete' || status === 'failed';
}

export interface UseTestImportResult {
  readonly importRun: ImportRunDto | null;
  readonly batches: ImportBatchItem[];
  readonly errors: { items: ImportErrorDto[]; total: number };
  readonly records: { items: ImportRecordDto[]; total: number };
  readonly connectorRequests: { items: ConnectorRequestDto[]; total: number };
  readonly selectedBatch: string | null;
  readonly setSelectedBatch: (batch: string | null) => void;
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
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const importRunQuery = useQuery({
    queryKey: ['import-run', entityId, runId] as const,
    queryFn: async (): Promise<ImportRunDto | null> => {
      if (!runId) {
        throw { code: 'NO_PIPELINE_RUN', message: 'No pipeline run for this entity' } satisfies AppError;
      }
      const result = await getImportRun(httpClient, runId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: runId !== undefined,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status || isTerminal(status)) return false;
      return q.state.dataUpdateCount < MAX_POLLS ? POLL_INTERVAL_MS : false;
    },
  });

  const importRun = importRunQuery.data !== undefined ? importRunQuery.data : null;
  const hasTerminalRun = importRun != null && isTerminal(importRun.status);

  const batchesQuery = useQuery({
    queryKey: ['import-run-batches', runId, importRun?.id] as const,
    queryFn: async (): Promise<ImportBatchItem[]> => {
      const result = await getImportRunBatches(httpClient, runId as string);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: hasTerminalRun && runId !== undefined,
  });

  const errorsQuery = useQuery({
    queryKey: ['import-run-errors', runId, importRun?.id, selectedBatch] as const,
    queryFn: async (): Promise<{ items: ImportErrorDto[]; total: number }> => {
      const result = await getImportRunErrors(
        httpClient,
        runId as string,
        selectedBatch ?? undefined,
      );
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: hasTerminalRun && runId !== undefined,
  });

  const recordsQuery = useQuery({
    queryKey: ['import-run-records', runId, importRun?.id, selectedBatch] as const,
    queryFn: async (): Promise<{ items: ImportRecordDto[]; total: number }> => {
      const result = await getImportRunRecords(
        httpClient,
        runId as string,
        selectedBatch ?? undefined,
      );
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: hasTerminalRun && runId !== undefined,
  });

  const connectorRequestsQuery = useQuery({
    queryKey: ['import-run-connectors', runId, importRun?.id, selectedBatch] as const,
    queryFn: async (): Promise<{ items: ConnectorRequestDto[]; total: number }> => {
      const result = await getImportRunConnectorRequests(
        httpClient,
        runId as string,
        selectedBatch ?? undefined,
      );
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: hasTerminalRun && runId !== undefined,
  });

  const mutation = useMutation({
    mutationFn: async (): Promise<ImportRunDto> => {
      if (!runId) {
        throw { code: 'NO_PIPELINE_RUN', message: 'No pipeline run for this entity' } satisfies AppError;
      }
      const result = await triggerImportRun(httpClient, runId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['import-run', entityId, runId], data);
    },
  });

  const queryError: AppError | null =
    importRunQuery.error != null
      ? isAppError(importRunQuery.error)
        ? importRunQuery.error
        : { code: 'import_run_unknown', message: String(importRunQuery.error) }
      : null;

  const mutationError: AppError | null =
    mutation.error != null
      ? isAppError(mutation.error)
        ? mutation.error
        : { code: 'trigger_import_run_error', message: String(mutation.error) }
      : null;

  return {
    importRun,
    batches: batchesQuery.data ?? [],
    errors: errorsQuery.data ?? { items: [], total: 0 },
    records: recordsQuery.data ?? { items: [], total: 0 },
    connectorRequests: connectorRequestsQuery.data ?? { items: [], total: 0 },
    selectedBatch,
    setSelectedBatch,
    isLoading: importRunQuery.isLoading,
    isTriggering: mutation.isPending,
    error: mutationError ?? queryError,
    triggerRun: () => { void mutation.mutate(); },
  };
}
