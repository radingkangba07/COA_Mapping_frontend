import axios from 'axios';
import { z } from 'zod';
import { httpClient } from '@/shared/services/http/http.instance';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { UploadedFile } from '@/shared/components/ui/FileUploader';
import type { EntityField, EntityId, EntityMetric, EntityPack, EntityReadiness } from '../dp-kit/types/entity';
import type { UploadResult } from '../types/upload.types';
import itemsFixture from '../dp-kit/fixtures/items.entity.json';
import customersFixture from '../dp-kit/fixtures/customers.entity.json';
import { formatObjectInline, formatPreviewValue } from '../utils/previewFormat';

// ─── Zod Schema ──────────────────────────────────────────────────────────────
// Mirrors dp-kit/types/entity.d.ts. Unlike Step 1 (Upload), this step reads
// pack.fields/readiness/metrics — the profiler output that doesn't exist at
// Upload — so those are validated here, not left as passthrough.

const findingSchema = z.object({ t: z.string(), tone: z.enum(['dup', 'warn', 'info', 'ok']) });
const distBarSchema = z.object({ label: z.string().optional(), pct: z.number().optional() });

const entityFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  semantic: z.string().optional(),
  role: z.string().optional(),
  roleTip: z.string().optional(),
  datatype: z.enum(['Text', 'Integer', 'Decimal', 'Date', 'DateTime', 'Boolean']),
  nullCount: z.number().optional(),
  distinct: z.number().optional(),
  uniqueness: z.number().optional(),
  cardinality: z.string().optional(),
  confidence: z.number().optional(),
  impact: z.enum(['blocker', 'review', 'warning', 'clean', 'na', 'resolved']),
  impactReason: z.string().optional(),
  categories: z.array(z.string()).optional(),
  sample: z.array(z.string()).optional(),
  findings: z.array(findingSchema).optional(),
  duplicates: z.object({
    rows: z.number().optional(),
    groups: z.number().optional(),
    crossSub: z.number().optional(),
    crossPct: z.number().optional(),
    composite: z.string().optional(),
  }).optional(),
  patterns: z.array(distBarSchema).optional(),
  patternAnomalies: z.number().optional(),
  text: z.object({
    minLen: z.number().optional(),
    maxLen: z.number().optional(),
    avgLen: z.number().optional(),
  }).optional(),
  range: z.object({
    min: z.string().optional(),
    max: z.string().optional(),
    median: z.string().optional(),
    p95: z.string().optional(),
    outliers: z.number().optional(),
    method: z.string().optional(),
    examples: z.string().optional(),
  }).optional(),
  dateProfile: z.object({
    earliest: z.string().optional(),
    latest: z.string().optional(),
    invalid: z.number().optional(),
    future: z.number().optional(),
  }).optional(),
  nearEmpty: z.object({
    populated: z.number().optional(),
    populatedPct: z.number().optional(),
    requiredByTarget: z.string().optional(),
    recommendation: z.string().optional(),
    safeToExclude: z.string().optional(),
  }).optional(),
  enumeration: z.object({
    candidate: z.string().optional(),
    validRef: z.number().optional(),
    invalidSrc: z.number().optional(),
    affectedRows: z.number().optional(),
    aliasRows: z.number().optional(),
    unresolved: z.number().optional(),
    refIntegrity: z.string().optional(),
    categoryAvailable: z.number().optional(),
    highConf: z.number().optional(),
    ambiguous: z.number().optional(),
    insufficient: z.number().optional(),
  }).optional(),
  dist: z.array(distBarSchema).optional(),
  distTitle: z.string().optional(),
  invalidTable: z.array(z.object({
    src: z.string().optional(),
    occ: z.number().optional(),
    canon: z.string().optional(),
    status: z.string().optional(),
    tone: z.enum(['dup', 'warn', 'info', 'ok']).optional(),
  })).optional(),
  interpretation: z.string().optional(),
  reasoning: z.string().optional(),
  actions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    primary: z.boolean().optional(),
  })).optional(),
  compare: z.object({
    cardinality: z.string().optional(),
    sem: z.string().optional(),
    overlap: z.string().optional(),
  }).optional(),
});

const entityMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['rowCount', 'fieldCount', 'impactCount', 'sumNulls', 'reviewCount', 'fieldStat']),
  impact: z.string().optional(),
  field: z.string().optional(),
  path: z.string().optional(),
  tone: z.enum(['blocker', 'warn', 'neutral']).optional(),
  highlight: z.array(z.string()).optional(),
  filter: z.string().optional(),
  tip: z.string().optional(),
});

const entityReadinessSchema = z.object({
  headline: z.string().optional(),
  tone: z.enum(['blocker', 'warn', 'neutral']).optional(),
  narrative: z.string().optional(),
  recommendedOrder: z.array(z.object({ label: z.string(), target: z.string().optional() })).optional(),
  evidence: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
});

const entityPackSchema = z.object({
  id: z.string(),
  label: z.object({ singular: z.string(), plural: z.string(), recordWord: z.string().optional() }),
  source: z.object({ system: z.string().optional(), object: z.string(), rowCount: z.number().optional() }),
  target: z.object({ record: z.string(), schemaVersion: z.string().optional(), recordsetVersion: z.string().optional() }).optional(),
  identity: z.object({
    candidates: z.array(z.string()),
    confirmed: z.string().nullable().optional(),
    compositeCandidates: z.array(z.array(z.string())).optional(),
  }),
  metrics: z.array(entityMetricSchema).optional(),
  readiness: entityReadinessSchema.optional(),
  fields: z.array(entityFieldSchema),
  copilotPrompts: z.array(z.unknown()).optional(),
  copilotResponses: z.record(z.string(), z.unknown()).optional(),
  copilotFixes: z.record(z.string(), z.unknown()).optional(),
  sampleCsv: z.string().nullable().optional(),
}).passthrough();

const FIXTURES: Partial<Record<EntityId, unknown>> = {
  items: itemsFixture,
  customers: customersFixture,
};

function toNotFoundError(entityId: EntityId): AppError {
  return {
    code: 'entity_pack_not_found',
    message: `No entity pack fixture exists yet for "${entityId}".`,
  };
}

function toValidationError(entityId: EntityId, issues: z.ZodIssue[]): AppError {
  return {
    code: 'entity_pack_invalid',
    message: `Entity pack for "${entityId}" failed schema validation.`,
    details: { issues },
  };
}

