import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Field Mapping ──────────────────────────────────────────────────────────

const SAP_FIELD_MAP: Record<string, string> = {
  'account number': 'account_number',
  'account name': 'account_name',
  'account type': 'account_type',
  'parent account': 'parent_account',
  'currency': 'currency',
  'cost center': 'cost_center',
  'profit center': 'profit_center',
  'company code': 'company_code',
};

const GENERIC_TO_SAP: Record<string, string> = {
  account_number: 'Account Number',
  account_name: 'Account Name',
  account_type: 'Account Type',
  parent_account: 'Parent Account',
  currency: 'Currency',
  cost_center: 'Cost Center',
  profit_center: 'Profit Center',
  company_code: 'Company Code',
};

// ─── Schema ─────────────────────────────────────────────────────────────────

const SAP_FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'Account Number', type: 'string', required: true },
  { id: 'account_name', name: 'Account Name', type: 'string', required: true },
  { id: 'account_type', name: 'Account Type', type: 'string', required: true },
  { id: 'parent_account', name: 'Parent Account', type: 'string', required: false },
  { id: 'currency', name: 'Currency', type: 'string', required: false },
  { id: 'cost_center', name: 'Cost Center', type: 'string', required: false },
  { id: 'profit_center', name: 'Profit Center', type: 'string', required: false },
  { id: 'company_code', name: 'Company Code', type: 'string', required: false },
] as const;

const SAP_ACCOUNT_TYPES = [
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'Expense',
] as const;

// ─── Adapter ────────────────────────────────────────────────────────────────

export const sapTargetMapper: ERPAdapter = {
  id: 'sap',
  name: 'SAP',
  fields: SAP_FIELDS,

  mapSourceRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalised = key.toLowerCase().trim();
      const fieldId = SAP_FIELD_MAP[normalised];
      if (fieldId !== undefined) {
        mapped[fieldId] = value;
      }
    }
    return mapped;
  },

  mapTargetRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const displayName = GENERIC_TO_SAP[key];
      if (displayName !== undefined) {
        mapped[displayName] = value;
      }
    }
    return mapped;
  },

  getAccountTypes(): readonly string[] {
    return SAP_ACCOUNT_TYPES;
  },
};
