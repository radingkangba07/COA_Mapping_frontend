import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Field Mapping ──────────────────────────────────────────────────────────

const DYNAMICS365_FIELD_MAP: Record<string, string> = {
  'main account': 'account_number',
  'name': 'account_name',
  'main account type': 'account_type',
  'main account category': 'category',
  'currency code': 'currency',
  'financial dimension': 'financial_dimension',
  'legal entity': 'legal_entity',
};

const GENERIC_TO_DYNAMICS365: Record<string, string> = {
  account_number: 'Main Account',
  account_name: 'Name',
  account_type: 'Main Account Type',
  category: 'Main Account Category',
  currency: 'Currency Code',
  financial_dimension: 'Financial Dimension',
  legal_entity: 'Legal Entity',
};

// ─── Schema ─────────────────────────────────────────────────────────────────

const DYNAMICS365_FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'Main Account', type: 'string', required: true },
  { id: 'account_name', name: 'Name', type: 'string', required: true },
  { id: 'account_type', name: 'Main Account Type', type: 'string', required: true },
  { id: 'category', name: 'Main Account Category', type: 'string', required: false },
  { id: 'currency', name: 'Currency Code', type: 'string', required: false },
  { id: 'financial_dimension', name: 'Financial Dimension', type: 'string', required: false },
  { id: 'legal_entity', name: 'Legal Entity', type: 'string', required: false },
] as const;

const DYNAMICS365_ACCOUNT_TYPES = [
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'Expense',
] as const;

// ─── Adapter ────────────────────────────────────────────────────────────────

export const dynamics365TargetMapper: ERPAdapter = {
  id: 'dynamics365',
  name: 'Microsoft Dynamics 365',
  fields: DYNAMICS365_FIELDS,

  mapSourceRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalised = key.toLowerCase().trim();
      const fieldId = DYNAMICS365_FIELD_MAP[normalised];
      if (fieldId !== undefined) {
        mapped[fieldId] = value;
      }
    }
    return mapped;
  },

  mapTargetRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const displayName = GENERIC_TO_DYNAMICS365[key];
      if (displayName !== undefined) {
        mapped[displayName] = value;
      }
    }
    return mapped;
  },

  getAccountTypes(): readonly string[] {
    return DYNAMICS365_ACCOUNT_TYPES;
  },
};
