import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { ok, err } from '@/shared/types/result.types';
import type { AppError, Result } from '@/shared/types/result.types';
import {
  createInitialMcpForm,
  testConnection,
  type McpConnectionForm,
  type McpTestConnectionResult,
} from '../../services/mcp.service';

// Button, success/failure panels, and the logs drawer (Sheet) all import
// `colors` from '@/config/theme'. Mirror the union of colors the sibling
// suites reference so the whole rendered subtree resolves.
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

// Partial-mock the service so only `testConnection` is stubbed; validation
// helpers (validateConnection/hasConnectionErrors) keep real implementations
// so `canTest`/gating behave exactly as in production.
jest.mock('../../services/mcp.service', () => {
  const actual = jest.requireActual('../../services/mcp.service');
  return { ...actual, testConnection: jest.fn() };
});

// The view model imports the real http instance; stub it so module load is inert.
jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { TestConnectionFlow } from '../TestConnectionFlow';
import { useProjectScopeStore } from '../../store/project-scope.store';
import { selectCanCreateProject } from '../../store/project-scope.selectors';

const testConnectionMock = testConnection as jest.MockedFunction<
  typeof testConnection
>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const validForm: McpConnectionForm = {
  ...createInitialMcpForm(),
  url: 'https://mcp.example.com',
  authType: 'bearer',
  token: 'abc',
};

const successResult = (
  connectedAt: string,
  logs: readonly string[] = [],
): Result<McpTestConnectionResult, AppError> => ok({ connectedAt, logs });

beforeEach(() => {
  testConnectionMock.mockReset();
  useProjectScopeStore.getState().reset();
});

// ─── DA-153: Test Connection flow — acceptance criteria ─────────────────────

