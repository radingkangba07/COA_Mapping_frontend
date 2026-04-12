import type { User, TokenPair } from '@/features/auth/types/auth.types';
import type { AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { createUserId, createOrgId } from '@/shared/types/common.types';

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('@/features/auth/services/auth.service');
jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {},
  configureHttpClient: jest.fn(),
}));
jest.mock('@/shared/services/storage/storage.service', () => ({
  storageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
}));

import { useAuthStore } from '@/features/auth/store/auth.store';
import * as authService from '@/features/auth/services/auth.service';

const mockLogin = authService.login as jest.MockedFunction<typeof authService.login>;
const mockFetchUserProfile = authService.fetchUserProfile as jest.MockedFunction<
  typeof authService.fetchUserProfile
>;
const mockRefreshTokens = authService.refreshTokens as jest.MockedFunction<
  typeof authService.refreshTokens
>;
const mockLogout = authService.logout as jest.MockedFunction<typeof authService.logout>;
const mockPersistTokens = authService.persistTokens as jest.MockedFunction<
  typeof authService.persistTokens
>;
const mockClearTokens = authService.clearTokens as jest.MockedFunction<
  typeof authService.clearTokens
>;
const mockLoadTokens = authService.loadTokens as jest.MockedFunction<
  typeof authService.loadTokens
>;

// ─── Fixtures ──────────────────────────────────────────────────────────────

const mockUser: User = {
  id: 'uuid-user-1',
  userId: createUserId('user-1'),
  name: 'Test User',
  email: 'test@example.com',
  isVerified: true,
  organizations: [
    { orgId: createOrgId('org-1'), name: 'Acme Corp', role: 'owner' },
  ],
};

const mockTokens: TokenPair = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
};

const mockNewTokens: TokenPair = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function resetStore(): void {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockPersistTokens.mockResolvedValue(undefined);
    mockClearTokens.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(ok(undefined));
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isRestoring).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('sets loading, calls authService.login, clears loading on success', async () => {
      mockLogin.mockResolvedValue(ok(undefined));

      await useAuthStore.getState().login('jane@acme.com');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(mockLogin).toHaveBeenCalledWith(expect.anything(), 'jane@acme.com');
    });

    it('sets error on failure', async () => {
      const appError: AppError = { code: 'HTTP_404', message: 'user not found' };
      mockLogin.mockResolvedValue(err(appError));

      await useAuthStore.getState().login('unknown@acme.com');

      const state = useAuthStore.getState();
      expect(state.error).toEqual(appError);
      expect(state.error?.code).toBe('HTTP_404');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('handleAuthCallback', () => {
    it('persists tokens and hydrates user on success', async () => {
      mockFetchUserProfile.mockResolvedValue(ok(mockUser));

      await useAuthStore.getState().handleAuthCallback(mockTokens);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(mockTokens.accessToken);
      expect(state.refreshToken).toBe(mockTokens.refreshToken);
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockPersistTokens).toHaveBeenCalledWith(expect.anything(), mockTokens);
    });

    it('clears tokens on /auth/me failure', async () => {
      const profileError: AppError = { code: 'HTTP_401', message: 'unauthorized' };
      mockFetchUserProfile.mockResolvedValue(err(profileError));

      await useAuthStore.getState().handleAuthCallback(mockTokens);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.error).toEqual(profileError);
      expect(state.isLoading).toBe(false);
      expect(mockClearTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshTokens', () => {
    it('returns false when no refresh token present', async () => {
      const result = await useAuthStore.getState().refreshTokens();

      expect(result).toBe(false);
      expect(mockRefreshTokens).not.toHaveBeenCalled();
    });

    it('updates state and persists on success', async () => {
      useAuthStore.setState({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
      mockRefreshTokens.mockResolvedValue(ok(mockNewTokens));

      const result = await useAuthStore.getState().refreshTokens();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(mockNewTokens.accessToken);
      expect(state.refreshToken).toBe(mockNewTokens.refreshToken);
      expect(mockPersistTokens).toHaveBeenCalledWith(expect.anything(), mockNewTokens);
    });

    it('returns false and does not mutate state on failure', async () => {
      useAuthStore.setState({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
      const refreshError: AppError = { code: 'HTTP_401', message: 'refresh expired' };
      mockRefreshTokens.mockResolvedValue(err(refreshError));

      const result = await useAuthStore.getState().refreshTokens();

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(mockTokens.accessToken);
      expect(state.refreshToken).toBe(mockTokens.refreshToken);
      expect(mockPersistTokens).not.toHaveBeenCalled();
      expect(mockClearTokens).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('sends refresh token and resets state', async () => {
      useAuthStore.setState({
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        isRestoring: false,
      });

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isRestoring).toBe(false);
      expect(state.error).toBeNull();
      expect(mockLogout).toHaveBeenCalledWith(expect.anything(), mockTokens.refreshToken);
      expect(mockClearTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('restoreSession', () => {
    it('sets isRestoring=false when no stored tokens', async () => {
      mockLoadTokens.mockResolvedValue(null);

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isRestoring).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('with valid stored tokens hydrates user', async () => {
      mockLoadTokens.mockResolvedValue(mockTokens);
      mockFetchUserProfile.mockResolvedValue(ok(mockUser));

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe(mockTokens.accessToken);
      expect(state.refreshToken).toBe(mockTokens.refreshToken);
      expect(state.isRestoring).toBe(false);
    });

    it('triggers refresh when /auth/me 401s and retries', async () => {
      const meError: AppError = { code: 'HTTP_401', message: 'unauthorized' };
      mockLoadTokens.mockResolvedValue(mockTokens);
      // First fetchUserProfile fails, second succeeds (after refresh)
      mockFetchUserProfile
        .mockResolvedValueOnce(err(meError))
        .mockResolvedValueOnce(ok(mockUser));
      mockRefreshTokens.mockResolvedValue(ok(mockNewTokens));

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe(mockNewTokens.accessToken);
      expect(state.refreshToken).toBe(mockNewTokens.refreshToken);
      expect(state.isRestoring).toBe(false);
      expect(mockRefreshTokens).toHaveBeenCalledTimes(1);
      expect(mockFetchUserProfile).toHaveBeenCalledTimes(2);
    });

    it('clears tokens when refresh also fails', async () => {
      const meError: AppError = { code: 'HTTP_401', message: 'unauthorized' };
      mockLoadTokens.mockResolvedValue(mockTokens);
      mockFetchUserProfile.mockResolvedValue(err(meError));
      mockRefreshTokens.mockResolvedValue(
        err({ code: 'HTTP_401', message: 'refresh expired' }),
      );

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isRestoring).toBe(false);
      expect(mockClearTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearError', () => {
    it('sets error to null', async () => {
      const appError: AppError = { code: 'HTTP_404', message: 'not found' };
      mockLogin.mockResolvedValue(err(appError));
      await useAuthStore.getState().login('test@example.com');
      expect(useAuthStore.getState().error).toEqual(appError);

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
