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
  readonly subtitle: string;
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
    { label: 'Total',           subtitle: 'Workstreams in scope', tone: 'default', value: counts.total          },
    { label: 'Completed',       subtitle: 'Fully mapped',         tone: 'success', value: counts.completed      },
    { label: 'In Progress',     subtitle: 'Active workstreams',   tone: 'info',    value: counts.inProgress     },
    { label: 'Review Required', subtitle: 'Awaiting sign-off',    tone: 'warning', value: counts.reviewRequired },
    { label: 'Blocked',         subtitle: 'Action required',      tone: 'danger',  value: counts.blocked        },
    { label: 'Not Started',     subtitle: 'Pending kick-off',     tone: 'muted',   value: counts.notStarted     },
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
          subtitle={tile.subtitle}
          tone={tile.tone}
          isLoading={isLoading}
          testID={`stat-card-${tile.label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      ))}

      {/* Overall Progress — right-aligned within the same flex row */}
      <View
        className="rounded-lg border border-border bg-card"
        style={{ marginLeft: 'auto', minWidth: 200, padding: 14, gap: 6 }}
        testID="stat-card-overall-progress"
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: colors.mutedForeground,
          }}
        >
          Overall Progress
        </Text>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          {isLoading ? (
            <Skeleton height={28} width={52} borderRadius={4} />
          ) : (
            <Text
              className="font-heading font-bold"
              style={{ fontSize: 24, color: colors.accent }}
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
                  backgroundColor: colors.accent,
                  minWidth: counts.progressPercent > 0 ? 8 : 0,
                }}
                testID="progress-bar-fill"
              />
            </View>
          )}
        </View>
        <Text
          className="font-body text-muted-foreground"
          style={{ fontSize: 11 }}
        >
          {counts.completed} of {counts.total} completed
        </Text>
      </View>
    </View>
  );
};
