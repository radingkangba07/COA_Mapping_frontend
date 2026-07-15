import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import { StepItem, ConnectorLine } from './MigrationStepperParts';
import type { StepStatus } from './MigrationStepperParts';

// ERP selection happens on the Project Overview screen; wizard starts at Upload.
// STEP_OFFSET maps display index 0 → store step 1 (UPLOAD).
const STEPS = [
  'Upload Files',
  'Type Mapping',
  'Account Mapping',
  'Preview & Export',
] as const;

const STEP_OFFSET = 1;

interface MigrationStepperProps {
  currentStep: number;
  completedSteps: readonly number[];
  onStepPress?: (step: number) => void;
}

function getStepStatus(
  displayIndex: number,
  currentStep: number,
  completedSteps: readonly number[],
): StepStatus {
  const storeStep = displayIndex + STEP_OFFSET;
  if (completedSteps.includes(storeStep)) return 'completed';
  if (storeStep === currentStep) return 'active';
  return 'upcoming';
}

function getLineColor(
  leftDisplayIndex: number,
  completedSteps: readonly number[],
): string {
  return completedSteps.includes(leftDisplayIndex + STEP_OFFSET)
    ? colors.primary
    : colors.border;
}

export const MigrationStepper = ({
  currentStep,
  completedSteps,
  onStepPress,
}: MigrationStepperProps) => {
  const handleStepPress = useCallback(
    (displayIndex: number) => {
      const storeStep = displayIndex + STEP_OFFSET;
      if (completedSteps.includes(storeStep) && onStepPress) {
        onStepPress(storeStep);
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
          Step {currentStep}: {STEPS[currentStep - STEP_OFFSET]}
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
