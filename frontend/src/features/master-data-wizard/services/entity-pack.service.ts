import axios from 'axios';
import { z } from 'zod';
import { httpClient } from '@/shared/services/http/http.instance';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { UploadedFile } from '@/shared/components/ui/FileUploader';
import type { EntityField, EntityId, EntityPack } from '../dp-kit/types/entity';
import type { UploadResult } from '../types/upload.types';
import itemsFixture from '../dp-kit/fixtures/items.entity.json';
import customersFixture from '../dp-kit/fixtures/customers.entity.json';

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

// ─── createPipelineRun · POST /api/v1/pipeline/runs ─────────────────────────

export async function createPipelineRun(
  workstreamId: string,
  scope: string,
  sourceFileRef: string,
): Promise<Result<PipelineRun, AppError>> {
  try {
    console.log('[entity-pack.service] POST /api/v1/pipeline/runs', { workstreamId, scope, sourceFileRef });
    const response = await httpClient.post<Record<string, unknown>>('/api/v1/pipeline/runs', {
      workstream_id: workstreamId,
      scope,
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

function toImpact(severity: string | null | undefined): EntityField['impact'] {
  switch (severity) {
    case 'ok':
      return 'clean';
    case 'warn':
      return 'warning';
    case 'error':
      return 'blocker';
    case 'info':
      return 'review';
    default:
      return 'na';
  }
}

function toEntityField(field: FieldProfileRead): EntityField {
  const uniqueness =
    field.distinct_count != null && field.total_count != null && field.total_count > 0
      ? field.distinct_count / field.total_count
      : undefined;

  return {
    id: field.field_name,
    name: field.field_name,
    datatype: toDatatype(field.user_override_type ?? field.detected_type),
    nullCount: field.null_count ?? undefined,
    distinct: field.distinct_count ?? undefined,
    uniqueness,
    cardinality: field.cardinality ?? undefined,
    confidence: field.confidence_score ?? undefined,
    role: field.semantic_role ?? undefined,
    roleTip: field.role_description ?? undefined,
    impact: toImpact(field.severity),
    impactReason: field.evidence ?? undefined,
    sample: field.sample_values as unknown as EntityField['sample'],
    patterns: field.pattern_summary as unknown as EntityField['patterns'],
    enumeration: field.enumeration_detail as unknown as EntityField['enumeration'],
    duplicates: {
      rows: field.duplicate_row_count ?? undefined,
      groups: field.duplicate_group_count ?? undefined,
    },
    patternAnomalies: field.pattern_anomalies ?? undefined,
  };
}

export function mapEntityPackResponse(response: EntityPackApiResponse, run: PipelineRun): EntityPack {
  const label = capitalise(response.scope);
  return {
    id: response.scope as EntityPack['id'],
    label: { singular: label, plural: `${label}s` },
    source: { object: response.scope, rowCount: run.sourceRowCount ?? undefined },
    target: { record: '' },
    // dp-kit's generated EntityIdentity.confirmed is `string | undefined`
    // (no `null` in the type) — undefined is the same "not yet approved"
    // default the type actually supports.
    identity: { candidates: [], confirmed: undefined },
    fields: response.fields.map(toEntityField),
    readiness: undefined,
    metrics: undefined,
  };
}

// ─── getEntityPackFromApi · GET /api/v1/projects/{orgProjectId}/entities/{scope}/profile

export async function getEntityPackFromApi(
  orgProjectId: string,
  scope: string,
): Promise<Result<EntityPack, AppError>> {
  try {
    console.log(`[entity-pack.service] GET /api/v1/projects/${orgProjectId}/entities/${scope}/profile`);
    const response = await httpClient.get<EntityPackApiResponse>(
      `/api/v1/projects/${orgProjectId}/entities/${scope}/profile`,
    );
    console.log(`[entity-pack.service] GET /api/v1/projects/${orgProjectId}/entities/${scope}/profile -> response`, response.data);
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
  try {
    console.log(`[entity-pack.service] GET /api/v1/projects/${orgProjectId}/entities/${scope}/profile (active-run lookup)`);
    const response = await httpClient.get<EntityPackApiResponse>(
      `/api/v1/projects/${orgProjectId}/entities/${scope}/profile`,
    );
    console.log(`[entity-pack.service] GET /api/v1/projects/${orgProjectId}/entities/${scope}/profile (active-run lookup) -> response`, response.data);
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
