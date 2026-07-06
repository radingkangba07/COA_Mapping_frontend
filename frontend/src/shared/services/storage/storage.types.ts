export interface StorageService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'coa_access_token',
  REFRESH_TOKEN: 'coa_refresh_token',
  THEME: 'coa_theme',
  LOCALE: 'coa_locale',
  ACTIVE_ORG_ID: 'coa_active_org_id',
  SECTION_STATE: 'coa_section_state',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
