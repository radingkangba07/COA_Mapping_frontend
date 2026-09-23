/* ============================================================================
   mapping.service.ts  ·  Real column-mappings load + write (Field Mapping, step 3)
   ----------------------------------------------------------------------------
   GET/PATCH /api/v1/pipeline/runs/{run_id}/mappings — confirmed against the
   real backend on branch feat/column-mappings (COA_Mapping_backend_V0,
   src/modules/pipeline/{routes.py,schemas.py,service.py}), not the earlier
   pasted contract, which used different paths/field names/status vocabulary
   throughout. Maps the response into the EXISTING EntityMapping/
   MappingProposal/TargetField shapes (dp-kit/types/entity.d.ts) so
   MappingTable/buildMappingRows/mapping.ts's card logic stay untouched —
   only this data-fetching layer changed.

   ── Real shape, and what's deliberately not covered here ──
   1. `erp_id` (default "odoo") replaces the earlier assumed `status` query
      param — the backend has no server-side status filter at all; the
      5 filter tabs are, and remain, a client-side filter over `status`
      (buildMappingRows already does this by card).
   2. Row fields are `source_field/target_field_id/target_field_label/
      target_dtype/status/confidence/validation/evidence` — none of
      `source_field_type`, `sample_values`, `inferred_role_label`, or a
      per-row `readiness`/handoff exist server-side yet. Those columns
      render their normal MappingRow fallback ('—' / empty) until backend
      adds them — not simulated here.
   3. Status vocabulary is `suggested | review_required | no_safe_target |
      confirmed | excluded` (confirmed by reading `_auto_propose()` and
      `update_mapping()` in service.py) — 5 real values, not the 4 the
      earlier contract described. `confirmed` covers both "accepted the
      AI proposal" and "user retargeted"; the row's own decision badge
      (Accepted/Overridden) comes from wizard.store's local
      decisionsByEntity, same convention as before.
   4. `validation` is `compatible | warning | incompatible | null`
      (`_DTYPE_COMPAT` in service.py) — `incompatible`, not `blocked`.
   5. Every row from this endpoint has a non-null `source_field` — the
      endpoint only ever returns one row per profiled source field, so
      there is no `missingTargets` source here (a required target with NO
      source column). Computing that needs the target-fields catalogue
      (GET .../target-fields) cross-referenced against required targets —
      out of scope for this branch (deferred, see plan). `missingTargets`
      is `[]` until that lands.
   6. `target_field_id` is a real, stable id straight from the backend.
      `getColumnMappings` now also calls the real `GET .../target-fields`
      (`getTargetFields`, exported separately per the one-function-per-
      endpoint rule) for the full catalogue, not just ids that happen to
      already appear on this run's rows. Falls back to the synthesized
      per-row set (the old behaviour) if that call fails — a catalogue
      fetch failing shouldn't take down the whole mapping table. Flagged
      separately: the backend's GET routes never call `db.commit()`, so
      `target_fields` re-seeds from YAML on every single call instead of
      persisting — functionally correct (still returns the full real
      catalogue each time) but wasteful; worth a backend fix, not blocking.
   7. No `readiness` banner exists server-side (no `.level`/`.text`
      anywhere in the response) and `summary.missing_required_targets` is
      hardcoded to 0 in the current backend — flagged back to the backend
      team rather than synthesized here; `EntityMapping.readiness` is left
      unset.
   8. `bulkAcceptColumnMappings` (DA-384) repurposes PUT .../mappings —
      see its own doc comment for the accepted provenance/audit gap this
      creates, decided explicitly rather than discovered later.
   9. `is_bookmarked` (row-level) plus POST/DELETE .../bookmark are real —
      `getColumnMappings` now returns `{mapping, bookmarkedIds}` instead of
      a bare `EntityMapping`, since bookmark state can't live inside the
      GENERATED `MappingProposal` type. `useBookmarks.ts` seeds from
      `bookmarkedIds` and calls `bookmarkMapping`/`unbookmarkMapping` for
      the write side.
   ========================================================================= */

import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { EntityMapping, TargetField } from '../dp-kit/types/entity';
import type { BulkAcceptField } from '../types/decision.types';

const mappingRowSchema = z.object({
  id: z.string(),
  source_field: z.string(),
  target_field_id: z.string().nullable(),
  target_field_label: z.string().nullable(),
  target_dtype: z.string().nullable(),
  status: z.string(),
  confidence: z.number().nullable(),
  validation: z.string().nullable(),
  evidence: z.array(z.string()).nullable(),
  is_bookmarked: z.boolean().default(false),
});

const columnMappingsResponseSchema = z.object({
  summary: z.object({
    total: z.number(),
    high_confidence: z.number(),
    needs_review: z.number(),
    no_safe_target: z.number(),
    missing_required_targets: z.number(),
    excluded: z.number(),
  }),
  mappings: z.array(mappingRowSchema),
});

