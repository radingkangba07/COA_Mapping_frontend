import React from 'react';
import { View, TextInput, Text, type TextInputProps } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  inputClassName?: string;
  testID?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      className,
      inputClassName,
      editable = true,
      testID,
      ...textInputProps
    },
    ref,
  ) => {
    const hasError = error !== undefined && error.length > 0;

    return (
      <View className={cn('gap-1.5', className)} testID={testID}>
        {label !== undefined && label.length > 0 && (
          <Text className="font-body text-sm font-medium text-foreground">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          editable={editable}
          className={cn(
            'h-10 rounded-md border bg-background px-3 font-body text-sm text-foreground focus:outline-none',
            hasError
              ? 'border-destructive'
              : 'border-input focus:border-ring',
            editable === false && 'opacity-50',
            inputClassName,
          )}
          placeholderTextColor={colors.mutedForeground}
          {...textInputProps}
        />
        {hasError && (
          <Text className="text-xs text-destructive">{error}</Text>
        )}
        {!hasError && helperText !== undefined && helperText.length > 0 && (
          <Text className="text-xs text-muted-foreground">{helperText}</Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';
