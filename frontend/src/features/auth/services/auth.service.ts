import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { StorageService } from '@/shared/services/storage/storage.types';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';
import type { Result } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import { createUserId } from '@/shared/types/common.types';
import type { User, Session, RegisterData } from '../types/auth.types';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const loginResponseSchema = z.object({
  user: z.object({
    user_id: z.string(),
    name: z.string(),
    email: z.string().optional(),
  }),
  token: z.string(),
});

type LoginResponseDTO = z.infer<typeof loginResponseSchema>;

const registerResponseSchema = z.object({
  user_id: z.string(),
  message: z.string(),
});

const storedUserSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string().optional(),
});

// ─── Mappers ────────────────────────────────────────────────────────────────

function toUser(dto: LoginResponseDTO['user']): User {
  return {
    userId: createUserId(dto.user_id),
    name: dto.name,
    email: dto.email,
  };
}

function toSession(dto: LoginResponseDTO): Session {
  return {
    token: dto.token,
    user: toUser(dto.user),
  };
}

// ─── Service Functions ──────────────────────────────────────────────────────

export async function login(
  client: HttpClient,
  userId: string,
): Promise<Result<Session, AppError>> {
  try {
    const { data } = await client.post<unknown>(
      '/api/v1/auth/login',
      { user_id: userId },
    );

    const parsed = loginResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Login response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toSession(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function logout(
  client: HttpClient,
): Promise<Result<void, AppError>> {
  try {
    await client.post('/api/v1/auth/logout');
  } catch {
    // Best-effort: ignore errors on logout
  }
  return ok(undefined);
}

export async function restoreSession(
  storage: StorageService,
): Promise<Result<Session | null, AppError>> {
  try {
    const [token, userData] = await Promise.all([
      storage.get(STORAGE_KEYS.AUTH_TOKEN),
      storage.get(STORAGE_KEYS.USER_DATA),
    ]);

    if (token === null || userData === null) {
      return ok(null);
    }

    const parsed = storedUserSchema.safeParse(JSON.parse(userData));

    if (!parsed.success) {
      return ok(null);
    }

    const user: User = {
      userId: createUserId(parsed.data.userId),
      name: parsed.data.name,
      email: parsed.data.email,
    };

    return ok({ token, user });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function persistSession(
  storage: StorageService,
  session: Session,
): Promise<Result<void, AppError>> {
  try {
    await Promise.all([
      storage.set(STORAGE_KEYS.AUTH_TOKEN, session.token),
      storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(session.user)),
    ]);
    return ok(undefined);
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

export async function clearSession(
  storage: StorageService,
): Promise<Result<void, AppError>> {
  try {
    await Promise.all([
      storage.remove(STORAGE_KEYS.AUTH_TOKEN),
      storage.remove(STORAGE_KEYS.USER_DATA),
    ]);
    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

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
