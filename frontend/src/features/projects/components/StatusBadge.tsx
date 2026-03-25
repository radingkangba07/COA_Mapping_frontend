import React from 'react';
import { Badge } from '@/shared/components/ui/Badge';
import type { ProjectStatus } from '../types/projects.types';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: 'secondary' | 'warning' | 'outline' | 'success' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  pending_review: { label: 'Pending Review', variant: 'outline' },
  completed: { label: 'Completed', variant: 'success' },
};

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
  testID?: string;
}

export const StatusBadge = ({
  status,
  className,
  testID,
}: StatusBadgeProps): React.JSX.Element => {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={className} testID={testID}>
      {config.label}
    </Badge>
  );
};
