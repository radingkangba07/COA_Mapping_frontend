import { AxiosError, AxiosHeaders } from 'axios';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { StorageService } from '@/shared/services/storage/storage.types';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';
import { createUserId, createOrgId } from '@/shared/types/common.types';
import {
  login,
  fetchUserProfile,
  refreshTokens,
  logout,
  persistTokens,
  loadTokens,
  clearTokens,
  register,
  resendVerification,
} from '@/features/auth/services/auth.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockHttpClient(overrides: Partial<HttpClient> = {}): HttpClient {
  return {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

function createMockStorage(
  store: Record<string, string> = {},
): StorageService {
  const data = new Map(Object.entries(store));
  return {
    get: jest.fn((key: string) => Promise.resolve(data.get(key) ?? null)),
    set: jest.fn((key: string, value: string) => {
      data.set(key, value);
      return Promise.resolve();
    }),
    remove: jest.fn((key: string) => {
      data.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      data.clear();
      return Promise.resolve();
    }),
  };
}

function createAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(
    message,
    String(status),
    { headers: new AxiosHeaders() } as never,
    undefined,
    {
      status,
      data: { message },
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
}

// ─── Valid DTOs ──────────────────────────────────────────────────────────────

const validMeResponse = {
  user_id: 'usr-123',
  name: 'Jane Doe',
  email: 'jane@example.com',
  is_verified: true,
  orgs: [
    { id: 'org-1', name: 'Acme Inc', role: 'owner' as const },
    { id: 'org-2', name: 'Beta Corp', role: 'member' as const },
  ],
};

const validTokenPairResponse = {
  access_token: 'new-access-tok',
  refresh_token: 'new-refresh-tok',
};

// ─── login (magic link) ────────────────────────────────────────────────────

describe('login (magic link)', () => {
  it('returns ok on 200', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({ data: { message: 'Login link sent' } }),
    });

    const result = await login(client, 'jane@acme.com');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeUndefined();
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      { email: 'jane@acme.com' },
    );
  });

  it('returns mapped AppError on 404', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockRejectedValue(createAxiosError(404, 'user not found')),
    });

    const result = await login(client, 'unknown@acme.com');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('HTTP_404');
    expect(result.error.message).toBe('user not found');
  });

  it('returns mapped AppError on 403', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockRejectedValue(createAxiosError(403, 'email not verified')),
    });

    const result = await login(client, 'unverified@acme.com');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('HTTP_403');
    expect(result.error.message).toBe('email not verified');
  });
});

// ─── fetchUserProfile ──────────────────────────────────────────────────────

describe('fetchUserProfile', () => {
  it('returns parsed User with organizations on 200', async () => {
    const client = createMockHttpClient({
      get: jest.fn().mockResolvedValue({ data: validMeResponse }),
    });

    const result = await fetchUserProfile(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      userId: createUserId('usr-123'),
      name: 'Jane Doe',
      email: 'jane@example.com',
      isVerified: true,
      organizations: [
        { orgId: createOrgId('org-1'), name: 'Acme Inc', role: 'owner' },
        { orgId: createOrgId('org-2'), name: 'Beta Corp', role: 'member' },
      ],
    });
    expect(result.data.organizations).toHaveLength(2);
    expect(client.get).toHaveBeenCalledWith('/api/v1/auth/me');
  });

  it('returns INVALID_RESPONSE on schema mismatch', async () => {
    const client = createMockHttpClient({
      get: jest.fn().mockResolvedValue({ data: { wrong_field: true } }),
    });

    const result = await fetchUserProfile(client);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('User profile response failed validation');
    expect(result.error.details).toHaveProperty('issues');
  });

  it('returns AppError on network error', async () => {
    const client = createMockHttpClient({
      get: jest.fn().mockRejectedValue(new Error('Network Error')),
    });

    const result = await fetchUserProfile(client);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNKNOWN_ERROR');
    expect(result.error.message).toBe('Network Error');
  });
});

// ─── refreshTokens ─────────────────────────────────────────────────────────

describe('refreshTokens', () => {
  it('returns ok with new TokenPair on 200', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({ data: validTokenPairResponse }),
    });

    const result = await refreshTokens(client, 'old-refresh-tok');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      accessToken: 'new-access-tok',
      refreshToken: 'new-refresh-tok',
    });
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      { refresh_token: 'old-refresh-tok' },
    );
  });

  it('returns INVALID_RESPONSE on schema mismatch', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({ data: { foo: 'bar' } }),
    });

    const result = await refreshTokens(client, 'old-refresh-tok');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Token refresh response failed validation');
    expect(result.error.details).toHaveProperty('issues');
  });

  it('returns AppError on 401 (refresh token expired)', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockRejectedValue(createAxiosError(401, 'Token expired')),
    });

    const result = await refreshTokens(client, 'expired-refresh-tok');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('HTTP_401');
    expect(result.error.message).toBe('Token expired');
  });
});

