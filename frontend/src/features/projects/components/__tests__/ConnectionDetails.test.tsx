// MCP Connection Details panel is always visible and collapsed by default,
// regardless of the selected connection method. CSV upload boxes are not
// rendered here (file upload happens in a different screen).

import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const AnimatedView = ReactModule.forwardRef(
    (props: Record<string, unknown>, ref: unknown) =>
      ReactModule.createElement(View, { ...props, ref }),
  );
  return {
    __esModule: true,
    default: { View: AnimatedView },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (toValue: unknown) => toValue,
  };
});

jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    primary: '#003399',
    primaryForeground: '#FAFAFA',
    accent: '#2563EB',
    success: '#15803D',
    destructive: '#DC2626',
    cardForeground: '#09090B',
    border: '#E4E4E7',
    card: '#FFFFFF',
  },
}));

jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

import { ConnectionDetails } from '../ConnectionDetails';
import { INITIAL_CONNECTION } from '../../store/project-scope.store';

describe('ConnectionDetails — always-visible MCP panel', () => {
  it('renders MCP panel and Test Connection regardless of connection method', () => {
    render(
      <ConnectionDetails
        sourceMethod="csv"
        targetMethod="csv"
        connection={INITIAL_CONNECTION}
        onConnectionChange={jest.fn()}
        testID="connection-details"
      />,
    );

    expect(screen.getByTestId('mcp-panel')).toBeTruthy();
    expect(screen.getByTestId('mcp-panel-test-connection')).toBeTruthy();
    // No CSV upload boxes on this screen
    expect(screen.queryByTestId('upload-source')).toBeNull();
    expect(screen.queryByTestId('upload-target')).toBeNull();
    // "Configure for" scope radio is present inside the collapsible
    expect(screen.getByTestId('mcp-scope-source')).toBeTruthy();
    expect(screen.getByTestId('mcp-scope-target')).toBeTruthy();
    expect(screen.getByTestId('mcp-scope-both')).toBeTruthy();
  });

  it('seeds scope to "source" when only source uses MCP', () => {
    render(
      <ConnectionDetails
        sourceMethod="mcp"
        targetMethod="csv"
        connection={INITIAL_CONNECTION}
        onConnectionChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('mcp-panel')).toBeTruthy();
    expect(screen.getByTestId('mcp-panel-test-connection')).toBeTruthy();
  });

  it('seeds scope to "target" when only target uses MCP', () => {
    render(
      <ConnectionDetails
        sourceMethod="csv"
        targetMethod="mcp"
        connection={INITIAL_CONNECTION}
        onConnectionChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('mcp-panel')).toBeTruthy();
  });

  it('seeds scope to "both" when both sides use MCP', () => {
    render(
      <ConnectionDetails
        sourceMethod="mcp"
        targetMethod="mcp"
        connection={INITIAL_CONNECTION}
        onConnectionChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('mcp-panel')).toBeTruthy();
  });
});
