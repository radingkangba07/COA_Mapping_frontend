import type { Workstream } from './workstream.types';
import type { ProjectStatus } from '@/features/projects/types/projects.types';

// ─── Raw API DTO (snake_case from backend) ───────────────────────────────────

export interface WorkstreamDTO {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: string;
  readonly progress: number;
  readonly current_stage: string;
  readonly included: boolean;
}

export interface WorkstreamGroupDTO {
  readonly key: string;
  readonly title: string;
  readonly workstreams: readonly WorkstreamDTO[];
}

export interface ProjectOverviewDTO {
  readonly id: string;
  readonly name: string;
  readonly project_code: string;
  readonly status: string;
  readonly source_erp: string;
  readonly target_erp: string;
  readonly source_deployment: string | null;
  readonly target_deployment: string | null;
  readonly last_edited_at: string;
  readonly groups: readonly WorkstreamGroupDTO[];
}

// ─── Domain Models ───────────────────────────────────────────────────────────

export interface WorkstreamGroupModel {
  readonly key: string;
  readonly title: string;
  readonly items: readonly Workstream[];
}

export interface ProjectOverview {
  readonly id: string;
  readonly name: string;
  readonly projectCode: string;
  readonly status: ProjectStatus;
  readonly sourceErp: string;
  readonly targetErp: string;
  readonly sourceDeployment: string | null;
  readonly targetDeployment: string | null;
  readonly lastEditedAt: Date;
  readonly groups: readonly WorkstreamGroupModel[];
  readonly totalWorkstreams: number;
  readonly overallProgress: number;
}
