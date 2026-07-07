import React from 'react';
import { View, Text } from 'react-native';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import type { OpeningBalanceRowVM } from '../hooks/useMigrationScopeViewModel';

interface OpeningBalancesChecklistProps {
  readonly items: readonly OpeningBalanceRowVM[];
  readonly onToggle: (id: string) => void;
  readonly testID?: string;
}

export function OpeningBalancesChecklist({
  items,
  onToggle,
  testID,
}: OpeningBalancesChecklistProps): React.JSX.Element {
  return (
    <View className="gap-1" testID={testID}>
      {items.map((item) => (
        <View key={item.id} className="flex-row items-center justify-between py-2">
          <Text className="font-body flex-1 text-sm text-foreground">{item.label}</Text>
          <Checkbox
            checked={item.selected}
            onCheckedChange={() => onToggle(item.id)}
            testID={testID !== undefined ? `${testID}-${item.id}` : undefined}
          />
        </View>
      ))}
    </View>
  );
}
