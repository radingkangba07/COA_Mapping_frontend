import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { ProjectId } from '@/shared/types/common.types';
import type { Project, ProjectCreate, ProjectUpdate } from '../types/projects.types';
import {
  projectResponseSchema,
  projectListResponseSchema,
  toProject,
  toCreatePayload,
  toUpdatePayload,
} from './projects.mapper';

// ─── Service Functions ──────────────────────────────────────────────────────

export async function getProjects(
  client: HttpClient,
  skip = 0,
  limit = 100,
): Promise<Result<{ projects: Project[]; total: number }, AppError>> {
  try {
    const { data } = await client.get<unknown>(
      `/api/v1/projects?skip=${String(skip)}&limit=${String(limit)}`,
    );

    const parsed = projectListResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Projects list response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok({
      projects: parsed.data.projects.map(toProject),
      total: parsed.data.total,
    });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getProject(
  client: HttpClient,
  projectId: ProjectId,
): Promise<Result<Project, AppError>> {
  try {
    const { data } = await client.get<unknown>(
      `/api/v1/projects/${projectId}`,
    );

    const parsed = projectResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Project response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toProject(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function createProject(
  client: HttpClient,
  data: ProjectCreate,
): Promise<Result<Project, AppError>> {
  try {
    const { data: responseData } = await client.post<unknown>(
      '/api/v1/projects',
      toCreatePayload(data),
    );

    const parsed = projectResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Create project response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toProject(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function updateProject(
  client: HttpClient,
  projectId: ProjectId,
  data: ProjectUpdate,
): Promise<Result<Project, AppError>> {
  try {
    const { data: responseData } = await client.patch<unknown>(
      `/api/v1/projects/${projectId}`,
      toUpdatePayload(data),
    );

    const parsed = projectResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Update project response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toProject(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function deleteProject(
  client: HttpClient,
  projectId: ProjectId,
): Promise<Result<void, AppError>> {
  try {
    await client.delete(`/api/v1/projects/${projectId}`);
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
