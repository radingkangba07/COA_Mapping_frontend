import type { HttpClient } from '@/shared/services/http/http.types';
import { toAppError } from '@/shared/services/http/http.client';
import { ok, err } from '@/shared/types/result.types';
import type { Result, AppError } from '@/shared/types/result.types';
import type {
  HierarchicalMappingResponse,
  HierarchicalMappingRequestDTO,
  GroupedMapping,
  MappingCreateDTO,
  BulkSaveResponseDTO,
} from '@/features/migration/types/mapping.types';

// ─── Service Functions ──────────────────────────────────────────────────────

/**
 * POST to /api/v1/mappings/hierarchical — get grouped account mappings.
 * Port of App.js:1486-1530 (handleProceedToMapping).
 */
export async function getHierarchicalMapping(
  client: HttpClient,
  sourceData: Record<string, unknown>[],
  targetData?: Record<string, unknown>[],
  sourceErp?: string,
  targetErp?: string,
): Promise<Result<HierarchicalMappingResponse, AppError>> {
  try {
    const body: HierarchicalMappingRequestDTO = {
      source_data: sourceData,
      target_data: targetData,
      source_erp: sourceErp,
      target_erp: targetErp,
    };

    const response = await client.post<HierarchicalMappingResponse>(
      '/api/v1/mappings/hierarchical',
      body,
    );
    return ok(response.data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

/**
 * POST to /api/v1/mappings/bulk — save multiple mappings at once.
 */
export async function saveMappings(
  client: HttpClient,
  mappings: readonly MappingCreateDTO[],
): Promise<Result<BulkSaveResponseDTO, AppError>> {
  try {
    const response = await client.post<BulkSaveResponseDTO>(
      '/api/v1/mappings/bulk',
      { mappings },
    );
    return ok(response.data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

/**
 * GET from /api/v1/mappings/project/{projectId} — fetch all mappings for a project.
 */
export async function getMappings(
  client: HttpClient,
  projectId: string,
): Promise<Result<GroupedMapping[], AppError>> {
  try {
    const response = await client.get<GroupedMapping[]>(
      `/api/v1/mappings/project/${projectId}`,
    );
    return ok(response.data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
