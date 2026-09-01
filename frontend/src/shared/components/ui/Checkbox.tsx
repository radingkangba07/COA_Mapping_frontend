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
  /**
   * `'default'` (20×20, 2px border) is this component's long-standing
   * app-wide look. `'sm'` (15×15, 1px border) exists for the master-data
   * wizard's table row-checkbox, whose reference is a plain native
   * `<input type="checkbox">` at `width:15px;height:15px` — a thick 2px
   * border reads disproportionately chunky at that size, so `'sm'` also
   * thins it to 1px. Additive: every existing consumer keeps `'default'`.
   */
  size?: 'default' | 'sm';
  /** Native-title-equivalent hover text / screen-reader label — additive, not set by any existing consumer. */
  accessibilityLabel?: string;
  className?: string;
  testID?: string;
}

const ICON_SIZE = 14;
const ICON_SIZE_SM = 11;

export const Checkbox = React.forwardRef<View, CheckboxProps>(
  (
    {
      checked,
      onCheckedChange,
      label,
      isDisabled = false,
      size = 'default',
      accessibilityLabel,
      className,
      testID,
    },
    ref,
  ) => {
    const isChecked = checked === true;
    const isIndeterminate = checked === 'indeterminate';
    const isFilled = isChecked || isIndeterminate;
    const isSm = size === 'sm';
    const iconSize = isSm ? ICON_SIZE_SM : ICON_SIZE;

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
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{
          checked: isIndeterminate ? 'mixed' : isChecked,
          disabled: isDisabled,
        }}
      >
        <View
          className={cn(
            'items-center justify-center rounded-sm',
            isSm ? 'h-[15px] w-[15px] border' : 'h-5 w-5 border-2',
            isFilled
              ? 'border-primary bg-primary'
              : 'bg-background',
          )}
          style={!isFilled ? { borderColor: colors.mutedForeground } : undefined}
        >
          {isChecked && (
            <Check
              size={iconSize}
              color={colors.primaryForeground}
              strokeWidth={3}
            />
          )}
          {isIndeterminate && (
            <Minus
              size={iconSize}
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