/**
 * Stand-in for `GET /api/projects/:projectId/entities/:entityId/profile`
 * (no agreed endpoint yet — see CLAUDE.md -> The contract). Reads the bundled
 * fixture; swap the body for an HttpClient call once the endpoint exists.
 * Shared by every wizard step — Step 1 (Upload) reads only pack.spec, this
 * step additionally reads pack.fields/readiness/metrics.
 */
export async function getEntityPack(entityId: EntityId): Promise<Result<EntityPack, AppError>> {
  const raw = FIXTURES[entityId];
  if (raw === undefined) {
    return err(toNotFoundError(entityId));
  }

  const parsed = entityPackSchema.safeParse(raw);
  if (!parsed.success) {
    return err(toValidationError(entityId, parsed.error.issues));
  }

  return ok(parsed.data as unknown as EntityPack);
}

/* ============================================================================
   uploadSourceFile  ·  POST /api/v1/storage/upload -> Result<UploadResult>
   ----------------------------------------------------------------------------
   Multipart upload against the shared object-storage router (storage_service.py
   / FileResponse) — the generic file store every master-data object uploads
   into, distinct from the legacy COA-only /api/v1/files/upload used by
   features/migration/services/excel.service.ts.

   Confirmed live against a running api-service, authenticated as a real
   user (2026-08-28):
     - POST /api/v1/storage/upload requires a Bearer token (401 without one)
       and rejects an empty body with 422, matching the request shape below.
     - Body is multipart/form-data: file (required) + org_project_id /
       project_id / file_type / job_id / workstream_id (all optional strings).
     - 201 response is NOT a flat FileResponse (unlike GET
       /storage/files/{id}) — the upload handler wraps it:
       { success: true, file: { id, file_type, original_filename,
       storage_path, content_type, size_bytes, status, columns, row_count,
       created_at } }. Same wrapper convention as the legacy
       /api/v1/files/upload's `{ file: { id } }` in excel.service.ts. An
       earlier version of this schema assumed the flat GET shape and failed
       every real (successful) upload with INVALID_RESPONSE — read
       response.data.file, not response.data.
   ========================================================================= */

const uploadResponseSchema = z.object({
  success: z.boolean().optional(),
  file: z.object({
    id: z.string(),
    file_type: z.string(),
    original_filename: z.string(),
    storage_path: z.string(),
    content_type: z.string(),
    size_bytes: z.number(),
    status: z.string(),
    row_count: z.number(),
    created_at: z.string(),
  }),
});

function toUploadResult(dto: z.infer<typeof uploadResponseSchema>): UploadResult {
  const { file } = dto;
  return {
    fileId: file.id,
    fileName: file.original_filename,
    fileType: file.file_type,
    contentType: file.content_type,
    sizeBytes: file.size_bytes,
    status: file.status,
    rowCount: file.row_count,
    storagePath: file.storage_path,
    createdAt: file.created_at,
  };
}

export interface UploadSourceFileOptions {
  orgProjectId?: string;
  projectId?: string;
  /** Defaults to 'source_erp' server-side if omitted. */
  fileType?: string;
  jobId?: string;
  workstreamId?: string;
  /** Which master-data entity (customers, vendors, items, ...) this file belongs to — sent so the backend can persist it and later scope listOrgProjectFiles/getFileById by entity_id, not just workstream_id. */
  entityId?: string;
}

export async function uploadSourceFile(
  client: HttpClient,
  file: UploadedFile,
  options?: UploadSourceFileOptions,
): Promise<Result<UploadResult, AppError>> {
  try {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      // React Native's FormData polyfill takes this shape in place of a Blob.
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob);
    }
    if (options?.orgProjectId) formData.append('org_project_id', options.orgProjectId);
    if (options?.projectId) formData.append('project_id', options.projectId);
    if (options?.fileType) formData.append('file_type', options.fileType);
    if (options?.jobId) formData.append('job_id', options.jobId);
    if (options?.entityId) formData.append('entity_id', options.entityId);
    if (options?.workstreamId) formData.append('workstream_id', options.workstreamId);

    console.log('[entity-pack.service] POST /api/v1/storage/upload', options);
    // No explicit Content-Type here — the axios instance defaults to
    // 'application/json', and overriding it to a literal 'multipart/form-data'
    // (no boundary) makes the browser send that header as-is instead of
    // generating its own boundary, which the backend's multipart parser then
    // can't split. Content-Type: undefined removes the instance default so
    // the browser/XHR sets the correct 'multipart/form-data; boundary=...'
    // itself from the FormData body.
    const response = await client.post<unknown>('/api/v1/storage/upload', formData, {
      headers: { 'Content-Type': undefined },
    });
    console.log('[entity-pack.service] POST /api/v1/storage/upload -> response', response.data);

    const parsed = uploadResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Upload response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toUploadResult(parsed.data));
  } catch (error: unknown) {
    console.log('[entity-pack.service] POST /api/v1/storage/upload -> error', error);
    // No response ever came back (connection refused, DNS failure, request
    // timeout) — the backend process itself isn't reachable, as opposed to
    // the backend being up and returning an error. Surface that distinctly
    // so the user isn't shown a raw "Network Error" for what is really
    // "the server isn't running".
    if (axios.isAxiosError(error) && !error.response) {
      return err({
        code: 'SERVER_UNREACHABLE',
        message: 'Cannot reach the server. Make sure it is running, then try again.',
      });
    }
    return err(toAppError(error));
  }
}

/* ============================================================================
   Profiler pipeline runs
   ----------------------------------------------------------------------------
   Wraps the pipeline endpoints in src/modules/pipeline/routes.py:
     - POST  /api/v1/pipeline/runs
     - GET   /api/v1/pipeline/runs/{runId}
     - PATCH /api/v1/pipeline/runs/{runId}/fields/{fieldId}/type
     - GET   /api/v1/projects/{orgProjectId}/entities/{scope}/profile
   Same Result<T, AppError> pattern as the rest of this file.

   EntityPackResponse (backend) carries `run_id` but not `source_row_count` —
   getEntityPackFromApi chains through getPipelineRun(run_id) so
   mapEntityPackResponse always has a full run to read source.rowCount from.
   ========================================================================= */

// ─── Shapes ──────────────────────────────────────────────────────────────────

export interface PipelineRun {
  id: string;
  workstreamId: string;
  scope: string;
  status: string;
  sourceRowCount: number | null;
  fieldCount: number | null;
  fieldsProcessed: number | null;
  errorDetail: string | null;
  createdAt: string;
  completedAt: string | null;
  runSummary: Record<string, unknown> | null;
}

