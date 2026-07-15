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
