import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
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
  const { width } = useWindowDimensions();
  const counts = useMemo(() => countByStatus(workstreams), [workstreams]);

  const GAP = 8;
  const overallFontSize = width >= 1100 ? 28 : 24;
  const overallLabelSize = width >= 1100 ? 11 : 10;

  const tiles: readonly TileDefinition[] = [
    { label: 'Total',           subtitle: 'Workstreams in scope', tone: 'default', value: counts.total          },
    { label: 'Completed',       subtitle: 'Fully mapped',         tone: 'success', value: counts.completed      },
    { label: 'In Progress',     subtitle: 'Active workstreams',   tone: 'info',    value: counts.inProgress     },
    { label: 'Review Required', subtitle: 'Awaiting sign-off',    tone: 'warning', value: counts.reviewRequired },
    { label: 'Blocked',         subtitle: 'Action required',      tone: 'danger',  value: counts.blocked        },
    { label: 'Not Started',     subtitle: 'Pending kick-off',     tone: 'muted',   value: counts.notStarted     },
  ];

  return (
    <View style={{ gap: GAP }} testID={testID}>
      {/* Section heading */}
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: colors.mutedForeground,
        }}
      >
        Summary Stats
      </Text>

      {/* All 6 tiles in a single row — flex: 1 on each so they share space equally */}
      <View style={{ flexDirection: 'row', gap: GAP, flexWrap: 'wrap' }}>
        {tiles.map((tile) => (
          <View key={tile.label} style={{ flex: 1, minWidth: 100 }}>
            <StatCard
              value={tile.value}
              label={tile.label}
              subtitle={tile.subtitle}
              tone={tile.tone}
              isLoading={isLoading}
              testID={`stat-card-${tile.label.toLowerCase().replace(/\s+/g, '-')}`}
            />
          </View>
        ))}
      </View>

      {/* Overall Progress — full-width below the tiles */}
      <View
        className="rounded-lg border border-border bg-card"
        style={{ padding: 14, gap: 6 }}
        testID="stat-card-overall-progress"
      >
        <Text
          style={{
            fontSize: overallLabelSize,
            fontWeight: '700',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: colors.mutedForeground,
          }}
        >
          Overall Progress
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isLoading ? (
            <Skeleton height={overallFontSize + 4} width={52} borderRadius={4} />
          ) : (
            <Text
              className="font-heading font-bold"
              style={{ fontSize: overallFontSize, color: colors.primary }}
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
                  backgroundColor: colors.primary,
                  minWidth: counts.progressPercent > 0 ? 8 : 0,
                }}
                testID="progress-bar-fill"
              />
            </View>
          )}
        </View>

        <Text
          className="font-body text-muted-foreground"
          style={{ fontSize: overallLabelSize }}
        >
          {counts.completed} of {counts.total} completed
        </Text>
      </View>
    </View>
  );
};
