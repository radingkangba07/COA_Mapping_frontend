import React from 'react';
import { View } from 'react-native';
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
    <View className="gap-3" testID={testID}>
      {items.map((item) => (
        <Checkbox
          key={item.id}
          label={item.label}
          checked={item.selected}
          onCheckedChange={() => onToggle(item.id)}
          testID={testID !== undefined ? `${testID}-${item.id}` : undefined}
        />
      ))}
    </View>
  );
}
