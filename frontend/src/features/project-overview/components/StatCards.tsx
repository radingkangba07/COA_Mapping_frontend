import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { colors } from '@/config/theme';
import { countByStatus } from '../utils/countByStatus';
import { StatCard } from './StatCard';
import type { StatTone } from './StatCard';
import type { Workstream } from '../types/workstream.types';

interface StatCardsProps {
  readonly workstreams: readonly Workstream[];
  readonly isLoading?: boolean;
  readonly testID?: string;
}

interface TileDefinition {
  readonly label: string;
  readonly tone: StatTone;
  readonly value: number;
}

export const StatCards = ({
  workstreams,
  isLoading = false,
  testID,
}: StatCardsProps): React.JSX.Element => {
  const counts = useMemo(() => countByStatus(workstreams), [workstreams]);

  const tiles: readonly TileDefinition[] = [
    { label: 'Total',           tone: 'default', value: counts.total           },
    { label: 'Completed',       tone: 'success', value: counts.completed       },
    { label: 'In Progress',     tone: 'info',    value: counts.inProgress      },
    { label: 'Review Required', tone: 'warning', value: counts.reviewRequired  },
    { label: 'Blocked',         tone: 'danger',  value: counts.blocked         },
    { label: 'Not Started',     tone: 'muted',   value: counts.notStarted      },
  ];

  return (
    <View
      className="flex-row flex-wrap items-center"
      style={{ gap: 8 }}
      testID={testID}
    >
      {tiles.map((tile) => (
        <StatCard
          key={tile.label}
          value={tile.value}
          label={tile.label}
          tone={tile.tone}
          isLoading={isLoading}
          testID={`stat-card-${tile.label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      ))}

      {/* Overall Progress — right-aligned within the same flex row */}
      <View
        className="rounded-lg border border-border bg-card p-4"
        style={{ marginLeft: 'auto', minWidth: 180, gap: 6 }}
        testID="stat-card-overall-progress"
      >
        <Text className="font-body text-xs text-muted-foreground">Overall Progress</Text>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          {isLoading ? (
            <Skeleton height={24} width={48} borderRadius={4} />
          ) : (
            <Text
              className="font-heading font-bold"
              style={{ fontSize: 20, color: colors.accent }}
            >
              {counts.progressPercent}%
            </Text>
          )}
          {isLoading ? (
            <View style={{ flex: 1 }}>
              <Skeleton height={8} width="100%" borderRadius={4} />
            </View>
          ) : (
            <View
              className="flex-1 bg-muted rounded-full"
              style={{ height: 8 }}
              testID="progress-bar-track"
            >
              <View
                className="rounded-full"
                style={{
                  height: 8,
                  width: `${counts.progressPercent}%`,
                  backgroundColor: colors.success,
                  minWidth: counts.progressPercent > 0 ? 8 : 0,
                }}
                testID="progress-bar-fill"
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
