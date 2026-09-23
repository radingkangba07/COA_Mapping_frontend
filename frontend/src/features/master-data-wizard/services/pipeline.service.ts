/* ============================================================================
   pipeline.service.ts  ·  Pipeline run creation
   ----------------------------------------------------------------------------
   POST /api/v1/pipeline/runs — the real, already-merged backend endpoint
   that mints a run_id (confirmed by reading
   COA_Mapping_backend_V0/src/modules/pipeline/routes.py +
   src/modules/pipeline/schemas.py directly). Every later Mapping-step call
   (column-mappings GET/PATCH, available-target-fields) is scoped under this
   run_id, so this is the one prerequisite call before any of those can fire.

   `scope` is the backend's own name for `EntityId` — identical for 7 of 8
   entities; only `fixedAssets` differs (`fixed_assets` server-side, per
   pipeline/schemas.py's own `_VALID_SCOPES`).
   ========================================================================= */

import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { EntityId } from '../dp-kit/types/entity';

const pipelineRunSchema = z.object({
  id: z.string(),
  workstream_id: z.string(),
  scope: z.string(),
  status: z.string(),
  source_row_count: z.number().nullable(),
  field_count: z.number().nullable(),
  fields_processed: z.number().nullable(),
  error_detail: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
  run_summary: z.record(z.string(), z.unknown()).nullable(),
});

export interface PipelineRun {
  readonly id: string;
  readonly workstreamId: string;
  readonly scope: string;
  readonly status: string;
  readonly createdAt: string;
}

function toPipelineRun(dto: z.infer<typeof pipelineRunSchema>): PipelineRun {
  return {
    id: dto.id,
    workstreamId: dto.workstream_id,
    scope: dto.scope,
    status: dto.status,
    createdAt: dto.created_at,
  };
}

/** `entity.d.ts`'s own `EntityId` values match the backend's `_VALID_SCOPES`
 *  verbatim except `fixedAssets` — the only camelCase id in an otherwise-flat
 *  set. A general camelCase->snake_case conversion (not a literal id check)
 *  so this stays a casing conversion, not a per-entity conditional. */
function toScope(entityId: EntityId): string {
  return entityId.replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`);
}

export interface CreatePipelineRunOptions {
  readonly workstreamId: string;
  readonly entityId: EntityId;
  readonly sourceFileRef: string;
}

export async function createPipelineRun(
  client: HttpClient,
  options: CreatePipelineRunOptions,
): Promise<Result<PipelineRun, AppError>> {
  try {
    const response = await client.post<unknown>('/api/v1/pipeline/runs', {
      workstream_id: options.workstreamId,
      scope: toScope(options.entityId),
      source_file_ref: options.sourceFileRef,
    });

    const parsed = pipelineRunSchema.safeParse(response.data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Pipeline run response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toPipelineRun(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
