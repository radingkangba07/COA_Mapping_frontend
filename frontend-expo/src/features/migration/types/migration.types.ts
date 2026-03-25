import type { FileId, JobId, ProjectId } from '@/shared/types/common.types';

// ─── Value Objects ──────────────────────────────────────────────────────────

export type MigrationStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export type JobType = 'account_matching' | 'type_mapping' | 'export';

// ─── Domain Entities ────────────────────────────────────────────────────────

export interface UploadedFile {
  readonly name: string;
  readonly rowCount: number;
  readonly fileId: FileId;
}

export interface MigrationRow {
  readonly id: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface TypeMappingRow {
  readonly id: string;
  readonly sourceType: string;
  readonly targetType: string;
  readonly isCustom: boolean;
}

export interface DeletedAccount {
  readonly sourceType: string;
  readonly accountIndex: number;
  readonly sourceNumber: string;
  readonly sourceName: string;
}

export interface MigrationJob {
  readonly id: JobId;
  readonly projectId: ProjectId;
  readonly jobType: JobType;
  readonly status: MigrationStatus;
  readonly progress: number;
  readonly message: string | undefined;
  readonly isComplete: boolean;
  readonly hasError: boolean;
  readonly resultAvailable: boolean;
  readonly resultData: Readonly<Record<string, unknown>> | undefined;
  readonly errorMessage: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ─── DTO Contracts ──────────────────────────────────────────────────────────

export interface JobCreateDTO {
  readonly project_id: string;
  readonly job_type: JobType;
  readonly input_data?: Readonly<Record<string, unknown>> | undefined;
}

export interface JobResponseDTO {
  readonly id: string;
  readonly project_id: string;
  readonly job_type: JobType;
  readonly status: MigrationStatus;
  readonly progress: number;
  readonly message?: string | undefined;
  readonly is_complete: boolean;
  readonly has_error: boolean;
  readonly result_available: boolean;
  readonly result_data?: Readonly<Record<string, unknown>> | undefined;
  readonly error_message?: string | undefined;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface JobStatusResponseDTO {
  readonly job_id: string;
  readonly status: MigrationStatus;
  readonly progress: number;
  readonly message?: string | undefined;
  readonly is_complete: boolean;
  readonly has_error: boolean;
  readonly result_available: boolean;
}

export interface JobResultResponseDTO {
  readonly job_id: string;
  readonly status: MigrationStatus;
  readonly result_data?: Readonly<Record<string, unknown>> | undefined;
  readonly error_message?: string | undefined;
}

