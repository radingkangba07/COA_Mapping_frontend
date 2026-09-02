import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { UploadedFile } from '@/shared/components/ui/FileUploader';
import type { EntityId, EntityPack } from '../dp-kit/types/entity';
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

    console.log('[MasterDataUploadScreen] POST /api/v1/storage/upload', options);
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
    console.log('[MasterDataUploadScreen] POST /api/v1/storage/upload -> response', response.data);

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
    console.log('[MasterDataUploadScreen] POST /api/v1/storage/upload -> error', error);
    return err(toAppError(error));
  }
}
