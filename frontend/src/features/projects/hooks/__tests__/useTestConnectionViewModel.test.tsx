// ViewModel tests for the MCP test-connection flow (DA-69). Verifies the hook
// wires erp-connection.service and resolves status/connectedAt/logs/error.

import { act, renderHook } from '@testing-library/react-native';

// Avoid pulling the real http client (and its env/config) into the test.
jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

// Mock erp-connection.service: stub createMcpConnection and testMcpConnection
// while keeping resolveErpId real so gating behaves as in production.
jest.mock('../../services/erp-connection.service', () => {
  const actual = jest.requireActual('../../services/erp-connection.service');
  return {
    ...actual,
    createMcpConnection: jest.fn(),
    testMcpConnection: jest.fn(),
  };
});

import { ok, err } from '@/shared/types/result.types';
import {
  createInitialMcpForm,
  type McpConnectionForm,
} from '../../services/mcp.service';
import {
  createMcpConnection,
  testMcpConnection,
} from '../../services/erp-connection.service';
import { useProjectScopeStore } from '../../store/project-scope.store';
import { useTestConnectionViewModel } from '../useTestConnectionViewModel';

const createMock = createMcpConnection as jest.MockedFunction<typeof createMcpConnection>;
const testMock = testMcpConnection as jest.MockedFunction<typeof testMcpConnection>;

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
  token: '',
};

beforeEach(() => {
  createMock.mockReset();
  testMock.mockReset();
  createMock.mockResolvedValue(ok({ id: 'conn-1', version: 1 }));
  useProjectScopeStore.getState().reset();
  // Seed a valid source ERP so resolveErpId returns non-null.
  useProjectScopeStore.getState().setSource('odoo');
});

describe('useTestConnectionViewModel', () => {
  it('resolves to success with connectedAt + logs', async () => {
    testMock.mockResolvedValue(
      ok({ connectedAt: '2026-06-28T10:00:00Z', logs: ['x'] }),
    );

    const { result } = renderHook(() => useTestConnectionViewModel(validForm));

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(result.current.status).toBe('success');
    expect(result.current.connectedAt).toBe('2026-06-28T10:00:00Z');
    expect(result.current.logs).toEqual(['x']);
    expect(result.current.error).toBeNull();
    expect(useProjectScopeStore.getState().connectionReady).toBe(true);
    expect(useProjectScopeStore.getState().testStatus).toBe('success');
  });

  it('resolves to failure with server message + logs', async () => {
    testMock.mockResolvedValue(
      err({ code: 'CONNECTION_FAILED', message: 'boom', details: { logs: ['e1'] } }),
    );

    const { result } = renderHook(() => useTestConnectionViewModel(validForm));

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(result.current.status).toBe('failure');
    expect(result.current.error).toBe('boom');
    expect(result.current.logs).toEqual(['e1']);
    expect(result.current.connectedAt).toBeNull();
    expect(useProjectScopeStore.getState().connectionReady).toBe(false);
    expect(useProjectScopeStore.getState().testStatus).toBe('error');
  });

  it('invalidates a prior success when the connection is edited', async () => {
    testMock.mockResolvedValue(
      ok({ connectedAt: '2026-06-28T10:00:00Z', logs: ['x'] }),
    );

    const { result, rerender } = renderHook(
      ({ connection }: { connection: McpConnectionForm }) =>
        useTestConnectionViewModel(connection),
      { initialProps: { connection: validForm } },
    );

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(result.current.status).toBe('success');
    expect(useProjectScopeStore.getState().connectionReady).toBe(true);

    const editedForm: McpConnectionForm = {
      ...validForm,
      url: 'https://mcp.changed.example.com',
    };

    act(() => {
      rerender({ connection: editedForm });
    });

    expect(result.current.status).toBe('idle');
    expect(useProjectScopeStore.getState().connectionReady).toBe(false);
    expect(useProjectScopeStore.getState().testStatus).toBe('idle');
  });

  it('success survives an unrelated re-render with a content-equal connection', async () => {
    testMock.mockResolvedValue(
      ok({ connectedAt: '2026-06-28T10:00:00Z', logs: ['x'] }),
    );

    const { result, rerender } = renderHook(
      ({ connection }: { connection: McpConnectionForm }) =>
        useTestConnectionViewModel(connection),
      { initialProps: { connection: validForm } },
    );

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(result.current.status).toBe('success');
    expect(useProjectScopeStore.getState().connectionReady).toBe(true);

    // New object, identical field values — must NOT reset the gate.
    act(() => {
      rerender({ connection: { ...validForm } });
    });

    expect(result.current.status).toBe('success');
    expect(useProjectScopeStore.getState().connectionReady).toBe(true);
    expect(useProjectScopeStore.getState().testStatus).toBe('success');
  });

  it('mount does not reset an already-established gate', () => {
    useProjectScopeStore.getState().setConnectionReady(true);
    useProjectScopeStore.getState().setTestStatus('success');

    renderHook(() => useTestConnectionViewModel(validForm));

    expect(useProjectScopeStore.getState().connectionReady).toBe(true);
    expect(useProjectScopeStore.getState().testStatus).toBe('success');
  });

  it('does not call the service for an invalid form', async () => {
    const { result } = renderHook(() =>
      useTestConnectionViewModel(invalidForm),
    );

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(testMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBe(
      'Complete the connection details before testing.',
    );
  });
});
