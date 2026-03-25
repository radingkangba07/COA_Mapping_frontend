import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ProjectId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';
import type { ProjectsState, ProjectsStore } from '../types/projects.types';

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: ProjectsState = {
  selectedProject: null,
  isLoading: false,
  error: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProjectsStore = create<ProjectsStore>()(
  immer((set) => ({
    ...initialState,

    setSelectedProject: (projectId: ProjectId | null): void => {
      set((state) => {
        state.selectedProject = projectId;
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
