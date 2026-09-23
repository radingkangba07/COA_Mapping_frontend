import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok } from '@/shared/types/result.types';
import { useWizardStore } from '../../store/wizard.store';
import type { EntityMapping } from '../../dp-kit/types/entity';

const mockGetColumnMappings = jest.fn();
jest.mock('../../services/mapping.service', () => ({
  getColumnMappings: (...args: unknown[]) => mockGetColumnMappings(...args),
}));

import { useMappingData } from '../useMappingData';

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const EMPTY_MAPPING: EntityMapping = { targetFields: [], proposals: [], missingTargets: [] };
const POPULATED_MAPPING: EntityMapping = {
  targetFields: [{ id: 'name', label: 'Name' }],
  proposals: [{ id: 'f1', name: 'Item Name', targetId: 'name', status: 'Suggested' }],
  missingTargets: [],
};

const EMPTY_IDS: ReadonlySet<string> = new Set();

describe('useMappingData', () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    mockGetColumnMappings.mockReset();
  });

  it('exposes bookmarkedIds from the response, defaulting to empty until data loads', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockGetColumnMappings.mockResolvedValue(ok({ mapping: POPULATED_MAPPING, bookmarkedIds: new Set(['f1']) }));

    const { result } = renderHook(() => useMappingData('items'), { wrapper: createWrapper() });

    expect(result.current.bookmarkedIds).toEqual(EMPTY_IDS);
    await waitFor(() => expect(result.current.bookmarkedIds).toEqual(new Set(['f1'])));
  });

  it('polls again after an empty result, and stops once a non-empty result arrives', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockGetColumnMappings
      .mockResolvedValueOnce(ok({ mapping: EMPTY_MAPPING, bookmarkedIds: EMPTY_IDS }))
      .mockResolvedValueOnce(ok({ mapping: POPULATED_MAPPING, bookmarkedIds: EMPTY_IDS }));

    const { result } = renderHook(() => useMappingData('items'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.pack).not.toBeNull());
    expect(result.current.pack?.mapping.proposals).toEqual([]);

    await waitFor(() => expect(result.current.pack?.mapping.proposals).toHaveLength(1), { timeout: 5000 });
    expect(mockGetColumnMappings).toHaveBeenCalledTimes(2);

    // A third poll never fires — the hook stopped once the result was non-empty.
    await new Promise((resolve) => setTimeout(resolve, 2500));
    expect(mockGetColumnMappings).toHaveBeenCalledTimes(2);
  }, 10000);

  it('does not poll at all when the first result already has data', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockGetColumnMappings.mockResolvedValue(ok({ mapping: POPULATED_MAPPING, bookmarkedIds: EMPTY_IDS }));

    const { result } = renderHook(() => useMappingData('items'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.pack?.mapping.proposals).toHaveLength(1));

    await new Promise((resolve) => setTimeout(resolve, 2500));
    expect(mockGetColumnMappings).toHaveBeenCalledTimes(1);
  }, 10000);
});
