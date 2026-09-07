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
  VENDOR_PREFS: 'coa_vendor_prefs',
  WIZARD_STEP_BY_ENTITY: 'coa_wizard_step_by_entity',
  WIZARD_UPLOADED_FILE_BY_ENTITY: 'coa_wizard_uploaded_file_by_entity',
  WIZARD_SOURCE_CSV_BY_ENTITY: 'coa_wizard_source_csv_by_entity',
  WIZARD_PIPELINE_RUN_ID_BY_ENTITY: 'coa_wizard_pipeline_run_id_by_entity',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
