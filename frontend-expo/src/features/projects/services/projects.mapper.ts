import { z } from 'zod';
import {
  createProjectId,
  createUserId,
  createCompanyId,
} from '@/shared/types/common.types';
import type { Project, ProjectCreate, ProjectUpdate } from '../types/projects.types';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const projectResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  source_erp: z.string().min(1),
  target_erp: z.string().min(1),
  status: z.enum(['draft', 'in_progress', 'pending_review', 'completed']),
  company_id: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ProjectResponseDTO = z.infer<typeof projectResponseSchema>;

export const projectListResponseSchema = z.object({
  projects: z.array(projectResponseSchema),
  total: z.number(),
});

// ─── Mappers ────────────────────────────────────────────────────────────────

export function toProject(dto: ProjectResponseDTO): Project {
  return {
    projectId: createProjectId(dto.id),
    name: dto.name,
    sourceErp: dto.source_erp,
    targetErp: dto.target_erp,
    status: dto.status,
    companyId: dto.company_id ? createCompanyId(dto.company_id) : undefined,
    description: dto.description ?? undefined,
    createdBy: dto.created_by ? createUserId(dto.created_by) : undefined,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

export function toCreatePayload(
  data: ProjectCreate,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: data.name,
    source_erp: data.sourceErp,
    target_erp: data.targetErp,
  };

  if (data.companyId !== undefined) {
    payload.company_id = data.companyId;
  }

  if (data.description !== undefined) {
    payload.description = data.description;
  }

  return payload;
}

export function toUpdatePayload(
  data: ProjectUpdate,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) {
    payload.name = data.name;
  }
  if (data.sourceErp !== undefined) {
    payload.source_erp = data.sourceErp;
  }
  if (data.targetErp !== undefined) {
    payload.target_erp = data.targetErp;
  }
  if (data.description !== undefined) {
    payload.description = data.description;
  }
  if (data.status !== undefined) {
    payload.status = data.status;
  }

  return payload;
}
