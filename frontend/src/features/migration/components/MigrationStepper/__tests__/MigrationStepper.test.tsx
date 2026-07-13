import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    Check: (props: Record<string, unknown>) => (
      <View testID="check-icon" {...props} />
    ),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <View {...props}>{children}</View>,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
}));

import { MigrationStepper } from '../MigrationStepper';

// Stepper starts at Upload Files (store step 1). STEP_OFFSET=1 means
// completedSteps and currentStep use store step values (1–4), not display indices.
const STEP_LABELS = [
  'Upload Files',
  'Type Mapping',
  'Account Mapping',
  'Preview & Export',
];

describe('MigrationStepper', () => {
  it('renders all 4 step labels', () => {
    render(
      <MigrationStepper currentStep={1} completedSteps={[]} />,
    );
    for (const label of STEP_LABELS) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('shows step number for active step', () => {
    render(
      <MigrationStepper currentStep={2} completedSteps={[1]} />,
    );
    // Store step 2 → display index 1 → shows "2"
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows Check icon for completed steps', () => {
    render(
      <MigrationStepper currentStep={3} completedSteps={[1, 2]} />,
    );
    const checkIcons = screen.getAllByTestId('check-icon');
    expect(checkIcons).toHaveLength(2);
  });

  it('shows step number for upcoming steps', () => {
    render(
      <MigrationStepper currentStep={1} completedSteps={[]} />,
    );
    // Display indices 1–3 are upcoming and show their numbers (2, 3, 4)
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('fires onStepPress only for completed steps', () => {
    const onStepPress = jest.fn();
    render(
      <MigrationStepper
        currentStep={3}
        completedSteps={[1, 2]}
        onStepPress={onStepPress}
      />,
    );

    // Display index 0 → store step 1 (completed) → fires onStepPress(1)
    fireEvent.press(screen.getByTestId('step-0'));
    expect(onStepPress).toHaveBeenCalledWith(1);

    // Display index 1 → store step 2 (completed) → fires onStepPress(2)
    fireEvent.press(screen.getByTestId('step-1'));
    expect(onStepPress).toHaveBeenCalledWith(2);

    expect(onStepPress).toHaveBeenCalledTimes(2);
  });

  it('disables upcoming steps', () => {
    render(
      <MigrationStepper currentStep={1} completedSteps={[]} />,
    );
    // Display index 1 (store step 2) is upcoming — should be disabled
    const upcomingStep = screen.getByTestId('step-1');
    expect(upcomingStep.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('disables active step (only completed are pressable)', () => {
    render(
      <MigrationStepper currentStep={2} completedSteps={[1]} />,
    );
    // Display index 1 (store step 2) is active — should be disabled
    const activeStep = screen.getByTestId('step-1');
    expect(activeStep.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('has testID "migration-stepper" on root', () => {
    render(
      <MigrationStepper currentStep={1} completedSteps={[]} />,
    );
    expect(screen.getByTestId('migration-stepper')).toBeTruthy();
  });

  it('has testID "step-{index}" on individual steps', () => {
    render(
      <MigrationStepper currentStep={1} completedSteps={[]} />,
    );
    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`step-${i}`)).toBeTruthy();
    }
  });

  it('does not fire onStepPress for active step', () => {
    const onStepPress = jest.fn();
    render(
      <MigrationStepper
        currentStep={2}
        completedSteps={[1]}
        onStepPress={onStepPress}
      />,
    );
    // Active step = display index 1 (store step 2) — pressing should not fire
    fireEvent.press(screen.getByTestId('step-1'));
    expect(onStepPress).not.toHaveBeenCalled();
  });
});
