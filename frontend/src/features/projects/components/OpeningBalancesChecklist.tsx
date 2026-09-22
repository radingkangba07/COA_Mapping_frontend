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
    <View className="w-full" testID={testID}>
      {/* Column header row, mirrors MasterDataTable's header. */}
      <View
        className="w-[calc(100%+16px)] -ml-2 flex-row items-center border-b border-border px-2 pb-1"
        testID={testID !== undefined ? `${testID}-header` : undefined}
      >
        <Text className="w-[90%] font-heading text-xs font-bold text-foreground" numberOfLines={1}>
          Opening Balances
        </Text>
        <View className="w-[10%]" />
      </View>

      <View className="w-full">
        {items.map((item) => (
          <View
            key={item.id}
            className="w-[calc(100%+16px)] -ml-2 flex-row items-center border-b border-border px-2 py-1"
          >
            <Text className="w-[90%] font-body text-sm text-foreground">
              {item.label}
            </Text>
            <View className="w-[10%] items-center">
              <Checkbox
                checked={item.selected}
                onCheckedChange={() => onToggle(item.id)}
                testID={testID !== undefined ? `${testID}-${item.id}` : undefined}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
