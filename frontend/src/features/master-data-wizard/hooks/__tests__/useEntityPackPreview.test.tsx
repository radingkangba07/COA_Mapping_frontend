import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok, err } from '@/shared/types/result.types';
import type { Result, AppError } from '@/shared/types/result.types';
import type { EntityId, EntityPack } from '../../dp-kit/types/entity';

const mockGetEntityPack = jest.fn<Promise<Result<EntityPack, AppError>>, [EntityId]>();

jest.mock('../../services/entity-pack.service', () => ({
  getEntityPack: (entityId: EntityId) => mockGetEntityPack(entityId),
}));

import { useEntityPackPreview } from '../useEntityPackPreview';

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makePack(overrides: Partial<EntityPack> = {}): EntityPack {
  return {
    id: 'items',
    label: { singular: 'Item', plural: 'Items' },
    source: { object: 'Item master extract', rowCount: 100 },
    target: { record: 'product.template' },
    identity: { candidates: ['sku'] },
    fields: [],
    ...overrides,
  };
}

describe('useEntityPackPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts loading, then resolves with the pack on success', async () => {
    mockGetEntityPack.mockResolvedValue(ok(makePack()));

    const { result } = renderHook(() => useEntityPackPreview('items'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.pack).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetEntityPack).toHaveBeenCalledWith('items');
    expect(result.current.pack?.id).toBe('items');
    expect(result.current.error).toBeNull();
  });

  it('starts loading, then resolves with an error and a null pack on failure', async () => {
    mockGetEntityPack.mockResolvedValue(
      err({ code: 'entity_pack_not_found', message: 'No entity pack fixture exists yet for "vendors".' }),
    );

    const { result } = renderHook(() => useEntityPackPreview('vendors'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pack).toBeNull();
    expect(result.current.error?.code).toBe('entity_pack_not_found');
  });
});
