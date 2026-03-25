import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { getProjects } from '@/features/projects/services/projects.service';
import type { Project, ProjectStatus } from '@/features/projects/types/projects.types';

const ACTIVE_STATUSES: ReadonlySet<ProjectStatus> = new Set([
  'in_progress',
  'pending_review',
]);

export async function getActiveMigrations(
  client: HttpClient,
): Promise<Result<readonly Project[], AppError>> {
  const result = await getProjects(client);

  if (!result.ok) {
    return result;
  }

  const active = result.data.projects.filter((p) =>
    ACTIVE_STATUSES.has(p.status),
  );

  return ok(active);
}
