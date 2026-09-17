import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpClient } from '@/shared/services/http/http.instance';
import {
  buildTestConnectionPayload,
  hasConnectionErrors,
  validateConnection,
  type McpConnectionForm,
  type McpFormAuthType,
} from '../services/mcp.service';
import {
  createMcpConnection,
  testMcpConnection,
  resolveErpId,
} from '../services/erp-connection.service';
import { useProjectScopeStore } from '../store/project-scope.store';
import { selectSource, selectTarget } from '../store/project-scope.selectors';

function buildCredentialsForStore(form: McpConnectionForm): Record<string, string> {
  const type: McpFormAuthType = form.authType;
  switch (type) {
    case 'bearer': return { access_token: form.token };
    case 'apiKey': return { api_key: form.apiKey };
    case 'tba': return { consumer_key: form.consumerKey, consumer_secret: form.consumerSecret, token_id: form.tokenId, token_secret: form.tokenSecret };
    case 'oauth2': return { access_token: form.token };
  }
}

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
  const sourceConnectionId = useProjectScopeStore((s) => s.sourceConnectionId);
  const targetConnectionId = useProjectScopeStore((s) => s.targetConnectionId);

  // Seed the ref from the store on mount so a remount reuses the existing
  // connection record rather than creating a new one.
  const connectionIdRef = useRef<string | null>(
    connection.scope === 'target' ? targetConnectionId : sourceConnectionId,
  );

  // Keep the ref in sync when the store's connection ID is cleared externally
  // (e.g. clearCredentials() called while the component is still mounted).
  useEffect(() => {
    const stored = connection.scope === 'target' ? targetConnectionId : sourceConnectionId;
    if (stored === null) {
      connectionIdRef.current = null;
    }
  }, [connection.scope, sourceConnectionId, targetConnectionId]);

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
    // URL or credentials changed — any previously created connection record is
    // now stale. Clear it so the next test creates a fresh one.
    connectionIdRef.current = null;
    setStatus('idle');
    setConnectedAt(null);
    setLogs([]);
    setError(null);
    useProjectScopeStore.getState().setConnectionReady(false);
    useProjectScopeStore.getState().setTestStatus('idle');
  }, [connectionSignature]);

  const onTestConnection = useCallback(async (): Promise<void> => {
    if (hasConnectionErrors(validateConnection(connection))) {
      setError(INCOMPLETE_FORM_MESSAGE);
      return;
    }

    setError(null);
    setStatus('testing');
    useProjectScopeStore.getState().setTestStatus('loading');
    useProjectScopeStore.getState().setConnectionReady(false);

    // Resolve the ERP id from the project scope store based on which side the
    // MCP form is configured for.
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
      useProjectScopeStore.getState().setTestStatus('success');
      useProjectScopeStore.getState().setConnectionReady(true);
      // Persist the connection record and credentials so data fetch calls after
      // project creation don't require the user to re-authenticate.
      const role = connection.scope === 'target' ? 'target' : 'source';
      const credentials = buildCredentialsForStore(connection);
      useProjectScopeStore.getState().setConnectionContext(role, connectionIdRef.current!, credentials);
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
    useProjectScopeStore.getState().setConnectionReady(false);
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
