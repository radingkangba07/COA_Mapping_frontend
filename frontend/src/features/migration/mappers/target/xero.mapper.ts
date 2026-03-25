import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Field Mapping ──────────────────────────────────────────────────────────

const XERO_FIELD_MAP: Record<string, string> = {
  'code': 'account_number',
  'name': 'account_name',
  'type': 'account_type',
  'tax type': 'tax_type',
  'description': 'description',
  'bank account number': 'bank_account_number',
};

const GENERIC_TO_XERO: Record<string, string> = {
  account_number: 'Code',
  account_name: 'Name',
  account_type: 'Type',
  tax_type: 'Tax Type',
  description: 'Description',
  bank_account_number: 'Bank Account Number',
};

// ─── Schema ─────────────────────────────────────────────────────────────────

const XERO_FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'Code', type: 'string', required: false },
  { id: 'account_name', name: 'Name', type: 'string', required: true },
  { id: 'account_type', name: 'Type', type: 'string', required: true },
  { id: 'tax_type', name: 'Tax Type', type: 'string', required: false },
  { id: 'description', name: 'Description', type: 'string', required: false },
  { id: 'bank_account_number', name: 'Bank Account Number', type: 'string', required: false },
] as const;

const XERO_ACCOUNT_TYPES = [
  'BANK',
  'CURRENT',
  'FIXED',
  'INVENTORY',
  'NONCURRENT',
  'PREPAYMENT',
  'CURRLIAB',
  'TERMLIAB',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'OTHERINCOME',
  'DIRECTCOSTS',
  'OVERHEADS',
  'EXPENSE',
  'DEPRECIATN',
] as const;

// ─── Adapter ────────────────────────────────────────────────────────────────

export const xeroTargetMapper: ERPAdapter = {
  id: 'xero',
  name: 'Xero',
  fields: XERO_FIELDS,

  mapSourceRow(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      const generic = XERO_FIELD_MAP[key.toLowerCase()];
      if (generic !== undefined) {
        result[generic] = value;
      }
    }

    return result;
  },

  mapTargetRow(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      const erpField = GENERIC_TO_XERO[key];
      if (erpField !== undefined) {
        result[erpField] = value;
      }
    }

    return result;
  },

  getAccountTypes(): readonly string[] {
    return XERO_ACCOUNT_TYPES;
  },
};
