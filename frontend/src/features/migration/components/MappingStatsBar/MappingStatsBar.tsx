import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle2, Eye } from 'lucide-react-native';
import { Badge } from '@/shared/components/ui/Badge';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';
import type { ConfidenceLevel } from '@/features/migration/types/mapping.types';

const ICON_SIZE = 14;

interface MappingStatsBarProps {
  totalAccounts: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  confirmedCount: number;
  confirmedHigh: boolean;
  confirmedMedium: boolean;
  confirmedLow: boolean;
  activeFilter: ConfidenceLevel | null;
  onFilterPress: (filter: ConfidenceLevel | null) => void;
  onConfirmedPress?: () => void;
  testID?: string;
}

export const MappingStatsBar = ({
  totalAccounts,
  highConfidence,
  mediumConfidence,
  lowConfidence,
  confirmedCount,
  confirmedHigh,
  confirmedMedium,
  confirmedLow,
  activeFilter,
  onFilterPress,
  onConfirmedPress,
  testID,
}: MappingStatsBarProps): React.JSX.Element => {
  const handlePress = useCallback(
    (key: ConfidenceLevel | 'all') => {
      onFilterPress(key === 'all' ? null : key);
    },
    [onFilterPress],
  );

  const allConfirmed = confirmedHigh && confirmedMedium && confirmedLow;
  const isAllActive = activeFilter === null;

  return (
    <View className="flex-row flex-wrap gap-3" testID={testID}>
      {/* All Account Names */}
      <Pressable
        onPress={() => handlePress('all')}
        className={cn(
          'min-w-[80px] flex-1 items-center rounded-lg border p-3 bg-white',
          isAllActive ? 'border-blue-400' : 'border-gray-200',
        )}
        accessibilityRole="button"
        accessibilityState={{ selected: isAllActive }}
        testID={testID !== undefined ? `${testID}-all` : undefined}
      >
        <Text className="font-mono text-xl font-bold text-foreground">{totalAccounts}</Text>
        <Text className="text-xs text-muted-foreground">All Account Names</Text>
        {isAllActive && (
          <Badge className="mt-1 bg-blue-100 px-2 py-0.5">
            <Text className="text-xs font-medium text-blue-700">Active</Text>
          </Badge>
        )}
      </Pressable>

      {/* High (90%+) */}
      <StatCard
        count={highConfidence}
        label="High (90%+)"
        bgClass="bg-green-50"
        textClass="text-green-700"
        borderClass="border-green-400"
        confirmedBadgeClass="bg-green-600"
        confirmed={confirmedHigh}
        isActive={activeFilter === 'high'}
        onPress={() => handlePress('high')}
        testID={testID !== undefined ? `${testID}-high` : undefined}
      />

      {/* Medium (70-89%) */}
      <StatCard
        count={mediumConfidence}
        label="Medium (70-89%)"
        bgClass="bg-yellow-50"
        textClass="text-yellow-700"
        borderClass="border-yellow-400"
        confirmedBadgeClass="bg-yellow-600"
        confirmed={confirmedMedium}
        isActive={activeFilter === 'medium'}
        onPress={() => handlePress('medium')}
        testID={testID !== undefined ? `${testID}-medium` : undefined}
      />

      {/* Low (<70%) */}
      <StatCard
        count={lowConfidence}
        label="Low (<70%)"
        bgClass="bg-red-50"
        textClass="text-red-700"
        borderClass="border-red-400"
        confirmedBadgeClass="bg-red-600"
        confirmed={confirmedLow}
        isActive={activeFilter === 'low'}
        onPress={() => handlePress('low')}
        testID={testID !== undefined ? `${testID}-low` : undefined}
      />

      {/* Confirmed Names */}
      <Pressable
        onPress={onConfirmedPress}
        disabled={!allConfirmed}
        className={cn(
          'min-w-[80px] flex-1 items-center rounded-lg border p-3',
          allConfirmed ? 'bg-purple-50 border-purple-400' : 'bg-purple-50/50 border-gray-200',
        )}
        accessibilityRole="button"
        testID={testID !== undefined ? `${testID}-confirmed` : undefined}
      >
        <Text className={cn('font-mono text-xl font-bold', allConfirmed ? 'text-purple-600' : 'text-purple-400')}>
          {confirmedCount}
        </Text>
        <Text className="text-xs text-muted-foreground">Confirmed Names</Text>
        {allConfirmed ? (
          <Badge className="mt-1 bg-purple-600 px-2 py-0.5">
            <View className="flex-row items-center gap-1">
              <Eye size={10} color="#FFFFFF" />
              <Text className="text-xs font-medium text-white">View Review</Text>
            </View>
          </Badge>
        ) : (
          <Badge variant="outline" className="mt-1 px-2 py-0.5 border-gray-300">
            <Text className="text-xs text-muted-foreground">Click to review</Text>
          </Badge>
        )}
      </Pressable>
    </View>
  );
};

// ─── Stat Card Sub-component ────────────────────────────────────────────────

interface StatCardProps {
  count: number;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  confirmedBadgeClass: string;
  confirmed: boolean;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
}

const StatCard = ({
  count,
  label,
  bgClass,
  textClass,
  borderClass,
  confirmedBadgeClass,
  confirmed,
  isActive,
  onPress,
  testID,
}: StatCardProps) => (
  <Pressable
    onPress={onPress}
    className={cn(
      'min-w-[80px] flex-1 items-center rounded-lg border p-3',
      bgClass,
      confirmed ? bgClass : bgClass,
      isActive ? borderClass : 'border-transparent',
    )}
    accessibilityRole="button"
    accessibilityState={{ selected: isActive }}
    testID={testID}
  >
    <Text className={cn('font-mono text-xl font-bold', textClass)}>{count}</Text>
    <Text className="text-xs text-muted-foreground">{label}</Text>
    {confirmed ? (
      <Badge className={cn('mt-1 px-2 py-0.5', confirmedBadgeClass)}>
        <View className="flex-row items-center gap-1">
          <CheckCircle2 size={10} color="#FFFFFF" />
          <Text className="text-xs font-medium text-white">Confirmed</Text>
        </View>
      </Badge>
    ) : isActive ? (
      <Badge className="mt-1 bg-gray-100 px-2 py-0.5">
        <Text className="text-xs font-medium text-gray-600">Review</Text>
      </Badge>
    ) : null}
  </Pressable>
);