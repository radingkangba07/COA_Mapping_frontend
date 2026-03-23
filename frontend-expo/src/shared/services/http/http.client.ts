import axios, { AxiosError } from 'axios';
import type { HttpClient, HttpClientConfig } from './http.types';
import type { AppError } from '@/shared/types/result.types';

const DEFAULT_TIMEOUT = 30_000;

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use(async (requestConfig) => {
    const token = await config.getToken();
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    return requestConfig;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (error instanceof AxiosError && error.response?.status === 401) {
        config.onUnauthorized?.();
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
