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
  getAccessToken: () => Promise<string | null> | string | null;
  refresh?: () => Promise<boolean>;
  onLogout?: () => void;
}
