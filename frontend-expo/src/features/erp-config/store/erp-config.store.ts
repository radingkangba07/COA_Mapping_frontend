import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AppError } from '@/shared/types/result.types';
import type { ERPSystem, ERPConfigState, ERPConfigStore } from '../types/erp-config.types';

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: ERPConfigState = {
  erpSystems: [],
  selectedERP: null,
  isLoading: false,
  error: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useERPConfigStore = create<ERPConfigStore>()(
  immer((set) => ({
    ...initialState,

    setERPSystems: (systems: ERPSystem[]): void => {
      set((state) => {
        state.erpSystems = systems as typeof state.erpSystems;
      });
    },

    setSelectedERP: (erp: ERPSystem | null): void => {
      set((state) => {
        state.selectedERP = erp as typeof state.selectedERP;
      });
    },

    setLoading: (isLoading: boolean): void => {
      set((state) => {
        state.isLoading = isLoading;
      });
    },

    setError: (error: AppError): void => {
      set((state) => {
        state.error = error;
      });
    },

    clearError: (): void => {
      set((state) => {
        state.error = null;
      });
    },

    reset: (): void => {
      set(() => ({ ...initialState }));
    },
  })),
);
