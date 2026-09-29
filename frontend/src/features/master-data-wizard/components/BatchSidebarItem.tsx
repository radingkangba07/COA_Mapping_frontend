import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/config/theme';
import type { ImportBatchItem } from '../services/test_import.service';
import { shortBatch } from './test-import.utils';

export function BatchSidebarItem({
  batch,
  isSelected,
  onPress,
}: {
  batch: ImportBatchItem;
  isSelected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const hasErrors = batch.errors_open > 0;
  return (
    <Pressable
      onPress={onPress}
      className="px-3 py-2.5"
      style={
        isSelected
          ? { backgroundColor: colors.accent + '12', borderLeftWidth: 2, borderLeftColor: colors.accent, borderBottomWidth: 1, borderBottomColor: colors.border }
          : { borderBottomWidth: 1, borderBottomColor: colors.border }
      }
      testID={`batch-item-${batch.batch_code}`}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="font-body text-sm"
          style={{
            fontWeight: isSelected ? '600' : '400',
            color: isSelected ? colors.accent : colors.foreground,
          }}
          numberOfLines={1}
        >
          {shortBatch(batch.batch_code)}
        </Text>
        {hasErrors ? (
          <View className="h-5 w-5 items-center justify-center rounded-full bg-destructive">
            <Text className="font-body text-[10px] font-bold text-destructive-foreground">
              {String(batch.errors_open)}
            </Text>
          </View>
        ) : (
          <Check size={14} color={colors.success} />
        )}
      </View>
      <Text className="font-body text-xs text-muted-foreground mt-0.5">
        {`${String(batch.records_total)} records`}
      </Text>
    </Pressable>
  );
}
