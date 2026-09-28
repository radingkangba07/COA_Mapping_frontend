import React from 'react';
import { Text, View } from 'react-native';
import { RadioGroup, type RadioOption } from '@/shared/components/ui/RadioGroup';
import type { McpConfigureScope } from '../services/mcp.service';

const SCOPE_OPTIONS: readonly RadioOption<McpConfigureScope>[] = [
  { value: 'source', label: 'Source' },
  { value: 'target', label: 'Target' },
];

const SCOPE_LABEL: Record<McpConfigureScope, string> = {
  source: 'Source',
  target: 'Target',
  both: 'Source and Target',
};

interface McpScopeSelectorProps {
  value: McpConfigureScope;
  onChange: (value: McpConfigureScope) => void;
  // When true, renders the selected scope as a read-only label instead of
  // interactive radio buttons (used when the panel is locked to a fixed side).
  isReadOnly?: boolean;
  testID?: string;
}

export const McpScopeSelector = ({
  value,
  onChange,
  isReadOnly = false,
  testID = 'mcp-scope',
}: McpScopeSelectorProps): React.JSX.Element => {
  return (
    <View className="gap-2">
      <Text className="font-body text-sm font-medium text-card-foreground">
        Configure for
      </Text>
      {isReadOnly ? (
        <View
          className="self-start rounded-md border border-border bg-muted/40 px-3 py-1.5"
          testID={`${testID}-readonly`}
        >
          <Text className="font-body text-sm font-semibold text-card-foreground">
            {SCOPE_LABEL[value]}
          </Text>
        </View>
      ) : (
        <RadioGroup
          value={value}
          options={SCOPE_OPTIONS}
          onChange={onChange}
          accessibilityLabel="Configure for"
          className="flex-row flex-wrap gap-x-6 gap-y-2"
          testID={testID}
        />
      )}
    </View>
  );
};
