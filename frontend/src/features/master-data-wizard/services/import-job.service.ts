/* ============================================================================
   import-job.service.ts  ·  Test Import / Final Import job status
   ----------------------------------------------------------------------------
   THERE IS NO BACKEND ENDPOINT FOR THIS YET. docs/handover/README.md,
   "Scope" lists Validation/Test/Import (steps 6-8) as design-not-final or
   not-designed, and INTEGRATION.md's contract section only specifies the
   profile GET. Root CLAUDE.md: "do not invent a route."

   This function exists so hooks/useImportJob.ts has a stable seam: once a
   real endpoint is agreed, replace the body below with an HttpClient call
   the same way entity-pack.service.ts wraps its GET (zod-validated response,
   Result<T, AppError> out) — the hook does not need to change.
   ========================================================================= */

import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { err } from '@/shared/types/result.types';
import type { ImportJobEvent } from '../types/import-job.types';

export async function getImportJobStatus(
  _client: HttpClient,
  _orgProjectId: string,
  _entityId: string,
  _jobId: string,
): Promise<Result<ImportJobEvent, AppError>> {
  return err({
    code: 'NOT_IMPLEMENTED',
    message:
      'No backend endpoint exists yet for Test/Final import job status. ' +
      'Steps 7-8 are not final in the design handover (docs/handover/README.md, "Scope") — ' +
      'raise the endpoint question before wiring this up; do not invent a route.',
  });
}
