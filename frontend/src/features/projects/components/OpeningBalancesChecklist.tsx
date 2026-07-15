import React from 'react';
import { View, Text } from 'react-native';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import type { OpeningBalanceRowVM } from '../hooks/useMigrationScopeViewModel';

interface OpeningBalancesChecklistProps {
  readonly items: readonly OpeningBalanceRowVM[];
  readonly onToggle: (id: string) => void;
  /** Selection counter rendered next to the "Opening Balances" header title. */
  readonly counter?: React.ReactNode;
  readonly testID?: string;
}

export function OpeningBalancesChecklist({
  items,
  onToggle,
  counter,
  testID,
}: OpeningBalancesChecklistProps): React.JSX.Element {
  return (
    <View className="w-full" testID={testID}>
      {/* Column header row, mirrors MasterDataTable's header. */}
      <View
        className="w-[calc(100%+16px)] -ml-2 flex-row items-center border-b border-border px-2 pb-1"
        testID={testID !== undefined ? `${testID}-header` : undefined}
      >
        <View className="w-[90%] flex-row flex-wrap items-center gap-2">
          <Text className="font-heading text-base font-semibold text-card-foreground">
            Opening Balances
          </Text>
          {counter}
        </View>
        <View className="w-[10%]" />
      </View>

      <View className="w-full">
        {items.map((item) => (
          <View
            key={item.id}
            className="w-[calc(100%+16px)] -ml-2 flex-row items-center border-b border-border px-2 py-1"
          >
            <Text className="w-[90%] font-body text-sm font-medium text-muted-foreground">
              {item.label}
            </Text>
            <View className="w-[10%] items-center">
              <Checkbox
                checked={item.selected}
                onCheckedChange={() => onToggle(item.id)}
                isDisabled
                testID={testID !== undefined ? `${testID}-${item.id}` : undefined}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
