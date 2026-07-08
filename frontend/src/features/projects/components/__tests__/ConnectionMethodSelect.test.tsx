// DA-55: the per-side connection-method dropdown. Verifies both options render,
// the current value is reflected, and onChange fires with the chosen value.

import React from 'react';
import { View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Select imports `colors` from '@/config/theme' for its ChevronDown/Check icons.
jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    accent: '#2563EB',
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { ConnectionMethodSelect } from '../ConnectionMethodSelect';
import type { ConnectionMethod } from '../../types/project-scope.types';

// The Select menu opens via triggerRef.measureInWindow(callback); the test
// renderer never fires it, so patch the host View prototype to invoke it
// synchronously (mirrors MemberAddControl.test).
beforeAll(() => {
  (
    View.prototype as unknown as {
      measureInWindow: (
        cb: (x: number, y: number, w: number, h: number) => void,
      ) => void;
    }
  ).measureInWindow = (cb) => cb(0, 0, 100, 40);
});

describe('ConnectionMethodSelect', () => {
  it('reflects the current value on the trigger', () => {
    render(
      <ConnectionMethodSelect
        value="mcp"
        onChange={jest.fn()}
        testID="connection-method-source"
      />,
    );

    expect(
      screen.getByTestId('connection-method-source-trigger'),
    ).toHaveTextContent('MCP Server');
  });

  it('opens and renders both method options', () => {
    render(
      <ConnectionMethodSelect
        value="csv"
        onChange={jest.fn()}
        testID="connection-method-target"
      />,
    );

    fireEvent.press(screen.getByTestId('connection-method-target-trigger'));

    expect(
      screen.getByTestId('connection-method-target-option-mcp'),
    ).toHaveTextContent('MCP Server');
    expect(
      screen.getByTestId('connection-method-target-option-csv'),
    ).toHaveTextContent('CSV File Upload');
  });

  it('fires onChange with the chosen method value', () => {
    const onChange = jest.fn<void, [ConnectionMethod]>();
    render(
      <ConnectionMethodSelect
        value="csv"
        onChange={onChange}
        testID="connection-method-source"
      />,
    );

    fireEvent.press(screen.getByTestId('connection-method-source-trigger'));
    fireEvent.press(screen.getByTestId('connection-method-source-option-mcp'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('mcp');
  });
});
