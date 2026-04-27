import { AxiosError } from 'axios';
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
    const firstTarget = row.targetTypes[0];
    if (row.sourceType && firstTarget) {
      mappings[row.sourceType] = firstTarget;
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
 * Build the payload for POST /api/v1/mappings/project/{projectId}.
 *
 * Backend uses exclude_unset semantics — every included field overwrites.
 * So we send only what the user actually changed:
 *
 *   - UPDATE (id present): only include `target_account_name` + `confidence_score`
 *     when `user_changed` is true. Untouched rows are omitted entirely.
 *   - INSERT from suggestion (suggestion_id, no id): always send
 *     `source_account_name` (required) + `target_account_name` so the suggestion
 *     is promoted to a real mapping. Source/target type carry the group context.
 *   - Brand-new manual row (no id, no suggestion_id): send the full identifying
 *     payload.
 *
 * `mapping_status` is NEVER sent from Save — status changes go through the
 * dedicated bulk-status endpoint via the Confirm action.
 */
export function toMappingCreateDTOs(
  projectId: string,
  groupedMappings: readonly GroupedMapping[],
): MappingCreateDTO[] {
  const dtos: MappingCreateDTO[] = [];

  for (const group of groupedMappings) {
    for (const account of group.accounts) {
      const isDeleted = account.is_active === false;

      // DELETE path — tombstone the row by id or suggestion_id.
      // Brand-new local rows (no id, no suggestion_id) that were deleted
      // before Save never existed on the server — skip them entirely.
      if (isDeleted) {
        if (account.id) {
          dtos.push({ project_id: projectId, id: account.id, is_active: false });
        } else if (account.suggestion_id) {
          dtos.push({
            project_id: projectId,
            suggestion_id: account.suggestion_id,
            is_active: false,
          });
        }
        continue;
      }

      // INSERT path — promote a suggestion to a mapping.
      if (!account.id && account.suggestion_id) {
        const dto: MappingCreateDTO = {
          project_id: projectId,
          suggestion_id: account.suggestion_id,
          source_account_name: account.source_name,
          target_account_name: account.target_name,
          source_account_type: group.source_type,
          target_account_type: group.target_type,
        };
        if (account.user_changed === true) {
          dtos.push({ ...dto, mapping_source: 'user' });
        } else {
          dtos.push(dto);
        }
        continue;
      }

      // UPDATE path — only emit a row when the user actually edited it.
      if (account.id) {
        if (account.user_changed === true) {
          dtos.push({
            project_id: projectId,
            id: account.id,
            target_account_name: account.target_name,
            confidence_score: account.score,
            mapping_source: 'user',
          });
        }
        continue;
      }

      // Brand-new manual row — no id, no suggestion_id.
      dtos.push({
        project_id: projectId,
        source_account_name: account.source_name,
        source_account_number: account.source_number || undefined,
        target_account_name: account.target_name,
        source_account_type: group.source_type,
        target_account_type: group.target_type,
      });
    }
  }

  return dtos;
}

// ─── Service Functions ──────────────────────────────────────────────────────

/**
 * POST to /api/v1/mappings/hierarchical — submit a mapping job using file references.
 * Returns a job reference ({job_id, project_id, status}), not inline results.
 */
export async function getHierarchicalMapping(
  client: HttpClient,
  projectId: string,
  sourceFileId: string,
  targetFileId: string,
  mappingFileId?: string,
): Promise<Result<HierarchicalMappingResponse, AppError>> {
  try {
    const body: HierarchicalMappingRequestDTO = {
      project_id: projectId,
      source_file_id: sourceFileId,
      target_file_id: targetFileId,
      mapping_file_id: mappingFileId,
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
 * POST to /api/v1/mappings/project/{projectId} — upsert mappings.
 * Each row with `id` is updated; rows with only `suggestion_id` are inserted
 * and auto-linked to the suggestion.
 */
export async function saveMappings(
  client: HttpClient,
  projectId: string,
  mappings: readonly MappingCreateDTO[],
): Promise<Result<BulkSaveResponseDTO, AppError>> {
  try {
    const response = await client.post<BulkSaveResponseDTO>(
      `/api/v1/mappings/project/${projectId}`,
      mappings,
    );
    return ok(response.data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

/**
 * PATCH /api/v1/mappings/bulk-status — update status for mappings in a score range.
 */
export async function updateMappingStatus(
  client: HttpClient,
  projectId: string,
  minScore: number,
  status: 'confirmed' | 'pending',
  maxScore = 100,
): Promise<Result<void, AppError>> {
  try {
    await client.patch('/api/v1/mappings/bulk-status', {
      project_id: projectId,
      min_score: minScore,
      max_score: maxScore,
      status,
    });
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

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
    if (error instanceof AxiosError && error.response?.status === 404) {
      return ok([]);
    }
    return err(toAppError(error));
  }
}
