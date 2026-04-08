import React from 'react';
import { View, Text } from 'react-native';
import type { ProjectStatus } from '../types/projects.types';

// Dark tonal badges matching reference design — primary dark bg + white text
const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: '#6B7280', bgColor: 'rgba(107,114,128,0.12)' },
  in_progress: { label: 'In Progress', color: '#003399', bgColor: 'rgba(0,51,153,0.10)' },
  pending_review: { label: 'Review', color: '#D97706', bgColor: 'rgba(217,119,6,0.10)' },
  completed: { label: 'Completed', color: '#16A34A', bgColor: 'rgba(22,163,74,0.10)' },
};

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
  testID?: string;
}

export const StatusBadge = ({
  status,
  testID,
}: StatusBadgeProps): React.JSX.Element => {
  const config = STATUS_CONFIG[status];

  return (
    <View
      className="self-start rounded-full px-2.5 py-0.5"
      style={{ backgroundColor: config.bgColor }}
      testID={testID}
    >
      <Text
        className="font-body text-xs font-medium"
        style={{ color: config.color }}
      >
        {config.label}
      </Text>
    </View>
  );
};
