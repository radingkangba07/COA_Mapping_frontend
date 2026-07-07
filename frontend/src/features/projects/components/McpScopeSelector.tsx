import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { RadioGroup, type RadioOption } from '@/shared/components/ui/RadioGroup';
import { cn } from '@/shared/utils/string.utils';
import type { McpConfigureScope } from '../services/mcp.service';

const SCOPE_OPTIONS: readonly RadioOption<McpConfigureScope>[] = [
  { value: 'source', label: 'Source' },
  { value: 'target', label: 'Target' },
  { value: 'both', label: 'Both Source and Target' },
];

const SCOPE_TABS: Record<McpConfigureScope, readonly { value: string; label: string }[]> = {
  source: [{ value: 'source', label: 'Source' }],
  target: [{ value: 'target', label: 'Target' }],
  both: [
    { value: 'source', label: 'Source' },
    { value: 'target', label: 'Target' },
    { value: 'both', label: 'Both' },
  ],
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
  const [activeSubTab, setActiveSubTab] = useState<string>(
    value === 'both' ? 'source' : value,
  );

  useEffect(() => {
    setActiveSubTab(value === 'both' ? 'source' : value);
  }, [value]);

  return (
    <View className="gap-3">
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
      <View>
        <View className="flex-row">
          {SCOPE_TABS[value].map((tab) => {
            const isActive = activeSubTab === tab.value;
            return (
              <View key={tab.value} className="relative mr-6">
                <Pressable
                  onPress={() => setActiveSubTab(tab.value)}
                  className="pb-3 pt-1"
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  testID={`${testID}-subtab-${tab.value}`}
                >
                  <Text
                    className={cn(
                      'text-sm',
                      isActive
                        ? 'font-semibold text-accent'
                        : 'font-medium text-muted-foreground',
                    )}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
                {isActive && (
                  <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </View>
            );
          })}
        </View>
        <View className="h-px bg-border" />
      </View>
    </View>
  );
};
