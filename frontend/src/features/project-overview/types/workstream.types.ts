export type WorkstreamStatus =
  | 'completed'
  | 'in_progress'
  | 'review_required'
  | 'blocked'
  | 'not_started'
  | 'not_included';

export interface Workstream {
  readonly id: string;
  readonly name: string;
  readonly projectId: string;
  readonly status: WorkstreamStatus;
  readonly progress: number;      // 0–100
  readonly currentStage: string;
  readonly included: boolean;
}