/** Mirrors backend FieldProfileRead (src/modules/pipeline/schemas.py). */
export interface FieldProfileRead {
  id: string;
  field_name: string;
  detected_type: string | null;
  total_count: number | null;
  null_count: number | null;
  distinct_count: number | null;
  cardinality: string | null;
  duplicate_row_count: number | null;
  duplicate_group_count: number | null;
  invalid_count: number | null;
  reference_failures: number | null;
  is_enumeration_candidate: boolean | null;
  pattern_anomalies: number | null;
  anomaly_count: number | null;
  semantic_role: string | null;
  role_description: string | null;
  confidence_score: number | null;
  evidence: string | null;
  severity: string | null;
  stats: Record<string, unknown> | null;
  pattern_summary: unknown[] | null;
  anomaly_examples: Record<string, unknown> | null;
  enumeration_detail: Record<string, unknown> | null;
  sample_values: Record<string, unknown> | null;
  value_distribution: unknown[] | null;
  format_detected: string | null;
  user_override_type: string | null;
  override_status: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
}

/** Mirrors backend EntityPackResponse (src/modules/pipeline/schemas.py). */
export interface EntityPackApiResponse {
  run_id: string;
  scope: string;
  status: string;
  run_summary: Record<string, unknown> | null;
  fields: FieldProfileRead[];
}

function toPipelineRun(dto: Record<string, unknown>): PipelineRun {
  return {
    id: dto.id as string,
    workstreamId: dto.workstream_id as string,
    scope: dto.scope as string,
    status: dto.status as string,
    sourceRowCount: (dto.source_row_count as number | null) ?? null,
    fieldCount: (dto.field_count as number | null) ?? null,
    fieldsProcessed: (dto.fields_processed as number | null) ?? null,
    errorDetail: (dto.error_detail as string | null) ?? null,
    createdAt: dto.created_at as string,
    completedAt: (dto.completed_at as string | null) ?? null,
    runSummary: (dto.run_summary as Record<string, unknown> | null) ?? null,
  };
}

// Callers pass EntityId as-is (dp-kit/types/entity.d.ts: camelCase — 'fixedAssets'),
// but the backend's PipelineRunCreate/scope path param validates against
// snake_case scope names (schemas.py _VALID_SCOPES: 'fixed_assets'). Every other
// EntityId happens to already match its backend scope 1:1 — 'fixedAssets' is the
// one exception — so every wire boundary that sends/reads a scope value funnels
// through this instead of each screen having to know about the mismatch.
const ENTITY_ID_TO_BACKEND_SCOPE: Record<string, string> = { fixedAssets: 'fixed_assets' };
function toBackendScope(scope: string): string {
  return ENTITY_ID_TO_BACKEND_SCOPE[scope] ?? scope;
}
// Inverse of the above — every EntityPackApiResponse/PipelineRunRead the
// backend returns carries its own scope back in this snake_case form, so
// anything that treats it as this app's EntityId (mapEntityPackResponse's
// `id`, in particular — typed as EntityId, not just a display string) has to
// convert it back or silently hold a value ('fixed_assets') that doesn't
// match the type it claims to be.
const BACKEND_SCOPE_TO_ENTITY_ID: Record<string, string> = { fixed_assets: 'fixedAssets' };
function toEntityId(backendScope: string): string {
  return BACKEND_SCOPE_TO_ENTITY_ID[backendScope] ?? backendScope;
}

// ─── createPipelineRun · POST /api/v1/pipeline/runs ─────────────────────────

export async function createPipelineRun(
  workstreamId: string,
  scope: string,
  sourceFileRef: string,
): Promise<Result<PipelineRun, AppError>> {
  try {
    const backendScope = toBackendScope(scope);
    console.log('[entity-pack.service] POST /api/v1/pipeline/runs', { workstreamId, scope: backendScope, sourceFileRef });
    const response = await httpClient.post<Record<string, unknown>>('/api/v1/pipeline/runs', {
      workstream_id: workstreamId,
      scope: backendScope,
      source_file_ref: sourceFileRef,
    });
    console.log('[entity-pack.service] POST /api/v1/pipeline/runs -> response', response.data);
    return ok(toPipelineRun(response.data));
  } catch (error: unknown) {
    console.log('[entity-pack.service] POST /api/v1/pipeline/runs -> error', error);
    return err(toAppError(error));
  }
}

// ─── getPipelineRun · GET /api/v1/pipeline/runs/{runId} ─────────────────────

export async function getPipelineRun(runId: string): Promise<Result<PipelineRun, AppError>> {
  try {
    // console.log(`[entity-pack.service] GET /api/v1/pipeline/runs/${runId}`);
    const response = await httpClient.get<Record<string, unknown>>(`/api/v1/pipeline/runs/${runId}`);
    // console.log(`[entity-pack.service] GET /api/v1/pipeline/runs/${runId} -> response`, response.data);
    return ok(toPipelineRun(response.data));
  } catch (error: unknown) {
    console.log(`[entity-pack.service] GET /api/v1/pipeline/runs/${runId} -> error`, error);
    return err(toAppError(error));
  }
}

// ─── overrideFieldType · PATCH /api/v1/pipeline/runs/{runId}/fields/{fieldId}/type

export async function overrideFieldType(
  runId: string,
  fieldId: string,
  overrideType: string,
  dateFormat?: string,
): Promise<Result<FieldProfileRead, AppError>> {
  try {
    console.log(`[entity-pack.service] PATCH /api/v1/pipeline/runs/${runId}/fields/${fieldId}/type`, { overrideType, dateFormat });
    const response = await httpClient.patch<FieldProfileRead>(
      `/api/v1/pipeline/runs/${runId}/fields/${fieldId}/type`,
      { override_type: overrideType, date_format: dateFormat },
    );
    console.log(`[entity-pack.service] PATCH /api/v1/pipeline/runs/${runId}/fields/${fieldId}/type -> response`, response.data);
    return ok(response.data);
  } catch (error: unknown) {
    console.log(`[entity-pack.service] PATCH /api/v1/pipeline/runs/${runId}/fields/${fieldId}/type -> error`, error);
    return err(toAppError(error));
  }
}

// ─── mapEntityPackResponse ───────────────────────────────────────────────────

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function toDatatype(rawType: string | null | undefined): EntityField['datatype'] {
  switch (rawType) {
    case 'text':
      return 'Text';
    case 'integer':
      return 'Integer';
    case 'decimal':
      return 'Decimal';
    case 'date':
      return 'Date';
    case 'boolean':
      return 'Boolean';
    default:
      return 'Text';
  }
}

