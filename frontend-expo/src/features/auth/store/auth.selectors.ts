import type { User, AuthStore } from '../types/auth.types';
import type { AppError } from '@/shared/types/result.types';

export const selectIsAuthenticated = (state: AuthStore): boolean =>
  state.user !== null && state.token !== null;

export const selectUser = (state: AuthStore): User | null =>
  state.user;

export const selectAuthLoading = (state: AuthStore): boolean =>
  state.isLoading;

export const selectAuthRestoring = (state: AuthStore): boolean =>
  state.isRestoring;

export const selectAuthError = (state: AuthStore): AppError | null =>
  state.error;
