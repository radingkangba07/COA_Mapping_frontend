import React from 'react';
import { View, Text } from 'react-native';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { cardShadow } from '@/config/theme';

export type StatTone = 'default' | 'success' | 'info' | 'warning' | 'danger' | 'muted';

interface StatCardProps {
  readonly value: number;
  readonly label: string;
  readonly subtitle?: string;
  readonly tone?: StatTone;
  readonly isLoading?: boolean;
  readonly testID?: string;
}

// Count colors per tone — darker green/blue for legibility at 2xl size.
const TONE_TEXT_CLASS: Record<StatTone, string> = {
  default: 'text-foreground',
  success: 'text-green-800 dark:text-green-400',
  info:    'text-blue-800 dark:text-blue-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger:  'text-amber-900 dark:text-amber-500',
  muted:   'text-muted-foreground',
};

export const StatCard = ({
  value,
  label,
  subtitle,
  tone = 'default',
  isLoading = false,
  testID,
}: StatCardProps): React.JSX.Element => {
  return (
    <View
      className="rounded-lg border border-border bg-card"
      style={{ padding: 14, gap: 4, flex: 1, ...cardShadow }}
      testID={testID}
    >
      {/* Title left, count right on the same row */}
      <View className="flex-row items-center justify-between gap-2">
        <Text
          className="font-heading text-base font-semibold text-card-foreground"
          numberOfLines={1}
        >
          {label}
        </Text>

        {isLoading ? (
          <Skeleton height={30} width={48} borderRadius={4} />
        ) : (
          <Text
            className={`font-heading text-3xl font-medium ${TONE_TEXT_CLASS[tone]}`}
          >
            {value}
          </Text>
        )}
      </View>

      {subtitle !== undefined && (
        <Text className="font-body text-sm text-muted-foreground" numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};
