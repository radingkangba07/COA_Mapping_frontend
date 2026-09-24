/* ============================================================================
   test_import.service.ts  ·  Import Run (step 7) — trigger + poll a simulated ERP import
   ----------------------------------------------------------------------------
   POST /api/v1/pipeline/runs/{run_id}/import-run kicks off a simulated import
   run through the NATS worker. GET .../import-run reads the latest result.
   Sub-resource endpoints return batches, errors, records, and connector
   requests scoped to the run. All use the Result<T, AppError> pattern.
   ========================================================================= */

import { isAxiosError } from 'axios';
import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';

// ─── Schemas ────────────────────────────────────────────────────────────────

const importRunSchema = z.object({
  id: z.string(),
  run_id: z.string(),
  status: z.enum(['pending', 'running', 'complete', 'failed']),
  run_code: z.string().nullable().default(null),
  batch_size: z.number(),
  req_per_sec: z.number(),
  rows_attempted: z.number().nullable().default(null),
  rows_imported: z.number().nullable().default(null),
  rows_failed: z.number().nullable().default(null),
  rows_skipped: z.number().nullable().default(null),
  rows_reconciled: z.number().nullable().default(null),
  duration_ms: z.number().nullable().default(null),
  error_detail: z.string().nullable().default(null),
  started_at: z.string().nullable().default(null),
  completed_at: z.string().nullable().default(null),
  created_at: z.string(),
});

const importBatchItemSchema = z.object({
  batch_code: z.string(),
  records_total: z.number(),
  records_imported: z.number(),
  records_failed: z.number(),
  records_skipped: z.number(),
  errors_open: z.number(),
});

const importBatchListSchema = z.object({
  batches: z.array(importBatchItemSchema),
});

const importErrorSchema = z.object({
  id: z.string(),
  import_run_id: z.string(),
  connector_request_id: z.string().nullable().default(null),
  source_row_index: z.number(),
  record_ref: z.string().nullable().default(null),
  batch_code: z.string(),
  error_title: z.string(),
  error_detail: z.string().nullable().default(null),
  retry_class: z.enum(['permanent', 'transient']),
  parsed_by: z.enum(['deterministic', 'ai']),
  status: z.enum(['open', 'resolved']),
  source_field: z.string().nullable().default(null),
  raw_value: z.string().nullable().default(null),
  written_to: z.string().nullable().default(null),
  value_sent: z.string().nullable().default(null),
  erp_response: z.string().nullable().default(null),
  deterministic_rule: z.string().nullable().default(null),
  ai_analysis: z.string().nullable().default(null),
  ai_likely_cause: z.string().nullable().default(null),
  ai_cause_category: z.string().nullable().default(null),
  ai_fix_suggestion: z.string().nullable().default(null),
  ai_fix_step: z.string().nullable().default(null),
  ai_model: z.string().nullable().default(null),
  created_at: z.string(),
});

const importErrorListSchema = z.object({
  errors: z.array(importErrorSchema),
  total: z.number(),
});

const importRecordSchema = z.object({
  id: z.string(),
  import_run_id: z.string(),
  source_row_index: z.number(),
  internal_id: z.string().nullable().default(null),
  display_name: z.string().nullable().default(null),
  batch_code: z.string(),
  outcome: z.enum(['imported', 'failed', 'skipped']),
  target_id: z.string().nullable().default(null),
  latency_ms: z.number().nullable().default(null),
  created_at: z.string(),
});

const importRecordListSchema = z.object({
  records: z.array(importRecordSchema),
  total: z.number(),
});

const connectorRequestSchema = z.object({
  id: z.string(),
  import_run_id: z.string(),
  request_code: z.string(),
  operation: z.string(),
  erp_model: z.string().nullable().default(null),
  record_ref: z.string().nullable().default(null),
  batch_code: z.string(),
  http_status: z.number().nullable().default(null),
  latency_ms: z.number().nullable().default(null),
  retries: z.number(),
  request_payload: z.record(z.string(), z.unknown()).nullable().default(null),
  response_payload: z.record(z.string(), z.unknown()).nullable().default(null),
  created_at: z.string(),
});

