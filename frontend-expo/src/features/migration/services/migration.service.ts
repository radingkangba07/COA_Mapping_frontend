import type { HttpClient } from '@/shared/services/http/http.types';
import { toAppError } from '@/shared/services/http/http.client';
import { ok, err } from '@/shared/types/result.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { createJobId, createProjectId } from '@/shared/types/common.types';
import type {
  MigrationJob,
  JobCreateDTO,
  JobResponseDTO,
  JobStatusResponseDTO,
  JobResultResponseDTO,
  MigrationStatus,
} from '@/features/migration/types/migration.types';

// ─── Local Response Interfaces ──────────────────────────────────────────────

interface JobStatusResponse {
  readonly jobId: string;
  readonly status: MigrationStatus;
  readonly progress: number;
  readonly message: string | undefined;
  readonly isComplete: boolean;
  readonly hasError: boolean;
  readonly resultAvailable: boolean;
}

interface JobResultResponse {
  readonly jobId: string;
  readonly status: MigrationStatus;
  readonly resultData: Readonly<Record<string, unknown>> | undefined;
  readonly errorMessage: string | undefined;
}

// ─── Internal Mapper ────────────────────────────────────────────────────────

function toMigrationJob(dto: JobResponseDTO): MigrationJob {
  return {
    id: createJobId(dto.id),
    projectId: createProjectId(dto.project_id),
    jobType: dto.job_type,
    status: dto.status,
    progress: dto.progress,
    message: dto.message,
    isComplete: dto.is_complete,
    hasError: dto.has_error,
    resultAvailable: dto.result_available,
    resultData: dto.result_data,
    errorMessage: dto.error_message,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

function toJobStatusResponse(dto: JobStatusResponseDTO): JobStatusResponse {
  return {
    jobId: dto.job_id,
    status: dto.status,
    progress: dto.progress,
    message: dto.message,
    isComplete: dto.is_complete,
    hasError: dto.has_error,
    resultAvailable: dto.result_available,
  };
}

function toJobResultResponse(dto: JobResultResponseDTO): JobResultResponse {
  return {
    jobId: dto.job_id,
    status: dto.status,
    resultData: dto.result_data,
    errorMessage: dto.error_message,
  };
}

// ─── Service Functions ──────────────────────────────────────────────────────

export async function createJob(
  client: HttpClient,
  data: JobCreateDTO,
): Promise<Result<MigrationJob, AppError>> {
  try {
    const response = await client.post<JobResponseDTO>('/api/v1/jobs', data);
    return ok(toMigrationJob(response.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getJobStatus(
  client: HttpClient,
  jobId: string,
): Promise<Result<JobStatusResponse, AppError>> {
  try {
    const response = await client.get<JobStatusResponseDTO>(
      `/api/v1/jobs/${jobId}/status`,
    );
    return ok(toJobStatusResponse(response.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getJobResult(
  client: HttpClient,
  jobId: string,
): Promise<Result<JobResultResponse, AppError>> {
  try {
    const response = await client.get<JobResultResponseDTO>(
      `/api/v1/jobs/${jobId}/result`,
    );
    return ok(toJobResultResponse(response.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getProjectJobs(
  client: HttpClient,
  projectId: string,
  options?: { status?: MigrationStatus; limit?: number },
): Promise<Result<MigrationJob[], AppError>> {
  try {
    const params: Record<string, string | number> = {};
    if (options?.status !== undefined) {
      params['status'] = options.status;
    }
    if (options?.limit !== undefined) {
      params['limit'] = options.limit;
    }

    const response = await client.get<JobResponseDTO[]>(
      `/api/v1/jobs/project/${projectId}`,
      { params },
    );
    return ok(response.data.map(toMigrationJob));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function cancelJob(
  client: HttpClient,
  jobId: string,
): Promise<Result<void, AppError>> {
  try {
    await client.delete(`/api/v1/jobs/${jobId}`);
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
