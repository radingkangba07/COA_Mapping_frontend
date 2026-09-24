import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWizardStore } from '../../store/wizard.store';

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

function importRunResponse(overrides: Record<string, unknown>): { data: Record<string, unknown> } {
  return {
    data: {
      id: 'ir-1',
      run_id: 'run-1',
      status: 'pending',
      run_code: 'run_ti_0001',
      batch_size: 20,
      req_per_sec: 4,
      rows_attempted: null,
      rows_imported: null,
      rows_failed: null,
      rows_skipped: null,
      rows_reconciled: null,
      duration_ms: null,
      error_detail: null,
      started_at: null,
      completed_at: null,
      created_at: '2026-09-23T10:00:00Z',
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

  it('returns a null importRun and does not load when there is no run id in the store', () => {
    const { result } = renderHook(() => useTestImport('items' as EntityId), { wrapper: createWrapper() });

    expect(result.current.importRun).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('polls until it reaches a terminal complete status', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockGet
      .mockResolvedValueOnce(importRunResponse({ status: 'running' }))
      .mockResolvedValue(
        importRunResponse({ status: 'complete', rows_attempted: 10, rows_imported: 8, rows_failed: 2 }),
      );

    const { result } = renderHook(() => useTestImport('items' as EntityId), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.importRun?.status).toBe('running'));
    await waitFor(() => expect(result.current.importRun?.status).toBe('complete'), { timeout: 5000 });
    expect(result.current.importRun?.rows_failed).toBe(2);
  }, 10000);

  it('sets importRun after triggerRun POSTs a new run', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockGet.mockRejectedValue(new Error('no run yet'));
    mockPost.mockResolvedValue(importRunResponse({ status: 'pending' }));

    const { result } = renderHook(() => useTestImport('items' as EntityId), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.triggerRun(); });

    await waitFor(() => expect(result.current.isTriggering).toBe(false));
    await waitFor(() => expect(result.current.importRun?.status).toBe('pending'));
    expect(mockPost).toHaveBeenCalledWith('/api/v1/pipeline/runs/run-1/import-run', {});
  }, 10000);

  it('stops polling once the run has failed', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockGet.mockResolvedValue(importRunResponse({ status: 'failed', error_detail: 'worker crashed' }));

    const { result } = renderHook(() => useTestImport('items' as EntityId), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.importRun?.status).toBe('failed'));
    await new Promise((resolve) => setTimeout(resolve, 2500));
    // Only the import-run endpoint itself is polled — sub-resource GETs fire once
    // when the run becomes terminal but the import-run poll must not repeat.
    const importRunPolls = (mockGet.mock.calls as [string][]).filter(
      ([url]) => !url.includes('/batches') && !url.includes('/errors') && !url.includes('/records') && !url.includes('/connector-requests'),
    );
    expect(importRunPolls).toHaveLength(1);
    expect(result.current.importRun?.error_detail).toBe('worker crashed');
  }, 10000);

  it('exposes setSelectedBatch and defaults selectedBatch to null', () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockGet.mockResolvedValue(importRunResponse({ status: 'pending' }));

    const { result } = renderHook(() => useTestImport('items' as EntityId), { wrapper: createWrapper() });

    expect(result.current.selectedBatch).toBeNull();

    act(() => { result.current.setSelectedBatch('batch_01'); });

    expect(result.current.selectedBatch).toBe('batch_01');
  });
});
