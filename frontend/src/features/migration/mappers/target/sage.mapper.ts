import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Field Mapping ──────────────────────────────────────────────────────────

const SAGE_FIELD_MAP: Record<string, string> = {
  'account no': 'account_number',
  'title': 'account_name',
  'account type': 'account_type',
  'normal balance': 'normal_balance',
  'category': 'category',
  'department id': 'department_id',
};

const GENERIC_TO_SAGE: Record<string, string> = {
  account_number: 'Account No',
  account_name: 'Title',
  account_type: 'Account Type',
  normal_balance: 'Normal Balance',
  category: 'Category',
  department_id: 'Department ID',
};

// ─── Schema ─────────────────────────────────────────────────────────────────

const SAGE_FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'Account No', type: 'string', required: true },
  { id: 'account_name', name: 'Title', type: 'string', required: true },
  { id: 'account_type', name: 'Account Type', type: 'string', required: true },
  { id: 'normal_balance', name: 'Normal Balance', type: 'string', required: false },
  { id: 'category', name: 'Category', type: 'string', required: false },
  { id: 'department_id', name: 'Department ID', type: 'string', required: false },
] as const;

const SAGE_ACCOUNT_TYPES = [
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'Expense',
] as const;

// ─── Adapter ────────────────────────────────────────────────────────────────

export const sageTargetMapper: ERPAdapter = {
  id: 'sage_intacct',
  name: 'Sage Intacct',
  fields: SAGE_FIELDS,

  mapSourceRow(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      const generic = SAGE_FIELD_MAP[key.toLowerCase().trim()];
      if (generic !== undefined) {
        result[generic] = value;
      }
    }

    return result;
  },

  mapTargetRow(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      const erpField = GENERIC_TO_SAGE[key];
      if (erpField !== undefined) {
        result[erpField] = value;
      }
    }

    return result;
  },

  getAccountTypes(): readonly string[] {
    return SAGE_ACCOUNT_TYPES;
  },
};
