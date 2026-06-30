import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/config/theme';
import type { WorkstreamStatus } from '../types/workstream.types';

export type BadgeStatus = WorkstreamStatus | 'not_included';

interface StatusConfig {
  readonly label: string;
  readonly bg: string;
  readonly textColor: () => string;
}

const STATUS_CONFIG: Record<BadgeStatus, StatusConfig> = {
  completed:       { label: 'Completed',       bg: 'rgba(21,128,61,0.12)',   textColor: () => colors.success        },
  in_progress:     { label: 'In Progress',     bg: 'rgba(37,99,235,0.12)',   textColor: () => colors.accent         },
  review_required: { label: 'Review Required', bg: 'rgba(180,83,9,0.12)',    textColor: () => colors.warning        },
  blocked:         { label: 'Blocked',         bg: 'rgba(215,34,34,0.12)',   textColor: () => colors.destructive    },
  not_started:     { label: 'Not Started',     bg: 'rgba(158,158,158,0.12)', textColor: () => colors.mutedForeground },
  not_included:    { label: 'Not Included',    bg: 'rgba(158,158,158,0.12)', textColor: () => colors.mutedForeground },
};

interface StatusBadgeProps {
  readonly status: BadgeStatus;
  readonly testID?: string;
}

export const StatusBadge = ({ status, testID }: StatusBadgeProps): React.JSX.Element => {
  const config = STATUS_CONFIG[status];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: config.bg,
        borderRadius: 99,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
      testID={testID}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: config.textColor(),
          letterSpacing: 0.1,
        }}
        numberOfLines={1}
      >
        {config.label}
      </Text>
    </View>
  );
};
