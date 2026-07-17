import React from 'react';
import { Text } from 'react-native';
import { Badge } from '@/shared/components/ui/Badge';
import { cn } from '@/shared/utils/string.utils';
import type { WorkstreamStatus } from '../types/workstream.types';

export type BadgeStatus = WorkstreamStatus | 'not_included';

// Same pill treatment as the mapping table's "AI suggestion" badge — outline
// Badge with tint classes per status instead of hardcoded rgba values, so
// dark mode works.
const STATUS_CONFIG: Record<BadgeStatus, { label: string; pill: string }> = {
  completed:       { label: 'Completed',       pill: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' },
  in_progress:     { label: 'In Progress',     pill: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
  review_required: { label: 'Review Required', pill: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' },
  blocked:         { label: 'Blocked',         pill: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' },
  not_started:     { label: 'Not Started',     pill: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30' },
  not_included:    { label: 'Not Included',    pill: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30' },
};

interface StatusBadgeProps {
  readonly status: BadgeStatus;
  readonly testID?: string;
}

export const StatusBadge = ({ status, testID }: StatusBadgeProps): React.JSX.Element => {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={cn('self-center px-1.5 py-0.5', config.pill)}
      testID={testID}
    >
      <Text className={cn('font-body text-base font-medium', config.pill)} numberOfLines={1}>
        {config.label}
      </Text>
    </Badge>
  );
};
