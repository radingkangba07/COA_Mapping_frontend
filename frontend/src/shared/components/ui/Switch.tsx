import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  isDisabled?: boolean;
  className?: string;
  testID?: string;
}

const THUMB_OFF = 2;
const THUMB_ON = 22;

export const Switch = React.forwardRef<View, SwitchProps>(
  ({ checked, onCheckedChange, label, isDisabled = false, className, testID }, ref) => {
    const translateX = useRef(new Animated.Value(checked ? THUMB_ON : THUMB_OFF)).current;

    useEffect(() => {
      Animated.timing(translateX, {
        toValue: checked ? THUMB_ON : THUMB_OFF,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }, [checked, translateX]);

    const handlePress = useCallback(() => {
      if (isDisabled) return;
      onCheckedChange(!checked);
    }, [isDisabled, checked, onCheckedChange]);

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        className={cn('flex-row items-center', isDisabled && 'opacity-50', className)}
        testID={testID}
        accessibilityRole="switch"
        accessibilityState={{ checked, disabled: isDisabled }}
      >
        <View
          className={cn(
            'h-6 w-11 rounded-full',
            checked ? 'bg-primary' : 'bg-input',
          )}
        >
          <Animated.View
            className="absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm"
            style={{ transform: [{ translateX }] }}
          />
        </View>

        {label != null && label.length > 0 && (
          <Text className="ml-2 font-body text-sm text-foreground">{label}</Text>
        )}
      </Pressable>
    );
  },
);

Switch.displayName = 'Switch';
