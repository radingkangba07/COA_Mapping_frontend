import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
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
}: StatCardProps): React.JSX.Element => {
  const { width } = useWindowDimensions();

  const valueFontSize  = width >= 1100 ? 22 : width >= 768 ? 20 : 16;
  const labelFontSize  = width >= 1100 ? 10 : 9;
  const subFontSize    = width >= 1100 ? 11 : 10;

  return (
    <View
      className="rounded-lg border border-border bg-card"
      style={{ padding: 14, gap: 4, flex: 1 }}
      testID={testID}
    >
      <Text
        style={{
          fontSize: labelFontSize,
          fontWeight: '700',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: colors.mutedForeground,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>

      {isLoading ? (
        <Skeleton height={valueFontSize + 6} width={48} borderRadius={4} />
      ) : (
        <Text
          className="font-heading"
          style={{ fontSize: valueFontSize, fontWeight: '500', lineHeight: valueFontSize * 1.2, color: countColor(tone) }}
        >
          {value}
        </Text>
      )}

      {subtitle !== undefined && (
        <Text
          className="font-body text-muted-foreground"
          style={{ fontSize: subFontSize, lineHeight: subFontSize * 1.4 }}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};
