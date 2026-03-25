import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Field Mapping ──────────────────────────────────────────────────────────

const ODOO_FIELD_MAP: Record<string, string> = {
  'account code': 'account_number',
  'account name': 'account_name',
  'type': 'account_type',
  'internal type': 'internal_type',
  'internal group': 'internal_group',
  'currency': 'currency',
};

const GENERIC_TO_ODOO: Record<string, string> = {
  account_number: 'Account Code',
  account_name: 'Account Name',
  account_type: 'Type',
  internal_type: 'Internal Type',
  internal_group: 'Internal Group',
  currency: 'Currency',
};

// ─── Schema ─────────────────────────────────────────────────────────────────

const ODOO_FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'Account Code', type: 'string', required: true },
  { id: 'account_name', name: 'Account Name', type: 'string', required: true },
  { id: 'account_type', name: 'Type', type: 'string', required: true },
  { id: 'internal_type', name: 'Internal Type', type: 'string', required: false },
  { id: 'internal_group', name: 'Internal Group', type: 'string', required: false },
  { id: 'currency', name: 'Currency', type: 'string', required: false },
] as const;

const ODOO_ACCOUNT_TYPES = [
  'Receivable',
  'Payable',
  'Bank and Cash',
  'Current Assets',
  'Non-current Assets',
  'Fixed Assets',
  'Current Liabilities',
  'Non-current Liabilities',
  'Equity',
  'Income',
  'Other Income',
  'Expenses',
  'Cost of Revenue',
  'Depreciation',
] as const;

// ─── Adapter ────────────────────────────────────────────────────────────────

export const odooTargetMapper: ERPAdapter = {
  id: 'odoo',
  name: 'Odoo',
  fields: ODOO_FIELDS,

  mapSourceRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalised = key.toLowerCase().trim();
      const fieldId = ODOO_FIELD_MAP[normalised];
      if (fieldId !== undefined) {
        mapped[fieldId] = value;
      }
    }
    return mapped;
  },

  mapTargetRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const displayName = GENERIC_TO_ODOO[key];
      if (displayName !== undefined) {
        mapped[displayName] = value;
      }
    }
    return mapped;
  },

  getAccountTypes(): readonly string[] {
    return ODOO_ACCOUNT_TYPES;
  },
};
