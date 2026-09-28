// ConnectionDetails renders the correct panel layout based on source/target methods.

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

describe('ConnectionDetails — panel layout', () => {
  it('shows disabled placeholder when neither side is MCP', () => {
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
    expect(screen.queryByTestId('upload-source')).toBeNull();
    expect(screen.queryByTestId('upload-target')).toBeNull();
    // Scope selector is interactive (no fixedScope on disabled placeholder)
    expect(screen.getByTestId('mcp-scope-source')).toBeTruthy();
    expect(screen.getByTestId('mcp-scope-target')).toBeTruthy();
    // "Both" option is removed
    expect(screen.queryByTestId('mcp-scope-both')).toBeNull();
  });

  it('shows single panel locked to source when only source is MCP', () => {
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
    // Read-only scope badge shown instead of radio buttons
    expect(screen.getByTestId('mcp-scope-readonly')).toBeTruthy();
  });

  it('shows single panel locked to target when only target is MCP', () => {
    render(
      <ConnectionDetails
        sourceMethod="csv"
        targetMethod="mcp"
        connection={INITIAL_CONNECTION}
        onConnectionChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('mcp-panel')).toBeTruthy();
    expect(screen.getByTestId('mcp-panel-test-connection')).toBeTruthy();
    // Read-only scope badge shown instead of radio buttons
    expect(screen.getByTestId('mcp-scope-readonly')).toBeTruthy();
  });

  it('shows single panel locked to both sides when both sides are MCP', () => {
    render(
      <ConnectionDetails
        sourceMethod="mcp"
        targetMethod="mcp"
        connection={INITIAL_CONNECTION}
        onConnectionChange={jest.fn()}
      />,
    );
    // Single panel — not two separate panels
    expect(screen.getByTestId('mcp-panel')).toBeTruthy();
    expect(screen.getByTestId('mcp-panel-test-connection')).toBeTruthy();
    // Read-only scope badge shows "Source and Target"
    expect(screen.getByTestId('mcp-scope-readonly')).toBeTruthy();
  });
});
