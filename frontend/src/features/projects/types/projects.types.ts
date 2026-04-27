import type { ProjectId, UserId, CompanyId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';

// ─── Value Objects ──────────────────────────────────────────────────────────

export type ProjectStatus =
  | 'draft'
  | 'in_progress'
  | 'pending_review'
  | 'completed';

export type ProjectRole = 'owner' | 'editor' | 'viewer';

// ─── Domain Entities ────────────────────────────────────────────────────────

export interface Project {
  readonly projectId: ProjectId;
  readonly name: string;
  readonly sourceErp: string;
  readonly targetErp: string;
  readonly status: ProjectStatus;
  readonly companyId: CompanyId | undefined;
  readonly description: string | undefined;
  readonly createdBy: UserId | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly updatedBy: UserId | undefined;
  readonly createdByName: string | undefined;
  readonly updatedByName: string | undefined;
  readonly currentStep: number;
}

export interface ProjectMember {
  readonly userId: UserId;
  readonly name: string;
  readonly role: ProjectRole;
}

export interface ProjectGroup {
  readonly companyId: CompanyId | null;
  readonly companyName: string;
  readonly projects: readonly Project[];
}

// ─── DTO Contracts ──────────────────────────────────────────────────────────

export interface ProjectCreate {
  readonly name: string;
  readonly sourceErp?: string | undefined;
  readonly targetErp?: string | undefined;
  readonly companyId?: string | undefined;
  readonly companyName?: string | undefined;
  readonly description?: string | undefined;
}

export interface ProjectUpdate {
  readonly name?: string | undefined;
  readonly sourceErp?: string | undefined;
  readonly targetErp?: string | undefined;
  readonly description?: string | undefined;
  readonly status?: ProjectStatus | undefined;
  readonly currentStep?: number | undefined;
}

// ─── Store Contracts ────────────────────────────────────────────────────────

export interface ProjectsState {
  readonly selectedProject: ProjectId | null;
  readonly isLoading: boolean;
  readonly error: AppError | null;
}

export interface ProjectsActions {
  setSelectedProject: (projectId: ProjectId | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: AppError) => void;
  clearError: () => void;
  reset: () => void;
}

// ─── Derived Helpers ────────────────────────────────────────────────────────

export type ProjectsStore = ProjectsState & ProjectsActions;
