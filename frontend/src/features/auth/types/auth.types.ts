import type { UserId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';

// ─── Domain Entities ────────────────────────────────────────────────────────

export interface User {
  readonly userId: UserId;
  readonly name: string;
  readonly email?: string | undefined;
}

// ─── Value Objects ──────────────────────────────────────────────────────────

export interface Session {
  readonly token: string;
  readonly user: User;
}

export interface RegisterData {
  readonly name: string;
  readonly email: string;
  readonly orgName: string;
}

// ─── Store Contracts ────────────────────────────────────────────────────────

export interface AuthState {
  readonly user: User | null;
  readonly token: string | null;
  readonly isLoading: boolean;
  readonly isRestoring: boolean;
  readonly error: AppError | null;
}

export interface AuthActions {
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

// ─── Derived Helpers ────────────────────────────────────────────────────────

export type AuthStore = AuthState & AuthActions;

export function isAuthenticated(state: AuthState): boolean {
  return state.user !== null && state.token !== null;
}
