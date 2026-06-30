import React from 'react';
import { View, Text } from 'react-native';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { colors } from '@/config/theme';

export type StatTone = 'default' | 'success' | 'info' | 'warning' | 'danger' | 'muted';

interface StatCardProps {
  readonly value: number;
  readonly label: string;
  readonly subtitle?: string;
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
  subtitle,
  tone = 'default',
  isLoading = false,
  testID,
}: StatCardProps): React.JSX.Element => (
  <View
    className="rounded-lg border border-border bg-card"
    style={{ minWidth: 120, padding: 14, gap: 4 }}
    testID={testID}
  >
    {/* Uppercase label at top */}
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: colors.mutedForeground,
      }}
      numberOfLines={1}
    >
      {label}
    </Text>

    {/* Value */}
    {isLoading ? (
      <Skeleton height={32} width={48} borderRadius={4} />
    ) : (
      <Text
        className="font-heading font-bold"
        style={{ fontSize: 28, lineHeight: 34, color: countColor(tone) }}
      >
        {value}
      </Text>
    )}

    {/* Optional subtitle */}
    {subtitle !== undefined && (
      <Text
        className="font-body text-muted-foreground"
        style={{ fontSize: 11, lineHeight: 15 }}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
    )}
  </View>
);
