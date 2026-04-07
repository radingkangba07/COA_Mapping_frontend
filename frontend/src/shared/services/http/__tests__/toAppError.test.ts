import { AxiosError, AxiosHeaders } from 'axios';
import { toAppError } from '@/shared/services/http/http.client';

function makeAxiosError(options: {
  status?: number;
  data?: Record<string, unknown>;
  message?: string;
  url?: string;
}): AxiosError {
  const headers = new AxiosHeaders();
  const config = { url: options.url ?? '/test', headers };

  return new AxiosError(
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
}

describe('toAppError', () => {
  it('converts AxiosError with response to AppError', () => {
    const appError = toAppError(
      makeAxiosError({
        status: 404,
        data: { message: 'Project not found' },
        url: '/api/v1/projects/123',
      }),
    );

    expect(appError.code).toBe('HTTP_404');
    expect(appError.message).toBe('Project not found');
    expect(appError.details).toEqual({ status: 404, url: '/api/v1/projects/123' });
  });

  it('falls back to error.message when response has no message field', () => {
    const appError = toAppError(
      makeAxiosError({ status: 500, data: { error: 'internal' }, message: 'Internal Server Error' }),
    );

    expect(appError.code).toBe('HTTP_500');
    expect(appError.message).toBe('Internal Server Error');
  });

  it('handles AxiosError without response (network error)', () => {
    const error = new AxiosError(
      'Network Error',
      AxiosError.ERR_NETWORK,
      { url: '/api/v1/data', headers: new AxiosHeaders() },
    );
    const appError = toAppError(error);

    expect(appError.code).toBe('HTTP_0');
    expect(appError.message).toBe('Network Error');
    expect(appError.details).toEqual({ status: 0, url: '/api/v1/data' });
  });

  it('converts regular Error to AppError', () => {
    const appError = toAppError(new Error('Something broke'));

    expect(appError.code).toBe('UNKNOWN_ERROR');
    expect(appError.message).toBe('Something broke');
    expect(appError.details).toBeUndefined();
  });

  it('converts unknown error type to generic AppError', () => {
    const appError = toAppError('string error');

    expect(appError.code).toBe('UNKNOWN_ERROR');
    expect(appError.message).toBe('An unexpected error occurred');
  });

  it('converts null to generic AppError', () => {
    expect(toAppError(null).code).toBe('UNKNOWN_ERROR');
  });

  it('converts undefined to generic AppError', () => {
    expect(toAppError(undefined).code).toBe('UNKNOWN_ERROR');
  });
});
