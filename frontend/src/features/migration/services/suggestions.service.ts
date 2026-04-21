import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import { toAppError } from '@/shared/services/http/http.client';
import { ok, err } from '@/shared/types/result.types';
import type { Result, AppError } from '@/shared/types/result.types';
import type {
  SuggestionAccount,
  SuggestionAccountDTO,
  SuggestionGroup,
  SuggestionGroupDTO,
  SuggestionListResponse,
  SuggestionQueryOptions,
} from '@/features/migration/types/suggestion.types';

// ─── Zod schemas (API boundary) ────────────────────────────────────────────

const suggestionAccountSchema = z.object({
  id: z.string().nullable(),
  suggestion_id: z.string(),
  source_name: z.string(),
  target_name: z.string(),
  score: z.number(),
  status: z.string(),
  mapping_source: z.string().nullable().optional(),
});

const suggestionGroupSchema = z.object({
  source_type: z.string(),
  target_type: z.string(),
  confidence: z.number(),
  accounts: z.array(suggestionAccountSchema),
});

const suggestionListSchema = z.object({
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
  groups: z.array(suggestionGroupSchema),
});

// ─── Pure transforms ───────────────────────────────────────────────────────

function toAccount(dto: SuggestionAccountDTO): SuggestionAccount {
  return {
    id: dto.id,
    suggestionId: dto.suggestion_id,
    sourceName: dto.source_name,
    targetName: dto.target_name,
    score: dto.score,
    status: dto.status,
    mappingSource: dto.mapping_source ?? null,
  };
}

export function toSuggestionGroup(dto: SuggestionGroupDTO): SuggestionGroup {
  return {
    sourceType: dto.source_type,
    targetType: dto.target_type,
    confidence: dto.confidence,
    accounts: dto.accounts.map(toAccount),
  };
}

function buildQueryParams(
  opts: SuggestionQueryOptions | undefined,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (opts === undefined) return params;
  if (opts.status !== undefined && opts.status.length > 0) {
    params['status'] = opts.status;
  }
  if (opts.sourceType !== undefined && opts.sourceType.length > 0) {
    params['source_type'] = opts.sourceType;
  }
  if (opts.skip !== undefined) params['skip'] = opts.skip;
  if (opts.limit !== undefined) params['limit'] = opts.limit;
  return params;
}

// ─── Service ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/mappings/project/{projectId}/suggestions
 * Returns a paginated envelope: `{ total, skip, limit, groups }`. Groups are a
 * page of suggestions collapsed by source_type × target_type, so `total` is the
 * count of underlying suggestions (post-filter), not the number of groups.
 */
export async function listMappingSuggestions(
  client: HttpClient,
  projectId: string,
  opts?: SuggestionQueryOptions,
): Promise<Result<SuggestionListResponse, AppError>> {
  try {
    const response = await client.get<unknown>(
      `/api/v1/mappings/project/${projectId}/suggestions`,
      { params: buildQueryParams(opts) },
    );
    const parsed = suggestionListSchema.safeParse(response.data);
    if (!parsed.success) {
      return err<AppError>({
        code: 'INVALID_RESPONSE',
        message: 'Unexpected response shape from suggestions endpoint',
      });
    }
    return ok({
      total: parsed.data.total,
      skip: parsed.data.skip,
      limit: parsed.data.limit,
      groups: parsed.data.groups.map(toSuggestionGroup),
    });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
