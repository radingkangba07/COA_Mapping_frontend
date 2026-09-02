/* ============================================================================
   import-job.types.ts  ·  Test Import (step 7) / Final Import (step 8) job
   ----------------------------------------------------------------------------
   Not part of the dp-kit contract — docs/handover/README.md, "Scope" lists
   steps 6-8 as design-not-final / not-designed, and there is no agreed
   backend endpoint for either job (see services/import-job.service.ts). This
   is this app's own placeholder shape, kept minimal so it can be replaced
   without a hook/component rewrite once the real contract lands.
   ========================================================================= */

export type ImportJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface ImportJobEvent {
  jobId: string;
  status: ImportJobStatus;
  processedCount?: number;
  totalCount?: number;
  message?: string;
}
