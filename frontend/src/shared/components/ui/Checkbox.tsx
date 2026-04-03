import React, { useCallback } from 'react';
import { Pressable, View, Text } from 'react-native';
import { Check, Minus } from 'lucide-react-native';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';

type CheckedState = boolean | 'indeterminate';

interface CheckboxProps {
  checked: CheckedState;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  isDisabled?: boolean;
  className?: string;
  testID?: string;
}

const ICON_SIZE = 14;

export const Checkbox = React.forwardRef<View, CheckboxProps>(
  (
    {
      checked,
      onCheckedChange,
      label,
      isDisabled = false,
      className,
      testID,
    },
    ref,
  ) => {
    const isChecked = checked === true;
    const isIndeterminate = checked === 'indeterminate';
    const isFilled = isChecked || isIndeterminate;

    const handlePress = useCallback(() => {
      if (isDisabled) return;
      onCheckedChange(!isChecked);
    }, [isDisabled, isChecked, onCheckedChange]);

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={isDisabled}
        className={cn(
          'flex-row items-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-sm',
          isDisabled && 'opacity-50',
          className,
        )}
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: isIndeterminate ? 'mixed' : isChecked,
          disabled: isDisabled,
        }}
      >
        <View
          className={cn(
            'h-5 w-5 items-center justify-center rounded-sm border',
            isFilled
              ? 'border-primary bg-primary'
              : 'border-border bg-background',
          )}
        >
          {isChecked && (
            <Check
              size={ICON_SIZE}
              color={colors.primaryForeground}
              strokeWidth={3}
            />
          )}
          {isIndeterminate && (
            <Minus
              size={ICON_SIZE}
              color={colors.primaryForeground}
              strokeWidth={3}
            />
          )}
        </View>

        {label != null && label.length > 0 && (
          <Text className="ml-2 font-body text-sm text-foreground">{label}</Text>
        )}
      </Pressable>
    );
  },
);

Checkbox.displayName = 'Checkbox';
