import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { ValueMappingScreen } from '../ValueMappingScreen';
import { STEPS, getStep } from '../../utils/taxonomy';

function renderScreen(props: React.ComponentProps<typeof ValueMappingScreen> = {}): void {
  render(<ValueMappingScreen {...props} />);
}

describe('ValueMappingScreen', () => {
  it('renders the step header and an honest "not built yet" message, not a bare blank page', () => {
    renderScreen();

    expect(screen.getByText('Value Mapping')).toBeTruthy();
    expect(screen.getByText(`Step ${getStep('values').n} of ${STEPS.length}`)).toBeTruthy();
    expect(within(screen.getByTestId('value-mapping-empty')).getByText("Value Mapping isn't built yet")).toBeTruthy();
  });

  it('shows the Back button only when a back handler is available, and calls it on press', () => {
    const onBack = jest.fn();
    renderScreen({ onBack });

    fireEvent.press(screen.getByTestId('value-mapping-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hides the Back button when no back handler is available', () => {
    renderScreen();

    expect(screen.queryByTestId('value-mapping-back')).toBeNull();
  });

  it('never wraps itself in a second MigrationLayout (regression guard for the duplicate-sidebar bug)', () => {
    renderScreen();

    expect(screen.queryByTestId('master-data-values-screen')).toBeNull();
  });
});
