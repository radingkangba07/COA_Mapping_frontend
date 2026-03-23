import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AuthState, AuthStore } from '../types/auth.types';
import * as authService from '../services/auth.service';
import { httpClient, configureHttpClient } from '@/shared/services/http/http.instance';
import { storageService } from '@/shared/services/storage/storage.service';

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isRestoring: true,
  error: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  immer((set) => ({
    ...initialState,

    login: async (userId: string): Promise<void> => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      const result = await authService.login(httpClient, userId);

      if (result.ok) {
        set((state) => {
          state.user = result.data.user;
          state.token = result.data.token;
          state.isLoading = false;
        });
        await authService.persistSession(storageService, result.data);
      } else {
        set((state) => {
          state.error = result.error;
          state.isLoading = false;
        });
      }
    },

    logout: async (): Promise<void> => {
      await authService.logout(httpClient);
      await authService.clearSession(storageService);
      set(() => ({
        ...initialState,
        isRestoring: false,
      }));
    },

    restoreSession: async (): Promise<void> => {
      set((state) => {
        state.isRestoring = true;
      });

      const result = await authService.restoreSession(storageService);

      if (result.ok && result.data !== null) {
        set((state) => {
          state.user = result.data.user;
          state.token = result.data.token;
          state.isRestoring = false;
        });
      } else {
        set((state) => {
          state.isRestoring = false;
          if (!result.ok) {
            state.error = result.error;
          }
        });
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
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => void useAuthStore.getState().logout(),
});
