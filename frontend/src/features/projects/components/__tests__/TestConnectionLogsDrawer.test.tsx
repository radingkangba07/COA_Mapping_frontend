import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Sheet + Sheet.Close import `colors` from '@/config/theme'.
jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    cardForeground: '#09090B',
    border: '#E4E4E7',
    card: '#FFFFFF',
  },
}));

import { TestConnectionLogsDrawer } from '../TestConnectionLogsDrawer';

const secretLogs: readonly string[] = [
  'GET /coa Authorization: Bearer sk-supersecret-123',
  'password=hunter2 connecting',
  'plain info line',
];

const noop = (): void => undefined;

describe('TestConnectionLogsDrawer', () => {
  it('redacts secrets in every rendered log line', () => {
    render(
      <TestConnectionLogsDrawer
        visible={true}
        logs={secretLogs}
        onClose={noop}
      />,
    );

    const lineNodes = [
      screen.getByTestId('test-connection-log-line-0'),
      screen.getByTestId('test-connection-log-line-1'),
      screen.getByTestId('test-connection-log-line-2'),
    ];

    const combined = lineNodes.map((node) => String(node.props.children)).join('\n');

    expect(combined).not.toContain('sk-supersecret-123');
    expect(combined).not.toContain('hunter2');
    expect(combined).toContain('***');
    expect(combined).toContain('plain info line');
  });

  it('shows the empty state when there are no logs', () => {
    render(
      <TestConnectionLogsDrawer visible={true} logs={[]} onClose={noop} />,
    );

    expect(screen.getByTestId('test-connection-logs-empty')).toBeTruthy();
    expect(screen.queryByTestId('test-connection-log-line-0')).toBeNull();
  });

  it('does not render the drawer content when not visible', () => {
    render(
      <TestConnectionLogsDrawer
        visible={false}
        logs={secretLogs}
        onClose={noop}
      />,
    );

    expect(screen.queryByText('Connection Logs')).toBeNull();
    expect(screen.queryByTestId('test-connection-log-line-0')).toBeNull();
  });
});
