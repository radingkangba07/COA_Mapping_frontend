// DA-215 (AC: DA-173) — QA: Test Connection flow.
// Component test — driving the MCP form + Test Connection reliably is not
// feasible in E2E (custom Select async-open), so the flow's states, gating and
// secret redaction are verified at the component level.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ok, err } from '@/shared/types/result.types';
import type { AppError, Result } from '@/shared/types/result.types';
import {
  createInitialMcpForm,
  testConnection,
  type McpConnectionForm,
  type McpTestConnectionResult,
} from '../../services/mcp.service';

jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    primaryForeground: '#FAFAFA',
    primary: '#003399',
    success: '#15803D',
    destructive: '#D72222',
    mutedForeground: '#71717A',
    cardForeground: '#09090B',
    border: '#E4E4E7',
    card: '#FFFFFF',
  },
}));

// Partial-mock so only testConnection is stubbed; validation stays real so
// canTest / gating behaves exactly as in production.
jest.mock('../../services/mcp.service', () => {
  const actual = jest.requireActual('../../services/mcp.service');
  return { ...actual, testConnection: jest.fn() };
});

jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

import { TestConnectionFlow } from '../TestConnectionFlow';
import { useProjectScopeStore } from '../../store/project-scope.store';

const testConnectionMock = testConnection as jest.MockedFunction<typeof testConnection>;

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

const successResult = (
  connectedAt: string,
  logs: readonly string[] = [],
): Result<McpTestConnectionResult, AppError> => ok({ connectedAt, logs });

beforeEach(() => {
  testConnectionMock.mockReset();
  useProjectScopeStore.getState().reset();
});

describe('DA-215 Test Connection flow', () => {
  // TC-01 — gating: button disabled with an invalid/incomplete form, enabled when valid
  it('disables the button until the connection form is valid', () => {
    const { rerender } = render(<TestConnectionFlow connection={invalidForm} />);
    expect(screen.getByTestId('test-connection-button').props.accessibilityState?.disabled).toBe(true);

    rerender(<TestConnectionFlow connection={validForm} />);
    expect(screen.getByTestId('test-connection-button').props.accessibilityState?.disabled).toBe(false);
  });

  // TC-02 — testing state: button disabled/loading while the request is in flight
  it('shows a loading/disabled button while testing', () => {
    testConnectionMock.mockReturnValue(new Promise(() => undefined)); // never resolves
    render(<TestConnectionFlow connection={validForm} />);
    fireEvent.press(screen.getByTestId('test-connection-button'));
    expect(screen.getByTestId('test-connection-button').props.accessibilityState?.disabled).toBe(true);
  });

  // TC-03 — success: "Connected on {timestamp}" panel
  it('renders the connected-on success panel', async () => {
    testConnectionMock.mockResolvedValue(successResult('2026-07-22T10:00:00.000Z', ['ok']));
    render(<TestConnectionFlow connection={validForm} />);
    fireEvent.press(screen.getByTestId('test-connection-button'));
    const message = await screen.findByTestId('test-connection-success-message');
    expect(message.props.children).toEqual(['Connected on ', expect.any(String)]);
  });

  // TC-04 — failure: actionable message, raw HTTP error hidden
  it('maps a failure to an actionable message and hides the raw error', async () => {
    testConnectionMock.mockResolvedValue(
      err({ code: 'HTTP_401', message: 'Request failed with status code 401', details: {} }),
    );
    render(<TestConnectionFlow connection={validForm} />);
    fireEvent.press(screen.getByTestId('test-connection-button'));
    const message = await screen.findByTestId('test-connection-failure-message');
    expect(String(message.props.children)).toMatch(/Authentication failed/i);
    expect(String(message.props.children)).not.toContain('Request failed with status code 401');
  });

  // TC-05 — View Logs drawer redacts secrets client-side
  it('redacts secrets in the rendered log lines', async () => {
    testConnectionMock.mockResolvedValue(
      successResult('2026-07-22T10:00:00.000Z', ['Authorization: Bearer sk-secret-XYZ', 'password=hunter2']),
    );
    render(<TestConnectionFlow connection={validForm} />);
    fireEvent.press(screen.getByTestId('test-connection-button'));
    fireEvent.press(await screen.findByTestId('test-connection-view-logs-button'));

    const lines = [
      screen.getByTestId('test-connection-log-line-0'),
      screen.getByTestId('test-connection-log-line-1'),
    ].map((n) => String(n.props.children));

    lines.forEach((text) => {
      expect(text).not.toContain('sk-secret-XYZ');
      expect(text).not.toContain('hunter2');
    });
    expect(lines.join('\n')).toContain('***');
  });

  // TC-06 — Create gate: connectionReady flips true only after a successful test
  it('keeps connectionReady false until a successful test, then flips it true', async () => {
    testConnectionMock.mockResolvedValue(successResult('2026-07-22T10:00:00.000Z'));
    render(<TestConnectionFlow connection={validForm} />);
    expect(useProjectScopeStore.getState().connectionReady).toBe(false);

    fireEvent.press(screen.getByTestId('test-connection-button'));
    await screen.findByTestId('test-connection-success-message');
    await waitFor(() => expect(useProjectScopeStore.getState().connectionReady).toBe(true));
  });
});
