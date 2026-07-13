import type {
  ProjectOverviewDTO,
  WorkstreamGroupDTO,
  WorkstreamDTO,
  ProjectOverview,
  WorkstreamGroupModel,
} from '../types/project-overview.types';
import type { Workstream, WorkstreamStatus } from '../types/workstream.types';
import type { ProjectStatus } from '@/features/projects/types/projects.types';
import { augmentNotIncluded } from '../utils/augmentNotIncluded';

// ─── Status normalisation ────────────────────────────────────────────────────

const WORKSTREAM_STATUSES: ReadonlySet<string> = new Set([
  'completed',
  'in_progress',
  'review_required',
  'blocked',
  'not_started',
  'not_included',
]);

function toWorkstreamStatus(raw: string): WorkstreamStatus {
  if (WORKSTREAM_STATUSES.has(raw)) return raw as WorkstreamStatus;
  return 'not_started';
}

const PROJECT_STATUSES: ReadonlySet<string> = new Set([
  'draft',
  'in_progress',
  'pending_review',
  'completed',
]);

function toProjectStatus(raw: string): ProjectStatus {
  if (PROJECT_STATUSES.has(raw)) return raw as ProjectStatus;
  return 'in_progress';
}

// ─── Workstream mapping ──────────────────────────────────────────────────────

function toWorkstream(dto: WorkstreamDTO): Workstream {
  const status = toWorkstreamStatus(dto.status);
  return {
    id: dto.id,
    name: dto.name,
    projectId: dto.code,   // code displayed as project ID in the table column
    status,
    progress: Math.min(100, Math.max(0, dto.progress)),
    currentStage: dto.current_stage ?? 'Not Started',
    included: status !== 'not_included' && dto.included,
  };
}

function toGroup(dto: WorkstreamGroupDTO): WorkstreamGroupModel {
  return {
    key: dto.key,
    title: dto.title,
    items: dto.workstreams.map(toWorkstream),
  };
}

// ─── Progress derivation ─────────────────────────────────────────────────────

function computeProgress(groups: readonly WorkstreamGroupModel[]): number {
  const included = groups.flatMap((g) => g.items).filter((w) => w.included);
  if (included.length === 0) return 0;
  const completed = included.filter((w) => w.status === 'completed').length;
  return Math.round((completed / included.length) * 100);
}

// ─── Public entry point ──────────────────────────────────────────────────────

export function toProjectOverview(dto: ProjectOverviewDTO): ProjectOverview {
  const groups = augmentNotIncluded(dto.groups.map(toGroup));
  const totalWorkstreams = groups.reduce((n, g) => n + g.items.filter((w) => w.included).length, 0);

  return {
    id: dto.id,
    name: dto.name,
    projectCode: dto.project_code,
    status: toProjectStatus(dto.status),
    sourceErp: dto.source_erp,
    targetErp: dto.target_erp,
    sourceDeployment: dto.source_deployment,
    targetDeployment: dto.target_deployment,
    lastEditedAt: new Date(dto.last_edited_at),
    groups,
    totalWorkstreams,
    overallProgress: computeProgress(groups),
  };
}
