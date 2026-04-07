import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { StorageService } from '@/shared/services/storage/storage.types';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import { createUserId, createOrgId } from '@/shared/types/common.types';
import type { User, TokenPair, RegisterData } from '../types/auth.types';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const tokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
});

const meResponseSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  is_verified: z.boolean(),
  organizations: z.array(
    z.object({
      org_id: z.string(),
      name: z.string(),
      role: z.enum(['owner', 'admin', 'member']),
    }),
  ),
});

const registerResponseSchema = z.object({
  user_id: z.string(),
  message: z.string(),
});

// ─── Mappers ────────────────────────────────────────────────────────────────

function toUser(dto: z.infer<typeof meResponseSchema>): User {
  return {
    userId: createUserId(dto.user_id),
    name: dto.name,
    email: dto.email,
    isVerified: dto.is_verified,
    organizations: dto.organizations.map((org) => ({
      orgId: createOrgId(org.org_id),
      name: org.name,
      role: org.role,
    })),
  };
}

// ─── Service Functions ──────────────────────────────────────────────────────

export async function login(
  client: HttpClient,
  email: string,
): Promise<Result<void, AppError>> {
  try {
    await client.post('/api/v1/auth/login', { email });
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function fetchUserProfile(
  client: HttpClient,
): Promise<Result<User, AppError>> {
  try {
    const { data } = await client.get<unknown>('/api/v1/auth/me');

    const parsed = meResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'User profile response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toUser(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function refreshTokens(
  client: HttpClient,
  refreshToken: string,
): Promise<Result<TokenPair, AppError>> {
  try {
    const { data } = await client.post<unknown>(
      '/api/v1/auth/refresh',
      { refresh_token: refreshToken },
    );

    const parsed = tokenPairSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Token refresh response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok({
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token,
    });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function logout(
  client: HttpClient,
  refreshToken: string | null,
): Promise<Result<void, AppError>> {
  try {
    const body = refreshToken ? { refresh_token: refreshToken } : undefined;
    await client.post('/api/v1/auth/logout', body);
  } catch (_error: unknown) {
    // Best-effort: server-side session cleanup is non-critical
  }
  return ok(undefined);
}

// ─── Token Persistence ──────────────────────────────────────────────────────

export async function persistTokens(
  storage: StorageService,
  tokens: TokenPair,
): Promise<void> {
  await Promise.all([
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
    storage.set(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
  ]);
}

export async function loadTokens(
  storage: StorageService,
): Promise<TokenPair | null> {
  const [accessToken, refreshToken] = await Promise.all([
    storage.get(STORAGE_KEYS.ACCESS_TOKEN),
    storage.get(STORAGE_KEYS.REFRESH_TOKEN),
  ]);

  if (accessToken === null || refreshToken === null) {
    return null;
  }

  return { accessToken, refreshToken };
}

export async function clearTokens(
  storage: StorageService,
): Promise<void> {
  await Promise.all([
    storage.remove(STORAGE_KEYS.ACCESS_TOKEN),
    storage.remove(STORAGE_KEYS.REFRESH_TOKEN),
  ]);
}

// ─── Registration (unchanged from SCRUM-19) ─────────────────────────────────

export async function register(
  client: HttpClient,
  data: RegisterData,
): Promise<Result<{ userId: string; message: string }, AppError>> {
  try {
    const { data: responseData } = await client.post<unknown>(
      '/api/v1/auth/register',
      { name: data.name, email: data.email, org_name: data.orgName },
    );

    const parsed = registerResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Register response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok({ userId: parsed.data.user_id, message: parsed.data.message });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function resendVerification(
  client: HttpClient,
  email: string,
): Promise<Result<void, AppError>> {
  try {
    await client.post('/api/v1/auth/resend-verification', { email });
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
