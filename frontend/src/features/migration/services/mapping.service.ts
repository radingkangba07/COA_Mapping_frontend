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
import type { TypeMappingRow } from '@/features/migration/types/migration.types';

// ─── Pure Functions ─────────────────────────────────────────────────────────

/**
 * Build a record of source→target type overrides from user-edited type mapping rows.
 */
export function buildCustomTypeMappings(
  rows: readonly TypeMappingRow[],
): Record<string, string> {
  const mappings: Record<string, string> = {};
  for (const row of rows) {
    if (row.sourceType && row.targetType) {
      mappings[row.sourceType] = row.targetType;
    }
  }
  return mappings;
}

/**
 * Apply custom type overrides to grouped mappings from the API response.
 * Sets confidence to 100 for any group whose type was user-overridden.
 */
export function applyCustomTypeMappings(
  groupedMappings: readonly GroupedMapping[],
  overrides: Record<string, string>,
): GroupedMapping[] {
  return groupedMappings.map((group): GroupedMapping => {
    const customTarget = overrides[group.source_type];
    if (customTarget) {
      return { ...group, target_type: customTarget, confidence: 100 };
    }
    return group;
  });
}

/**
 * Normalize API account data: map `name_confidence` → `score`, default missing fields.
 */
export function normalizeGroupedMappings(
  groups: readonly GroupedMapping[],
): GroupedMapping[] {
  return groups.map((group) => ({
    ...group,
    accounts: group.accounts.map((account) => {
      const raw = account as unknown as Record<string, unknown>;
      const score =
        typeof account.score === 'number' && !Number.isNaN(account.score)
          ? account.score
          : typeof raw['name_confidence'] === 'number'
            ? (raw['name_confidence'] as number)
            : 0;
      return {
        ...account,
        score,
        remark: account.remark ?? '',
      };
    }),
  }));
}

/**
 * Flatten grouped mappings into DTOs for bulk-save to the API.
 */
export function toMappingCreateDTOs(
  projectId: string,
  groupedMappings: readonly GroupedMapping[],
): MappingCreateDTO[] {
  return groupedMappings.flatMap((group) =>
    group.accounts.map(
      (account): MappingCreateDTO => ({
        project_id: projectId,
        source_account_name: account.source_name,
        target_account_name: account.target_name,
        confidence_score: account.score,
        status: 'pending',
        source_type: group.source_type,
        target_type: group.target_type,
      }),
    ),
  );
}

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
    const appError = toAppError(error);
    if (appError.code === 'HTTP_404') {
      return ok([]);
    }
    return err(appError);
  }
}
