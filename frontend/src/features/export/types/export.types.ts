// ─── Value Objects ──────────────────────────────────────────────────────────

export type ExportFormat = 'excel' | 'csv';

// ─── Domain Entities ────────────────────────────────────────────────────────

export interface MappingExportItem {
  readonly source_field: string;
  readonly target_field: string;
  readonly source_type: string;
  readonly target_type: string;
  readonly confidence: number;
  readonly method: string;
}

export interface ExportJob {
  readonly id: string;
  readonly projectId: string;
  readonly format: ExportFormat;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly progress: number;
  readonly message: string | null;
}

export interface ExportResult {
  readonly blob: Blob;
  readonly filename: string;
  readonly format: ExportFormat;
}