// ─── logout ─────────────────────────────────────────────────────────────────

describe('logout', () => {
  it('sends refresh_token in body when provided', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({ data: {} }),
    });

    const result = await logout(client, 'rt-abc');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeUndefined();
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      { refresh_token: 'rt-abc' },
    );
  });

  it('sends undefined body when refreshToken is null', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({ data: {} }),
    });

    await logout(client, null);

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      undefined,
    );
  });

  it('swallows network errors and still returns ok', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockRejectedValue(createAxiosError(500, 'Server error')),
    });

    const result = await logout(client, 'rt-abc');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeUndefined();
  });
});

// ─── persistTokens / loadTokens / clearTokens ──────────────────────────────

describe('persistTokens / loadTokens / clearTokens', () => {
  it('round-trips tokens through persist and load', async () => {
    const storage = createMockStorage();
    const tokens = { accessToken: 'at-123', refreshToken: 'rt-456' };

    await persistTokens(storage, tokens);

    const loaded = await loadTokens(storage);

    expect(loaded).toEqual(tokens);
    expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN, 'at-123');
    expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN, 'rt-456');
  });

  it('loadTokens returns null when no tokens stored', async () => {
    const storage = createMockStorage();

    const loaded = await loadTokens(storage);

    expect(loaded).toBeNull();
  });

  it('loadTokens returns null when only access token stored', async () => {
    const storage = createMockStorage({
      [STORAGE_KEYS.ACCESS_TOKEN]: 'at-only',
    });

    const loaded = await loadTokens(storage);

    expect(loaded).toBeNull();
  });

  it('loadTokens returns null when only refresh token stored', async () => {
    const storage = createMockStorage({
      [STORAGE_KEYS.REFRESH_TOKEN]: 'rt-only',
    });

    const loaded = await loadTokens(storage);

    expect(loaded).toBeNull();
  });

  it('clearTokens removes both token keys', async () => {
    const storage = createMockStorage({
      [STORAGE_KEYS.ACCESS_TOKEN]: 'at-123',
      [STORAGE_KEYS.REFRESH_TOKEN]: 'rt-456',
    });

    await clearTokens(storage);

    expect(storage.remove).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
    expect(storage.remove).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);

    const loaded = await loadTokens(storage);
    expect(loaded).toBeNull();
  });
});

// ─── register ──────────────────────────────────────────────────────────────

describe('register', () => {
  const validData = { name: 'Jane Doe', email: 'jane@acme.com', orgName: 'Acme Inc' };

  it('returns ok with parsed user_id and message on 201', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({
        data: { user_id: 'u1', message: 'Verification email sent' },
      }),
    });

    const result = await register(client, validData);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ userId: 'u1', message: 'Verification email sent' });
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      { name: 'Jane Doe', email: 'jane@acme.com', org_name: 'Acme Inc' },
    );
  });

  it('returns INVALID_RESPONSE error on schema mismatch', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({ data: { foo: 'bar' } }),
    });

    const result = await register(client, validData);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Register response failed validation');
    expect(result.error.details).toHaveProperty('issues');
  });

  it('returns mapped AppError on 409 email duplicate', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockRejectedValue(
        createAxiosError(409, 'Email already registered'),
      ),
    });

    const result = await register(client, validData);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('HTTP_409');
    expect(result.error.message).toBe('Email already registered');
  });

  it('returns mapped AppError on 409 org duplicate', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockRejectedValue(
        createAxiosError(409, 'Organization name already taken'),
      ),
    });

    const result = await register(client, validData);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('HTTP_409');
    expect(result.error.message).toBe('Organization name already taken');
  });
});

// ─── resendVerification ────────────────────────────────────────────────────

describe('resendVerification', () => {
  it('returns ok on 200', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({ data: {} }),
    });

    const result = await resendVerification(client, 'jane@acme.com');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeUndefined();
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/auth/resend-verification',
      { email: 'jane@acme.com' },
    );
  });

  it('returns mapped AppError on network failure', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockRejectedValue(new Error('Network Error')),
    });

    const result = await resendVerification(client, 'jane@acme.com');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNKNOWN_ERROR');
    expect(result.error.message).toBe('Network Error');
  });
});
