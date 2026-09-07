import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok, err } from '@/shared/types/result.types';
import type { Result, AppError } from '@/shared/types/result.types';
import type { PipelineRun } from '../../services/entity-pack.service';

const mockGetPipelineRun = jest.fn<Promise<Result<PipelineRun, AppError>>, [string]>();

jest.mock('../../services/entity-pack.service', () => ({
  getPipelineRun: (runId: string) => mockGetPipelineRun(runId),
}));

import { usePipelineRunPoller } from '../usePipelineRunPoller';

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makeRun(overrides: Partial<PipelineRun> = {}): PipelineRun {
  return {
    id: 'run-1',
    workstreamId: 'ws-1',
    scope: 'items',
    status: 'pending',
    sourceRowCount: null,
    fieldCount: null,
    fieldsProcessed: null,
    errorDetail: null,
    createdAt: '2026-01-01T00:00:00Z',
    completedAt: null,
    runSummary: null,
    ...overrides,
  };
}

describe('usePipelineRunPoller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call getPipelineRun and returns idle defaults when runId is null', async () => {
    const { result } = renderHook(() => usePipelineRunPoller(null), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual({ run: null, isPolling: false, error: null });
    expect(mockGetPipelineRun).not.toHaveBeenCalled();
  });

  it('fetches by runId and reports isPolling true while the run is pending', async () => {
    mockGetPipelineRun.mockResolvedValue(ok(makeRun({ status: 'pending' })));

    const { result } = renderHook(() => usePipelineRunPoller('run-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.run).not.toBeNull());

    expect(mockGetPipelineRun).toHaveBeenCalledWith('run-1');
    expect(result.current.run?.status).toBe('pending');
    expect(result.current.isPolling).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('reports isPolling true while the run is running', async () => {
    mockGetPipelineRun.mockResolvedValue(ok(makeRun({ status: 'running' })));

    const { result } = renderHook(() => usePipelineRunPoller('run-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.run).not.toBeNull());

    expect(result.current.isPolling).toBe(true);
  });

  it.each(['complete', 'error'] as const)('reports isPolling false once the run reaches the terminal status "%s"', async (status) => {
    mockGetPipelineRun.mockResolvedValue(ok(makeRun({ status })));

    const { result } = renderHook(() => usePipelineRunPoller('run-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.run).not.toBeNull());

    expect(result.current.run?.status).toBe(status);
    expect(result.current.isPolling).toBe(false);
  });

  it('surfaces the service error and keeps run null when the fetch fails', async () => {
    mockGetPipelineRun.mockResolvedValue(err({ code: 'pipeline_run_not_found', message: 'No such run' }));

    const { result } = renderHook(() => usePipelineRunPoller('missing-run'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.run).toBeNull();
    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toEqual({ code: 'pipeline_run_not_found', message: 'No such run' });
  });

  it('re-fetches on the polling interval while the run is still running, and stops once it completes', async () => {
    jest.useFakeTimers();
    try {
      mockGetPipelineRun.mockResolvedValueOnce(ok(makeRun({ status: 'running' })));

      const { result } = renderHook(() => usePipelineRunPoller('run-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.run?.status).toBe('running'));
      expect(result.current.isPolling).toBe(true);

      // Second poll resolves as complete — no further refetch should follow.
      mockGetPipelineRun.mockResolvedValueOnce(ok(makeRun({ status: 'complete' })));

      jest.advanceTimersByTime(3000);
      await waitFor(() => expect(result.current.run?.status).toBe('complete'));
      expect(mockGetPipelineRun).toHaveBeenCalledTimes(2);
      expect(result.current.isPolling).toBe(false);

      jest.advanceTimersByTime(10000);
      // Give any stray microtasks a chance to flush before asserting no extra call happened.
      await Promise.resolve();
      expect(mockGetPipelineRun).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
