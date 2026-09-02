import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';

export interface StatTableRow {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'blocker' | 'warn';
}

interface StatTableProps {
  readonly rows: readonly StatTableRow[];
}

/**
 * A bordered/rounded stat-table card — distinct from the borderless flat
 * list `StatRow` renders.
 */
export function StatTable({ rows }: StatTableProps): React.JSX.Element | null {
  if (rows.length === 0) return null;

  return (
    <View className="overflow-hidden rounded-[10px] border border-border">
      {rows.map((row, index) => {
        const valueColor = row.tone === 'blocker' ? colors.destructive : row.tone === 'warn' ? colors.warning : colors.foreground;
        return (
          <View
            key={row.label}
            className={cn(
              'flex-row items-center justify-between gap-3 border-b border-border px-3.5 py-2.5',
              index === rows.length - 1 && 'border-b-0',
            )}
          >
            <Text className="font-body text-xs text-muted-foreground">{row.label}</Text>
            <Text className="font-mono text-xs font-bold" style={{ color: valueColor }}>
              {row.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
