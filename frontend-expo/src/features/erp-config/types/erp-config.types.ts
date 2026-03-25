import type { AppError } from '@/shared/types/result.types';

// ─── Domain Types (camelCase — used in store, hooks, components) ─────────────

export interface ERPField {
  id: string;
  name: string;
  type: 'string' | 'number';
  required: boolean;
}

export interface ERPSystem {
  id: string;
  name: string;
  description: string;
  fields: ERPField[];
}

export interface ERPSampleData {
  readonly erpId: string;
  readonly erpName: string;
  readonly data: ReadonlyArray<Record<string, unknown>>;
  readonly rowCount: number;
}

export interface FuzzyMatch {
  readonly sourceColumn: string;
  readonly targetField: string;
  readonly score: number;
}

export interface FuzzyMatchResult {
  readonly mappings: readonly FuzzyMatch[];
  readonly targetFields: readonly string[];
}

// ─── Store Types ─────────────────────────────────────────────────────────────

export interface ERPConfigState {
  readonly erpSystems: ERPSystem[];
  readonly selectedERP: ERPSystem | null;
  readonly isLoading: boolean;
  readonly error: AppError | null;
}

export interface ERPConfigActions {
  setERPSystems: (systems: ERPSystem[]) => void;
  setSelectedERP: (erp: ERPSystem | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: AppError) => void;
  clearError: () => void;
  reset: () => void;
}

export type ERPConfigStore = ERPConfigState & ERPConfigActions;
