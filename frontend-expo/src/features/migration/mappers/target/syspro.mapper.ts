import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Field Mapping ──────────────────────────────────────────────────────────

const SYSPRO_FIELD_MAP: Record<string, string> = {
  'gl account': 'account_number',
  'description': 'account_name',
  'account type': 'account_type',
  'group': 'group',
  'currency': 'currency',
};

const GENERIC_TO_SYSPRO: Record<string, string> = {
  account_number: 'GL Account',
  account_name: 'Description',
  account_type: 'Account Type',
  group: 'Group',
  currency: 'Currency',
};

// ─── Schema ─────────────────────────────────────────────────────────────────

const SYSPRO_FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'GL Account', type: 'string', required: true },
  { id: 'account_name', name: 'Description', type: 'string', required: true },
  { id: 'account_type', name: 'Account Type', type: 'string', required: true },
  { id: 'group', name: 'Group', type: 'string', required: false },
  { id: 'currency', name: 'Currency', type: 'string', required: false },
] as const;

const SYSPRO_ACCOUNT_TYPES = [
  'Asset',
  'Liability',
  'Capital',
  'Income',
  'Expense',
] as const;

// ─── Adapter ────────────────────────────────────────────────────────────────

export const sysproTargetMapper: ERPAdapter = {
  id: 'syspro',
  name: 'Syspro',
  fields: SYSPRO_FIELDS,

  mapSourceRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalised = key.toLowerCase().trim();
      const fieldId = SYSPRO_FIELD_MAP[normalised];
      if (fieldId !== undefined) {
        mapped[fieldId] = value;
      }
    }
    return mapped;
  },

  mapTargetRow(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const displayName = GENERIC_TO_SYSPRO[key];
      if (displayName !== undefined) {
        mapped[displayName] = value;
      }
    }
    return mapped;
  },

  getAccountTypes(): readonly string[] {
    return SYSPRO_ACCOUNT_TYPES;
  },
};
