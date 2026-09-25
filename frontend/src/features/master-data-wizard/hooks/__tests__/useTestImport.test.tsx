import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWizardStore } from '../../store/wizard.store';

// The service calls httpClient.get / httpClient.post (an axios instance); mock
// that layer so the whole real hook -> service -> parse path runs, and assert
// on the polling/mutation behaviour built on top of it.
const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { useTestImport } from '../useTestImport';
import type { EntityId } from '../../dp-kit/types/entity';

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/** Build a complete TestRunDto response wrapped as an axios `{ data }` result. */
function testRunResponse(overrides: Record<string, unknown>): { data: Record<string, unknown> } {
  return {
    data: {
      id: 'test-run-1',
      run_id: 'run-1',
      status: 'pending',
      rows_attempted: null,
      rows_passed: null,
      rows_failed: null,
      failure_summary: null,
      sample_failures: null,
      error_detail: null,
      created_at: '2026-09-23T10:00:00Z',
      started_at: null,
      completed_at: null,
      ...overrides,
    },
  };
}

describe('useTestImport', () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('returns a null testRun and does not load when there is no run id in the store', () => {
    const { result } = renderHook(() => useTestImport('items' as EntityId), { wrapper: createWrapper() });

    expect(result.current.testRun).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('polls until it reaches a terminal complete status', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockGet
      .mockResolvedValueOnce(testRunResponse({ status: 'running' }))
      .mockResolvedValueOnce(
        testRunResponse({ status: 'complete', rows_attempted: 10, rows_passed: 8, rows_failed: 2 }),
      );

    const { result } = renderHook(() => useTestImport('items' as EntityId), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.testRun?.status).toBe('running'));
    await waitFor(() => expect(result.current.testRun?.status).toBe('complete'), { timeout: 5000 });
    expect(result.current.testRun?.rows_failed).toBe(2);
  }, 10000);

  it('sets testRun after triggerRun POSTs a new dry run', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    // Query fetch fails so only the mutation result populates testRun.
    mockGet.mockRejectedValue(new Error('no test run yet'));
    mockPost.mockResolvedValue(testRunResponse({ status: 'pending' }));

    const { result } = renderHook(() => useTestImport('items' as EntityId), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.triggerRun();
    });

    await waitFor(() => expect(result.current.isTriggering).toBe(false));
    await waitFor(() => expect(result.current.testRun?.status).toBe('pending'));
    expect(mockPost).toHaveBeenCalledWith('/api/v1/pipeline/runs/run-1/test', {});
  }, 10000);

  it('stops polling once the run has failed', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockGet.mockResolvedValue(testRunResponse({ status: 'failed', error_detail: 'boom' }));

    const { result } = renderHook(() => useTestImport('items' as EntityId), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.testRun?.status).toBe('failed'));

    // refetchInterval returns false for terminal states, so no further GETs fire.
    await new Promise((resolve) => setTimeout(resolve, 2500));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(result.current.testRun?.error_detail).toBe('boom');
  }, 10000);
});
