// ViewModel tests for the MCP test-connection flow (DA-69). Verifies the hook
// wires mcp.service.testConnection and resolves status/connectedAt/logs/error.

import { act, renderHook } from '@testing-library/react-native';

// Avoid pulling the real http client (and its env/config) into the test.
jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

// Keep the real form helpers/validation; mock only the network call.
jest.mock('../../services/mcp.service', () => {
  const actual = jest.requireActual('../../services/mcp.service');
  return { ...actual, testConnection: jest.fn() };
});

import { ok, err } from '@/shared/types/result.types';
import {
  createInitialMcpForm,
  testConnection,
  type McpConnectionForm,
} from '../../services/mcp.service';
import { useTestConnectionViewModel } from '../useTestConnectionViewModel';

const mockTestConnection = testConnection as jest.MockedFunction<
  typeof testConnection
>;

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
  mockTestConnection.mockReset();
});

describe('useTestConnectionViewModel', () => {
  it('resolves to success with connectedAt + logs', async () => {
    mockTestConnection.mockResolvedValue(
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
  });

  it('resolves to failure with server message + logs', async () => {
    mockTestConnection.mockResolvedValue(
      err({ code: 'HTTP_502', message: 'boom', details: { logs: ['e1'] } }),
    );

    const { result } = renderHook(() => useTestConnectionViewModel(validForm));

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(result.current.status).toBe('failure');
    expect(result.current.error).toBe('boom');
    expect(result.current.logs).toEqual(['e1']);
    expect(result.current.connectedAt).toBeNull();
  });

  it('does not call the service for an invalid form', async () => {
    const { result } = renderHook(() =>
      useTestConnectionViewModel(invalidForm),
    );

    await act(async () => {
      await result.current.onTestConnection();
    });

    expect(mockTestConnection).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBe(
      'Complete the connection details before testing.',
    );
  });
});
