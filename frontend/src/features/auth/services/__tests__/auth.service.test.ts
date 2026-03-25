import { AxiosError, AxiosHeaders } from 'axios';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { StorageService } from '@/shared/services/storage/storage.types';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';
import { createUserId } from '@/shared/types/common.types';
import {
  login,
  logout,
  restoreSession,
  persistSession,
  clearSession,
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

// ─── login ──────────────────────────────────────────────────────────────────

describe('login', () => {
  it('returns Session with correct user mapping on success', async () => {
    const apiResponse = {
      user: { user_id: 'usr-123', name: 'Jane Doe', email: 'jane@example.com' },
      token: 'jwt-token-abc',
    };
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({ data: apiResponse }),
    });

    const result = await login(client, 'usr-123');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      token: 'jwt-token-abc',
      user: {
        userId: createUserId('usr-123'),
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
    });
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      { user_id: 'usr-123' },
    );
  });

  it('returns AppError when HTTP request fails', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockRejectedValue(createAxiosError(401, 'Unauthorized')),
    });

    const result = await login(client, 'usr-bad');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('HTTP_401');
    expect(result.error.message).toBe('Unauthorized');
  });

  it('returns INVALID_RESPONSE error when response shape is invalid', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({
        data: { wrong_field: true },
      }),
    });

    const result = await login(client, 'usr-123');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Login response failed validation');
    expect(result.error.details).toHaveProperty('issues');
  });

  it('maps user_id to branded UserId type', async () => {
    const apiResponse = {
      user: { user_id: 'uid-456', name: 'Bob' },
      token: 'tok',
    };
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({ data: apiResponse }),
    });

    const result = await login(client, 'uid-456');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.user.userId).toBe('uid-456');
  });
});

// ─── logout ─────────────────────────────────────────────────────────────────

describe('logout', () => {
  it('returns ok(undefined) on successful logout', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockResolvedValue({ data: {} }),
    });

    const result = await logout(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeUndefined();
    expect(client.post).toHaveBeenCalledWith('/api/v1/auth/logout');
  });

  it('returns ok(undefined) even when API throws', async () => {
    const client = createMockHttpClient({
      post: jest.fn().mockRejectedValue(createAxiosError(500, 'Server error')),
    });

    const result = await logout(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeUndefined();
  });
});

// ─── restoreSession ─────────────────────────────────────────────────────────

describe('restoreSession', () => {
  it('returns null when no token in storage', async () => {
    const storage = createMockStorage();

    const result = await restoreSession(storage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });

  it('returns null when token exists but user data is missing', async () => {
    const storage = createMockStorage({
      [STORAGE_KEYS.AUTH_TOKEN]: 'stored-token',
    });

    const result = await restoreSession(storage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });

  it('returns Session when valid data exists in storage', async () => {
    const userData = JSON.stringify({
      userId: 'usr-789',
      name: 'Alice',
      email: 'alice@example.com',
    });
    const storage = createMockStorage({
      [STORAGE_KEYS.AUTH_TOKEN]: 'stored-token',
      [STORAGE_KEYS.USER_DATA]: userData,
    });

    const result = await restoreSession(storage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      token: 'stored-token',
      user: {
        userId: createUserId('usr-789'),
        name: 'Alice',
        email: 'alice@example.com',
      },
    });
  });

  it('returns null when stored user data is invalid JSON', async () => {
    const storage = createMockStorage({
      [STORAGE_KEYS.AUTH_TOKEN]: 'stored-token',
      [STORAGE_KEYS.USER_DATA]: '{{not-json',
    });

    const result = await restoreSession(storage);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBeDefined();
  });

  it('returns null when stored user data fails schema validation', async () => {
    const storage = createMockStorage({
      [STORAGE_KEYS.AUTH_TOKEN]: 'stored-token',
      [STORAGE_KEYS.USER_DATA]: JSON.stringify({ wrong: 'shape' }),
    });

    const result = await restoreSession(storage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });
});

// ─── persistSession ─────────────────────────────────────────────────────────

describe('persistSession', () => {
  it('saves token and user JSON to storage', async () => {
    const storage = createMockStorage();
    const session = {
      token: 'jwt-persist',
      user: {
        userId: createUserId('usr-100'),
        name: 'Charlie',
        email: 'charlie@example.com' as string | undefined,
      },
    };

    const result = await persistSession(storage, session);

    expect(result.ok).toBe(true);
    expect(storage.set).toHaveBeenCalledWith(
      STORAGE_KEYS.AUTH_TOKEN,
      'jwt-persist',
    );
    expect(storage.set).toHaveBeenCalledWith(
      STORAGE_KEYS.USER_DATA,
      JSON.stringify(session.user),
    );
  });

  it('returns error when storage.set fails', async () => {
    const storage = createMockStorage();
    (storage.set as jest.Mock).mockRejectedValue(new Error('Storage full'));
    const session = {
      token: 'jwt-fail',
      user: {
        userId: createUserId('usr-101'),
        name: 'Dave',
        email: undefined,
      },
    };

    const result = await persistSession(storage, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Storage full');
  });
});

// ─── clearSession ───────────────────────────────────────────────────────────

describe('clearSession', () => {
  it('removes both auth keys from storage', async () => {
    const storage = createMockStorage({
      [STORAGE_KEYS.AUTH_TOKEN]: 'old-token',
      [STORAGE_KEYS.USER_DATA]: '{}',
    });

    const result = await clearSession(storage);

    expect(result.ok).toBe(true);
    expect(storage.remove).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
    expect(storage.remove).toHaveBeenCalledWith(STORAGE_KEYS.USER_DATA);
  });

  it('returns error when storage.remove fails', async () => {
    const storage = createMockStorage();
    (storage.remove as jest.Mock).mockRejectedValue(
      new Error('Permission denied'),
    );

    const result = await clearSession(storage);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Permission denied');
  });
});
