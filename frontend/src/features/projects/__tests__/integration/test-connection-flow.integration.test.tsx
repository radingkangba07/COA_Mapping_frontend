// DA-92 (DA-54 cross-cutting tests): Test-connection FLOW integration tests.
//
// Drives the REAL useTestConnectionViewModel hook against the REAL
// project-scope store + selectors, mocking ONLY the network boundary
// (createMcpConnection and testMcpConnection) and the http instance module load.

import { act, renderHook } from '@testing-library/react-native';
import { ok, err } from '@/shared/types/result.types';
import type { AppError, Result } from '@/shared/types/result.types';
import {
  createInitialMcpForm,
  type McpConnectionForm,
  type McpTestConnectionResult,
} from '../../services/mcp.service';

// Mock erp-connection.service: stub createMcpConnection and testMcpConnection
// so no real HTTP is made. Keep the real resolveErpId so gating works.
jest.mock('../../services/erp-connection.service', () => {
  const actual = jest.requireActual('../../services/erp-connection.service');
  return {
    ...actual,
    createMcpConnection: jest.fn(),
    testMcpConnection: jest.fn(),
  };
});

// The view model imports the real http instance; stub it so module load is inert.
jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import {
  createMcpConnection,
  testMcpConnection,
} from '../../services/erp-connection.service';
import { useTestConnectionViewModel } from '../../hooks/useTestConnectionViewModel';
import { useProjectScopeStore } from '../../store/project-scope.store';
import { selectCanCreateProject } from '../../store/project-scope.selectors';

const createMock = createMcpConnection as jest.MockedFunction<typeof createMcpConnection>;
const testMock = testMcpConnection as jest.MockedFunction<typeof testMcpConnection>;

// ─── Fixtures ───────────────────────────────────────────────────────────────

const validForm: McpConnectionForm = {
  ...createInitialMcpForm(),
  url: 'https://mcp.example.com',
  authType: 'bearer',
  token: 'abc',
};

const invalidForm: McpConnectionForm = {
  ...createInitialMcpForm(),
  url: '',
  authType: 'bearer',
  token: 'abc',
};

const successResult = (
  connectedAt: string,
  logs: readonly string[] = [],
): Result<McpTestConnectionResult, AppError> => ok({ connectedAt, logs });

const failureResult = (
  message: string = 'Authentication failed',
  logs: readonly string[] = [],
): Result<McpTestConnectionResult, AppError> =>
  err({
    code: 'CONNECTION_FAILED',
    message,
    details: { logs: [...logs] },
  });

// Seeds every Create precondition EXCEPT connectionReady so the gate is driven
// solely by the test-connection result. Use 'odoo' source so resolveErpId resolves.
const seedCreatePreconditions = (): void => {
  const store = useProjectScopeStore.getState();
  store.setCompanyId('company-1');
  store.setSource('odoo');
  store.setTarget('oracle_netsuite');
  store.setSourceMethod('mcp');
  store.setTargetMethod('mcp');
};

beforeEach(() => {
  createMock.mockReset();
  testMock.mockReset();
  // createMcpConnection succeeds by default
  createMock.mockResolvedValue(ok({ id: 'conn-1', version: 1 }));
  useProjectScopeStore.getState().reset();
});

// ─── 1. SUCCESS ─────────────────────────────────────────────────────────────

describe('test-connection flow — SUCCESS', () => {
  it('propagates ok() into hook success state and opens the Create gate', async () => {
    testMock.mockResolvedValue(successResult('2026-06-28T10:00:00.000Z', ['connected ok']));
    seedCreatePreconditions();

    const { result } = renderHook(() => useTestConnectionViewModel(validForm));

    expect(result.current.status).toBe('idle');
    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(false);

    await act(async () => {
      await result.current.onTestConnection();
    });

    // Hook surfaces success and server logs.
    expect(result.current.status).toBe('success');
    expect(result.current.connectedAt).not.toBeNull();
    expect(result.current.logs).toEqual(['connected ok']);
    expect(result.current.error).toBeNull();

    // Store gate flips open.
    const state = useProjectScopeStore.getState();
    expect(state.testStatus).toBe('success');
    expect(state.connectionReady).toBe(true);
    expect(selectCanCreateProject(state)).toBe(true);
  });
});