// Backend severity values (coa_db_models/pipeline/models.py's
// ck_field_profiles_severity constraint: 'blocker','warning','review','clean')
// already match EntityField['impact'] 1:1 — anything else (including null,
// e.g. a field the profiler hasn't scored) falls back to 'na'.
function toImpact(severity: string | null | undefined): EntityField['impact'] {
  switch (severity) {
    case 'blocker':
      return 'blocker';
    case 'warning':
      return 'warning';
    case 'review':
      return 'review';
    case 'clean':
      return 'clean';
    default:
      return 'na';
  }
}

// Backend shape is `{ values: string[] }` (see FieldProfileRead.sample_values),
// not a bare array — casting the wrapper object straight to EntityField['sample']
// (string[]) previously fed the FieldsTable "Sample" column an object instead
// of the values it actually holds.
// A sample value is nominally a scalar, but the backend's sample_values shape
// (Record<string, unknown> | null, same opaque contract as anomaly_examples/
// enumeration_detail above) does not guarantee that — an object or a
// serialized-JSON string can land in `.values` for a problem field. Routing
// each entry through formatPreviewValue (rather than a bare String(v)) means
// FieldsTable's Sample column, which joins up to 3 of these with a middle
// dot, can never render raw braces/quotes even if that happens.
function toSample(sampleValues: Record<string, unknown> | null | undefined): EntityField['sample'] {
  const values = sampleValues?.values;
  if (!Array.isArray(values)) return undefined;
  return values.map((v) => (typeof v === 'string' ? formatPreviewValue(v) : formatObjectInline(v)));
}

// Backend sends enumeration_detail with snake_case keys (candidate,
// valid_ref, invalid_src, affected_rows, ref_integrity, ...);
// EntityField['enumeration'] (dp-kit/types/entity.d.ts — GENERATED, never
// hand-edited) is camelCase. Casting the raw object straight across, as a
// previous version of toEntityField() did, left validRef/invalidSrc/
// affectedRows/refIntegrity reading as undefined at runtime —
// DistributionTab's enumerationRows() then rendered the literal string
// "undefined" for those rows instead of the real numbers/status.
function toEnumeration(raw: Record<string, unknown> | null | undefined): EntityField['enumeration'] {
  if (!raw) return undefined;
  const num = (key: string): number | undefined => (typeof raw[key] === 'number' ? (raw[key] as number) : undefined);
  const str = (key: string): string | undefined => (typeof raw[key] === 'string' ? (raw[key] as string) : undefined);
  return {
    candidate: str('candidate'),
    validRef: num('valid_ref'),
    invalidSrc: num('invalid_src'),
    affectedRows: num('affected_rows'),
    aliasRows: num('alias_rows'),
    unresolved: num('unresolved'),
    refIntegrity: str('ref_integrity'),
    categoryAvailable: num('category_available'),
    highConf: num('high_conf'),
    ambiguous: num('ambiguous'),
    insufficient: num('insufficient'),
  };
}

function statusTone(status: string | undefined): 'dup' | 'warn' | 'info' | 'ok' | undefined {
  switch (status) {
    case 'recognized_alias':
      return 'ok';
    case 'review_required':
      return 'warn';
    default:
      return undefined;
  }
}

// anomaly_examples carries a reference-integrity breakdown as
// `{ type: 'reference_integrity', details: [{ source, canonical, rows,
// status }] }` — previously never read anywhere in toEntityField(), so it
// was silently dropped for every live pipeline run. Mapped here onto the
// existing invalidTable shape (dp-kit/types/entity.d.ts), which
// InvalidValuesTable.tsx is already built to render as readable text (never
// raw JSON) — "source → canonical", a row count, and a humanized status
// badge — so this only had to supply real data, not a new renderer.
function toInvalidTable(raw: Record<string, unknown> | null | undefined): EntityField['invalidTable'] {
  if (!raw || raw.type !== 'reference_integrity' || !Array.isArray(raw.details)) return undefined;
  return raw.details.map((entry): NonNullable<EntityField['invalidTable']>[number] => {
    const d = (entry ?? {}) as Record<string, unknown>;
    const status = typeof d.status === 'string' ? d.status : undefined;
    const canonical = typeof d.canonical === 'string' ? d.canonical.trim() : '';
    return {
      src: typeof d.source === 'string' ? d.source : undefined,
      canon: canonical.length > 0 ? formatPreviewValue(canonical) : undefined,
      occ: typeof d.rows === 'number' ? d.rows : undefined,
      status: status ? formatPreviewValue(status) : undefined,
      tone: statusTone(status),
    };
  });
}

