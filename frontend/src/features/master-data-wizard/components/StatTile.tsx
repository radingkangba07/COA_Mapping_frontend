import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/config/theme';

export function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}): React.JSX.Element {
  return (
    <View className="flex-1 flex-row items-center justify-between rounded-[7px] border border-border px-4 py-3 gap-3">
      <Text className="font-body text-sm text-muted-foreground">{label}</Text>
      <Text className="font-heading text-sm font-semibold" style={{ color: color ?? colors.foreground }}>
        {value}
      </Text>
    </View>
  );
}
