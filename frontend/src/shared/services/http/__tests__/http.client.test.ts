import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosError, AxiosHeaders } from 'axios';
import { createHttpClient } from '@/shared/services/http/http.client';
import type { HttpClientConfig } from '@/shared/services/http/http.types';

jest.mock('@/shared/services/http/http.error-handler', () => ({
  isTransientError: (s: number | undefined) => s === undefined || s >= 500 || s === 408 || s === 429,
  showTransientErrorToast: jest.fn(),
}));

function makeConfig(overrides: Partial<HttpClientConfig> = {}): HttpClientConfig {
  return { baseURL: 'https://api.test.com', getAccessToken: () => null, ...overrides };
}

const make401 = (config: InternalAxiosRequestConfig) => new AxiosError(
  'Unauthorized', AxiosError.ERR_BAD_RESPONSE, config, undefined,
  { status: 401, statusText: 'Unauthorized', headers: {}, config, data: {} },
);

const ok = (config: InternalAxiosRequestConfig, data: unknown = {}) =>
  ({ data, status: 200, statusText: 'OK', headers: {}, config });

// ─── Request interceptor ───────────────────────────────────────────────────

describe('createHttpClient — request interceptor', () => {
  it('adds Bearer token when getAccessToken returns a string', async () => {
    const client = createHttpClient(
      makeConfig({ getAccessToken: () => 'test-token-abc' }),
    );
    client.defaults.adapter = async (config) => {
      expect(config.headers.get('Authorization')).toBe('Bearer test-token-abc');
      return ok(config);
    };
    await client.get('/test');
  });

  it('adds Bearer token when getAccessToken returns a promise', async () => {
    const client = createHttpClient(
      makeConfig({ getAccessToken: () => Promise.resolve('async-token') }),
    );
    client.defaults.adapter = async (config) => {
      expect(config.headers.get('Authorization')).toBe('Bearer async-token');
      return ok(config);
    };
    await client.get('/test');
  });

  it('does not add Authorization header when no token', async () => {
    const client = createHttpClient(makeConfig({ getAccessToken: () => null }));
    client.defaults.adapter = async (config) => {
      expect(config.headers.get('Authorization')).toBeUndefined();
      return ok(config);
    };
    await client.get('/test');
  });
});

// ─── 401 refresh + retry ──────────────────────────────────────────────────

describe('createHttpClient — 401 refresh + retry', () => {
  it('retries once with new token after successful refresh', async () => {
    const refresh = jest.fn().mockResolvedValue(true);
    let callCount = 0;
    const client = createHttpClient(
      makeConfig({
        getAccessToken: () => (callCount > 0 ? 'new-token' : 'old-token'),
        refresh,
        onLogout: jest.fn(),
      }),
    );
    client.defaults.adapter = async (config) => {
      callCount++;
      if (callCount === 1) throw make401(config);
      return ok(config, { success: true });
    };

    const response = await client.get('/foo');

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(callCount).toBe(2);
    expect(response.data).toEqual({ success: true });
  });

  it('fires exactly one refresh for 5 concurrent 401s', async () => {
    const refresh = jest.fn().mockResolvedValue(true);
    const client = createHttpClient(
      makeConfig({ getAccessToken: () => 'token', refresh, onLogout: jest.fn() }),
    );
    client.defaults.adapter = async (config) => {
      if (!(config as InternalAxiosRequestConfig & { _retried?: boolean })._retried) {
        throw make401(config);
      }
      return ok(config, { ok: true });
    };

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => client.get(`/foo?${i}`)),
    );

    expect(refresh).toHaveBeenCalledTimes(1);
    results.forEach((r) => expect(r.status).toBe(200));
  });

  it('calls onLogout when refresh returns false', async () => {
    const onLogout = jest.fn();
    const client = createHttpClient(
      makeConfig({
        getAccessToken: () => 'expired',
        refresh: jest.fn().mockResolvedValue(false),
        onLogout,
      }),
    );
    client.defaults.adapter = async (config) => { throw make401(config); };

    await expect(client.get('/foo')).rejects.toThrow();
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it.each(['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/logout'])(
    'does NOT attempt refresh for %s',
    async (endpoint) => {
      const refresh = jest.fn().mockResolvedValue(true);
      const onLogout = jest.fn();
      const client = createHttpClient(
        makeConfig({ getAccessToken: () => 'token', refresh, onLogout }),
      );
      client.defaults.adapter = async (config) => { throw make401(config); };

      await expect(client.post(endpoint)).rejects.toThrow();
      expect(refresh).not.toHaveBeenCalled();
      expect(onLogout).not.toHaveBeenCalled();
    },
  );

  it('does NOT attempt a second refresh on a retried request', async () => {
    const refresh = jest.fn().mockResolvedValue(true);
    const onLogout = jest.fn();
    const client = createHttpClient(
      makeConfig({ getAccessToken: () => 'token', refresh, onLogout }),
    );
    client.defaults.adapter = async (config) => { throw make401(config); };

    await expect(client.get('/foo')).rejects.toThrow();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('calls onLogout on 401 when refresh is not configured', async () => {
    const onLogout = jest.fn();
    const client = createHttpClient(
      makeConfig({ getAccessToken: () => 'token', onLogout }),
    );
    client.defaults.adapter = async (config) => { throw make401(config); };

    await expect(client.get('/protected')).rejects.toThrow();
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('passes through non-AxiosError without triggering refresh', async () => {
    const refresh = jest.fn();
    const onLogout = jest.fn();
    const client = createHttpClient(
      makeConfig({ getAccessToken: () => 'token', refresh, onLogout }),
    );
    client.defaults.adapter = async () => { throw new Error('network down'); };

    await expect(client.get('/foo')).rejects.toThrow('network down');
    expect(refresh).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });
});

// ─── Transient error + config ──────────────────────────────────────────────

describe('createHttpClient — transient errors + config', () => {
  it('shows toast on 5xx errors', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { showTransientErrorToast } = require('@/shared/services/http/http.error-handler');
    const client = createHttpClient(makeConfig());
    client.defaults.adapter = async (config) => {
      throw new AxiosError('Service Unavailable', AxiosError.ERR_BAD_RESPONSE, config, undefined, {
        status: 503, statusText: 'Service Unavailable', headers: {}, config, data: {},
      });
    };

    await expect(client.get('/test')).rejects.toThrow();
    expect(showTransientErrorToast).toHaveBeenCalledWith('Service Unavailable');
  });

  it('uses 30000ms as default timeout', () => {
    const client = createHttpClient(makeConfig());
    expect(client.defaults.timeout).toBe(30_000);
  });

  it('allows timeout override', () => {
    const client = createHttpClient(makeConfig({ timeout: 5000 }));
    expect(client.defaults.timeout).toBe(5000);
  });
});
