import React from 'react';
import { render, screen } from '@testing-library/react-native';

// config/theme is not globally mocked; the panel reads colors for the icon.
jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    primary: '#003399',
    success: '#15803D',
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { TestConnectionSuccessPanel } from '../TestConnectionSuccessPanel';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TestConnectionSuccessPanel', () => {
  it('renders the success message with the "Connected on" prefix', () => {
    render(
      <TestConnectionSuccessPanel connectedAt="2026-06-28T10:00:00.000Z" />,
    );

    const message = screen.getByTestId('test-connection-success-message');
    expect(message.props.children).toEqual([
      'Connected on ',
      expect.any(String),
    ]);
    expect(screen.getByText(/^Connected on /)).toBeTruthy();
  });

  it('falls back to the raw value when connectedAt is unparseable', () => {
    render(<TestConnectionSuccessPanel connectedAt="not-a-date" />);

    expect(screen.getByText('Connected on not-a-date')).toBeTruthy();
  });
});
