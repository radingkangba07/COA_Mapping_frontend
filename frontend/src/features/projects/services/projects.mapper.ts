import { z } from 'zod';
import {
  createProjectId,
  createUserId,
  createCompanyId,
  createOrgId,
} from '@/shared/types/common.types';
import type { Project, ProjectCreate, ProjectUpdate } from '../types/projects.types';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const projectResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  source_system: z.string(),
  target_system: z.string(),
  status: z.enum(['active', 'draft', 'in_progress', 'pending_review', 'completed']),
  org_id: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  updated_by: z.string().nullable().optional(),
  created_by_name: z.string().nullable().optional(),
  updated_by_name: z.string().nullable().optional(),
  current_step: z.number().int().min(0).default(0),
  effective_permission: z.string().nullable().optional(),
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
    sourceErp: dto.source_system,
    targetErp: dto.target_system,
    status: dto.status,
    orgId: dto.org_id ? createOrgId(dto.org_id) : undefined,
    companyId: dto.company_id ? createCompanyId(dto.company_id) : undefined,
    description: dto.description ?? undefined,
    createdBy: dto.created_by ? createUserId(dto.created_by) : undefined,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
    updatedBy: dto.updated_by ? createUserId(dto.updated_by) : undefined,
    createdByName: dto.created_by_name ?? undefined,
    updatedByName: dto.updated_by_name ?? undefined,
    currentStep: dto.current_step,
    effectivePermission: dto.effective_permission ?? undefined,
  };
}

export function toCreatePayload(
  data: ProjectCreate,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: data.name,
  };

  if (data.sourceErp !== undefined) {
    payload.source_system = data.sourceErp;
  }

  if (data.targetErp !== undefined) {
    payload.target_system = data.targetErp;
  }

  if (data.orgId !== undefined) {
    payload.org_id = data.orgId;
  }

  if (data.companyId !== undefined) {
    payload.company_id = data.companyId;
  }

  if (data.companyName !== undefined) {
    payload.company_name = data.companyName;
  }

  if (data.description !== undefined) {
    payload.description = data.description;
  }

  if (data.members !== undefined && data.members.length > 0) {
    payload.members = data.members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
    }));
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
    payload.source_system = data.sourceErp;
  }
  if (data.targetErp !== undefined) {
    payload.target_system = data.targetErp;
  }
  if (data.description !== undefined) {
    payload.description = data.description;
  }
  if (data.status !== undefined) {
    payload.status = data.status;
  }
  if (data.currentStep !== undefined) {
    payload.current_step = data.currentStep;
  }

  return payload;
}
