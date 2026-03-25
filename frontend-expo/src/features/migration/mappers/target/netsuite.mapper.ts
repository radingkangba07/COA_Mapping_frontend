import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Field Mapping ──────────────────────────────────────────────────────────

const NETSUITE_FIELD_MAP: Record<string, string> = {
  'account number': 'account_number',
  'account name': 'account_name',
  'type': 'account_type',
  'subaccount of': 'parent_account',
  'currency': 'currency',
  'department': 'department',
  'class': 'class',
  'location': 'location',
};

const GENERIC_TO_NETSUITE: Record<string, string> = {
  account_number: 'Account Number',
  account_name: 'Account Name',
  account_type: 'Type',
  parent_account: 'Subaccount Of',
  currency: 'Currency',
  department: 'Department',
  class: 'Class',
  location: 'Location',
};

// ─── Schema ─────────────────────────────────────────────────────────────────

const NETSUITE_FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'Account Number', type: 'string', required: true },
  { id: 'account_name', name: 'Account Name', type: 'string', required: true },
  { id: 'account_type', name: 'Type', type: 'string', required: true },
  { id: 'parent_account', name: 'Subaccount Of', type: 'string', required: false },
  { id: 'currency', name: 'Currency', type: 'string', required: false },
  { id: 'department', name: 'Department', type: 'string', required: false },
  { id: 'class', name: 'Class', type: 'string', required: false },
  { id: 'location', name: 'Location', type: 'string', required: false },
] as const;

const NETSUITE_ACCOUNT_TYPES = [
  'Bank',
  'Accounts Receivable',
  'Other Current Asset',
  'Fixed Asset',
  'Other Asset',
  'Accounts Payable',
  'Credit Card',
  'Other Current Liability',
  'Long Term Liability',
  'Equity',
  'Income',
  'Other Income',
  'Cost of Goods Sold',
  'Expense',
  'Other Expense',
] as const;

// ─── Adapter ────────────────────────────────────────────────────────────────

export const netsuiteTargetMapper: ERPAdapter = {
  id: 'oracle_netsuite',
  name: 'Oracle NetSuite',
  fields: NETSUITE_FIELDS,

  mapSourceRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalised = key.toLowerCase().trim();
      const fieldId = NETSUITE_FIELD_MAP[normalised];
      if (fieldId !== undefined) {
        mapped[fieldId] = value;
      }
    }
    return mapped;
  },

  mapTargetRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const displayName = GENERIC_TO_NETSUITE[key];
      if (displayName !== undefined) {
        mapped[displayName] = value;
      }
    }
    return mapped;
  },

  getAccountTypes(): readonly string[] {
    return NETSUITE_ACCOUNT_TYPES;
  },
};
