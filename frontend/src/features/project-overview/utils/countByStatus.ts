import type { Workstream } from '../types/workstream.types';

export interface StatusCounts {
  readonly total: number;
  readonly completed: number;
  readonly inProgress: number;
  readonly reviewRequired: number;
  readonly blocked: number;
  readonly notStarted: number;
  readonly progressPercent: number;
}

export function countByStatus(workstreams: readonly Workstream[]): StatusCounts {
  let completed = 0;
  let inProgress = 0;
  let reviewRequired = 0;
  let blocked = 0;
  let notStarted = 0;

  for (const w of workstreams) {
    switch (w.status) {
      case 'completed':
        completed++;
        break;
      case 'in_progress':
        inProgress++;
        break;
      case 'review_required':
        reviewRequired++;
        break;
      case 'blocked':
        blocked++;
        break;
      case 'not_started':
        notStarted++;
        break;
    }
  }

  const total = workstreams.length;

  return {
    total,
    completed,
    inProgress,
    reviewRequired,
    blocked,
    notStarted,
    progressPercent: total === 0 ? 0 : Math.round(workstreams.reduce((sum, w) => sum + w.progress, 0) / total),
  };
}
