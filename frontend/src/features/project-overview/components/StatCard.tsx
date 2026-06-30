import React from 'react';
import { View, Text } from 'react-native';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { colors } from '@/config/theme';

export type StatTone = 'default' | 'success' | 'info' | 'warning' | 'danger' | 'muted';

interface StatCardProps {
  readonly value: number;
  readonly label: string;
  readonly tone?: StatTone;
  readonly isLoading?: boolean;
  readonly testID?: string;
}

function countColor(tone: StatTone): string {
  switch (tone) {
    case 'success': return colors.success;
    case 'info':    return colors.accent;
    case 'warning': return colors.warning;
    case 'danger':  return colors.destructive;
    case 'muted':   return colors.mutedForeground;
    default:        return colors.foreground;
  }
}

export const StatCard = ({
  value,
  label,
  tone = 'default',
  isLoading = false,
  testID,
}: StatCardProps): React.JSX.Element => (
  <View
    className="rounded-lg border border-border bg-card p-4"
    style={{ minWidth: 120 }}
    testID={testID}
  >
    {isLoading ? (
      <Skeleton height={28} width={40} borderRadius={4} />
    ) : (
      <Text
        className="font-heading font-bold"
        style={{ fontSize: 24, color: countColor(tone) }}
      >
        {value}
      </Text>
    )}
    <Text className="font-body text-sm text-muted-foreground mt-1" numberOfLines={2}>
      {label}
    </Text>
  </View>
);
