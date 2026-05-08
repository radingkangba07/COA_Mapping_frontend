import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createOrgId } from '@/shared/types/common.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import type { Org } from '../../types/org.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

jest.mock('@/shared/services/http/http.client', () => ({
  toAppError: (e: unknown) =>
    e != null && typeof e === 'object' && 'code' in e
      ? e
      : { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' },
}));

const mockGetUserOrgs = jest.fn<Promise<Result<Org[], AppError>>, [unknown]>();

jest.mock('../../services/org.service', () => ({
  getUserOrgs: (...args: [unknown]) => mockGetUserOrgs(...args),
}));

let mockActiveOrgId: string | null = null;
const mockSetActiveOrg = jest.fn();

jest.mock('@/shared/store/app.store', () => {
  const useAppStore = (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ activeOrgId: mockActiveOrgId });
  useAppStore.getState = () => ({ setActiveOrg: mockSetActiveOrg });
  return { useAppStore };
});

jest.mock('@/shared/store/app.selectors', () => ({
  selectActiveOrgId: (s: Record<string, unknown>) => s.activeOrgId,
}));

// ─── Import (after mocks) ────────────────────────────────────────────────────

import { useOrgsViewModel } from '../useOrgsViewModel';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const EMPLOYER_ORG: Org = {
  id: createOrgId('org-employer'),
  name: 'Acme Corp',
  role: 'owner',
  orgType: 'employer',
  createdAt: '2026-01-01T00:00:00Z',
};

const CLIENT_ORG: Org = {
  id: createOrgId('org-client'),
  name: 'Retail Corp',
  role: 'client_admin',
  orgType: 'client',
  createdAt: '2026-02-01T00:00:00Z',
};

const CLIENT_ORG_2: Org = {
  id: createOrgId('org-client-2'),
  name: 'Finance Ltd',
  role: 'client_member',
  orgType: 'client',
  createdAt: '2026-03-01T00:00:00Z',
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

describe('useOrgsViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveOrgId = null;
  });

  it('returns isLoading=true initially then false after fetch', async () => {
    mockGetUserOrgs.mockResolvedValue(ok([EMPLOYER_ORG]));

    const { result } = renderHook(() => useOrgsViewModel(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('partitions orgs into employerOrgs and clientOrgs by orgType', async () => {
    mockGetUserOrgs.mockResolvedValue(ok([EMPLOYER_ORG, CLIENT_ORG, CLIENT_ORG_2]));

    const { result } = renderHook(() => useOrgsViewModel(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.orgs).toHaveLength(3);
    expect(result.current.employerOrgs).toHaveLength(1);
    expect(result.current.employerOrgs[0]?.name).toBe('Acme Corp');
    expect(result.current.clientOrgs).toHaveLength(2);
    expect(result.current.clientOrgs[0]?.name).toBe('Retail Corp');
    expect(result.current.clientOrgs[1]?.name).toBe('Finance Ltd');
  });

  it('returns empty employer and client arrays when no orgs', async () => {
    mockGetUserOrgs.mockResolvedValue(ok([]));

    const { result } = renderHook(() => useOrgsViewModel(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.employerOrgs).toEqual([]);
    expect(result.current.clientOrgs).toEqual([]);
  });

  it('derives activeOrg from activeOrgId', async () => {
    mockActiveOrgId = 'org-employer';
    mockGetUserOrgs.mockResolvedValue(ok([EMPLOYER_ORG, CLIENT_ORG]));

    const { result } = renderHook(() => useOrgsViewModel(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeOrg?.name).toBe('Acme Corp');
    expect(result.current.activeOrgId).toBe('org-employer');
  });

  it('returns activeOrgType as employer when active org is an employer org', async () => {
    mockActiveOrgId = 'org-employer';
    mockGetUserOrgs.mockResolvedValue(ok([EMPLOYER_ORG, CLIENT_ORG]));

    const { result } = renderHook(() => useOrgsViewModel(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeOrgType).toBe('employer');
  });

  it('returns activeOrgType as client when active org is a client org', async () => {
    mockActiveOrgId = 'org-client';
    mockGetUserOrgs.mockResolvedValue(ok([EMPLOYER_ORG, CLIENT_ORG]));

    const { result } = renderHook(() => useOrgsViewModel(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeOrgType).toBe('client');
  });

  it('returns activeOrgType as null when no org is active', async () => {
    mockActiveOrgId = null;
    mockGetUserOrgs.mockResolvedValue(ok([EMPLOYER_ORG]));

    const { result } = renderHook(() => useOrgsViewModel(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeOrgType).toBeNull();
  });

  it('exposes error when fetch fails', async () => {
    mockGetUserOrgs.mockResolvedValue(err({ code: 'HTTP_500', message: 'Server error' }));

    const { result } = renderHook(() => useOrgsViewModel(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).not.toBeNull();
    expect(result.current.orgs).toEqual([]);
  });

  it('exposes a refetch function', () => {
    mockGetUserOrgs.mockResolvedValue(ok([]));

    const { result } = renderHook(() => useOrgsViewModel(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
