import type { ExportStore } from './export.store';
import type { ExportFormat } from '@/features/export/types/export.types';
import type { AppError } from '@/shared/types/result.types';

export const selectIsExporting = (state: ExportStore): boolean =>
  state.isExporting;

export const selectExportFormat = (state: ExportStore): ExportFormat =>
  state.exportFormat;

export const selectExportError = (state: ExportStore): AppError | null =>
  state.error;
