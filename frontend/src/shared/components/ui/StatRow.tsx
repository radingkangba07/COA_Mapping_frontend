import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { Tooltip } from '@/shared/components/ui/Tooltip';

interface StatRowProps {
  readonly label: string;
  readonly value: string;
  /** Plain toned text — not a badge/pill. */
  readonly tone?: 'blocker' | 'warn';
  readonly tip?: string;
}

export function StatRow({ label, value, tone, tip }: StatRowProps): React.JSX.Element {
  const valueColor = tone === 'blocker' ? colors.destructive : tone === 'warn' ? colors.warning : colors.foreground;

  const labelNode = <Text className="font-body text-xs text-muted-foreground">{label}</Text>;

  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-border py-[9px]">
      {tip ? <Tooltip content={tip} position="bottom">{labelNode}</Tooltip> : labelNode}
      <Text className="font-mono text-xs font-medium" style={{ color: valueColor }}>
        {value}
      </Text>
    </View>
  );
}
