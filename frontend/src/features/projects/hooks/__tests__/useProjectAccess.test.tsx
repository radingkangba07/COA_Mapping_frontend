import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createProjectId, createUserId } from '@/shared/types/common.types';
import type { UserId } from '@/shared/types/common.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import type { AccessResponse } from '../../types/project-access.types';

// ─── Constants ──────────────────────────────────────────────────────────────

const PROJECT_ID = createProjectId('proj-1');
const CURRENT_USER_ID = createUserId('current-user');
const OTHER_USER_ID = createUserId('other-user');

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {},
}));

jest.mock('@/shared/services/http/http.client', () => ({
  toAppError: (e: unknown) =>
    e != null && typeof e === 'object' && 'code' in e
      ? e
      : { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' },
}));

const mockGetProjectMembers = jest.fn<
  Promise<Result<AccessResponse[], AppError>>,
  [unknown, unknown]
>();
const mockGrantProjectAccess = jest.fn<
  Promise<Result<AccessResponse, AppError>>,
  [unknown, unknown, unknown]
>();

jest.mock('../../services/project-access.service', () => ({
  getProjectMembers: (...args: [unknown, unknown]) => mockGetProjectMembers(...args),
  grantProjectAccess: (...args: [unknown, unknown, unknown]) =>
    mockGrantProjectAccess(...args),
}));

let mockUserId: UserId | null = CURRENT_USER_ID;

jest.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: mockUserId ? { userId: mockUserId } : null }),
}));

// ─── Import (after mocks) ──────────────────────────────────────────────────

import { useProjectAccess } from '../useProjectAccess';

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

function makeMember(
  userId: UserId,
  permission: 'viewer' | 'editor' | 'approver' | 'admin',
): AccessResponse {
  return {
    userId,
    name: `User ${userId}`,
    email: `${userId}@test.com`,
    permission,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useProjectAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = CURRENT_USER_ID;
    mockGetProjectMembers.mockResolvedValue(ok([]));
  });

  describe('canManage derives correctly for each permission tier', () => {
    it.each([
      ['viewer', false],
      ['editor', false],
      ['approver', true],
      ['admin', true],
    ] as const)('is %s when current user is %s', async (permission, expected) => {
      mockGetProjectMembers.mockResolvedValue(
        ok([makeMember(CURRENT_USER_ID, permission)]),
      );
      const { result } = renderHook(() => useProjectAccess(PROJECT_ID), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.canManage).toBe(expected);
    });

    it('is false when current user is not in members list', async () => {
      mockGetProjectMembers.mockResolvedValue(
        ok([makeMember(OTHER_USER_ID, 'admin')]),
      );
      const { result } = renderHook(() => useProjectAccess(PROJECT_ID), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.canManage).toBe(false);
    });
  });

  describe('grant mutation', () => {
    const grantPayload = { userId: OTHER_USER_ID, permission: 'editor' as const };

    it('invalidates the cache on success', async () => {
      mockGetProjectMembers.mockResolvedValue(ok([makeMember(CURRENT_USER_ID, 'admin')]));
      mockGrantProjectAccess.mockResolvedValue(ok(makeMember(OTHER_USER_ID, 'editor')));

      const { result } = renderHook(() => useProjectAccess(PROJECT_ID), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const callCountBefore = mockGetProjectMembers.mock.calls.length;
      await act(async () => { result.current.grant(grantPayload); });

      await waitFor(() => expect(mockShowSuccess).toHaveBeenCalledWith('User added to project'));
      await waitFor(() => {
        expect(mockGetProjectMembers.mock.calls.length).toBeGreaterThan(callCountBefore);
      });
    });

    it('toasts correct message for CONFLICT error', async () => {
      mockGrantProjectAccess.mockResolvedValue(err({ code: 'CONFLICT', message: 'Already exists' }));

      const { result } = renderHook(() => useProjectAccess(PROJECT_ID), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { result.current.grant(grantPayload); });

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('User already has access to this project');
      });
    });

    it('toasts correct message for FORBIDDEN error', async () => {
      mockGrantProjectAccess.mockResolvedValue(err({ code: 'FORBIDDEN', message: 'Not allowed' }));

      const { result } = renderHook(() => useProjectAccess(PROJECT_ID), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { result.current.grant(grantPayload); });

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('You do not have permission to manage members');
      });
    });

    it('toasts generic message for other errors', async () => {
      mockGrantProjectAccess.mockResolvedValue(err({ code: 'SERVER_ERROR', message: 'Something broke' }));

      const { result } = renderHook(() => useProjectAccess(PROJECT_ID), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { result.current.grant(grantPayload); });

      await waitFor(() => expect(mockShowError).toHaveBeenCalledWith('Something broke'));
    });
  });

  it('exposes members and currentUserId from query and auth store', async () => {
    const members = [makeMember(CURRENT_USER_ID, 'admin'), makeMember(OTHER_USER_ID, 'viewer')];
    mockGetProjectMembers.mockResolvedValue(ok(members));

    const { result } = renderHook(() => useProjectAccess(PROJECT_ID), {
      wrapper: createWrapper(),
    });

    expect(result.current.currentUserId).toBe(CURRENT_USER_ID);
    await waitFor(() => expect(result.current.members).toHaveLength(2));
    expect(result.current.members[0]?.userId).toBe(CURRENT_USER_ID);
    expect(result.current.members[1]?.userId).toBe(OTHER_USER_ID);
  });
});
