// Single shared connection (partial DA-48 revert). When either side uses MCP,
// ONE MCPConnectionPanel — WITH the "Configure for" scope selector — plus ONE
// Test Connection flow render. Each CSV side renders its file-upload control.

import React from 'react';
import { render, screen } from '@testing-library/react-native';

// The global reanimated mock resolves to {} on this version, so the real
// Collapsible (rendered by MCPConnectionPanel) needs a minimal animated stub.
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

// TestConnectionFlow loads the real http instance at module level; stub it.
jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { ConnectionDetails } from '../ConnectionDetails';
import { INITIAL_CONNECTION } from '../../store/project-scope.store';

describe('ConnectionDetails — single shared connection', () => {
  it("renders ONE MCP panel with the 'Configure for' radios + test flow when a side is 'mcp'", () => {
    render(
      <ConnectionDetails
        sourceMethod="mcp"
        targetMethod="csv"
        connection={INITIAL_CONNECTION}
        onConnectionChange={jest.fn()}
        testID="connection-details"
      />,
    );

    expect(screen.getByTestId('mcp-panel')).toBeTruthy();
    expect(screen.getByTestId('test-connection')).toBeTruthy();
    // The scope selector ("Configure for") must be present (no fixedScope).
    expect(screen.getByTestId('mcp-scope-source')).toBeTruthy();
    expect(screen.getByTestId('mcp-scope-target')).toBeTruthy();
    expect(screen.getByTestId('mcp-scope-both')).toBeTruthy();
    // The csv target side still renders its upload control.
    expect(screen.getByTestId('upload-target')).toBeTruthy();
  });

  it("renders the upload control(s) for csv sides and no MCP panel", () => {
    render(
      <ConnectionDetails
        sourceMethod="csv"
        targetMethod="csv"
        connection={INITIAL_CONNECTION}
        onConnectionChange={jest.fn()}
        testID="connection-details"
      />,
    );

    expect(screen.getByTestId('upload-source')).toBeTruthy();
    expect(screen.getByTestId('upload-target')).toBeTruthy();
    expect(screen.queryByTestId('mcp-panel')).toBeNull();
    expect(screen.queryByTestId('test-connection')).toBeNull();
  });
});
