import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Field Mapping ──────────────────────────────────────────────────────────

const FIELD_MAP: Record<string, string> = {
  'number': 'account_number',
  'name': 'account_name',
  'type': 'account_type',
  'detail type': 'detail_type',
  'description': 'description',
  'balance': 'balance',
};

const GENERIC_TO_QUICKBOOKS: Record<string, string> = {
  account_number: 'Number',
  account_name: 'Name',
  account_type: 'Type',
  detail_type: 'Detail Type',
  description: 'Description',
  balance: 'Balance',
};

// ─── Schema ─────────────────────────────────────────────────────────────────

const FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'Number', type: 'string', required: false },
  { id: 'account_name', name: 'Name', type: 'string', required: true },
  { id: 'account_type', name: 'Type', type: 'string', required: true },
  { id: 'detail_type', name: 'Detail Type', type: 'string', required: false },
  { id: 'description', name: 'Description', type: 'string', required: false },
  { id: 'balance', name: 'Balance', type: 'number', required: false },
] as const;

const ACCOUNT_TYPES = [
  'Bank',
  'Accounts Receivable',
  'Other Current Assets',
  'Fixed Assets',
  'Other Assets',
  'Accounts Payable',
  'Credit Card',
  'Other Current Liability',
  'Long Term Liability',
  'Equity',
  'Income',
  'Other Income',
  'Cost of Goods Sold',
  'Expenses',
  'Other Expense',
] as const;

// ─── Adapter ────────────────────────────────────────────────────────────────

export const quickbooksSourceMapper: ERPAdapter = {
  id: 'quickbooks',
  name: 'QuickBooks',
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
      const erpField = GENERIC_TO_QUICKBOOKS[key];
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
