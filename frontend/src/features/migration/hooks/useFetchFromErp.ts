import { useCallback, useState } from 'react';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import {
  selectConnectionReady,
  selectFetchStatus,
  selectMethod,
} from '@/features/projects/store/project-scope.selectors';
import type {
  ConnectionMethod,
  CoaRow,
  RequestStatus,
} from '@/features/projects/types/project-scope.types';
import { useMigrationStore } from '../store/migration.store';
import {
  selectSourceERP,
  selectTargetERP,
} from '../store/migration.selectors';

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

  const sourceERP = useMigrationStore(selectSourceERP);
  const targetERP = useMigrationStore(selectTargetERP);

  const [fetchState] = useState<FetchState>(() =>
    createInitialFetchState(storeFetchStatus ?? 'idle'),
  );

  const runFetch = useCallback((): void => {
    // TODO(DA-80): perform fetch — call fetchCoa service, drive status/progress,
    // then TODO(DA-81): populate counts + samples. No-op for DA-79.
  }, []);

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
