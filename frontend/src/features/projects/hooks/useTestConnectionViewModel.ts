import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpClient } from '@/shared/services/http/http.instance';
import {
  buildTestConnectionPayload,
  hasConnectionErrors,
  testConnection,
  validateConnection,
  type McpConnectionForm,
} from '../services/mcp.service';
import { useProjectScopeStore } from '../store/project-scope.store';

export type TestConnectionStatus = 'idle' | 'testing' | 'success' | 'failure';

export interface TestConnectionViewModel {
  readonly status: TestConnectionStatus;
  readonly connectedAt: string | null;
  readonly logs: readonly string[];
  readonly error: string | null;
  readonly isTesting: boolean;
  readonly canTest: boolean;
  readonly onTestConnection: () => Promise<void>;
}

const INCOMPLETE_FORM_MESSAGE =
  'Complete the connection details before testing.';

// Sets the per-side readiness gate(s) implied by a connection's scope (DA-48).
// 'source'/'target' flip a single side; 'both' flips both in lockstep.
function setReadyForScope(
  scope: McpConnectionForm['scope'],
  ready: boolean,
): void {
  const store = useProjectScopeStore.getState();
  if (scope === 'source' || scope === 'both') {
    store.setSourceConnectionReady(ready);
  }
  if (scope === 'target' || scope === 'both') {
    store.setTargetConnectionReady(ready);
  }
}

export function useTestConnectionViewModel(
  connection: McpConnectionForm,
): TestConnectionViewModel {
  const [status, setStatus] = useState<TestConnectionStatus>('idle');
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [logs, setLogs] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = useMemo(
    () => !hasConnectionErrors(validateConnection(connection)),
    [connection],
  );

  const isTesting = status === 'testing';
  const canTest = isFormValid && status !== 'testing';

  // Content signature of the test-relevant fields (normalized via the payload
  // builder). Two referentially-different but content-equal connection objects
  // produce the SAME signature, so a parent re-render cannot wipe a fresh success.
  const connectionSignature = useMemo(
    () => JSON.stringify(buildTestConnectionPayload(connection)),
    [connection],
  );

  const lastSignatureRef = useRef<string | null>(null);

  // GATE HYGIENE: a real credential/URL edit (signature change) invalidates a
  // prior successful test and forces a re-test before Create. The first run
  // (mount) is skipped so mounting never stomps a gate a draft restore already
  // established. Same-signature re-renders are no-ops, so this cannot loop.
  useEffect(() => {
    if (lastSignatureRef.current === null) {
      lastSignatureRef.current = connectionSignature;
      return;
    }
    if (lastSignatureRef.current === connectionSignature) {
      return;
    }
    lastSignatureRef.current = connectionSignature;
    setStatus('idle');
    setConnectedAt(null);
    setLogs([]);
    setError(null);
    setReadyForScope(connection.scope, false);
    useProjectScopeStore.getState().setTestStatus('idle');
  }, [connectionSignature, connection.scope]);

  const onTestConnection = useCallback(async (): Promise<void> => {
    if (hasConnectionErrors(validateConnection(connection))) {
      setError(INCOMPLETE_FORM_MESSAGE);
      return;
    }

    setError(null);
    setStatus('testing');
    useProjectScopeStore.getState().setTestStatus('loading');
    setReadyForScope(connection.scope, false);

    const result = await testConnection(
      httpClient,
      buildTestConnectionPayload(connection),
    );

    if (result.ok) {
      setConnectedAt(result.data.connectedAt);
      setLogs(result.data.logs);
      setError(null);
      setStatus('success');
      useProjectScopeStore.getState().setTestStatus('success');
      setReadyForScope(connection.scope, true);
      return;
    }

    const detailLogs = result.error.details?.logs;
    const serverLogs =
      Array.isArray(detailLogs) &&
      detailLogs.every((line): line is string => typeof line === 'string')
        ? detailLogs
        : [];
    setLogs(serverLogs);
    setError(result.error.message);
    setConnectedAt(null);
    setStatus('failure');
    useProjectScopeStore.getState().setTestStatus('error');
    setReadyForScope(connection.scope, false);
  }, [connection]);

  return {
    status,
    connectedAt,
    logs,
    error,
    isTesting,
    canTest,
    onTestConnection,
  };
}
