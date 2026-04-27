import { useCallback } from 'react';
import type { User } from '../types/auth.types';
import type { AppError } from '@/shared/types/result.types';
import { useAuthStore } from '../store/auth.store';
import {
  selectIsAuthenticated,
  selectUser,
  selectAuthLoading,
  selectAuthError,
} from '../store/auth.selectors';

// ─── Return Type ────────────────────────────────────────────────────────────

interface AuthViewModel {
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly login: (email: string) => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly clearError: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuthViewModel(): AuthViewModel {
  const user = useAuthStore(selectUser);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isLoading = useAuthStore(selectAuthLoading);
  const error = useAuthStore(selectAuthError);

  const login = useCallback((email: string): Promise<void> => {
    return useAuthStore.getState().login(email);
  }, []);

  const logout = useCallback((): Promise<void> => {
    return useAuthStore.getState().logout();
  }, []);

  const clearError = useCallback((): void => {
    useAuthStore.getState().clearError();
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };
}
