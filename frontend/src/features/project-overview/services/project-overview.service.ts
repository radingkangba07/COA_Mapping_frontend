import type { HttpClient } from '@/shared/services/http/http.types';
import type { ProjectOverviewDTO } from '../types/project-overview.types';

export async function getProjectOverview(
  client: HttpClient,
  projectId: string,
): Promise<ProjectOverviewDTO> {
  const response = await client.get<ProjectOverviewDTO>(
    `/api/v1/projects/${projectId}/overview`,
  );
  return response.data;
}

// GET /api/v1/org-projects/{org_project_id}/overview — same ProjectOverviewResponse
// shape as getProjectOverview above (backend: org_projects/service.py's
// get_org_project_overview builds the identical ProjectOverviewResponse), so
// no separate DTO/mapper is needed here. A master-data entity's own
// orgProjectId (wizard.store.ts) is always known inside the wizard, so this
// lets a single-entity caller (e.g. wizard.store's hydrateEntityProgress)
// fetch just that entity's own progress/status/current_stage directly,
// instead of fetching the whole parent project's overview to find one row in
// it. Per CLAUDE.md rule #11 (one service function per endpoint), this is the
// only place this endpoint is called from.
export async function getOrgProjectOverview(
  client: HttpClient,
  orgProjectId: string,
): Promise<ProjectOverviewDTO> {
  const response = await client.get<ProjectOverviewDTO>(
    `/api/v1/org-projects/${orgProjectId}/overview`,
  );
  return response.data;
}
