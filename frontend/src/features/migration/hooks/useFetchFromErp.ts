import { useCallback, useState } from 'react';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import {
  selectConnectionReady,
  selectFetchStatus,
  selectMethod,
} from '@/features/projects/store/project-scope.selectors';
import { serializeProjectScopeDraft } from '@/features/projects/store/project-scope.store';
import {
  fetchCoa,
  type FetchCoaPayload,
} from '@/features/projects/services/mcp.service';
import type {
  ConnectionMethod,
  CoaRow,
  RequestStatus,
} from '@/features/projects/types/project-scope.types';
import { httpClient } from '@/shared/services/http/http.instance';
import { useMigrationStore } from '../store/migration.store';
import {
  selectSourceERP,
  selectTargetERP,
} from '../store/migration.selectors';

const SAMPLE_LIMIT = 5;

// ─── Lifecycle State ─────────────────────────────────────────────────────────

/**
 * Shape for the whole Fetch-from-ERP lifecycle.
 * DA-79 initializes/exposes this; later subtasks populate it:
 *  - DA-80 drives `status` + `progress` during the fetch.
 *  - DA-81 fills `counts` + `sampleSource`/`sampleTarget`.
 *  - DA-82 resets it on re-fetch.
 */
export interface FetchState {
  readonly status: RequestStatus;
  readonly progress: number;
  readonly counts: { readonly source: number; readonly target: number };
  readonly sampleSource: readonly CoaRow[];
  readonly sampleTarget: readonly CoaRow[];
  readonly errorMessage: string | null;
}

export interface UseFetchFromErpResult {
  readonly method: ConnectionMethod;
  readonly connectionReady: boolean;
  readonly sourceErpName?: string;
  readonly targetErpName?: string;
  readonly fetch: FetchState;
  readonly runFetch: () => void;
  readonly refetch: () => void;
}

function createInitialFetchState(status: RequestStatus): FetchState {
  return {
    status,
    progress: 0,
    counts: { source: 0, target: 0 },
    sampleSource: [],
    sampleTarget: [],
    errorMessage: null,
  };
}

// ─── ViewModel Hook ──────────────────────────────────────────────────────────

export function useFetchFromErp(): UseFetchFromErpResult {
  const method = useProjectScopeStore(selectMethod);
  const connectionReady = useProjectScopeStore(selectConnectionReady);
  const storeFetchStatus = useProjectScopeStore(selectFetchStatus);
  const setFetchStatus = useProjectScopeStore((state) => state.setFetchStatus);

  const sourceERP = useMigrationStore(selectSourceERP);
  const targetERP = useMigrationStore(selectTargetERP);

  const [fetchState, setFetchState] = useState<FetchState>(() =>
    createInitialFetchState(storeFetchStatus ?? 'idle'),
  );

  const runFetch = useCallback((): void => {
    // MCP gate: never fetch before a successful test connection (DA-50).
    if (!connectionReady) {
      return;
    }

    const run = async (): Promise<void> => {
      const draft = useProjectScopeStore.getState().draft;
      const serialized = serializeProjectScopeDraft(draft);
      const payload: FetchCoaPayload = {
        source_erp: serialized.source_erp,
        target_erp: serialized.target_erp,
        scope: serialized.scope,
        connection: serialized.connection,
      };

      setFetchStatus('loading');
      setFetchState((s) => ({
        ...s,
        status: 'loading',
        progress: 0,
        errorMessage: null,
      }));

      const result = await fetchCoa(httpClient, payload);

      if (result.ok) {
        const { source, target } = result.data;
        setFetchStatus('success');
        setFetchState((s) => ({
          ...s,
          status: 'success',
          progress: 100,
          counts: { source: source.length, target: target.length },
          sampleSource: source.slice(0, SAMPLE_LIMIT),
          sampleTarget: target.slice(0, SAMPLE_LIMIT),
        }));
        // TODO(DA-84): feed result into migration store via setCoa
      } else {
        setFetchStatus('error');
        setFetchState((s) => ({
          ...s,
          status: 'error',
          errorMessage: result.error.message,
        }));
      }
    };

    void run();
  }, [connectionReady, setFetchStatus]);

  const refetch = useCallback((): void => {
    // TODO(DA-82): re-fetch — reset state and re-run runFetch. No-op for DA-79.
  }, []);

  return {
    method,
    connectionReady,
    sourceErpName: sourceERP?.name,
    targetErpName: targetERP?.name,
    fetch: fetchState,
    runFetch,
    refetch,
  };
}
