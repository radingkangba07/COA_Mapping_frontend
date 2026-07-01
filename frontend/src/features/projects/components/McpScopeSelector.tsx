import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import type { McpConfigureScope } from '../services/mcp.service';

interface ScopeOption {
  readonly value: McpConfigureScope;
  readonly label: string;
}

const SCOPE_OPTIONS: readonly ScopeOption[] = [
  { value: 'source', label: 'Source' },
  { value: 'target', label: 'Target' },
  { value: 'both', label: 'Both' },
];

interface ScopeOptionButtonProps {
  option: ScopeOption;
  isSelected: boolean;
  onSelect: (value: McpConfigureScope) => void;
  testID?: string;
}

const ScopeOptionButton = ({
  option,
  isSelected,
  onSelect,
  testID,
}: ScopeOptionButtonProps): React.JSX.Element => {
  const handlePress = useCallback((): void => {
    onSelect(option.value);
  }, [onSelect, option.value]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={option.label}
      className={cn(
        'flex-1 items-center justify-center rounded-md border px-3 py-2',
        isSelected
          ? 'border-primary bg-primary'
          : 'border-border bg-muted',
      )}
      testID={testID}
    >
      <Text
        className={cn(
          'font-body text-sm font-medium',
          isSelected ? 'text-primary-foreground' : 'text-muted-foreground',
        )}
      >
        {option.label}
      </Text>
    </Pressable>
  );
};

interface McpScopeSelectorProps {
  value: McpConfigureScope;
  onChange: (value: McpConfigureScope) => void;
  testID?: string;
}

export const McpScopeSelector = ({
  value,
  onChange,
  testID = 'mcp-scope',
}: McpScopeSelectorProps): React.JSX.Element => {
  return (
    <View className="gap-2">
      <Text className="font-body text-sm font-medium text-card-foreground">
        Configure for
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Configure for"
        className="flex-row gap-2"
      >
        {SCOPE_OPTIONS.map((option) => (
          <ScopeOptionButton
            key={option.value}
            option={option}
            isSelected={value === option.value}
            onSelect={onChange}
            testID={`${testID}-${option.value}`}
          />
        ))}
      </View>
    </View>
  );
};
