import { createHttpClient } from './http.client';
import { env } from '@/config/env';
import type { HttpClient } from './http.types';

let tokenGetter: () => string | null = () => null;
let unauthorizedHandler: () => void = () => {};

export const httpClient: HttpClient = createHttpClient({
  baseURL: env.API_BASE_URL,
  getToken: () => tokenGetter(),
  onUnauthorized: () => unauthorizedHandler(),
});

export function configureHttpClient(config: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}): void {
  tokenGetter = config.getToken;
  unauthorizedHandler = config.onUnauthorized;
}
