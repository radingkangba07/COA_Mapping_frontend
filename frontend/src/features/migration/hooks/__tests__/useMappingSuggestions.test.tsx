import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import type { SuggestionGroup } from '@/features/migration/types/suggestion.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockListMappingSuggestions = jest.fn<
  Promise<Result<SuggestionGroup[], AppError>>,
  [unknown, string, unknown?]
>();

jest.mock('@/features/migration/services/suggestions.service', () => ({
  listMappingSuggestions: (...args: [unknown, string, unknown?]) =>
    mockListMappingSuggestions(...args),
}));

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {},
}));

// ─── SUT ───────────────────────────────────────────────────────────────────

import {
  useMappingSuggestions,
  mappingSuggestionsQueryKey,
} from '../useMappingSuggestions';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeGroup(): SuggestionGroup {
  return {
    sourceType: 'Asset',
    targetType: 'Fixed Asset',
    confidence: 0.9,
    accounts: [],
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('mappingSuggestionsQueryKey', () => {
  it('includes projectId and all filter fields as stable values', () => {
    const key = mappingSuggestionsQueryKey('proj-1', {
      status: 'pending',
      sourceType: 'Asset',
      skip: 0,
      limit: 50,
    });
    expect(key).toEqual([
      'mapping-suggestions',
      'proj-1',
      { status: 'pending', sourceType: 'Asset', skip: 0, limit: 50 },
    ]);
  });

  it('defaults all filter fields to null when absent', () => {
    const key = mappingSuggestionsQueryKey('proj-1', {});
    expect(key).toEqual([
      'mapping-suggestions',
      'proj-1',
      { status: null, sourceType: null, skip: null, limit: null },
    ]);
  });
});

describe('useMappingSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListMappingSuggestions.mockResolvedValue(ok([makeGroup()]));
  });

  it('fires on mount and returns suggestions', async () => {
    const { result } = renderHook(() => useMappingSuggestions('proj-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListMappingSuggestions).toHaveBeenCalledTimes(1);
    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions[0]?.sourceType).toBe('Asset');
  });

  it('respects enabled: false and does not call the service', () => {
    renderHook(
      () => useMappingSuggestions('proj-1', { enabled: false }),
      { wrapper: createWrapper() },
    );
    expect(mockListMappingSuggestions).not.toHaveBeenCalled();
  });

  it('passes filter options through to the service', async () => {
    const { result } = renderHook(
      () =>
        useMappingSuggestions('proj-1', {
          status: 'pending',
          sourceType: 'Asset',
          skip: 10,
          limit: 25,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListMappingSuggestions).toHaveBeenCalledWith(
      {},
      'proj-1',
      { status: 'pending', sourceType: 'Asset', skip: 10, limit: 25 },
    );
  });

  it('does not fire when projectId is empty', () => {
    renderHook(() => useMappingSuggestions(''), { wrapper: createWrapper() });
    expect(mockListMappingSuggestions).not.toHaveBeenCalled();
  });

  it('exposes error when the service returns err', async () => {
    mockListMappingSuggestions.mockResolvedValue(
      err({ code: 'HTTP_500', message: 'Server down' }),
    );
    const { result } = renderHook(() => useMappingSuggestions('proj-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.code).toBe('HTTP_500');
  });
});
