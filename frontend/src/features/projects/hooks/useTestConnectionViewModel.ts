import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpClient } from '@/shared/services/http/http.instance';
import {
  buildTestConnectionPayload,
  hasConnectionErrors,
  validateConnection,
  type McpConnectionForm,
} from '../services/mcp.service';
import {
  createMcpConnection,
  testMcpConnection,
  resolveErpId,
} from '../services/erp-connection.service';
import { useProjectScopeStore } from '../store/project-scope.store';
import { selectSource, selectTarget } from '../store/project-scope.selectors';

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

export function useTestConnectionViewModel(
  connection: McpConnectionForm,
): TestConnectionViewModel {
  const [status, setStatus] = useState<TestConnectionStatus>('idle');
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [logs, setLogs] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sourceProductId = useProjectScopeStore(selectSource);
  const targetProductId = useProjectScopeStore(selectTarget);

  // Created connection record ID for this panel. Null on first test; reused on
  // retry within the same mount so a credential-edit-then-retry does not create
  // a duplicate backend record. Reset by the gate-hygiene effect on URL/cred change.
  const connectionIdRef = useRef<string | null>(null);

  // Keep connectionIdRef in sync with the store's per-scope connection ID.
  // Seeds the ref on mount so a remount reuses an existing backend record
  // instead of creating a duplicate. Clears the ref when the store ID is
  // wiped externally (e.g. clearCredentials called from another part of the UI).
  const storeConnectionId = useProjectScopeStore(
    useCallback(
      (s) => (connection.scope === 'target' ? s.targetConnectionId : s.sourceConnectionId),
      [connection.scope],
    ),
  );
  useEffect(() => {
    connectionIdRef.current = storeConnectionId;
  }, [storeConnectionId]);

  const isFormValid = useMemo(
    () => !hasConnectionErrors(validateConnection(connection)),
    [connection],
  );

  const isTesting = status === 'testing';
  const canTest = isFormValid && status !== 'testing';

  const connectionSignature = useMemo(
    () => JSON.stringify(buildTestConnectionPayload(connection)),
    [connection],
  );

  const lastSignatureRef = useRef<string | null>(null);

  // Keep the current scope accessible inside the hygiene effect without adding
  // it as a dependency (would cause infinite re-runs via the signature).
  const scopeRef = useRef(connection.scope);
  useEffect(() => {
    scopeRef.current = connection.scope;
  });

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
    // URL or credentials changed — the created connection record is now stale.
    connectionIdRef.current = null;
    setStatus('idle');
    setConnectedAt(null);
    setLogs([]);
    setError(null);
    const store = useProjectScopeStore.getState();
    store.setTestStatus('idle');
    // Reset only the gate(s) this panel covers.
    const scope = scopeRef.current;
    if (scope !== 'target') store.setSourceConnectionReady(false);
    if (scope !== 'source') store.setTargetConnectionReady(false);
  }, [connectionSignature]);

  const onTestConnection = useCallback(async (): Promise<void> => {
    if (hasConnectionErrors(validateConnection(connection))) {
      setError(INCOMPLETE_FORM_MESSAGE);
      return;
    }

    setError(null);
    setStatus('testing');
    const store = useProjectScopeStore.getState();
    store.setTestStatus('loading');
    // Reset this panel's gate(s) while the test is in flight.
    if (connection.scope !== 'target') store.setSourceConnectionReady(false);
    if (connection.scope !== 'source') store.setTargetConnectionReady(false);

    // Resolve the ERP id from the project scope based on which side this panel covers.
    const productId =
      connection.scope === 'target' ? targetProductId : sourceProductId;
    const erpId = resolveErpId(productId);

    if (!erpId) {
      setError('Select a source or target ERP system before testing the connection.');
      setStatus('failure');
      useProjectScopeStore.getState().setTestStatus('error');
      return;
    }

    // Create the connection record on the first test; reuse on subsequent clicks.
    if (!connectionIdRef.current) {
      const role = connection.scope === 'target' ? 'target' : 'source';
      const label = `${erpId} ${role} – MCP`;
      const createResult = await createMcpConnection(httpClient, erpId, role, connection, label);
      if (!createResult.ok) {
        setError(createResult.error.message);
        setStatus('failure');
        useProjectScopeStore.getState().setTestStatus('error');
        return;
      }
      connectionIdRef.current = createResult.data.id;
    }

    const result = await testMcpConnection(httpClient, connectionIdRef.current, connection);

    if (result.ok) {
      setConnectedAt(result.data.connectedAt);
      setLogs(result.data.logs);
      setError(null);
      setStatus('success');
      const s = useProjectScopeStore.getState();
      s.setTestStatus('success');
      // Persist the connection ID so remounts reuse this record instead of
      // creating a duplicate (which the backend rejects with 409).
      const role = connection.scope === 'target' ? 'target' : 'source';
      s.setConnectionContext(role, connectionIdRef.current!, {});
      // Open only this panel's gate(s).
      if (connection.scope !== 'target') s.setSourceConnectionReady(true);
      if (connection.scope !== 'source') s.setTargetConnectionReady(true);
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
    const s = useProjectScopeStore.getState();
    s.setTestStatus('error');
    if (connection.scope !== 'target') s.setSourceConnectionReady(false);
    if (connection.scope !== 'source') s.setTargetConnectionReady(false);
  }, [connection, sourceProductId, targetProductId]);

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
