import type { AxiosInstance } from 'axios';

export type HttpClient = AxiosInstance;

export interface HttpError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  getToken: () => Promise<string | null> | string | null;
  onUnauthorized?: () => void;
}
