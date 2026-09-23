import { renderHook, act, waitFor } from '@testing-library/react-native';
import { ok, err } from '@/shared/types/result.types';
import { useWizardStore } from '../../store/wizard.store';

const mockBookmarkMapping = jest.fn();
const mockUnbookmarkMapping = jest.fn();
jest.mock('../../services/mapping.service', () => ({
  bookmarkMapping: (...args: unknown[]) => mockBookmarkMapping(...args),
  unbookmarkMapping: (...args: unknown[]) => mockUnbookmarkMapping(...args),
}));

const mockShowError = jest.fn();
jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: jest.fn(), showWarning: jest.fn() }),
}));

import { useBookmarks } from '../useBookmarks';

describe('useBookmarks', () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    mockBookmarkMapping.mockReset();
    mockUnbookmarkMapping.mockReset();
    mockShowError.mockReset();
  });

  it('seeds from bookmarkedIds (the real GET response is_bookmarked)', () => {
    const { result } = renderHook(() => useBookmarks('items', new Set(['f1'])));

    expect(result.current.isBookmarked('f1')).toBe(true);
    expect(result.current.isBookmarked('f2')).toBe(false);
  });

  it('with no pipeline run yet, toggling only flips local state — no request attempted', () => {
    const { result } = renderHook(() => useBookmarks('items', new Set()));

    act(() => {
      result.current.toggleBookmark('f1');
    });

    expect(result.current.isBookmarked('f1')).toBe(true);
    expect(mockBookmarkMapping).not.toHaveBeenCalled();

    act(() => {
      result.current.toggleBookmark('f1');
    });
    expect(result.current.isBookmarked('f1')).toBe(false);
  });

  it('toggles a row on, then off again, independently of other rows', () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockBookmarkMapping.mockResolvedValue(ok(undefined));
    mockUnbookmarkMapping.mockResolvedValue(ok(undefined));
    const { result } = renderHook(() => useBookmarks('items', new Set()));

    act(() => {
      result.current.toggleBookmark('f1');
    });
    expect(result.current.isBookmarked('f1')).toBe(true);
    expect(result.current.isBookmarked('f2')).toBe(false);

    act(() => {
      result.current.toggleBookmark('f1');
    });
    expect(result.current.isBookmarked('f1')).toBe(false);
  });

  it('tracks multiple bookmarked rows at once', () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockBookmarkMapping.mockResolvedValue(ok(undefined));
    const { result } = renderHook(() => useBookmarks('items', new Set()));

    act(() => {
      result.current.toggleBookmark('f1');
      result.current.toggleBookmark('f3');
    });

    expect(result.current.isBookmarked('f1')).toBe(true);
    expect(result.current.isBookmarked('f3')).toBe(true);
    expect(result.current.isBookmarked('f2')).toBe(false);
  });

  it('with a pipeline run, toggling on calls the real POST bookmark endpoint', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockBookmarkMapping.mockResolvedValue(ok(undefined));
    const { result } = renderHook(() => useBookmarks('items', new Set()));

    act(() => {
      result.current.toggleBookmark('f1');
    });

    await waitFor(() => {
      expect(mockBookmarkMapping).toHaveBeenCalledWith(expect.anything(), 'run-1', 'f1');
    });
  });

  it('with a pipeline run, toggling an already-bookmarked row off calls the real DELETE bookmark endpoint', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockUnbookmarkMapping.mockResolvedValue(ok(undefined));
    const { result } = renderHook(() => useBookmarks('items', new Set(['f1'])));

    act(() => {
      result.current.toggleBookmark('f1');
    });

    await waitFor(() => {
      expect(mockUnbookmarkMapping).toHaveBeenCalledWith(expect.anything(), 'run-1', 'f1');
    });
  });

  it('rolls back the optimistic toggle and shows a toast when the request fails', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockBookmarkMapping.mockResolvedValue(err({ code: 'HTTP_500', message: 'Server error' }));
    const { result } = renderHook(() => useBookmarks('items', new Set()));

    act(() => {
      result.current.toggleBookmark('f1');
    });

    // Optimistic write happened immediately.
    expect(result.current.isBookmarked('f1')).toBe(true);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
    expect(result.current.isBookmarked('f1')).toBe(false);
  });
});
