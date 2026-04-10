import type { HttpClient } from '@/shared/services/http/http.types';
import type { AppError, Result } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';

// ─── API Response Interfaces (snake_case from backend) ──────────────────────

interface ApiFileUploadResponse {
  file_id: string;
  file_name: string;
  row_count: number;
  sample_data: Record<string, unknown>[];
}

interface ApiFileDataResponse {
  file_id: string;
  file_name: string;
  row_count: number;
  sample_data: Record<string, unknown>[];
}

interface ApiProjectFileDTO {
  id: string;
  original_filename: string;
  file_type: 'sourcecoa' | 'targetcoa' | 'typemapping';
  size_bytes: number;
  created_at: string;
}

interface ApiProjectFilesResponse {
  files: ApiProjectFileDTO[];
}

// ─── Domain Interfaces ──────────────────────────────────────────────────────

export type FileType = 'sourcecoa' | 'targetcoa' | 'typemapping';

export interface ProjectFile {
  readonly fileId: string;
  fileName: string;
  fileType: FileType;
  rowCount: number;
}

interface FileUploadResponse {
  fileId: string;
  fileName: string;
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

interface FileDataResponse {
  fileId: string;
  data: Record<string, unknown>[];
}

interface UploadFileOptions {
  sourceErp?: string;
  targetErp?: string;
  fileName?: string;
  projectId?: string;
  fileType?: FileType;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function toProjectFile(dto: ApiProjectFileDTO): ProjectFile {
  return {
    fileId: dto.id,
    fileName: dto.original_filename,
    fileType: dto.file_type,
    rowCount: 0,
  };
}

function toFileUploadResponse(api: ApiFileUploadResponse): FileUploadResponse {
  return {
    fileId: api.file_id,
    fileName: api.file_name,
    rowCount: api.row_count,
    sampleData: api.sample_data,
  };
}

function toFileDataResponse(api: ApiFileDataResponse): FileDataResponse {
  return {
    fileId: api.file_id,
    data: api.sample_data,
  };
}

// ─── Service Functions ──────────────────────────────────────────────────────

export async function uploadFile(
  client: HttpClient,
  file: File | Blob,
  options?: UploadFileOptions,
): Promise<Result<FileUploadResponse, AppError>> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const params: Record<string, string> = {};
    if (options?.sourceErp) params.source_system = options.sourceErp;
    if (options?.targetErp) params.target_system = options.targetErp;
    if (options?.projectId) params.project_id = options.projectId;
    if (options?.fileType) params.file_type = options.fileType;

    const response = await client.post<ApiFileUploadResponse>(
      '/api/v1/files/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, params },
    );

    return ok(toFileUploadResponse(response.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getFileData(
  client: HttpClient,
  fileId: string,
): Promise<Result<FileDataResponse, AppError>> {
  try {
    const response = await client.get<ApiFileDataResponse>(
      `/api/v1/files/${fileId}/data`,
    );

    return ok(toFileDataResponse(response.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getProjectFiles(
  client: HttpClient,
  projectId: string,
): Promise<Result<ProjectFile[], AppError>> {
  try {
    const response = await client.get<ApiProjectFilesResponse>(
      `/api/v1/files/project/${projectId}`,
    );

    return ok(response.data.files.map(toProjectFile));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
