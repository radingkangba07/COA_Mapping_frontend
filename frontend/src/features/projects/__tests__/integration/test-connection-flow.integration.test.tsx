// DA-92 (DA-54 cross-cutting tests): Test-connection FLOW integration tests.
//
// Drives the REAL useTestConnectionViewModel hook against the REAL
// project-scope store + selectors, mocking ONLY the network boundary
// (`testConnection`) and the http instance module load. This verifies how a
// mocked test-connection API result (success/failure/loading + invalid-form
// gating + gate-hygiene invalidation) propagates into the store gate
// (connectionReady / testStatus) that the Continue/Create button gates on.

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ok, err } from '@/shared/types/result.types';
import type { AppError, Result } from '@/shared/types/result.types';
import {
  createInitialMcpForm,
  testConnection,
  type McpConnectionForm,
  type McpTestConnectionResult,
} from '../../services/mcp.service';

// Partial-mock the service: keep the real validation/payload helpers
// (validateConnection/hasConnectionErrors/buildTestConnectionPayload/
// createInitialMcpForm) so gating behaves exactly as in production, and stub
// only the network call `testConnection`.
jest.mock('../../services/mcp.service', () => {
  const actual = jest.requireActual('../../services/mcp.service');
  return { ...actual, testConnection: jest.fn() };
});

// The view model imports the real http instance; stub it so module load is inert.
jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { useTestConnectionViewModel } from '../../hooks/useTestConnectionViewModel';
import { useProjectScopeStore } from '../../store/project-scope.store';
import { selectCanCreateProject } from '../../store/project-scope.selectors';

const testConnectionMock = testConnection as jest.MockedFunction<
  typeof testConnection
>;

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
  logs: readonly string[] = [],
): Result<McpTestConnectionResult, AppError> =>
  err({
    code: 'HTTP_401',
    message: 'Authentication failed',
    details: { logs: [...logs] },
  });

// Seeds every Create precondition EXCEPT connectionReady so the gate is driven
// solely by the test-connection result.
const seedCreatePreconditions = (): void => {
  const store = useProjectScopeStore.getState();
  store.setCompanyId('company-1');
  store.setSource('sap');
  store.setTarget('netsuite');
};

beforeEach(() => {
  testConnectionMock.mockReset();
  useProjectScopeStore.getState().reset();
});

// ─── 1. SUCCESS ─────────────────────────────────────────────────────────────

describe('test-connection flow — SUCCESS', () => {
  it('propagates ok() into hook success state and opens the Create gate', async () => {
    testConnectionMock.mockResolvedValue(
      successResult('2026-06-28T10:00:00.000Z', ['connected ok']),
    );
    seedCreatePreconditions();

    const { result } = renderHook(() => useTestConnectionViewModel(validForm));

    expect(result.current.status).toBe('idle');
    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(false);

    await act(async () => {
      await result.current.onTestConnection();
    });

    // Hook surfaces success, timestamp, and server logs.
    expect(result.current.status).toBe('success');
    expect(result.current.connectedAt).toBe('2026-06-28T10:00:00.000Z');
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
    testConnectionMock.mockResolvedValue(
      failureResult(['server log: 401 unauthorized']),
    );
    seedCreatePreconditions();

    const { result } = renderHook(() => useTestConnectionViewModel(validForm));

    await act(async () => {
      await result.current.onTestConnection();
    });

    // Hook surfaces failure, server error message, and server logs.
    expect(result.current.status).toBe('failure');
    expect(result.current.error).toBe('Authentication failed');
    expect(result.current.logs).toEqual(['server log: 401 unauthorized']);
    expect(result.current.connectedAt).toBeNull();

    // Store gate stays closed.
    const state = useProjectScopeStore.getState();
    expect(state.testStatus).toBe('error');
    expect(state.connectionReady).toBe(false);
    expect(selectCanCreateProject(state)).toBe(false);
  });
});

// ─── 3. LOADING ─────────────────────────────────────────────────────────────

describe('test-connection flow — LOADING', () => {
  it("transitions to 'testing' and store 'loading' before the call resolves", async () => {
    let resolveCall: (value: Result<McpTestConnectionResult, AppError>) => void =
      () => undefined;
    const deferred = new Promise<Result<McpTestConnectionResult, AppError>>(
      (resolve) => {
        resolveCall = resolve;
      },
    );
    testConnectionMock.mockReturnValue(deferred);

    const { result } = renderHook(() => useTestConnectionViewModel(validForm));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.onTestConnection();
    });

    // Mid-flight: hook is testing, gating is closed, store status is loading.
    expect(result.current.status).toBe('testing');
    expect(result.current.isTesting).toBe(true);
    expect(result.current.canTest).toBe(false);
    expect(useProjectScopeStore.getState().testStatus).toBe('loading');
    expect(useProjectScopeStore.getState().connectionReady).toBe(false);

    // Resolve and settle.
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
    testConnectionMock.mockResolvedValue(
      successResult('2026-06-28T10:00:00.000Z'),
    );

    const { result } = renderHook(() =>
      useTestConnectionViewModel(invalidForm),
    );

    expect(result.current.canTest).toBe(false);

    await act(async () => {
      await result.current.onTestConnection();
    });

    // An error is set, but the network was never invoked and status stays idle.
    expect(result.current.error).toBe(
      'Complete the connection details before testing.',
    );
    expect(result.current.status).toBe('idle');
    expect(testConnectionMock).not.toHaveBeenCalled();
    expect(useProjectScopeStore.getState().connectionReady).toBe(false);
  });
});

// ─── 5. GATE HYGIENE ─────────────────────────────────────────────────────────

describe('test-connection flow — GATE HYGIENE', () => {
  it('invalidates a prior success when a credential field changes, forcing a re-test', async () => {
    testConnectionMock.mockResolvedValue(
      successResult('2026-06-28T10:00:00.000Z'),
    );
    seedCreatePreconditions();

    const { result, rerender } = renderHook(
      (connection: McpConnectionForm) =>
        useTestConnectionViewModel(connection),
      { initialProps: validForm },
    );

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(result.current.status).toBe('success');
    expect(useProjectScopeStore.getState().connectionReady).toBe(true);

    // Editing a credential field (new object, different token) changes the
    // signature and must invalidate the gate via the hook's useEffect.
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