function toEntityField(field: FieldProfileRead): EntityField {
  const total = field.total_count ?? 0;
  // distinct_count/total_count and confidence_score both come back from the
  // backend as 0-1 fractions (e.g. 0.5, 0.88, 1.00) — scaled to 0-100 here so
  // they match the fixture-authored packs' own scale (e.g. 44.4, 87) and
  // FieldsTable's uniquenessPct()/confidencePct() formatters, which both
  // expect a 0-100 percentage rather than a fraction.
  const uniqueness =
    field.distinct_count != null && total > 0
      ? (field.distinct_count / total) * 100
      : undefined;
  const confidence = field.confidence_score != null ? field.confidence_score * 100 : undefined;

  const stats = (field.stats ?? {}) as Record<string, unknown>;
  const anomalyEx = field.anomaly_examples as {
    type?: string;
    examples?: string[];
    details?: Array<{ source?: string; rows?: number; canonical?: string | null; status?: string }>;
  } | null;
  const dtype = toDatatype(field.user_override_type ?? field.detected_type);

  // ── categories — drives all filter chips and the coverage-popover counts ──
  // Previously never set, so every category stat in the popover showed 0.
  const categories: string[] = [];
  if (field.semantic_role === 'identifier_candidate') categories.push('identifiers');
  if (field.is_enumeration_candidate === true) categories.push('enums');
  if ((field.null_count ?? 0) > 0) categories.push('missing');
  if ((field.duplicate_row_count ?? 0) > 0) categories.push('duplicates');
  if ((field.pattern_anomalies ?? 0) > 0) categories.push('patterns');
  if ((field.anomaly_count ?? 0) > 0) categories.push('outliers');
  if ((field.reference_failures ?? 0) > 0) categories.push('refFailures');
  if ((field.invalid_count ?? 0) > 0) categories.push('invalid');
  const populated = total - (field.null_count ?? 0);
  if (total > 0 && populated / total < 0.05) categories.push('nearEmpty');

  // ── range — numeric types only ────────────────────────────────────────────
  let range: EntityField['range'];
  if (dtype === 'Integer' || dtype === 'Decimal') {
    range = {
      min: stats.min as string | undefined,
      max: stats.max as string | undefined,
      median: stats.median as string | undefined,
      p95: stats.p95 as string | undefined,
      method: stats.method as string | undefined,
      outliers: field.anomaly_count ?? undefined,
      examples:
        anomalyEx?.type === 'outlier' && Array.isArray(anomalyEx.examples)
          ? anomalyEx.examples.join(', ')
          : undefined,
    };
  }

  // ── text stats — text type only ───────────────────────────────────────────
  let text: EntityField['text'];
  if (dtype === 'Text') {
    const ts = stats.text_stats as { min_length?: number; max_length?: number; avg_length?: number } | undefined;
    if (ts) text = { minLen: ts.min_length, maxLen: ts.max_length, avgLen: ts.avg_length };
  }

  // ── dateProfile — date type only ──────────────────────────────────────────
  let dateProfile: EntityField['dateProfile'];
  if (dtype === 'Date' || dtype === 'DateTime') {
    const dp = stats.date_profile as
      | { earliest?: string; latest?: string; invalid?: number; future?: number }
      | undefined;
    if (dp) dateProfile = { earliest: dp.earliest, latest: dp.latest, invalid: dp.invalid, future: dp.future };
  }

  // ── nearEmpty detail ──────────────────────────────────────────────────────
  let nearEmpty: EntityField['nearEmpty'];
  if (total > 0 && populated / total < 0.05) {
    nearEmpty = { populated, populatedPct: Math.round((populated / total) * 1000) / 10 };
  }

  // ── invalidTable — reference-integrity per-value breakdown ────────────────
  // anomaly_examples.type === 'reference_integrity' when a scope handler ran.
  let invalidTable: EntityField['invalidTable'];
  if (anomalyEx?.type === 'reference_integrity' && Array.isArray(anomalyEx.details)) {
    invalidTable = anomalyEx.details.map((d) => ({
      src: d.source,
      occ: d.rows,
      canon: d.canonical ?? undefined,
      status: d.status,
      tone: (d.status === 'recognized_alias' ? 'ok' : 'warn') as 'ok' | 'warn',
    }));
  }

  // ── dist — value distribution ─────────────────────────────────────────────
  const dist = (field.value_distribution as Array<{ label: string; pct: number }> | null | undefined)
    ?.map((v) => ({ label: v.label, pct: v.pct }));

  // ── enumeration — snake_case → camelCase + scope-handler extra_stats ──────
  // Previously a direct cast so valid_ref/invalid_src/etc. were silently
  // undefined on the frontend (EntityField expects camelCase keys).
  const ed = field.enumeration_detail as Record<string, unknown> | null | undefined;
  let enumeration: EntityField['enumeration'];
  if (ed) {
    enumeration = {
      candidate: ed.candidate as string | undefined,
      validRef: ed.valid_ref as number | undefined,
      invalidSrc: ed.invalid_src as number | undefined,
      affectedRows: ed.affected_rows as number | undefined,
      refIntegrity: ed.ref_integrity as string | undefined,
      // extra_stats from scope handlers are merged into stats at the top level
      categoryAvailable: stats.category_available_count as number | undefined,
      highConf: stats.high_confidence_inference as number | undefined,
      ambiguous: stats.ambiguous_rows as number | undefined,
      insufficient: stats.insufficient_evidence_rows as number | undefined,
    };
  }

  return {
    id: field.field_name,
    name: field.field_name,
    datatype: dtype,
    nullCount: field.null_count ?? undefined,
    distinct: field.distinct_count ?? undefined,
    uniqueness,
    cardinality: field.cardinality ? formatPreviewValue(field.cardinality) : undefined,
    confidence,
    role: field.semantic_role ?? undefined,
    roleTip: field.role_description ?? undefined,
    impact: toImpact(field.severity),
    impactReason: field.evidence ?? undefined,
    sample: toSample(field.sample_values),
    categories: categories.length > 0 ? categories : undefined,
    patterns: field.pattern_summary as unknown as EntityField['patterns'],
    patternAnomalies: field.pattern_anomalies ?? undefined,
    duplicates:
      (field.duplicate_row_count ?? 0) > 0 || (field.duplicate_group_count ?? 0) > 0
        ? { rows: field.duplicate_row_count ?? undefined, groups: field.duplicate_group_count ?? undefined }
        : undefined,
    range,
    text,
    dateProfile,
    nearEmpty,
    enumeration,
    dist,
    invalidTable,
  };
}

// KpiStrip's tiles (see buildMetrics in utils/fields.ts) — every value is
// computed live off pack.fields/pack.source.rowCount, never a literal, so
// this same generic definition set drives the strip for every scope. The
// backend has no per-entity metric config yet (unlike the fixture-based
// dp-kit stand-in, which hand-authors a scope-specific `highlight` per
// metric); `highlight` here is computed the same way each metric's own
// `value` already is — off the real fields — so clicking a live-run tile
// highlights/filters the same fields its count describes, instead of always
// being empty (which silently made every KPI tile in a live run a no-op
// click, unlike the fixture-preview path).
function buildLiveMetrics(fields: EntityField[]): EntityMetric[] {
  const blockerIds = fields.filter((f) => f.impact === 'blocker').map((f) => f.id);
  const reviewIds = fields.filter((f) => f.impact === 'review' || f.impact === 'warning').map((f) => f.id);
  const nullIds = fields.filter((f) => (f.nullCount ?? 0) > 0).map((f) => f.id);

  return [
    { id: 'records', label: 'Total records', kind: 'rowCount', tone: 'neutral', tip: 'All source rows profiled' },
    { id: 'fields', label: 'Fields profiled', kind: 'fieldCount', tone: 'neutral', tip: 'Columns detected in the source file' },
    { id: 'blockers', label: 'Blocking issues', kind: 'impactCount', impact: 'blocker', tone: 'blocker', tip: 'Fields that must be resolved before mapping', highlight: blockerIds },
    { id: 'review', label: 'Needs review', kind: 'reviewCount', tone: 'warn', tip: 'Fields flagged for review', highlight: reviewIds },
    { id: 'nulls', label: 'Null values', kind: 'sumNulls', tone: 'neutral', tip: 'Total blank values across all fields', highlight: nullIds },
  ];
}