const targetFieldSchema = z.object({
  field_id: z.string(),
  label: z.string(),
  dtype: z.string(),
  required: z.boolean(),
  read_only: z.boolean(),
  identifier: z.boolean(),
});

const targetFieldListResponseSchema = z.object({
  erp_id: z.string(),
  scope: z.string(),
  fields: z.array(targetFieldSchema),
});

const STATUS_MAP: Record<string, string> = {
  suggested: 'Suggested',
  review_required: 'Review required',
  no_safe_target: 'Blocked',
  // Server-confirmed rows still render their pre-decision status here — the
  // Actions cell's own "Accepted"/"Overridden" badge comes from
  // wizard.store's local decisionsByEntity, not row.status.
  confirmed: 'Suggested',
  excluded: 'Excluded',
};

const VALIDATION_MAP: Record<string, string> = {
  compatible: 'Compatible',
  warning: 'Warning',
  incompatible: 'Blocked',
};

function toTitleStatus(value: string): string {
  return STATUS_MAP[value] ?? value;
}

function toTitleValidation(value: string | null): string | undefined {
  if (value === null) return undefined;
  return VALIDATION_MAP[value] ?? value;
}

/** Reverse of VALIDATION_MAP, for bulkAcceptColumnMappings below — the only
 *  direction this app writes validation back to the wire. */
const VALIDATION_MAP_REVERSE: Record<string, string> = {
  Compatible: 'compatible',
  Warning: 'warning',
  Blocked: 'incompatible',
};

function fromTitleValidation(value: string | undefined): string | null {
  if (value === undefined) return null;
  return VALIDATION_MAP_REVERSE[value] ?? null;
}

type MappingRowDto = z.infer<typeof mappingRowSchema>;

/** Per-row target label/dtype, used only when the real catalogue (below)
 *  couldn't be fetched — a row's own target is still shown even if the
 *  full dropdown list degrades. */
function targetFieldsFromRows(mappings: readonly MappingRowDto[]): TargetField[] {
  const byId = new Map<string, TargetField>();
  for (const row of mappings) {
    if (row.target_field_id === null) continue;
    if (!byId.has(row.target_field_id)) {
      byId.set(row.target_field_id, {
        id: row.target_field_id,
        label: row.target_field_label ?? row.target_field_id,
        dtype: row.target_dtype ?? undefined,
      });
    }
  }
  return Array.from(byId.values());
}

function toEntityMapping(dto: z.infer<typeof columnMappingsResponseSchema>, targetFields: TargetField[]): EntityMapping {
  const proposals = dto.mappings.map((row: MappingRowDto) => ({
    id: row.id,
    name: row.source_field,
    targetId: row.target_field_id ?? undefined,
    conf: row.confidence !== null ? Math.round(row.confidence * 100) : undefined,
    status: toTitleStatus(row.status),
    validation: toTitleValidation(row.validation),
    evidence: row.evidence ?? undefined,
  }));

  return {
    targetFields,
    proposals,
    // Every row here has a source_field — required-target-with-no-source
    // rows aren't representable from this endpoint alone (see doc comment 5).
    missingTargets: [],
    cards: [
      { id: 'high', label: 'High confidence', statuses: ['Suggested'] },
      { id: 'review', label: 'Needs review', statuses: ['Review required'] },
      { id: 'none', label: 'No safe target', statuses: ['Blocked'] },
      { id: 'missing', label: 'Missing required targets', statuses: ['Missing target'] },
      { id: 'excluded', label: 'Excluded', statuses: ['Excluded'] },
    ],
  };
}

/** `MappingProposal` (dp-kit/types/entity.d.ts) is GENERATED from the
 *  cross-ERP schema — it has no `isBookmarked` field, and adding one means
 *  touching the schema generator, out of scope here. Bookmark state
 *  travels alongside `EntityMapping` instead of inside it; row `id` is
 *  already the real `mapping_id` (see `toEntityMapping` above), so this
 *  needs no separate lookup. */
function bookmarkedIdsFrom(dto: z.infer<typeof columnMappingsResponseSchema>): ReadonlySet<string> {
  return new Set(dto.mappings.filter((row) => row.is_bookmarked).map((row) => row.id));
}

/** GET .../target-fields — the retarget dropdown's full catalogue. Exported
 *  on its own (one function per endpoint) even though getColumnMappings is
 *  its only caller today. */
