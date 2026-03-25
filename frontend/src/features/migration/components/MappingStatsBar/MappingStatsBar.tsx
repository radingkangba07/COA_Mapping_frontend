import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';
import type { ConfidenceLevel } from '@/features/migration/types/mapping.types';

const ICON_SIZE = 14;

interface StatCardConfig {
  readonly key: ConfidenceLevel | 'all';
  readonly label: string;
  readonly bgClass: string;
  readonly textClass: string;
  readonly borderClass: string;
}

const STAT_CARDS: readonly StatCardConfig[] = [
  { key: 'all', label: 'All', bgClass: 'bg-secondary', textClass: 'text-secondary-foreground', borderClass: 'border-secondary' },
  { key: 'high', label: 'High', bgClass: 'bg-green-50', textClass: 'text-green-700', borderClass: 'border-green-300' },
  { key: 'medium', label: 'Medium', bgClass: 'bg-yellow-50', textClass: 'text-yellow-700', borderClass: 'border-yellow-300' },
  { key: 'low', label: 'Low', bgClass: 'bg-red-50', textClass: 'text-red-700', borderClass: 'border-red-300' },
] as const;

interface MappingStatsBarProps {
  totalAccounts: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  confirmedHigh: boolean;
  confirmedMedium: boolean;
  confirmedLow: boolean;
  activeFilter: ConfidenceLevel | null;
  onFilterPress: (filter: ConfidenceLevel | null) => void;
  testID?: string;
}

function getCountForCard(
  key: ConfidenceLevel | 'all',
  total: number,
  high: number,
  medium: number,
  low: number,
): number {
  switch (key) {
    case 'all': return total;
    case 'high': return high;
    case 'medium': return medium;
    case 'low': return low;
  }
}

function isConfirmed(
  key: ConfidenceLevel | 'all',
  confirmedHigh: boolean,
  confirmedMedium: boolean,
  confirmedLow: boolean,
): boolean {
  switch (key) {
    case 'all': return confirmedHigh && confirmedMedium && confirmedLow;
    case 'high': return confirmedHigh;
    case 'medium': return confirmedMedium;
    case 'low': return confirmedLow;
  }
}

export const MappingStatsBar = ({
  totalAccounts,
  highConfidence,
  mediumConfidence,
  lowConfidence,
  confirmedHigh,
  confirmedMedium,
  confirmedLow,
  activeFilter,
  onFilterPress,
  testID,
}: MappingStatsBarProps): React.JSX.Element => {
  const handlePress = useCallback(
    (key: ConfidenceLevel | 'all') => {
      onFilterPress(key === 'all' ? null : key);
    },
    [onFilterPress],
  );

  return (
    <View className="flex-row flex-wrap gap-2" testID={testID}>
      {STAT_CARDS.map((card) => {
        const count = getCountForCard(card.key, totalAccounts, highConfidence, mediumConfidence, lowConfidence);
        const confirmed = isConfirmed(card.key, confirmedHigh, confirmedMedium, confirmedLow);
        const isActive = (card.key === 'all' && activeFilter === null) ||
          card.key === activeFilter;

        return (
          <Pressable
            key={card.key}
            onPress={() => handlePress(card.key)}
            className={cn(
              'min-w-[60px] flex-1 items-center rounded-lg border p-1.5 md:min-w-[70px] md:p-2',
              card.bgClass,
              isActive ? card.borderClass : 'border-transparent',
            )}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${card.label} confidence: ${count} accounts`}
            accessibilityState={{ selected: isActive }}
            testID={testID !== undefined ? `${testID}-${card.key}` : undefined}
          >
            <Text className={cn('font-mono text-base font-bold md:text-lg', card.textClass)}>
              {count}
            </Text>
            <Text className="text-xs text-muted-foreground md:text-sm">{card.label}</Text>
            {card.key !== 'all' && confirmed && (
              <CheckCircle2 size={ICON_SIZE} color={colors.success} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
};
