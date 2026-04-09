import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import { createCompanyId } from '@/shared/types/common.types';
import type { ProjectGroup } from '../types/projects.types';

const userOrgSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const userOrgsResponseSchema = z.union([
  z.array(userOrgSchema),
  z.object({ orgs: z.array(userOrgSchema) }),
]);

export async function getUserOrgs(
  client: HttpClient,
): Promise<Result<ProjectGroup[], AppError>> {
  try {
    const { data } = await client.get<unknown>('/api/v1/users/me/orgs');

    const parsed = userOrgsResponseSchema.safeParse(data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'User orgs response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    const orgs = Array.isArray(parsed.data) ? parsed.data : parsed.data.orgs;

    return ok(
      orgs.map((o) => ({
        companyId: createCompanyId(o.id),
        companyName: o.name,
        projects: [],
      })),
    );
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}