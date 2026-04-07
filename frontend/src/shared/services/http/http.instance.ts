import { createHttpClient } from './http.client';
import { env } from '@/config/env';
import type { HttpClient, HttpClientConfig } from './http.types';

let accessTokenGetter: HttpClientConfig['getAccessToken'] = () => null;
let refreshHandler: (() => Promise<boolean>) | undefined;
let logoutHandler: (() => void) | undefined;

export const httpClient: HttpClient = createHttpClient({
  baseURL: env.API_BASE_URL,
  getAccessToken: () => accessTokenGetter(),
  refresh: () => refreshHandler ? refreshHandler() : Promise.resolve(false),
  onLogout: () => logoutHandler?.(),
});

export function configureHttpClient(
  config: Required<Pick<HttpClientConfig, 'getAccessToken' | 'refresh' | 'onLogout'>>,
): void {
  accessTokenGetter = config.getAccessToken;
  refreshHandler = config.refresh;
  logoutHandler = config.onLogout;
}
