import type { Session, User } from '@/features/auth/types/auth.types';
import type { AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { createUserId } from '@/shared/types/common.types';

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('@/features/auth/services/auth.service');
jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {},
  configureHttpClient: jest.fn(),
}));
jest.mock('@/shared/services/storage/storage.service', () => ({
  storageService: {},
}));

import { useAuthStore } from '@/features/auth/store/auth.store';
import * as authService from '@/features/auth/services/auth.service';

const mockLogin = authService.login as jest.MockedFunction<typeof authService.login>;
const mockLogout = authService.logout as jest.MockedFunction<typeof authService.logout>;
const mockRestoreSession = authService.restoreSession as jest.MockedFunction<
  typeof authService.restoreSession
>;
const mockPersistSession = authService.persistSession as jest.MockedFunction<
  typeof authService.persistSession
>;
const mockClearSession = authService.clearSession as jest.MockedFunction<
  typeof authService.clearSession
>;

// ─── Fixtures ──────────────────────────────────────────────────────────────

const mockUser: User = {
  userId: createUserId('user-1'),
  name: 'Test User',
  email: 'test@example.com',
};

const mockSession: Session = {
  token: 'test-token-123',
  user: mockUser,
};

const mockAppError: AppError = {
  code: 'AUTH_FAILED',
  message: 'Invalid credentials',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function resetStore(): void {
  useAuthStore.setState({
    user: null,
    token: null,
    isLoading: false,
    isRestoring: true,
    error: null,
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isRestoring).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('sets user and token on success, calls persistSession', async () => {
      mockLogin.mockResolvedValue(ok(mockSession));
      mockPersistSession.mockResolvedValue(ok(undefined));

      await useAuthStore.getState().login('user-1');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('test-token-123');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockPersistSession).toHaveBeenCalledTimes(1);
    });

    it('sets error on failure, does not set user or token', async () => {
      mockLogin.mockResolvedValue(err(mockAppError));

      await useAuthStore.getState().login('user-1');

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toEqual(mockAppError);
      expect(mockPersistSession).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears state, calls logout service and clearSession, sets isRestoring=false', async () => {
      mockLogin.mockResolvedValue(ok(mockSession));
      mockPersistSession.mockResolvedValue(ok(undefined));
      mockLogout.mockResolvedValue(ok(undefined));
      mockClearSession.mockResolvedValue(ok(undefined));

      await useAuthStore.getState().login('user-1');
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isRestoring).toBe(false);
      expect(state.error).toBeNull();
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockClearSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('restoreSession', () => {
    it('sets user and token when session is found, sets isRestoring=false', async () => {
      mockRestoreSession.mockResolvedValue(ok(mockSession));

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('test-token-123');
      expect(state.isRestoring).toBe(false);
    });

    it('sets isRestoring=false only when no session is found', async () => {
      mockRestoreSession.mockResolvedValue(ok(null));

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isRestoring).toBe(false);
    });
  });

  describe('clearError', () => {
    it('sets error to null', async () => {
      mockLogin.mockResolvedValue(err(mockAppError));
      await useAuthStore.getState().login('user-1');
      expect(useAuthStore.getState().error).toEqual(mockAppError);

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
