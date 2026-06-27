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
  testConnection,
  type McpConnectionForm,
} from '../../services/mcp.service';

// Button + success panel import `colors` from '@/config/theme', not globally mocked.
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

// Partial-mock the service so only testConnection is stubbed; validation helpers
// (validateConnection/hasConnectionErrors) keep their real implementations.
jest.mock('../../services/mcp.service', () => {
  const actual = jest.requireActual('../../services/mcp.service');
  return { ...actual, testConnection: jest.fn() };
});

// The view model imports the real http instance; stub it so module load is inert.
jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { TestConnectionFlow } from '../TestConnectionFlow';

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
    // Default: a pending promise so loading-state tests stay in 'testing' and
    // never resolve into the success panel.
    (testConnection as jest.Mock).mockReset();
    (testConnection as jest.Mock).mockReturnValue(new Promise(() => undefined));
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
    render(<TestConnectionFlow connection={validBearerForm} />);

    const button = screen.getByTestId('test-connection-button');
    fireEvent.press(button);

    const buttonAfterPress = screen.getByTestId('test-connection-button');
    expect(buttonAfterPress.props.accessibilityState?.disabled).toBe(true);
  });

  it('shows the success panel after a successful test connection', async () => {
    (testConnection as jest.Mock).mockResolvedValue(
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
    (testConnection as jest.Mock).mockResolvedValue(
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
    (testConnection as jest.Mock).mockResolvedValue(
      err({
        code: 'HTTP_401',
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
