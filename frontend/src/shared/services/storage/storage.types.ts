export interface StorageService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'coa_auth_token',
  USER_DATA: 'coa_user_data',
  THEME: 'coa_theme',
  LOCALE: 'coa_locale',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
