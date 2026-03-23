import type { ProjectsStore } from '../types/projects.types';
import type { ProjectId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';

export const selectSelectedProject = (state: ProjectsStore): ProjectId | null =>
  state.selectedProject;

export const selectProjectsLoading = (state: ProjectsStore): boolean =>
  state.isLoading;

export const selectProjectsError = (state: ProjectsStore): AppError | null =>
  state.error;
