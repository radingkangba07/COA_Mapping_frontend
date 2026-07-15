import React from 'react';
import { View, Text } from 'react-native';
import { X } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { colors } from '@/config/theme';

interface SelectionActionBarProps {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  testID?: string;
}

export function SelectionActionBar({
  count,
  onDelete,
  onClear,
  testID,
}: SelectionActionBarProps): React.JSX.Element | null {
  if (count === 0) return null;

  return (
    <View
      className="flex-row items-center justify-between rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5"
      testID={testID}
    >
      <Text className="font-body text-sm font-medium text-blue-800 dark:text-blue-300">
        {count} {count === 1 ? 'account' : 'accounts'} selected
      </Text>
      <View className="flex-row items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onPress={onClear}
          accessibilityLabel="Clear selection"
          testID={testID ? `${testID}-clear` : undefined}
        >
          <View className="flex-row items-center gap-1">
            <X size={12} color={colors.foreground} />
            <Text className="text-xs font-medium text-foreground">Clear</Text>
          </View>
        </Button>
      </View>
    </View>
  );
}
