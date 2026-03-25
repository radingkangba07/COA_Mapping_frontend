import axios, { AxiosError, AxiosHeaders } from 'axios';
import { createHttpClient, toAppError } from '@/shared/services/http/http.client';
import type { HttpClientConfig } from '@/shared/services/http/http.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<HttpClientConfig> = {}): HttpClientConfig {
  return {
    baseURL: 'https://api.test.com',
    getToken: () => null,
    ...overrides,
  };
}

function makeAxiosError(options: {
  status?: number;
  data?: unknown;
  message?: string;
  url?: string;
}): AxiosError {
  const headers = new AxiosHeaders();
  const config = {
    url: options.url ?? '/test',
    headers,
  };

  const error = new AxiosError(
    options.message ?? 'Request failed',
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    options.status !== undefined
      ? {
          status: options.status,
          statusText: 'Error',
          headers: {},
          config,
          data: options.data ?? {},
        }
      : undefined,
  );

  return error;
}

// ─── createHttpClient — auth interceptor ────────────────────────────────────

describe('createHttpClient', () => {
  describe('auth interceptor', () => {
    it('adds Bearer token when token exists (T171)', async () => {
      const client = createHttpClient(makeConfig({
        getToken: () => 'test-token-abc',
      }));

      // Mock the adapter to capture the request config
      let capturedHeaders: Record<string, unknown> = {};
      client.defaults.adapter = async (config) => {
        capturedHeaders = config.headers as unknown as Record<string, unknown>;
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      };

      await client.get('/test');

      expect(capturedHeaders['Authorization']).toBe('Bearer test-token-abc');
    });

    it('adds Bearer token when getToken returns a promise (T171)', async () => {
      const client = createHttpClient(makeConfig({
        getToken: () => Promise.resolve('async-token'),
      }));

      let capturedHeaders: Record<string, unknown> = {};
      client.defaults.adapter = async (config) => {
        capturedHeaders = config.headers as unknown as Record<string, unknown>;
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      };

      await client.get('/test');

      expect(capturedHeaders['Authorization']).toBe('Bearer async-token');
    });

    it('does not add Authorization header when no token (T171)', async () => {
      const client = createHttpClient(makeConfig({
        getToken: () => null,
      }));

      let capturedHeaders: Record<string, unknown> = {};
      client.defaults.adapter = async (config) => {
        capturedHeaders = config.headers as unknown as Record<string, unknown>;
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      };

      await client.get('/test');

      expect(capturedHeaders['Authorization']).toBeUndefined();
    });
  });

  describe('response interceptor — 401 handling', () => {
    it('calls onUnauthorized on 401 response (T171)', async () => {
      const onUnauthorized = jest.fn();
      const client = createHttpClient(makeConfig({ onUnauthorized }));

      client.defaults.adapter = async (config) => {
        throw new AxiosError(
          'Unauthorized',
          AxiosError.ERR_BAD_RESPONSE,
          config,
          undefined,
          {
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
            data: {},
          },
        );
      };

      await expect(client.get('/protected')).rejects.toThrow();
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('does not call onUnauthorized for non-401 errors', async () => {
      const onUnauthorized = jest.fn();
      const client = createHttpClient(makeConfig({ onUnauthorized }));

      client.defaults.adapter = async (config) => {
        throw new AxiosError(
          'Forbidden',
          AxiosError.ERR_BAD_RESPONSE,
          config,
          undefined,
          {
            status: 403,
            statusText: 'Forbidden',
            headers: {},
            config,
            data: {},
          },
        );
      };

      await expect(client.get('/forbidden')).rejects.toThrow();
      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });

  describe('default configuration', () => {
    it('uses 30000ms as default timeout', () => {
      const client = createHttpClient(makeConfig());
      expect(client.defaults.timeout).toBe(30_000);
    });

    it('allows timeout override', () => {
      const client = createHttpClient(makeConfig({ timeout: 5000 }));
      expect(client.defaults.timeout).toBe(5000);
    });
  });
});

// ─── toAppError ─────────────────────────────────────────────────────────────

describe('toAppError', () => {
  it('converts AxiosError with response to AppError (T171)', () => {
    const axiosErr = makeAxiosError({
      status: 404,
      data: { message: 'Project not found' },
      url: '/api/v1/projects/123',
    });
    const appError = toAppError(axiosErr);

    expect(appError.code).toBe('HTTP_404');
    expect(appError.message).toBe('Project not found');
    expect(appError.details).toEqual({
      status: 404,
      url: '/api/v1/projects/123',
    });
  });

  it('falls back to error.message when response has no message field (T171)', () => {
    const axiosErr = makeAxiosError({
      status: 500,
      data: { error: 'internal' },
      message: 'Internal Server Error',
    });
    const appError = toAppError(axiosErr);

    expect(appError.code).toBe('HTTP_500');
    expect(appError.message).toBe('Internal Server Error');
  });

  it('handles AxiosError without response (network error) (T171)', () => {
    const error = new AxiosError(
      'Network Error',
      AxiosError.ERR_NETWORK,
      { url: '/api/v1/data', headers: new AxiosHeaders() },
    );
    const appError = toAppError(error);

    expect(appError.code).toBe('HTTP_0');
    expect(appError.message).toBe('Network Error');
    expect(appError.details).toEqual({
      status: 0,
      url: '/api/v1/data',
    });
  });

  it('converts regular Error to AppError (T171)', () => {
    const error = new Error('Something broke');
    const appError = toAppError(error);

    expect(appError.code).toBe('UNKNOWN_ERROR');
    expect(appError.message).toBe('Something broke');
    expect(appError.details).toBeUndefined();
  });

  it('converts unknown error type to generic AppError (T171)', () => {
    const appError = toAppError('string error');

    expect(appError.code).toBe('UNKNOWN_ERROR');
    expect(appError.message).toBe('An unexpected error occurred');
    expect(appError.details).toBeUndefined();
  });

  it('converts null to generic AppError', () => {
    const appError = toAppError(null);

    expect(appError.code).toBe('UNKNOWN_ERROR');
    expect(appError.message).toBe('An unexpected error occurred');
  });

  it('converts undefined to generic AppError', () => {
    const appError = toAppError(undefined);

    expect(appError.code).toBe('UNKNOWN_ERROR');
    expect(appError.message).toBe('An unexpected error occurred');
  });
});
