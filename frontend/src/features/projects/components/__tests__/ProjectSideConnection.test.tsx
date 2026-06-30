// DA-56: per-side connection branching. For a given side, method 'mcp' renders
// the MCP panel + Test Connection flow; method 'csv' renders the reused upload
// control. Switching the method swaps the rendered subtree.

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
import { ProjectSideConnection } from '../ProjectSideConnection';

describe('ProjectSideConnection — DA-56 method branching', () => {
  it("renders the MCP panel + test flow when the side's method is 'mcp'", () => {
    render(
      <ProjectSideConnection
        scope="source"
        method="mcp"
        uploadLabel="Source COA File"
        onConnectionChange={jest.fn()}
        testID="source-connection"
      />,
    );

    expect(screen.getByTestId('mcp-panel-source')).toBeTruthy();
    expect(screen.getByTestId('test-connection-source')).toBeTruthy();
    expect(screen.queryByTestId('upload-source')).toBeNull();
  });

  it("renders the upload control when the side's method is 'csv'", () => {
    render(
      <ProjectSideConnection
        scope="target"
        method="csv"
        uploadLabel="Target COA File"
        onConnectionChange={jest.fn()}
        testID="target-connection"
      />,
    );

    expect(screen.getByTestId('upload-target')).toBeTruthy();
    expect(screen.queryByTestId('mcp-panel-target')).toBeNull();
    expect(screen.queryByTestId('test-connection-target')).toBeNull();
  });

  it('swaps the rendered subtree when the method changes', () => {
    const { rerender } = render(
      <ProjectSideConnection
        scope="source"
        method="csv"
        uploadLabel="Source COA File"
        onConnectionChange={jest.fn()}
        testID="source-connection"
      />,
    );

    expect(screen.getByTestId('upload-source')).toBeTruthy();
    expect(screen.queryByTestId('mcp-panel-source')).toBeNull();

    rerender(
      <ProjectSideConnection
        scope="source"
        method="mcp"
        uploadLabel="Source COA File"
        onConnectionChange={jest.fn()}
        testID="source-connection"
      />,
    );

    expect(screen.getByTestId('mcp-panel-source')).toBeTruthy();
    expect(screen.queryByTestId('upload-source')).toBeNull();
  });

  it('hides the scope selector inside the fixed-scope MCP panel', () => {
    render(
      <ProjectSideConnection
        scope="source"
        method="mcp"
        uploadLabel="Source COA File"
        onConnectionChange={jest.fn()}
        testID="source-connection"
      />,
    );

    // The "Configure for" scope toggle must not appear when the panel is locked.
    expect(screen.queryByTestId('mcp-scope-source')).toBeNull();
    expect(screen.queryByTestId('mcp-scope-both')).toBeNull();
  });
});
