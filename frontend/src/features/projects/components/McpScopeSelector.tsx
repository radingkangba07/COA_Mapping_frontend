import React from 'react';
import { Text, View } from 'react-native';
import { RadioGroup, type RadioOption } from '@/shared/components/ui/RadioGroup';
import type { McpConfigureScope } from '../services/mcp.service';

const SCOPE_OPTIONS: readonly RadioOption<McpConfigureScope>[] = [
  { value: 'source', label: 'Source' },
  { value: 'target', label: 'Target' },
  { value: 'both', label: 'Both' },
];

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
      <RadioGroup
        value={value}
        options={SCOPE_OPTIONS}
        onChange={onChange}
        accessibilityLabel="Configure for"
        className="flex-row flex-wrap gap-x-6 gap-y-2"
        testID={testID}
      />
    </View>
  );
};
