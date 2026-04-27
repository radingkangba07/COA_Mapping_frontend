// ─── Wire Shape (snake_case — matches NATS payload broadcast by the API) ───

export type JobStatusEventStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface JobStatusEventMetadataDTO {
  readonly source_system: string | null;
  readonly target_system: string | null;
}

export interface JobStatusEventDTO {
  readonly job_id: string;
  readonly project_id: string | null;
  readonly company_id: string | null;
  readonly job_type: string;
  readonly status: JobStatusEventStatus;
  readonly source_file_id: string | null;
  readonly target_file_id: string | null;
  readonly mapping_file_id: string | null;
  readonly account_type_mapping_file_id: string | null;
  readonly triggered_by: string | null;
  readonly created_at: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly event_at: string | null;
  readonly error_message: string | null;
  readonly metadata: JobStatusEventMetadataDTO;
}

// ─── Domain Shape (camelCase — consumed by hooks/screens) ──────────────────

export interface JobStatusEventMetadata {
  readonly sourceSystem: string | null;
  readonly targetSystem: string | null;
}

export interface JobStatusEvent {
  readonly jobId: string;
  readonly projectId: string | null;
  readonly companyId: string | null;
  readonly jobType: string;
  readonly status: JobStatusEventStatus;
  readonly sourceFileId: string | null;
  readonly targetFileId: string | null;
  readonly mappingFileId: string | null;
  readonly accountTypeMappingFileId: string | null;
  readonly triggeredBy: string | null;
  readonly createdAt: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly eventAt: string | null;
  readonly errorMessage: string | null;
  readonly metadata: JobStatusEventMetadata;
}

// ─── Mapper ────────────────────────────────────────────────────────────────

export function toJobStatusEvent(dto: JobStatusEventDTO): JobStatusEvent {
  return {
    jobId: dto.job_id,
    projectId: dto.project_id,
    companyId: dto.company_id,
    jobType: dto.job_type,
    status: dto.status,
    sourceFileId: dto.source_file_id,
    targetFileId: dto.target_file_id,
    mappingFileId: dto.mapping_file_id,
    accountTypeMappingFileId: dto.account_type_mapping_file_id,
    triggeredBy: dto.triggered_by,
    createdAt: dto.created_at,
    startedAt: dto.started_at,
    completedAt: dto.completed_at,
    eventAt: dto.event_at,
    errorMessage: dto.error_message,
    metadata: {
      sourceSystem: dto.metadata.source_system,
      targetSystem: dto.metadata.target_system,
    },
  };
}
