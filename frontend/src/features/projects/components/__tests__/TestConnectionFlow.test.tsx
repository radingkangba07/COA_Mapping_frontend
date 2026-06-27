import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  createInitialMcpForm,
  type McpConnectionForm,
} from '../../services/mcp.service';

// Button imports `colors` from '@/config/theme', which is not globally mocked.
jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    primaryForeground: '#FAFAFA',
  },
}));

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
});
