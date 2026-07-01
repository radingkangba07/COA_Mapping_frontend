// Presentational chip for the Project Summary bar (DA-146).
// Icon + label + value, with a placeholder shown before a selection exists.
// Pure: props in, render out. No store access, no hooks.

import React from 'react';
import { View, Text } from 'react-native';

const ICON_SIZE = 16;

const DEFAULT_PLACEHOLDER = 'Not set';

interface SummaryChipProps {
  readonly icon: React.ComponentType<{
    size?: number;
    color?: string;
    className?: string;
  }>;
  readonly label: string;
  readonly value: string | null;
  readonly placeholder?: string;
  readonly testID?: string;
}

export function SummaryChip({
  icon: Icon,
  label,
  value,
  placeholder = DEFAULT_PLACEHOLDER,
  testID,
}: SummaryChipProps): React.JSX.Element {
  const hasValue = value !== null && value.length > 0;
  const displayValue = hasValue ? value : placeholder;
  const valueClassName = hasValue
    ? 'font-body text-sm font-medium text-foreground'
    : 'font-body text-sm italic text-muted-foreground';

  return (
    <View
      className="flex-row items-center gap-2 rounded-lg border border-border bg-card p-3"
      testID={testID}
    >
      <Icon size={ICON_SIZE} className="text-muted-foreground" />

      <View className="gap-0.5">
        <Text className="font-body text-xs text-muted-foreground">{label}</Text>
        <Text
          className={valueClassName}
          testID={testID !== undefined ? `${testID}-value` : undefined}
        >
          {displayValue}
        </Text>
      </View>
    </View>
  );
}
