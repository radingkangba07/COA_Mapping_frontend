import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { ok, err } from '@/shared/types/result.types';
import {
  createInitialMcpForm,
  type McpConnectionForm,
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
  },
}));

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

// The view model imports the real http instance; stub it so module load is inert.
jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { TestConnectionFlow } from '../TestConnectionFlow';
import {
  createMcpConnection,
  testMcpConnection,
} from '../../services/erp-connection.service';
import { useProjectScopeStore } from '../../store/project-scope.store';

const createMock = createMcpConnection as jest.MockedFunction<typeof createMcpConnection>;
const testMock = testMcpConnection as jest.MockedFunction<typeof testMcpConnection>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const validBearerForm: McpConnectionForm = {
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TestConnectionFlow', () => {
  beforeEach(() => {
    createMock.mockReset();
    testMock.mockReset();
    // Default: createMcpConnection resolves quickly; testMcpConnection never
    // resolves so loading-state tests stay in 'testing'.
    createMock.mockResolvedValue(ok({ id: 'conn-1', version: 1 }));
    testMock.mockReturnValue(new Promise(() => undefined));
    useProjectScopeStore.getState().reset();
    // Seed a valid source ERP so resolveErpId returns non-null ('odoo' → 'odoo').
    useProjectScopeStore.getState().setSource('odoo');
  });

  it('disables the test button when the connection is invalid', () => {
    render(<TestConnectionFlow connection={invalidForm} />);

    const button = screen.getByTestId('test-connection-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables the test button when the connection is valid', () => {
    render(<TestConnectionFlow connection={validBearerForm} />);

    const button = screen.getByTestId('test-connection-button');
    expect(button.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('enters loading/disabled state after pressing with a valid connection', () => {
    // createMcpConnection never resolves → hook stays in 'testing' state.
    createMock.mockReturnValue(new Promise(() => undefined));

    render(<TestConnectionFlow connection={validBearerForm} />);

    const button = screen.getByTestId('test-connection-button');
    fireEvent.press(button);

    const buttonAfterPress = screen.getByTestId('test-connection-button');
    expect(buttonAfterPress.props.accessibilityState?.disabled).toBe(true);
  });

  it('shows the success panel after a successful test connection', async () => {
    testMock.mockResolvedValue(
      ok({
        connectedAt: '2026-06-28T10:00:00.000Z',
        logs: ['line one with token'],
      }),
    );

    render(<TestConnectionFlow connection={validBearerForm} />);

    fireEvent.press(screen.getByTestId('test-connection-button'));

    const panel = await screen.findByTestId('test-connection-success');
    expect(panel).toBeTruthy();

    await waitFor(() => {
      const message = screen.getByTestId('test-connection-success-message');
      expect(message.props.children).toEqual([
        'Connected on ',
        expect.any(String),
      ]);
    });
  });

  it('opens the logs drawer when View Logs is pressed after a test resolves', async () => {
    testMock.mockResolvedValue(
      ok({
        connectedAt: '2026-06-28T10:00:00.000Z',
        logs: ['line one with token'],
      }),
    );

    render(<TestConnectionFlow connection={validBearerForm} />);

    fireEvent.press(screen.getByTestId('test-connection-button'));

    const viewLogsButton = await screen.findByTestId(
      'test-connection-view-logs-button',
    );
    expect(viewLogsButton).toBeTruthy();

    fireEvent.press(viewLogsButton);

    expect(screen.getByText('Connection Logs')).toBeTruthy();
    expect(screen.getByTestId('test-connection-log-line-0')).toBeTruthy();
  });

  it('does not show the View Logs button before any test resolves', () => {
    render(<TestConnectionFlow connection={validBearerForm} />);

    expect(
      screen.queryByTestId('test-connection-view-logs-button'),
    ).toBeNull();
  });

  it('shows the failure panel with actionable text after a failed test', async () => {
    testMock.mockResolvedValue(
      err({
        code: 'CONNECTION_FAILED',
        message: 'Request failed with status code 401',
        details: {},
      }),
    );

    render(<TestConnectionFlow connection={validBearerForm} />);

    fireEvent.press(screen.getByTestId('test-connection-button'));

    const panel = await screen.findByTestId('test-connection-failure');
    expect(panel).toBeTruthy();

    const message = screen.getByTestId('test-connection-failure-message');
    expect(message.props.children).toMatch(/Authentication failed/);
  });
});
