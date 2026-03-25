import React, { useCallback } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';

export type StepStatus = 'completed' | 'active' | 'upcoming';

export const CIRCLE_SIZE = Platform.OS === 'web' ? 40 : 32;
export const ICON_SIZE = Platform.OS === 'web' ? 18 : 14;

interface StepItemProps {
  index: number;
  label: string;
  status: StepStatus;
  isCompleted: boolean;
  onPress: (index: number) => void;
}

export const StepItem = React.memo(function StepItem({
  index,
  label,
  status,
  isCompleted,
  onPress,
}: StepItemProps) {
  const handlePress = useCallback(() => {
    onPress(index);
  }, [onPress, index]);

  return (
    <Pressable
      testID={`step-${index}`}
      onPress={handlePress}
      disabled={!isCompleted}
      className="items-center"
      style={{ width: Platform.OS === 'web' ? 100 : 72 }}
      accessibilityRole="button"
      accessibilityLabel={`Step ${index + 1}: ${label}`}
      accessibilityState={{ selected: status === 'active', disabled: !isCompleted }}
    >
      <StepCircle index={index} status={status} />
      <Text
        className={cn(
          'mt-1.5 text-center font-body',
          Platform.OS === 'web' ? 'text-xs' : 'text-[10px]',
          status === 'active'
            ? 'font-semibold text-foreground'
            : status === 'completed'
              ? 'font-medium text-foreground'
              : 'font-normal text-muted-foreground',
        )}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
});

interface StepCircleProps {
  index: number;
  status: StepStatus;
}

const StepCircle = React.memo(function StepCircle({
  index,
  status,
}: StepCircleProps) {
  return (
    <View
      className={cn(
        'items-center justify-center rounded-full',
        status === 'completed' && 'bg-success',
        status === 'active' && 'bg-primary',
        status === 'upcoming' && 'border-2 border-border bg-background',
      )}
      style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
    >
      {status === 'completed' ? (
        <Check
          size={ICON_SIZE}
          color={colors.successForeground}
          strokeWidth={3}
        />
      ) : (
        <Text
          className={cn(
            'font-body font-semibold',
            Platform.OS === 'web' ? 'text-sm' : 'text-xs',
            status === 'active'
              ? 'text-primary-foreground'
              : 'text-muted-foreground',
          )}
        >
          {index + 1}
        </Text>
      )}
    </View>
  );
});

interface ConnectorLineProps {
  color: string;
}

export const ConnectorLine = React.memo(function ConnectorLine({
  color,
}: ConnectorLineProps) {
  return (
    <View
      className="self-center"
      style={{
        height: 2,
        flex: 1,
        marginTop: CIRCLE_SIZE / 2 - 1,
        backgroundColor: color,
      }}
    />
  );
});
