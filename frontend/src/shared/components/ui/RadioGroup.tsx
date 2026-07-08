import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

const RADIO_INNER_DOT = 'h-2.5 w-2.5 rounded-full bg-primary';

export interface RadioOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
  readonly testID?: string;
}

interface RadioGroupOptionProps<TValue extends string> {
  option: RadioOption<TValue>;
  isSelected: boolean;
  onSelect: (value: TValue) => void;
  testID?: string;
}

function RadioGroupOption<TValue extends string>({
  option,
  isSelected,
  onSelect,
  testID,
}: RadioGroupOptionProps<TValue>): React.JSX.Element {
  const handlePress = useCallback((): void => {
    onSelect(option.value);
  }, [onSelect, option.value]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={option.label}
      testID={testID}
      className="flex-row items-center gap-2 rounded-sm py-1 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    >
      <View
        className={cn(
          'h-5 w-5 items-center justify-center rounded-full border',
          isSelected ? 'border-primary bg-background' : 'border-border bg-background',
        )}
      >
        {isSelected ? <View className={RADIO_INNER_DOT} /> : null}
      </View>
      <Text
        className={cn(
          'font-body text-sm',
          isSelected
            ? 'font-medium text-card-foreground'
            : 'text-muted-foreground',
        )}
      >
        {option.label}
      </Text>
    </Pressable>
  );
}

interface RadioGroupProps<TValue extends string> {
  value: TValue;
  options: readonly RadioOption<TValue>[];
  onChange: (value: TValue) => void;
  accessibilityLabel?: string;
  className?: string;
  testID?: string;
}

export function RadioGroup<TValue extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  className,
  testID,
}: RadioGroupProps<TValue>): React.JSX.Element {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn('gap-2', className)}
      testID={testID}
    >
      {options.map((option) => (
        <RadioGroupOption
          key={option.value}
          option={option}
          isSelected={value === option.value}
          onSelect={onChange}
          testID={
            option.testID ??
            (testID !== undefined ? `${testID}-${option.value}` : undefined)
          }
        />
      ))}
    </View>
  );
}