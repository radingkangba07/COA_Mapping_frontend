/* ============================================================================
   upload.types.ts  ·  Result of POST /api/v1/storage/upload
   ----------------------------------------------------------------------------
   The subset of the backend's FileResponse model this feature reads. See
   services/entity-pack.service.ts's uploadSourceFile for the full backend contract.
   ========================================================================= */

export interface UploadResult {
  readonly fileId: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly status: string;
  readonly rowCount: number;
  readonly storagePath: string;
  readonly createdAt: string;
}