/**
 * Builds ReadinessBanner's content entirely from real profiled fields — no
 * model call exists anywhere in this app (see root CLAUDE.md: "No AI —
 * custom fuzzy matching"), so unlike EntityReadiness's own type doc
 * ("narrative + recommendedOrder are ai"), nothing here is model-authored.
 * `narrative` is a plain, deterministic sentence reporting only counts the
 * profiler actually produced — never an invented causal explanation (e.g.
 * "SKU may only be unique within a subsidiary" — that requires real
 * analysis this pipeline doesn't do). `recommendedOrder` lists real blocker
 * field names ordered by severity, matching how ReadinessBanner already
 * renders it (ProvenanceLabel state="action", not "ai"). `evidence` is
 * exactly the fact-provenance counts the profiler computed.
 */
function buildReadiness(fields: EntityField[], rowCount: number | undefined): EntityReadiness | undefined {
  if (fields.length === 0) return undefined;

  const blockers = fields.filter((f) => f.impact === 'blocker');
  const reviews = fields.filter((f) => f.impact === 'review' || f.impact === 'warning');
  const clean = fields.filter((f) => f.impact === 'clean').length;

  const tone: NonNullable<EntityReadiness['tone']> =
    blockers.length > 0 ? 'blocker' : reviews.length > 0 ? 'warn' : 'neutral';
  const headline =
    tone === 'blocker'
      ? 'Migration readiness: Needs attention'
      : tone === 'warn'
        ? 'Migration readiness: Review recommended'
        : 'Migration readiness: Ready';

  const narrativeParts: string[] = [`${fields.length} field${fields.length === 1 ? '' : 's'} profiled`];
  if (rowCount !== undefined) narrativeParts.push(`from ${rowCount.toLocaleString('en-US')} source rows`);
  const issueParts: string[] = [];
  if (blockers.length > 0) issueParts.push(`${blockers.length} blocking issue${blockers.length === 1 ? '' : 's'}`);
  if (reviews.length > 0) issueParts.push(`${reviews.length} field${reviews.length === 1 ? '' : 's'} flagged for review`);
  const narrative = issueParts.length > 0
    ? `${narrativeParts.join(' ')}. ${issueParts.join(' and ')} — resolve before generating mappings.`
    : `${narrativeParts.join(' ')}. ${clean} field${clean === 1 ? '' : 's'} clean; ready to generate mappings.`;

  const recommendedOrder = blockers
    .slice(0, 5)
    .map((f) => ({ label: `Resolve ${f.name}`, target: f.id }));

  const evidence = [
    { value: String(fields.length), label: 'fields profiled' },
    { value: String(blockers.length), label: 'blocking issues' },
    { value: String(reviews.length), label: 'need review' },
    { value: String(clean), label: 'clean' },
  ];

  return { headline, tone, narrative, recommendedOrder, evidence };
}

export function mapEntityPackResponse(response: EntityPackApiResponse, run: PipelineRun): EntityPack {
  const entityId = toEntityId(response.scope);
  // 'fixedAssets' -> 'fixed Assets' -> capitalise -> 'Fixed Assets'; every
  // other EntityId has no lowercase-then-uppercase boundary, so this is a
  // no-op for them (capitalise('items') is unchanged from before).
  const label = capitalise(entityId.replace(/([a-z])([A-Z])/g, '$1 $2'));
  const fields = response.fields.map(toEntityField);
  const rowCount = run.sourceRowCount ?? undefined;
  return {
    id: entityId as EntityPack['id'],
    label: { singular: label, plural: `${label}s` },
    source: { object: entityId, rowCount },
    target: { record: '' },
    // dp-kit's generated EntityIdentity.confirmed is `string | undefined`
    // (no `null` in the type) — undefined is the same "not yet approved"
    // default the type actually supports.
    identity: { candidates: [], confirmed: undefined },
    fields,
    readiness: buildReadiness(fields, rowCount),
    metrics: buildLiveMetrics(fields),
  };
}

// ─── getEntityPackFromApi · GET /api/v1/projects/{orgProjectId}/entities/{scope}/profile

export async function getEntityPackFromApi(
  orgProjectId: string,
  scope: string,
): Promise<Result<EntityPack, AppError>> {
  const backendScope = toBackendScope(scope);
  try {
    console.log(`[entity-pack.service] GET /api/v1/projects/${orgProjectId}/entities/${backendScope}/profile`);
    const response = await httpClient.get<EntityPackApiResponse>(
      `/api/v1/projects/${orgProjectId}/entities/${backendScope}/profile`,
    );
    console.log(`[entity-pack.service] GET /api/v1/projects/${orgProjectId}/entities/${backendScope}/profile -> response`, response.data);
    const runResult = await getPipelineRun(response.data.run_id);
    if (!runResult.ok) return err(runResult.error);
    return ok(mapEntityPackResponse(response.data, runResult.data));
  } catch (error: unknown) {
    console.log(`[entity-pack.service] GET /api/v1/projects/${orgProjectId}/entities/${scope}/profile -> error`, error);
    return err(toAppError(error));
  }
}

// ─── getActivePipelineRun · recovers the run already in progress for a scope
// ─────────────────────────────────────────────────────────────────────────
// createPipelineRun 409s when a run for this workstream+scope is already
// in progress (backend enforces one active run per scope). Rather than
// surface that as a hard failure, callers can fall back to this to fetch
// the run already backing the scope's profile and carry on as if creation
// had succeeded.

export async function getActivePipelineRun(
  orgProjectId: string,
  scope: string,
): Promise<Result<PipelineRun, AppError>> {
  const backendScope = toBackendScope(scope);
  try {
    console.log(`[entity-pack.service] GET /api/v1/projects/${orgProjectId}/entities/${backendScope}/profile (active-run lookup)`);
    const response = await httpClient.get<EntityPackApiResponse>(
      `/api/v1/projects/${orgProjectId}/entities/${backendScope}/profile`,
    );
    console.log(`[entity-pack.service] GET /api/v1/projects/${orgProjectId}/entities/${backendScope}/profile (active-run lookup) -> response`, response.data);
    return getPipelineRun(response.data.run_id);
  } catch (error: unknown) {
    console.log(`[entity-pack.service] GET /api/v1/projects/${orgProjectId}/entities/${scope}/profile (active-run lookup) -> error`, error);
    return err(toAppError(error));
  }
}

/** True when the given error is the "run already in progress" conflict createPipelineRun returns. */
export function isPipelineRunConflict(error: AppError): boolean {
  return error.code === 'HTTP_409';
}

