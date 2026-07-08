import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Button + panel import `colors` from '@/config/theme'; not globally mocked.
jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    primaryForeground: '#FAFAFA',
    primary: '#003399',
    destructive: '#D72222',
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import {
  TestConnectionFailurePanel,
  toActionableMessage,
} from '../TestConnectionFailurePanel';

// ─── toActionableMessage ────────────────────────────────────────────────────

describe('toActionableMessage', () => {
  it('maps 401 / unauthorized to an authentication message', () => {
    expect(toActionableMessage('Request failed with status code 401')).toMatch(
      /Authentication failed/,
    );
    expect(toActionableMessage('UNAUTHORIZED access')).toMatch(
      /Authentication failed/,
    );
  });

  it('maps 403 / forbidden to an access-denied message', () => {
    expect(toActionableMessage('HTTP 403')).toMatch(/Access denied/);
    expect(toActionableMessage('Forbidden')).toMatch(/Access denied/);
  });

  it('maps 404 to a server-not-found message', () => {
    expect(toActionableMessage('status code 404')).toMatch(
      /MCP server not found/,
    );
  });

  it('maps timeout signatures to a timeout message', () => {
    expect(toActionableMessage('The request timed out')).toMatch(
      /timed out/,
    );
    expect(toActionableMessage('connection timeout')).toMatch(/timed out/);
    expect(toActionableMessage('error 408')).toMatch(/timed out/);
  });

  it('maps network / econnrefused to an unreachable message', () => {
    expect(toActionableMessage('connect ECONNREFUSED 127.0.0.1')).toMatch(
      /Could not reach the MCP server/,
    );
    expect(toActionableMessage('Network Error')).toMatch(
      /Could not reach the MCP server/,
    );
    expect(toActionableMessage('TypeError: Failed to fetch')).toMatch(
      /Could not reach the MCP server/,
    );
  });

  it('maps ssl / certificate to a TLS message', () => {
    expect(toActionableMessage('SSL handshake failed')).toMatch(/TLS\/SSL error/);
    expect(toActionableMessage('self signed certificate')).toMatch(
      /TLS\/SSL error/,
    );
  });

  it('falls back to the trimmed raw message when unmatched', () => {
    expect(toActionableMessage('  Something unexpected happened  ')).toBe(
      'Something unexpected happened',
    );
  });

  it('returns a generic message when the raw message is empty', () => {
    expect(toActionableMessage('')).toBe(
      'Connection test failed. Check the connection details and try again.',
    );
    expect(toActionableMessage('   ')).toBe(
      'Connection test failed. Check the connection details and try again.',
    );
  });
});

// ─── Panel rendering ────────────────────────────────────────────────────────

describe('TestConnectionFailurePanel', () => {
  it('renders the mapped actionable message', () => {
    render(
      <TestConnectionFailurePanel
        message="Request failed with status code 401"
        onRetry={jest.fn()}
      />,
    );

    const message = screen.getByTestId('test-connection-failure-message');
    expect(message.props.children).toMatch(/Authentication failed/);
  });

  it('calls onRetry when the retry button is pressed', () => {
    const onRetry = jest.fn();
    render(
      <TestConnectionFailurePanel message="Network Error" onRetry={onRetry} />,
    );

    fireEvent.press(screen.getByTestId('test-connection-retry-button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
