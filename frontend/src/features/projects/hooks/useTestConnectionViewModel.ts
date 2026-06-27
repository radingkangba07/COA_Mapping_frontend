import { useCallback, useMemo, useState } from 'react';
import {
  hasConnectionErrors,
  validateConnection,
  type McpConnectionForm,
} from '../services/mcp.service';

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

  const isFormValid = useMemo(
    () => !hasConnectionErrors(validateConnection(connection)),
    [connection],
  );

  const isTesting = status === 'testing';
  const canTest = isFormValid && status !== 'testing';

  const onTestConnection = useCallback(async (): Promise<void> => {
    if (hasConnectionErrors(validateConnection(connection))) {
      setError(INCOMPLETE_FORM_MESSAGE);
      return;
    }

    setError(null);
    setStatus('testing');
    // DA-69: call mcp.service.testConnection and resolve success/failure
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