/* ============================================================================
   Persisted org-project files
   ----------------------------------------------------------------------------
   Wraps the object-storage listing/removal endpoints so a project's uploaded
   file is re-derived from the server on every screen mount rather than
   trusted from local/zustand-persisted state (see MasterDataUploadScreen —
   this is the single source of truth for "does this project already have an
   uploaded source file").
     - GET    /api/v1/storage/org-project/{orgProjectId}/files
     - DELETE /api/v1/storage/files/{fileId}
   ========================================================================= */

// org_project_id/entity_id/workstream_id — optional because neither the
// live files-list endpoint nor GET /storage/files/{id} actually sends them
// back on the file object today (confirmed against a real response) — a
// strict "must be present and match" check against that real contract
// blanks out every legitimately-uploaded file, not just cross-entity ones.
// fileMatchesContext() below only rejects a file when a field it DOES
// carry disagrees with the caller's context; see its own comment.
const orgProjectFileSchema = z.object({
  id: z.string(),
  file_type: z.string(),
  original_filename: z.string(),
  storage_path: z.string(),
  content_type: z.string(),
  size_bytes: z.number(),
  status: z.string(),
  columns: z.array(z.string()).nullable().optional(),
  row_count: z.number(),
  created_at: z.string(),
  org_project_id: z.string().optional(),
  entity_id: z.string().optional(),
  workstream_id: z.string().optional(),
});

const orgProjectFilesResponseSchema = z.object({
  files: z.array(orgProjectFileSchema),
  total: z.number(),
});

/** Mirrors backend FileResponse (see uploadSourceFile's response comment above), as returned by the files-listing endpoint. */
export interface PersistedFile {
  readonly id: string;
  readonly fileType: string;
  readonly originalFilename: string;
  readonly storagePath: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly status: string;
  readonly columns: string[];
  readonly rowCount: number;
  readonly createdAt: string;
  /** Present only if/when the backend starts sending it — see fileMatchesContext(). */
  readonly orgProjectId?: string;
  readonly entityId?: string;
  readonly workstreamId?: string;
}

function toPersistedFile(dto: z.infer<typeof orgProjectFileSchema>): PersistedFile {
  return {
    id: dto.id,
    fileType: dto.file_type,
    originalFilename: dto.original_filename,
    storagePath: dto.storage_path,
    contentType: dto.content_type,
    sizeBytes: dto.size_bytes,
    status: dto.status,
    columns: dto.columns ?? [],
    rowCount: dto.row_count,
    createdAt: dto.created_at,
    orgProjectId: dto.org_project_id,
    entityId: dto.entity_id,
    workstreamId: dto.workstream_id,
  };
}

export interface FileContext {
  readonly orgProjectId?: string;
  readonly entityId?: string;
  readonly workstreamId?: string;
}

/**
 * True when every context field the file's own response actually carries
 * agrees with the caller's current org_project_id/entity_id/workstream_id.
 * A field the response omits is not checked (can't validate what isn't
 * there — confirmed live: neither the list nor GET /storage/files/{id}
 * sends these back today) rather than treated as a mismatch — a strict
 * "must be present" version of this rejected every real file, including
 * ones this screen had just uploaded itself under the exact current
 * context, because the field was never in the response to begin with.
 * Once the backend starts returning these fields, a genuine cross-entity
 * file (e.g. a Vendor file surfacing under Customer) fails this check and
 * callers must treat it as "no file" — never display it, never populate
 * row counts from it.
 */
export function fileMatchesContext(file: PersistedFile, ctx: FileContext): boolean {
  if (ctx.orgProjectId && file.orgProjectId && file.orgProjectId !== ctx.orgProjectId) return false;
  if (ctx.entityId && file.entityId && file.entityId !== ctx.entityId) return false;
  if (ctx.workstreamId && file.workstreamId && file.workstreamId !== ctx.workstreamId) return false;
  return true;
}

// ─── listOrgProjectFiles · GET /api/v1/storage/org-project/{orgProjectId}/files

/**
 * `total` is carried through explicitly (not just derived as `files.length`)
 * so callers can apply the backend's own literal existence contract —
 * `files.length > 0 AND total > 0` — rather than assuming today's "total is
 * always len(files)" backend behaviour holds forever (e.g. if this endpoint
 * is ever paginated). See useOrgProjectFiles.ts's `hasFile`.
 */
export interface OrgProjectFilesResult {
  readonly files: PersistedFile[];
  readonly total: number;
}

// A project holds one workstream per master-data entity (customers, vendors,
// items, ...) — without this filter, every entity's upload screen shares the
// exact same file pool (org_project_id alone), so uploading a Customers file
// then switching to Vendors would show "already uploaded" there too. Pass
// the entity's own workstream_id (always available — see
// MasterDataUploadScreen's workstream_id) to scope the list to that entity.
// entityId is sent alongside workstream_id (not instead of it) as a second,
// independent scoping key the backend can filter on.
export async function listOrgProjectFiles(
  orgProjectId: string,
  workstreamId?: string,
  entityId?: string,
): Promise<Result<OrgProjectFilesResult, AppError>> {
  try {
    console.log(`[entity-pack.service] GET /api/v1/storage/org-project/${orgProjectId}/files`, { workstreamId, entityId });
    const params: Record<string, string> = {};
    if (workstreamId) params.workstream_id = workstreamId;
    if (entityId) params.entity_id = entityId;
    // This endpoint's whole job is "reflect the file the user just deleted or
    // uploaded" — the URL is identical on every call, and the backend sends
    // no Cache-Control of its own, so without this a browser is free to
    // heuristically (RFC 7234 §4.2.2) serve a cached copy of this GET below
    // the axios/React-Query layer, inconsistently per browser, even though
    // the refetch that follows a delete/upload is genuinely being issued.
    const response = await httpClient.get<unknown>(`/api/v1/storage/org-project/${orgProjectId}/files`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    console.log(`[entity-pack.service] GET /api/v1/storage/org-project/${orgProjectId}/files -> response`, response.data);
    const parsed = orgProjectFilesResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Org project files response failed validation',
        details: { issues: parsed.error.issues },
      });
    }
    return ok({ files: parsed.data.files.map(toPersistedFile), total: parsed.data.total });
  } catch (error: unknown) {
    console.log(`[entity-pack.service] GET /api/v1/storage/org-project/${orgProjectId}/files -> error`, error);
    return err(toAppError(error));
  }
}

