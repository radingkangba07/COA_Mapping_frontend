import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { castDraft } from 'immer';
import type { AuthState, AuthStore, TokenPair } from '../types/auth.types';
import * as authService from '../services/auth.service';
import { httpClient, configureHttpClient } from '@/shared/services/http/http.instance';
import { storageService } from '@/shared/services/storage/storage.service';

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isRestoring: true,
  error: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  immer((set, get) => ({
    ...initialState,

    login: async (email: string): Promise<void> => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      const result = await authService.login(httpClient, email);

      if (!result.ok) {
        set((state) => {
          state.error = result.error;
          state.isLoading = false;
        });
      } else {
        set((state) => {
          state.isLoading = false;
        });
      }
    },

    handleAuthCallback: async (tokens: TokenPair): Promise<void> => {
      set((state) => {
        state.accessToken = tokens.accessToken;
        state.refreshToken = tokens.refreshToken;
        state.isLoading = true;
        state.error = null;
      });

      await authService.persistTokens(storageService, tokens);

      const profileResult = await authService.fetchUserProfile(httpClient);

      if (profileResult.ok) {
        set((state) => {
          state.user = castDraft(profileResult.data);
          state.isLoading = false;
        });
      } else {
        await authService.clearTokens(storageService);
        set((state) => {
          state.accessToken = null;
          state.refreshToken = null;
          state.user = null;
          state.error = profileResult.error;
          state.isLoading = false;
        });
      }
    },

    refreshTokens: async (): Promise<boolean> => {
      const current = get().refreshToken;

      if (current === null) {
        return false;
      }

      const result = await authService.refreshTokens(httpClient, current);

      if (!result.ok) {
        return false;
      }

      set((state) => {
        state.accessToken = result.data.accessToken;
        state.refreshToken = result.data.refreshToken;
      });

      await authService.persistTokens(storageService, result.data);

      return true;
    },

    logout: async (): Promise<void> => {
      const current = get().refreshToken;
      await authService.logout(httpClient, current);
      await authService.clearTokens(storageService);
      set(() => ({
        ...initialState,
        isRestoring: false,
      }));
    },

    restoreSession: async (): Promise<void> => {
      set((state) => {
        state.isRestoring = true;
      });

      const tokens = await authService.loadTokens(storageService);

      if (tokens === null) {
        set((state) => {
          state.isRestoring = false;
        });
        return;
      }

      set((state) => {
        state.accessToken = tokens.accessToken;
        state.refreshToken = tokens.refreshToken;
      });

      const profileResult = await authService.fetchUserProfile(httpClient);

      if (profileResult.ok) {
        set((state) => {
          state.user = castDraft(profileResult.data);
          state.isRestoring = false;
        });
        return;
      }

      // /auth/me failed — attempt a token refresh
      const refreshed = await get().refreshTokens();

      if (!refreshed) {
        await authService.clearTokens(storageService);
        set(() => ({
          ...initialState,
          isRestoring: false,
        }));
        return;
      }

      // Retry profile fetch after successful refresh
      const retryResult = await authService.fetchUserProfile(httpClient);

      if (retryResult.ok) {
        set((state) => {
          state.user = castDraft(retryResult.data);
          state.isRestoring = false;
        });
      } else {
        await authService.clearTokens(storageService);
        set(() => ({
          ...initialState,
          isRestoring: false,
        }));
      }
    },

    clearError: (): void => {
      set((state) => {
        state.error = null;
      });
    },
  })),
);

// ─── Wire HTTP Client ───────────────────────────────────────────────────────

configureHttpClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refresh: () => useAuthStore.getState().refreshTokens(),
  onLogout: () => void useAuthStore.getState().logout(),
});
