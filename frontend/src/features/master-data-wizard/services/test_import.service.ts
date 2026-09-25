/* ============================================================================
   test_import.service.ts  ·  Test Import (step 7) — trigger + poll a dry-run
   ----------------------------------------------------------------------------
   POST /api/v1/pipeline/runs/{run_id}/test kicks off a validation-only pass
   over the mapped source rows; GET .../test reads the latest result. Both are
   the same contract shape (TestRunDto); the POST returns it in its initial
   `pending` state, the GET returns it at whatever state polling catches it in.
   One service function per endpoint (no barrel), Result<T, AppError> like the
   rest of this feature's services (see mapping.service.ts).
   ========================================================================= */

import { isAxiosError } from 'axios';
import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';

const sampleFailureSchema = z.object({
  row_index: z.number(),
  field: z.string(),
  value: z.unknown(),
  reason: z.string(),
});

const testRunSchema = z.object({
  id: z.string(),
  run_id: z.string(),
  status: z.enum(['pending', 'running', 'complete', 'failed']),
  rows_attempted: z.number().nullable().default(null),
  rows_passed: z.number().nullable().default(null),
  rows_failed: z.number().nullable().default(null),
  failure_summary: z.record(z.string(), z.record(z.string(), z.number())).nullable().default(null),
  sample_failures: z.array(sampleFailureSchema).nullable().default(null),
  error_detail: z.string().nullable().default(null),
  created_at: z.string(),
  started_at: z.string().nullable().default(null),
  completed_at: z.string().nullable().default(null),
});

export type TestRunStatus = z.infer<typeof testRunSchema>['status'];
export type SampleFailure = z.infer<typeof sampleFailureSchema>;
export type TestRunDto = z.infer<typeof testRunSchema>;

function parseTestRun(data: unknown): Result<TestRunDto, AppError> {
  const parsed = testRunSchema.safeParse(data);
  if (!parsed.success) {
    return err({
      code: 'INVALID_RESPONSE',
      message: 'Test run response failed validation',
      details: { issues: parsed.error.issues },
    });
  }
  return ok(parsed.data);
}

export async function triggerTestImport(client: HttpClient, runId: string): Promise<Result<TestRunDto, AppError>> {
  try {
    const response = await client.post<unknown>(`/api/v1/pipeline/runs/${runId}/test`, {});
    return parseTestRun(response.data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

// Returns ok(null) when no test run exists yet (HTTP 404) — callers treat null
// as "idle" rather than an error, which is the correct first-visit state.
export async function getTestRun(client: HttpClient, runId: string): Promise<Result<TestRunDto | null, AppError>> {
  try {
    const response = await client.get<unknown>(`/api/v1/pipeline/runs/${runId}/test`);
    return parseTestRun(response.data);
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return ok(null);
    }
    return err(toAppError(error));
  }
}