describe('DA-153 Test Connection flow', () => {
  // AC1: status 'testing' → button is in loading/disabled state.
  describe('AC1: testing render state', () => {
    it('disables the Test Connection button while the request is in flight', () => {
      // Never resolves → status stays 'testing'.
      testConnectionMock.mockReturnValue(new Promise(() => undefined));

      render(<TestConnectionFlow connection={validForm} />);

      const button = screen.getByTestId('test-connection-button');
      fireEvent.press(button);

      const buttonWhileTesting = screen.getByTestId('test-connection-button');
      expect(buttonWhileTesting.props.accessibilityState?.disabled).toBe(true);
    });
  });

  // AC2: success panel shows "Connected on {timestamp}".
  describe('AC2: success panel', () => {
    it("renders 'Connected on' with the returned timestamp", async () => {
      testConnectionMock.mockResolvedValue(
        successResult('2026-06-28T10:00:00.000Z', ['ok line']),
      );

      render(<TestConnectionFlow connection={validForm} />);

      fireEvent.press(screen.getByTestId('test-connection-button'));

      const message = await screen.findByTestId(
        'test-connection-success-message',
      );
      expect(message.props.children).toEqual([
        'Connected on ',
        expect.any(String),
      ]);
    });
  });

  // AC3: failure panel shows an actionable error (not the raw HTTP message).
  describe('AC3: failure panel actionable error', () => {
    it('maps a 401 to an actionable message and hides the raw error', async () => {
      testConnectionMock.mockResolvedValue(
        err({
          code: 'HTTP_401',
          message: 'Request failed with status code 401',
          details: {},
        }),
      );

      render(<TestConnectionFlow connection={validForm} />);

      fireEvent.press(screen.getByTestId('test-connection-button'));

      const message = await screen.findByTestId(
        'test-connection-failure-message',
      );
      expect(message.props.children).toMatch(/Authentication failed/i);
      expect(String(message.props.children)).not.toContain(
        'Request failed with status code 401',
      );
    });
  });

  // AC4: View Logs drawer renders logs with secrets redacted client-side.
  describe('AC4: View Logs redaction', () => {
    it('redacts secrets in every rendered log line', async () => {
      testConnectionMock.mockResolvedValue(
        successResult('2026-06-28T10:00:00.000Z', [
          'Authorization: Bearer sk-secret-XYZ',
          'password=hunter2',
        ]),
      );

      render(<TestConnectionFlow connection={validForm} />);

      fireEvent.press(screen.getByTestId('test-connection-button'));

      const viewLogsButton = await screen.findByTestId(
        'test-connection-view-logs-button',
      );
      fireEvent.press(viewLogsButton);

      const lineNodes = [
        screen.getByTestId('test-connection-log-line-0'),
        screen.getByTestId('test-connection-log-line-1'),
      ];

      lineNodes.forEach((node) => {
        const text = String(node.props.children);
        expect(text).not.toContain('sk-secret-XYZ');
        expect(text).not.toContain('hunter2');
      });

      const combined = lineNodes
        .map((node) => String(node.props.children))
        .join('\n');
      expect(combined).toContain('***');
    });
  });

  // AC5: Continue disabled until status === 'success'.
  describe('AC5: Continue gating', () => {
    it('enables Continue only after a successful test', async () => {
      testConnectionMock.mockResolvedValue(
        successResult('2026-06-28T10:00:00.000Z'),
      );

      render(<TestConnectionFlow connection={validForm} />);

      const continueButton = screen.getByTestId(
        'test-connection-continue-button',
      );
      expect(continueButton.props.accessibilityState?.disabled).toBe(true);

      fireEvent.press(screen.getByTestId('test-connection-button'));

      await screen.findByTestId('test-connection-success-message');

      await waitFor(() => {
        const after = screen.getByTestId('test-connection-continue-button');
        expect(after.props.accessibilityState?.disabled).not.toBe(true);
      });
    });
  });

  // AC6: Create gate (store/selector) flips only after a successful test.
  describe('AC6: Create gate (store + selectCanCreateProject)', () => {
    it('keeps connectionReady false until a successful test, then flips it true', async () => {
      testConnectionMock.mockResolvedValue(
        successResult('2026-06-28T10:00:00.000Z'),
      );

      render(<TestConnectionFlow connection={validForm} />);

      expect(useProjectScopeStore.getState().connectionReady).toBe(false);

      fireEvent.press(screen.getByTestId('test-connection-button'));
      await screen.findByTestId('test-connection-success-message');

      await waitFor(() => {
        expect(useProjectScopeStore.getState().connectionReady).toBe(true);
      });
      expect(useProjectScopeStore.getState().testStatus).toBe('success');
    });

    it('leaves connectionReady false after a failed test', async () => {
      testConnectionMock.mockResolvedValue(
        err({
          code: 'HTTP_401',
          message: 'Request failed with status code 401',
          details: {},
        }),
      );

      render(<TestConnectionFlow connection={validForm} />);

      fireEvent.press(screen.getByTestId('test-connection-button'));
      await screen.findByTestId('test-connection-failure-message');

      expect(useProjectScopeStore.getState().connectionReady).toBe(false);
    });

    it('selectCanCreateProject is false before and true after a successful test (full MCP gate)', async () => {
      testConnectionMock.mockResolvedValue(
        successResult('2026-06-28T10:00:00.000Z'),
      );

      // Seed every other Create precondition so connectionReady is the ONLY
      // thing gating the Create button for an MCP project.
      const store = useProjectScopeStore.getState();
      store.setCompanyId('company-1');
      store.setSource('sap');
      store.setTarget('netsuite');

      expect(useProjectScopeStore.getState().draft.method).toBe('mcp');
      expect(
        selectCanCreateProject(useProjectScopeStore.getState()),
      ).toBe(false);

      render(<TestConnectionFlow connection={validForm} />);

      fireEvent.press(screen.getByTestId('test-connection-button'));
      await screen.findByTestId('test-connection-success-message');

      await waitFor(() => {
        expect(
          selectCanCreateProject(useProjectScopeStore.getState()),
        ).toBe(true);
      });
    });
  });
});
