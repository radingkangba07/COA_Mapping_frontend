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

const STEP_LABELS = [
  'Select Systems',
  'Upload Files',
  'Type Mapping',
  'Account Mapping',
  'Preview & Export',
];

describe('MigrationStepper', () => {
  it('renders all 5 step labels', () => {
    render(
      <MigrationStepper currentStep={0} completedSteps={[]} />,
    );
    for (const label of STEP_LABELS) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('shows step number for active step', () => {
    render(
      <MigrationStepper currentStep={2} completedSteps={[0, 1]} />,
    );
    // Active step (index 2) should show "3"
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows Check icon for completed steps', () => {
    render(
      <MigrationStepper currentStep={2} completedSteps={[0, 1]} />,
    );
    const checkIcons = screen.getAllByTestId('check-icon');
    expect(checkIcons).toHaveLength(2);
  });

  it('shows step number for upcoming steps', () => {
    render(
      <MigrationStepper currentStep={0} completedSteps={[]} />,
    );
    // Steps 2-5 are upcoming, should show their numbers
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('fires onStepPress only for completed steps', () => {
    const onStepPress = jest.fn();
    render(
      <MigrationStepper
        currentStep={2}
        completedSteps={[0, 1]}
        onStepPress={onStepPress}
      />,
    );

    // Press completed step (index 0)
    fireEvent.press(screen.getByTestId('step-0'));
    expect(onStepPress).toHaveBeenCalledWith(0);

    // Press completed step (index 1)
    fireEvent.press(screen.getByTestId('step-1'));
    expect(onStepPress).toHaveBeenCalledWith(1);

    expect(onStepPress).toHaveBeenCalledTimes(2);
  });

  it('disables upcoming steps', () => {
    render(
      <MigrationStepper currentStep={1} completedSteps={[0]} />,
    );
    // Step index 2 is upcoming — should be disabled
    const upcomingStep = screen.getByTestId('step-2');
    expect(upcomingStep.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('disables active step (only completed are pressable)', () => {
    render(
      <MigrationStepper currentStep={2} completedSteps={[0, 1]} />,
    );
    const activeStep = screen.getByTestId('step-2');
    expect(activeStep.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('has testID "migration-stepper" on root', () => {
    render(
      <MigrationStepper currentStep={0} completedSteps={[]} />,
    );
    expect(screen.getByTestId('migration-stepper')).toBeTruthy();
  });

  it('has testID "step-{index}" on individual steps', () => {
    render(
      <MigrationStepper currentStep={0} completedSteps={[]} />,
    );
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`step-${i}`)).toBeTruthy();
    }
  });

  it('does not fire onStepPress for active step', () => {
    const onStepPress = jest.fn();
    render(
      <MigrationStepper
        currentStep={1}
        completedSteps={[0]}
        onStepPress={onStepPress}
      />,
    );
    // Active step (index 1) is disabled, pressing should not fire
    fireEvent.press(screen.getByTestId('step-1'));
    expect(onStepPress).not.toHaveBeenCalled();
  });
});
