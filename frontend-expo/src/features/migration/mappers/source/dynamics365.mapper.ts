import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Field Mapping ──────────────────────────────────────────────────────────

const FIELD_MAP: Record<string, string> = {
  'main account': 'account_number',
  'name': 'account_name',
  'main account type': 'account_type',
  'main account category': 'category',
  'currency code': 'currency',
  'financial dimension': 'financial_dimension',
  'legal entity': 'legal_entity',
};

const GENERIC_TO_DYNAMICS: Record<string, string> = {
  account_number: 'Main Account',
  account_name: 'Name',
  account_type: 'Main Account Type',
  category: 'Main Account Category',
  currency: 'Currency Code',
  financial_dimension: 'Financial Dimension',
  legal_entity: 'Legal Entity',
};

// ─── Schema ─────────────────────────────────────────────────────────────────

const FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'Main Account', type: 'string', required: true },
  { id: 'account_name', name: 'Name', type: 'string', required: true },
  { id: 'account_type', name: 'Main Account Type', type: 'string', required: true },
  { id: 'category', name: 'Main Account Category', type: 'string', required: false },
  { id: 'currency', name: 'Currency Code', type: 'string', required: false },
  { id: 'financial_dimension', name: 'Financial Dimension', type: 'string', required: false },
  { id: 'legal_entity', name: 'Legal Entity', type: 'string', required: false },
] as const;

const ACCOUNT_TYPES = [
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'Expense',
] as const;

// ─── Adapter ────────────────────────────────────────────────────────────────

export const dynamics365SourceMapper: ERPAdapter = {
  id: 'dynamics365',
  name: 'Microsoft Dynamics 365',
  fields: FIELDS,

  mapSourceRow(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      const generic = FIELD_MAP[key.toLowerCase()];
      if (generic !== undefined) {
        result[generic] = value;
      }
    }

    return result;
  },

  mapTargetRow(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      const erpField = GENERIC_TO_DYNAMICS[key];
      if (erpField !== undefined) {
        result[erpField] = value;
      }
    }

    return result;
  },

  getAccountTypes(): readonly string[] {
    return ACCOUNT_TYPES;
  },
};
