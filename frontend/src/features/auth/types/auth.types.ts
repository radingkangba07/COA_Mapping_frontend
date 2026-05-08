import type { OrgId, UserId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';

// ─── Domain Entities ────────────────────────────────────────────────────────

export interface Organization {
  readonly orgId: OrgId;
  readonly name: string;
  readonly role: 'owner' | 'admin' | 'member' | 'client_admin' | 'client_member';
  readonly orgType: 'employer' | 'client';
}

export interface User {
  readonly id: string;
  readonly userId: UserId;
  readonly name: string;
  readonly email: string;
  readonly isVerified: boolean;
  readonly organizations: readonly Organization[];
}

// ─── Value Objects ──────────────────────────────────────────────────────────

export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface Session extends TokenPair {
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
  readonly accessToken: string | null;
  readonly refreshToken: string | null;
  readonly isLoading: boolean;
  readonly isRestoring: boolean;
  readonly sessionExpired: boolean;
  readonly error: AppError | null;
}

export interface AuthActions {
  login: (email: string) => Promise<void>;
  handleAuthCallback: (tokens: TokenPair) => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  markSessionExpired: () => void;
  clearError: () => void;
}

// ─── Derived Helpers ────────────────────────────────────────────────────────

export type AuthStore = AuthState & AuthActions;

export function isAuthenticated(state: AuthState): boolean {
  return state.user !== null && state.accessToken !== null;
}