// ─── getFileById · GET /api/v1/storage/files/{fileId} ───────────────────────
// Flat FileResponse shape (see uploadSourceFile's response comment above:
// "unlike GET /storage/files/{id}") — same shape listOrgProjectFiles' items
// already parse, so this reuses orgProjectFileSchema/toPersistedFile rather
// than a second schema. This is the one source Source/Target row counts
// should read from: never the POST /storage/upload response (which reflects
// only the instant of upload, not a later delete/refresh), and never the
// files-list response either (a different endpoint, scoped to "which file is
// current", not "what are this file's current details"). org_project_id/
// entity_id/workstream_id ride alongside file_id on every call so the
// backend can validate the file actually belongs to the caller's current
// project+entity+workstream, and so this hook's own cache key can include
// all four (see useFileDetails.ts).
export interface GetFileByIdParams {
  readonly orgProjectId?: string;
  readonly entityId?: string;
  readonly workstreamId?: string;
}

export async function getFileById(
  fileId: string,
  params?: GetFileByIdParams,
): Promise<Result<PersistedFile, AppError>> {
  try {
    const query: Record<string, string> = {};
    if (params?.orgProjectId) query.org_project_id = params.orgProjectId;
    if (params?.entityId) query.entity_id = params.entityId;
    if (params?.workstreamId) query.workstream_id = params.workstreamId;
    console.log(`[entity-pack.service] GET /api/v1/storage/files/${fileId}`, query);
    const response = await httpClient.get<unknown>(`/api/v1/storage/files/${fileId}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    console.log(`[entity-pack.service] GET /api/v1/storage/files/${fileId} -> response`, response.data);
    const parsed = orgProjectFileSchema.safeParse(response.data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'File details response failed validation',
        details: { issues: parsed.error.issues },
      });
    }
    return ok(toPersistedFile(parsed.data));
  } catch (error: unknown) {
    console.log(`[entity-pack.service] GET /api/v1/storage/files/${fileId} -> error`, error);
    return err(toAppError(error));
  }
}

// ─── deleteFile · DELETE /api/v1/storage/files/{fileId} ─────────────────────

export async function deleteFile(fileId: string): Promise<Result<void, AppError>> {
  try {
    console.log(`[entity-pack.service] DELETE /api/v1/storage/files/${fileId}`);
    await httpClient.delete(`/api/v1/storage/files/${fileId}`);
    return ok(undefined);
  } catch (error: unknown) {
    console.log(`[entity-pack.service] DELETE /api/v1/storage/files/${fileId} -> error`, error);
    return err(toAppError(error));
  }
}

// ─── downloadPersistedFile · GET /api/v1/storage/download/{fileId} ─────────
// The files-list endpoint (listOrgProjectFiles above) only ever carries
// column names and a row count — never actual cell values (see its own
// response shape). This is the only way to get real preview rows for a file
// that was uploaded in an earlier session (a refresh, a new tab, revisiting
// from another route): download the persisted bytes and let the caller
// parse them the same way a fresh client-side upload already does.

export async function downloadPersistedFile(fileId: string): Promise<Result<string, AppError>> {
  try {
    console.log(`[entity-pack.service] GET /api/v1/storage/download/${fileId}`);
    const response = await httpClient.get<string>(`/api/v1/storage/download/${fileId}`, {
      responseType: 'text',
    });
    return ok(response.data);
  } catch (error: unknown) {
    console.log(`[entity-pack.service] GET /api/v1/storage/download/${fileId} -> error`, error);
    return err(toAppError(error));
  }
}

/* ============================================================================
   Workstream stage progress
   ----------------------------------------------------------------------------
   Backs the wizard's StepRail with the workstream's own server-persisted
   position (`current_stage`) and per-step completion flags
   (`WorkstreamStage.is_completed`) — the same mechanism the migration flow's
   workstream stage tracking already uses (src/modules/workstreams/ on the
   backend). A stage's `name` is the wizard's own StepId string ('upload',
   'profile', ...) one-for-one — no separate mapping table needed.
   ========================================================================= */

const workstreamStageSchema = z.object({
  id: z.string(),
  workstream_id: z.string(),
  name: z.string(),
  sequence: z.number(),
  is_completed: z.boolean(),
  completed_at: z.string().nullable(),
  completed_by: z.string().nullable(),
});

const workstreamContextSchema = z
  .object({
    id: z.string(),
    current_stage: z.string().nullable(),
    stages: z.array(workstreamStageSchema),
  })
  .passthrough();

export interface WorkstreamStageInfo {
  readonly id: string;
  readonly name: string;
  readonly sequence: number;
  readonly isCompleted: boolean;
}

export interface WorkstreamProgress {
  readonly currentStage: string | null;
  readonly stages: readonly WorkstreamStageInfo[];
}

function toWorkstreamProgress(dto: z.infer<typeof workstreamContextSchema>): WorkstreamProgress {
  return {
    currentStage: dto.current_stage,
    stages: dto.stages.map((s) => ({
      id: s.id,
      name: s.name,
      sequence: s.sequence,
      isCompleted: s.is_completed,
    })),
  };
}

// ─── getWorkstreamProgress · GET /api/v1/workstreams/{workstreamId}/context

export async function getWorkstreamProgress(workstreamId: string): Promise<Result<WorkstreamProgress, AppError>> {
  try {
    console.log(`[entity-pack.service] GET /api/v1/workstreams/${workstreamId}/context`);
    const response = await httpClient.get<unknown>(`/api/v1/workstreams/${workstreamId}/context`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    const parsed = workstreamContextSchema.safeParse(response.data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Workstream context response failed validation',
        details: { issues: parsed.error.issues },
      });
    }
    return ok(toWorkstreamProgress(parsed.data));
  } catch (error: unknown) {
    console.log(`[entity-pack.service] GET /api/v1/workstreams/${workstreamId}/context -> error`, error);
    return err(toAppError(error));
  }
}

// ─── completeWorkstreamStage · PATCH /api/v1/workstreams/{workstreamId}/stages/{stageId}/complete
// Idempotent server-side — safe to call every time a step's Continue is
// pressed, even if this exact stage was already marked complete earlier.

export async function completeWorkstreamStage(
  workstreamId: string,
  stageId: string,
): Promise<Result<void, AppError>> {
  try {
    console.log(`[entity-pack.service] PATCH /api/v1/workstreams/${workstreamId}/stages/${stageId}/complete`);
    await httpClient.patch(`/api/v1/workstreams/${workstreamId}/stages/${stageId}/complete`);
    return ok(undefined);
  } catch (error: unknown) {
    console.log(
      `[entity-pack.service] PATCH /api/v1/workstreams/${workstreamId}/stages/${stageId}/complete -> error`,
      error,
    );
    return err(toAppError(error));
  }
}
