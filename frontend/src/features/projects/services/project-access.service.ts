import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { ProjectId } from '@/shared/types/common.types';
import { createUserId } from '@/shared/types/common.types';
import type { AccessResponse, AccessGrant } from '../types/project-access.types';

// ─── Zod Schema ────────────────────────────────────────────────────────────

const accessResponseDTOSchema = z.object({
  user_id: z.string().min(1),
  name: z.string(),
  email: z.string().email(),
  permission: z.enum(['viewer', 'editor', 'approver', 'admin']),
});

type AccessResponseDTO = z.infer<typeof accessResponseDTOSchema>;

const accessListSchema = z.array(accessResponseDTOSchema);

// ─── Mapper ────────────────────────────────────────────────────────────────

function toAccessResponse(dto: AccessResponseDTO): AccessResponse {
  return {
    userId: createUserId(dto.user_id),
    name: dto.name,
    email: dto.email,
    permission: dto.permission,
  };
}

// ─── Service Functions ─────────────────────────────────────────────────────

export async function getProjectMembers(
  client: HttpClient,
  projectId: ProjectId,
): Promise<Result<AccessResponse[], AppError>> {
  try {
    const { data } = await client.get<unknown>(
      `/api/v1/projects/${projectId}/access`,
    );

    const parsed = accessListSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Project members response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(parsed.data.map(toAccessResponse));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function grantProjectAccess(
  client: HttpClient,
  projectId: ProjectId,
  grant: AccessGrant,
): Promise<Result<AccessResponse, AppError>> {
  try {
    const { data } = await client.post<unknown>(
      `/api/v1/projects/${projectId}/access`,
      { user_id: grant.userId, permission: grant.permission },
    );

    const parsed = accessResponseDTOSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Grant access response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toAccessResponse(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}