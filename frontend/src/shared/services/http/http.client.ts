import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { HttpClient, HttpClientConfig } from './http.types';
import type { AppError } from '@/shared/types/result.types';
import { isTransientError, showTransientErrorToast, showAccessDeniedToast } from './http.error-handler';
import { createRefreshQueue } from './refresh-queue';

const DEFAULT_TIMEOUT = 30_000;

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const refreshQueue = createRefreshQueue();

  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use(async (requestConfig) => {
    const token = await config.getAccessToken();
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    return requestConfig;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!(error instanceof AxiosError)) {
        return Promise.reject(error);
      }

      const status = error.response?.status;

      if (status === 401 || status === 403) {
        const requestConfig = error.config as RetriableRequestConfig | undefined;
        const url = requestConfig?.url ?? '';

        if (
          requestConfig &&
          !requestConfig._retried &&
          !isAuthEndpoint(url) &&
          config.refresh !== undefined
        ) {
          const refreshed = await refreshQueue.runOnce(config.refresh);
          if (refreshed) {
            requestConfig._retried = true;
            return client.request(requestConfig);
          }
        }

        if (!isAuthEndpoint(url)) {
          if (status === 403 && requestConfig?._retried) {
            // Refresh succeeded but resource still 403 = genuine permission error
            showAccessDeniedToast();
          } else {
            config.onLogout?.();
          }
        }
        return Promise.reject(error);
      }

      if (isTransientError(status)) {
        showTransientErrorToast(
          error.message ?? 'Something went wrong. Please try again.',
        );
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    const responseData: unknown = error.response?.data;
    const serverMessage =
      typeof responseData === 'object' &&
      responseData !== null &&
      'message' in responseData &&
      typeof (responseData as Record<string, unknown>).message === 'string'
        ? (responseData as Record<string, unknown>).message as string // justified: narrowed above
        : undefined;

    return {
      code: `HTTP_${String(status)}`,
      message: serverMessage ?? error.message ?? 'An unexpected network error occurred',
      details: {
        status,
        url: error.config?.url ?? 'unknown',
      },
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  };
}