// ─── 2. FAILURE ─────────────────────────────────────────────────────────────

describe('test-connection flow — FAILURE', () => {
  it('propagates err() into hook failure state and keeps the Create gate closed', async () => {
    testMock.mockResolvedValue(failureResult('Authentication failed', ['server log: 401 unauthorized']));
    seedCreatePreconditions();

    const { result } = renderHook(() => useTestConnectionViewModel(validForm));

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(result.current.status).toBe('failure');
    expect(result.current.error).toBe('Authentication failed');
    expect(result.current.connectedAt).toBeNull();

    const state = useProjectScopeStore.getState();
    expect(state.testStatus).toBe('error');
    expect(state.connectionReady).toBe(false);
    expect(selectCanCreateProject(state)).toBe(false);
  });
});

// ─── 3. LOADING ─────────────────────────────────────────────────────────────

describe('test-connection flow — LOADING', () => {
  it("transitions to 'testing' and store 'loading' before the call resolves", async () => {
    let resolveCall: (value: Result<McpTestConnectionResult, AppError>) => void = () => undefined;
    const deferred = new Promise<Result<McpTestConnectionResult, AppError>>((resolve) => {
      resolveCall = resolve;
    });
    testMock.mockReturnValue(deferred);
    seedCreatePreconditions();

    const { result } = renderHook(() => useTestConnectionViewModel(validForm));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.onTestConnection();
    });

    // createMcpConnection resolves fast; testMcpConnection is deferred.
    // Wait for create to settle before checking mid-flight state.
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('testing');
    expect(result.current.isTesting).toBe(true);
    expect(result.current.canTest).toBe(false);
    expect(useProjectScopeStore.getState().testStatus).toBe('loading');
    expect(useProjectScopeStore.getState().connectionReady).toBe(false);

    await act(async () => {
      resolveCall(successResult('2026-06-28T10:00:00.000Z'));
      await pending;
    });

    expect(result.current.status).toBe('success');
    expect(useProjectScopeStore.getState().testStatus).toBe('success');
  });
});

// ─── 4. INVALID FORM gating ──────────────────────────────────────────────────

describe('test-connection flow — INVALID FORM gating', () => {
  it('blocks testing for an incomplete form without calling the network', async () => {
    testMock.mockResolvedValue(successResult('2026-06-28T10:00:00.000Z'));

    const { result } = renderHook(() => useTestConnectionViewModel(invalidForm));

    expect(result.current.canTest).toBe(false);

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(result.current.error).toBe('Complete the connection details before testing.');
    expect(result.current.status).toBe('idle');
    expect(testMock).not.toHaveBeenCalled();
    expect(useProjectScopeStore.getState().connectionReady).toBe(false);
  });
});

// ─── 5. GATE HYGIENE ─────────────────────────────────────────────────────────

describe('test-connection flow — GATE HYGIENE', () => {
  it('invalidates a prior success when a credential field changes, forcing a re-test', async () => {
    testMock.mockResolvedValue(successResult('2026-06-28T10:00:00.000Z'));
    seedCreatePreconditions();

    const { result, rerender } = renderHook(
      (connection: McpConnectionForm) => useTestConnectionViewModel(connection),
      { initialProps: validForm },
    );

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(result.current.status).toBe('success');
    expect(useProjectScopeStore.getState().connectionReady).toBe(true);

    const editedForm: McpConnectionForm = { ...validForm, token: 'different' };
    act(() => {
      rerender(editedForm);
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.connectedAt).toBeNull();

    const state = useProjectScopeStore.getState();
    expect(state.connectionReady).toBe(false);
    expect(state.testStatus).toBe('idle');
    expect(selectCanCreateProject(state)).toBe(false);
  });
});
