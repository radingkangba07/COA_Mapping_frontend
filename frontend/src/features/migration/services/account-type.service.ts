import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import { toAppError } from '@/shared/services/http/http.client';
import { ok, err } from '@/shared/types/result.types';
import type { Result, AppError } from '@/shared/types/result.types';
import type { TypeMappingRow } from '@/features/migration/types/migration.types';
import type {
  AccountTypeMappingBulkRequestDTO,
  AccountTypeMappingBulkResponseDTO,
  AccountTypeMappingPairDTO,
} from '@/features/migration/types/account-type.types';

// ─── Zod Schemas (API boundary validation) ─────────────────────────────────

const accountTypeMappingResponseSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  mapping_file_id: z.string().nullable().optional(),
  source_account_type: z.string(),
  target_account_type: z.string(),
  is_active: z.boolean(),
  created_by: z.string().nullable().optional(),
  updated_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

const accountTypeMappingListSchema = z.array(accountTypeMappingResponseSchema);

const bulkResponseSchema = z.object({
  success: z.boolean(),
  count: z.number().int().min(0),
  project_id: z.string(),
});

// ─── Pure Transforms ────────────────────────────────────────────────────────

/**
 * Fan a TypeMappingRow with N targets into N flat DTO pairs.
 * Skips rows with a blank source type or no targets.
 */
export function toAccountTypePairs(
  rows: readonly TypeMappingRow[],
): AccountTypeMappingPairDTO[] {
  const pairs: AccountTypeMappingPairDTO[] = [];
  for (const row of rows) {
    const source = row.sourceType.trim();
    if (source.length === 0) continue;
    for (const target of row.targetTypes) {
      const trimmed = target.trim();
      if (trimmed.length === 0) continue;
      pairs.push({
        source_account_type: source,
        target_account_type: trimmed,
      });
    }
  }
  return pairs;
}

/**
 * Group flat DTO rows by source_account_type, preserving first-seen order.
 * Row ids are derived from the source type so re-renders stay stable.
 */
export function fromAccountTypeDTOs(
  dtos: readonly z.infer<typeof accountTypeMappingResponseSchema>[],
): TypeMappingRow[] {
  const order: string[] = [];
  const grouped = new Map<string, string[]>();

  for (const dto of dtos) {
    if (!dto.is_active) continue;
    const source = dto.source_account_type;
    const existing = grouped.get(source);
    if (existing) {
      if (!existing.includes(dto.target_account_type)) {
        existing.push(dto.target_account_type);
      }
    } else {
      grouped.set(source, [dto.target_account_type]);
      order.push(source);
    }
  }

  return order.map((source, index): TypeMappingRow => {
    const targets = grouped.get(source) ?? [];
    return {
      id: buildSyntheticId(source, index),
      sourceType: source,
      targetTypes: targets,
      isCustom: false,
    };
  });
}

/**
 * Derive a stable row id from the source account type. Falls back to the
 * row index (not Date.now()) so two empty/non-slug sources in the same
 * payload don't collide, and so ids are stable across refetches of the
 * same payload order.
 */
function buildSyntheticId(source: string, index: number): string {
  const slug = source.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return slug.length > 0 ? slug : `row-${String(index)}`;
}

// ─── Service Functions ──────────────────────────────────────────────────────

interface BulkSaveSummary {
  readonly count: number;
}

/**
 * POST /api/v1/mappings/project/{projectId}/account-type-mappings
 * Bulk-replaces all type mappings for a project. Fans out N targets → N rows.
 */
export async function bulkSaveAccountTypeMappings(
  client: HttpClient,
  projectId: string,
  rows: readonly TypeMappingRow[],
  mappingFileId?: string,
): Promise<Result<BulkSaveSummary, AppError>> {
  try {
    const pairs = toAccountTypePairs(rows);
    const body: AccountTypeMappingBulkRequestDTO = mappingFileId
      ? { type_mappings: pairs, mapping_file_id: mappingFileId }
      : { type_mappings: pairs };

    const response = await client.post<AccountTypeMappingBulkResponseDTO>(
      `/api/v1/mappings/project/${projectId}/account-type-mappings`,
      body,
    );
    const parsed = bulkResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      return err<AppError>({
        code: 'INVALID_RESPONSE',
        message: 'Unexpected response shape from account-type mappings endpoint',
      });
    }
    return ok({ count: parsed.data.count });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

/**
 * GET /api/v1/mappings/project/{projectId}/account-type-mappings
 * Returns rows grouped back into the multi-target TypeMappingRow shape.
 */
export async function listAccountTypeMappings(
  client: HttpClient,
  projectId: string,
): Promise<Result<TypeMappingRow[], AppError>> {
  try {
    const response = await client.get<unknown>(
      `/api/v1/mappings/project/${projectId}/account-type-mappings`,
    );
    const parsed = accountTypeMappingListSchema.safeParse(response.data);
    if (!parsed.success) {
      return err<AppError>({
        code: 'INVALID_RESPONSE',
        message: 'Unexpected response shape from account-type mappings endpoint',
      });
    }
    return ok(fromAccountTypeDTOs(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

/**
 * DELETE /api/v1/mappings/project/{projectId}/account-type-mappings
 * Clears all mappings for a project.
 */
export async function clearAccountTypeMappings(
  client: HttpClient,
  projectId: string,
): Promise<Result<void, AppError>> {
  try {
    await client.delete(
      `/api/v1/mappings/project/${projectId}/account-type-mappings`,
    );
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