export async function getTargetFields(
  client: HttpClient,
  runId: string,
  erpId = 'odoo',
): Promise<Result<TargetField[], AppError>> {
  try {
    const response = await client.get<unknown>(`/api/v1/pipeline/runs/${runId}/target-fields`, {
      params: { erp_id: erpId },
    });

    const parsed = targetFieldListResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Target fields response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(
      parsed.data.fields.map((f) => ({
        id: f.field_id,
        label: f.label,
        dtype: f.dtype,
        required: f.required,
        identifier: f.identifier,
        writable: !f.read_only,
      })),
    );
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export interface ColumnMappingsResult {
  readonly mapping: EntityMapping;
  readonly bookmarkedIds: ReadonlySet<string>;
}

export async function getColumnMappings(
  client: HttpClient,
  runId: string,
  erpId = 'odoo',
): Promise<Result<ColumnMappingsResult, AppError>> {
  try {
    const response = await client.get<unknown>(`/api/v1/pipeline/runs/${runId}/mappings`, {
      params: { erp_id: erpId },
    });

    const parsed = columnMappingsResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Column mappings response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    // The full target-field catalogue is a supplementary enhancement to the
    // retarget dropdown — if it fails, degrade to the per-row set rather
    // than failing the whole mapping table over a secondary call.
    const targetFieldsResult = await getTargetFields(client, runId, erpId);
    const targetFields = targetFieldsResult.ok ? targetFieldsResult.data : targetFieldsFromRows(parsed.data.mappings);

    return ok({
      mapping: toEntityMapping(parsed.data, targetFields),
      bookmarkedIds: bookmarkedIdsFrom(parsed.data),
    });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export interface PatchColumnMappingBody {
  /** null excludes the row. A non-null id confirms it — accept and
   *  retarget are the same write server-side, there is no separate
   *  "accepted vs overridden" distinction at this layer. */
  readonly target_field_id: string | null;
  readonly notes?: string;
  readonly reason?: string;
}

/** Accept / Exclude / Retarget all confirm through this one endpoint —
 *  server derives confirmed_by/confirmed_at from the JWT and status
 *  ("confirmed" | "excluded") from whether target_field_id is set, never
 *  sent by the client. */
export async function patchColumnMapping(
  client: HttpClient,
  runId: string,
  mappingId: string,
  body: PatchColumnMappingBody,
  erpId = 'odoo',
): Promise<Result<void, AppError>> {
  try {
    await client.patch<unknown>(`/api/v1/pipeline/runs/${runId}/mappings/${mappingId}`, body, {
      params: { erp_id: erpId },
    });
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

/** DA-384: there is no dedicated bulk-accept endpoint anywhere in the
 *  backend (checked every branch) — this repurposes PUT .../mappings
 *  (`bulk_create_mappings`, documented server-side as "bulk upsert AI-
 *  proposed mappings") by resending each row's existing proposal data with
 *  status: "confirmed". Confirmed by reading the backend directly, this is
 *  a KNOWN, ACCEPTED gap, not an oversight:
 *    - mapping_source is hardcoded to "ai" in the PUT route regardless of
 *      body — a bulk-accepted row reads as AI-sourced, not user-confirmed.
 *    - confirmed_by/confirmed_at are never set by bulk_upsert at all.
 *    - no ColumnMappingHistory audit row is written for bulk-accepted rows
 *      (only the single-row PATCH path calls write_history).
 *  Decided explicitly (2026-09-10, see DA-384's Jira comments) to accept
 *  this rather than wait on a backend fix or fire N sequential PATCH calls. */
export async function bulkAcceptColumnMappings(
  client: HttpClient,
  runId: string,
  fields: readonly BulkAcceptField[],
  erpId = 'odoo',
): Promise<Result<void, AppError>> {
  try {
    const body = {
      mappings: fields.map((f) => ({
        source_field: f.sourceField,
        target_field_id: f.targetFieldId,
        target_field_label: f.targetFieldLabel ?? null,
        target_dtype: f.targetDtype ?? null,
        status: 'confirmed',
        confidence: f.confidence !== undefined ? f.confidence / 100 : null,
        validation: fromTitleValidation(f.validation),
        evidence: f.evidence ? [...f.evidence] : null,
      })),
    };
    await client.put<unknown>(`/api/v1/pipeline/runs/${runId}/mappings`, body, {
      params: { erp_id: erpId },
    });
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

/** Save this mapping as an org-level bookmark. Row `id` is the real
 *  `mapping_id` (see `toEntityMapping`'s doc comment). */
export async function bookmarkMapping(
  client: HttpClient,
  runId: string,
  mappingId: string,
): Promise<Result<void, AppError>> {
  try {
    await client.post<unknown>(`/api/v1/pipeline/runs/${runId}/mappings/${mappingId}/bookmark`, {});
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

/** Remove the org-level bookmark for this mapping. */
export async function unbookmarkMapping(
  client: HttpClient,
  runId: string,
  mappingId: string,
): Promise<Result<void, AppError>> {
  try {
    await client.delete<unknown>(`/api/v1/pipeline/runs/${runId}/mappings/${mappingId}/bookmark`);
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
