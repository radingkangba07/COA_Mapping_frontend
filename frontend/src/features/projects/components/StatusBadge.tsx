import React from 'react';
import { cn } from '@/shared/utils/string.utils';
import { Badge } from '@/shared/components/ui/Badge';
import type { ProjectStatus } from '../types/projects.types';

// Same pill treatment as the mapping table's "AI suggestion" badge — tint
// classes per status instead of hardcoded hex values, so dark mode works.
const STATUS_CONFIG: Record<ProjectStatus, { label: string; pill: string }> = {
  active: { label: 'Active', pill: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
  in_progress: { label: 'In Progress', pill: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
  draft: { label: 'Draft', pill: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30' },
  pending_review: { label: 'Review', pill: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' },
  completed: { label: 'Completed', pill: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' },
};

interface StatusBadgeProps {
  status: ProjectStatus;
  /** 'sm' matches table pills; 'md' sits comfortably next to page titles. */
  size?: 'sm' | 'md';
  className?: string;
  testID?: string;
}

export const StatusBadge = ({
  status,
  size = 'sm',
  className,
  testID,
}: StatusBadgeProps): React.JSX.Element => {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        'self-start',
        size === 'md' ? 'px-2.5 py-1' : 'px-1.5 py-0.5',
        config.pill,
        className,
      )}
      textClassName={cn(size === 'md' ? 'text-sm' : 'text-xs', config.pill)}
      testID={testID}
    >
      {config.label}
    </Badge>
  );
};