const connectorRequestListSchema = z.object({
  requests: z.array(connectorRequestSchema),
  total: z.number(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type ImportRunStatus = z.infer<typeof importRunSchema>['status'];
export type ImportRunDto = z.infer<typeof importRunSchema>;
export type ImportBatchItem = z.infer<typeof importBatchItemSchema>;
export type ImportErrorDto = z.infer<typeof importErrorSchema>;
export type ImportRecordDto = z.infer<typeof importRecordSchema>;
export type ConnectorRequestDto = z.infer<typeof connectorRequestSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parse<T>(schema: z.ZodType<T>, data: unknown, label: string): Result<T, AppError> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return err({
      code: 'INVALID_RESPONSE',
      message: `${label} response failed validation`,
      details: { issues: parsed.error.issues },
    });
  }
  return ok(parsed.data);
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function triggerImportRun(
  client: HttpClient,
  runId: string,
): Promise<Result<ImportRunDto, AppError>> {
  try {
    const response = await client.post<unknown>(`/api/v1/pipeline/runs/${runId}/import-run`, {});
    return parse(importRunSchema, response.data, 'Import run');
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

// Returns ok(null) on 404 — callers treat null as "no run yet" (idle state).
export async function getImportRun(
  client: HttpClient,
  runId: string,
): Promise<Result<ImportRunDto | null, AppError>> {
  try {
    const response = await client.get<unknown>(`/api/v1/pipeline/runs/${runId}/import-run`);
    return parse(importRunSchema, response.data, 'Import run');
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return ok(null);
    }
    return err(toAppError(error));
  }
}

export async function getImportRunBatches(
  client: HttpClient,
  runId: string,
): Promise<Result<ImportBatchItem[], AppError>> {
  try {
    const response = await client.get<unknown>(`/api/v1/pipeline/runs/${runId}/import-run/batches`);
    const result = parse(importBatchListSchema, response.data, 'Import run batches');
    if (!result.ok) return result;
    return ok(result.data.batches);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getImportRunErrors(
  client: HttpClient,
  runId: string,
  batch?: string,
  status?: string,
): Promise<Result<{ items: ImportErrorDto[]; total: number }, AppError>> {
  try {
    const params: Record<string, string> = {};
    if (batch !== undefined) params.batch = batch;
    if (status !== undefined) params.status = status;
    const response = await client.get<unknown>(
      `/api/v1/pipeline/runs/${runId}/import-run/errors`,
      { params },
    );
    const result = parse(importErrorListSchema, response.data, 'Import errors');
    if (!result.ok) return result;
    return ok({ items: result.data.errors, total: result.data.total });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getImportRunRecords(
  client: HttpClient,
  runId: string,
  batch?: string,
): Promise<Result<{ items: ImportRecordDto[]; total: number }, AppError>> {
  try {
    const params: Record<string, string> = {};
    if (batch !== undefined) params.batch = batch;
    const response = await client.get<unknown>(
      `/api/v1/pipeline/runs/${runId}/import-run/records`,
      { params },
    );
    const result = parse(importRecordListSchema, response.data, 'Import records');
    if (!result.ok) return result;
    return ok({ items: result.data.records, total: result.data.total });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getImportRunConnectorRequests(
  client: HttpClient,
  runId: string,
  batch?: string,
): Promise<Result<{ items: ConnectorRequestDto[]; total: number }, AppError>> {
  try {
    const params: Record<string, string> = {};
    if (batch !== undefined) params.batch = batch;
    const response = await client.get<unknown>(
      `/api/v1/pipeline/runs/${runId}/import-run/connector-requests`,
      { params },
    );
    const result = parse(connectorRequestListSchema, response.data, 'Connector requests');
    if (!result.ok) return result;
    return ok({ items: result.data.requests, total: result.data.total });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
