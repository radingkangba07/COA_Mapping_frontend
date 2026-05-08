import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createOrgId } from '@/shared/types/common.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import type { ClientOrg } from '../../types/org.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {},
}));

jest.mock('@/shared/services/http/http.client', () => ({
  toAppError: (e: unknown) =>
    e != null && typeof e === 'object' && 'code' in e
      ? e
      : { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' },
}));

const mockGetClientOrgs = jest.fn<
  Promise<Result<ClientOrg[], AppError>>,
  [unknown, unknown]
>();

jest.mock('../../services/org.service', () => ({
  getClientOrgs: (...args: [unknown, unknown]) => mockGetClientOrgs(...args),
}));

// ─── Import (after mocks) ────────────────────────────────────────────────────

import { useClientOrgs } from '../useClientOrgs';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const PARENT_ORG_ID = createOrgId('employer-001');

const MOCK_CLIENT_ORG: ClientOrg = {
  id: createOrgId('client-001'),
  name: 'Retail Corp',
  slug: 'retail-corp',
  description: 'A retail client',
  orgType: 'client',
  parentOrgId: PARENT_ORG_ID,
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-02T11:00:00Z',
};

const MOCK_CLIENT_ORG_2: ClientOrg = {
  id: createOrgId('client-002'),
  name: 'Finance Ltd',
  slug: 'finance-ltd',
  description: null,
  orgType: 'client',
  parentOrgId: PARENT_ORG_ID,
  createdAt: '2026-04-01T08:00:00Z',
  updatedAt: '2026-04-01T08:00:00Z',
};

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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useClientOrgs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array and isLoading=false when parentOrgId is null', () => {
    const { result } = renderHook(() => useClientOrgs(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.clientOrgs).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetClientOrgs).not.toHaveBeenCalled();
  });

  it('fetches client orgs when parentOrgId is provided', async () => {
    mockGetClientOrgs.mockResolvedValue(ok([MOCK_CLIENT_ORG, MOCK_CLIENT_ORG_2]));

    const { result } = renderHook(() => useClientOrgs(PARENT_ORG_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetClientOrgs).toHaveBeenCalledTimes(1);
    expect(result.current.clientOrgs).toHaveLength(2);
    expect(result.current.clientOrgs[0]?.name).toBe('Retail Corp');
    expect(result.current.clientOrgs[1]?.name).toBe('Finance Ltd');
    expect(result.current.error).toBeNull();
  });

  it('returns empty array when no clients exist', async () => {
    mockGetClientOrgs.mockResolvedValue(ok([]));

    const { result } = renderHook(() => useClientOrgs(PARENT_ORG_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.clientOrgs).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('exposes error when fetch fails', async () => {
    const appError: AppError = { code: 'HTTP_500', message: 'Server error' };
    mockGetClientOrgs.mockResolvedValue(err(appError));

    const { result } = renderHook(() => useClientOrgs(PARENT_ORG_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.clientOrgs).toEqual([]);
    expect(result.current.error).not.toBeNull();
  });

  it('uses cache key scoped to parentOrgId', async () => {
    const parentA = createOrgId('employer-A');
    const parentB = createOrgId('employer-B');

    mockGetClientOrgs.mockResolvedValue(ok([MOCK_CLIENT_ORG]));

    const { result: resultA } = renderHook(() => useClientOrgs(parentA), {
      wrapper: createWrapper(),
    });
    const { result: resultB } = renderHook(() => useClientOrgs(parentB), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(resultA.current.isLoading).toBe(false));
    await waitFor(() => expect(resultB.current.isLoading).toBe(false));

    expect(mockGetClientOrgs).toHaveBeenCalledWith(expect.anything(), parentA);
    expect(mockGetClientOrgs).toHaveBeenCalledWith(expect.anything(), parentB);
  });

  it('exposes a refetch function', () => {
    mockGetClientOrgs.mockResolvedValue(ok([]));

    const { result } = renderHook(() => useClientOrgs(PARENT_ORG_ID), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
