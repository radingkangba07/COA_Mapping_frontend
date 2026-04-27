import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import { StepItem, ConnectorLine } from './MigrationStepperParts';
import type { StepStatus } from './MigrationStepperParts';

const STEPS = [
  'Select Systems',
  'Upload Files',
  'Type Mapping',
  'Account Mapping',
  'Preview & Export',
] as const;

interface MigrationStepperProps {
  currentStep: number;
  completedSteps: readonly number[];
  onStepPress?: (step: number) => void;
}

function getStepStatus(
  index: number,
  currentStep: number,
  completedSteps: readonly number[],
): StepStatus {
  if (completedSteps.includes(index)) return 'completed';
  if (index === currentStep) return 'active';
  return 'upcoming';
}

function getLineColor(
  leftIndex: number,
  completedSteps: readonly number[],
): string {
  return completedSteps.includes(leftIndex)
    ? colors.primary
    : colors.border;
}

export const MigrationStepper = ({
  currentStep,
  completedSteps,
  onStepPress,
}: MigrationStepperProps) => {
  const handleStepPress = useCallback(
    (index: number) => {
      if (completedSteps.includes(index) && onStepPress) {
        onStepPress(index);
      }
    },
    [completedSteps, onStepPress],
  );

  return (
    <View testID="migration-stepper">
      {/* Desktop: full horizontal stepper */}
      <View
        className="hidden items-start justify-center px-4 py-3 md:flex md:flex-row"
        testID="stepper-desktop"
      >
        {STEPS.map((label, index) => {
          const status = getStepStatus(index, currentStep, completedSteps);
          const isLast = index === STEPS.length - 1;
          const isCompleted = status === 'completed';

          return (
            <React.Fragment key={label}>
              <StepItem
                index={index}
                label={label}
                status={status}
                isCompleted={isCompleted}
                onPress={handleStepPress}
              />
              {!isLast && (
                <ConnectorLine color={getLineColor(index, completedSteps)} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Mobile: compact current step + dots */}
      <View
        className="flex items-center gap-2 px-4 py-3 md:hidden"
        testID="stepper-mobile"
      >
        <Text className="font-heading text-sm font-semibold text-foreground">
          Step {currentStep + 1}: {STEPS[currentStep]}
        </Text>
        <View className="flex-row items-center gap-1.5">
          {STEPS.map((label, index) => {
            const status = getStepStatus(index, currentStep, completedSteps);
            return (
              <View
                key={label}
                className={cn(
                  'h-2 w-2 rounded-full',
                  status === 'completed' && 'bg-primary',
                  status === 'active' && 'bg-accent',
                  status === 'upcoming' && 'bg-border',
                )}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};
