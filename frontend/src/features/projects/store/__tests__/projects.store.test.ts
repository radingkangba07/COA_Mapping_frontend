import { useProjectsStore } from '@/features/projects/store/projects.store';
import { createProjectId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const mockProjectId = createProjectId('proj-001');
const mockProjectId2 = createProjectId('proj-002');

const mockError: AppError = {
  code: 'NOT_FOUND',
  message: 'Project not found',
};

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useProjectsStore', () => {
  beforeEach(() => {
    useProjectsStore.getState().reset();
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useProjectsStore.getState();

      expect(state.selectedProject).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setSelectedProject', () => {
    it('sets the selected project', () => {
      useProjectsStore.getState().setSelectedProject(mockProjectId);

      expect(useProjectsStore.getState().selectedProject).toBe(mockProjectId);
    });

    it('can change to a different project', () => {
      useProjectsStore.getState().setSelectedProject(mockProjectId);
      useProjectsStore.getState().setSelectedProject(mockProjectId2);

      expect(useProjectsStore.getState().selectedProject).toBe(mockProjectId2);
    });

    it('clears selected project when null is passed', () => {
      useProjectsStore.getState().setSelectedProject(mockProjectId);
      useProjectsStore.getState().setSelectedProject(null);

      expect(useProjectsStore.getState().selectedProject).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('sets loading to true', () => {
      useProjectsStore.getState().setLoading(true);

      expect(useProjectsStore.getState().isLoading).toBe(true);
    });

    it('sets loading back to false', () => {
      useProjectsStore.getState().setLoading(true);
      useProjectsStore.getState().setLoading(false);

      expect(useProjectsStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets the error object', () => {
      useProjectsStore.getState().setError(mockError);

      expect(useProjectsStore.getState().error).toEqual(mockError);
    });
  });

  describe('clearError', () => {
    it('clears error to null', () => {
      useProjectsStore.getState().setError(mockError);
      useProjectsStore.getState().clearError();

      expect(useProjectsStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('returns to initial state', () => {
      useProjectsStore.getState().setSelectedProject(mockProjectId);
      useProjectsStore.getState().setLoading(true);
      useProjectsStore.getState().setError(mockError);

      useProjectsStore.getState().reset();

      const state = useProjectsStore.getState();
      expect(state.selectedProject).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
