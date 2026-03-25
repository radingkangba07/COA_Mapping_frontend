import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ExportFormat } from '@/features/export/types/export.types';
import type { AppError } from '@/shared/types/result.types';

// ─── State ──────────────────────────────────────────────────────────────────

interface ExportState {
  isExporting: boolean;
  exportFormat: ExportFormat;
  error: AppError | null;
}

// ─── Actions ────────────────────────────────────────────────────────────────

interface ExportActions {
  setExporting: (exporting: boolean) => void;
  setFormat: (format: ExportFormat) => void;
  setError: (error: AppError | null) => void;
  reset: () => void;
}

export type ExportStore = ExportState & ExportActions;

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: ExportState = {
  isExporting: false,
  exportFormat: 'excel',
  error: null,
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useExportStore = create<ExportStore>()(
  immer((set) => ({
    ...initialState,

    setExporting: (exporting: boolean): void => {
      set((state) => {
        state.isExporting = exporting;
      });
    },

    setFormat: (format: ExportFormat): void => {
      set((state) => {
        state.exportFormat = format;
      });
    },

    setError: (error: AppError | null): void => {
      set((state) => {
        state.error = error;
      });
    },

    reset: (): void => {
      set(() => ({ ...initialState }));
    },
  })),
);
