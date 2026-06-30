export type WorkstreamStatus =
  | 'completed'
  | 'in_progress'
  | 'review_required'
  | 'blocked'
  | 'not_started';

export interface Workstream {
  readonly id: string;
  readonly name: string;
  readonly status: WorkstreamStatus;
}
