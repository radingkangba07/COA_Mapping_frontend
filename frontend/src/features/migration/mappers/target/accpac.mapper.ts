import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Field Mapping ──────────────────────────────────────────────────────────

const ACCPAC_FIELD_MAP: Record<string, string> = {
  'account number': 'account_number',
  'account description': 'account_name',
  'account type': 'account_type',
  'account group': 'account_group',
  'currency code': 'currency',
};

const GENERIC_TO_ACCPAC: Record<string, string> = {
  account_number: 'Account Number',
  account_name: 'Account Description',
  account_type: 'Account Type',
  account_group: 'Account Group',
  currency: 'Currency Code',
};

// ─── Schema ─────────────────────────────────────────────────────────────────

const ACCPAC_FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'Account Number', type: 'string', required: true },
  { id: 'account_name', name: 'Account Description', type: 'string', required: true },
  { id: 'account_type', name: 'Account Type', type: 'string', required: true },
  { id: 'account_group', name: 'Account Group', type: 'string', required: false },
  { id: 'currency', name: 'Currency Code', type: 'string', required: false },
] as const;

const ACCPAC_ACCOUNT_TYPES = [
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'Expense',
] as const;

// ─── Adapter ────────────────────────────────────────────────────────────────

export const accpacTargetMapper: ERPAdapter = {
  id: 'accpac',
  name: 'Accpac',
  fields: ACCPAC_FIELDS,

  mapSourceRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalised = key.toLowerCase().trim();
      const fieldId = ACCPAC_FIELD_MAP[normalised];
      if (fieldId !== undefined) {
        mapped[fieldId] = value;
      }
    }
    return mapped;
  },

  mapTargetRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const displayName = GENERIC_TO_ACCPAC[key];
      if (displayName !== undefined) {
        mapped[displayName] = value;
      }
    }
    return mapped;
  },

  getAccountTypes(): readonly string[] {
    return ACCPAC_ACCOUNT_TYPES;
  },
};
