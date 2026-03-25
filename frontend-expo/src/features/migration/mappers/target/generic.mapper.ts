import type { ERPAdapter, ERPFieldSchema } from '@/features/migration/types/erp.types';

// ─── Alias Maps ─────────────────────────────────────────────────────────────

const ACCOUNT_NUMBER_ALIASES = [
  'account number',
  'account no',
  'acct no',
  'number',
  'code',
  'gl account',
  'account code',
  'main account',
  'account',
] as const;

const ACCOUNT_NAME_ALIASES = [
  'account name',
  'name',
  'description',
  'title',
  'account description',
  'acct name',
] as const;

const ACCOUNT_TYPE_ALIASES = [
  'account type',
  'type',
  'main account type',
  'category',
] as const;

type AliasEntry = {
  readonly aliases: readonly string[];
  readonly genericKey: string;
};

const ALIAS_GROUPS: readonly AliasEntry[] = [
  { aliases: ACCOUNT_NUMBER_ALIASES, genericKey: 'account_number' },
  { aliases: ACCOUNT_NAME_ALIASES, genericKey: 'account_name' },
  { aliases: ACCOUNT_TYPE_ALIASES, genericKey: 'account_type' },
];

// ─── Schema ─────────────────────────────────────────────────────────────────

const GENERIC_FIELDS: readonly ERPFieldSchema[] = [
  { id: 'account_number', name: 'Account Number', type: 'string', required: true },
  { id: 'account_name', name: 'Account Name', type: 'string', required: true },
  { id: 'account_type', name: 'Account Type', type: 'string', required: true },
] as const;

const GENERIC_ACCOUNT_TYPES = [
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'Expense',
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildAliasLookup(): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const group of ALIAS_GROUPS) {
    for (const alias of group.aliases) {
      lookup.set(alias, group.genericKey);
    }
  }

  return lookup;
}

const ALIAS_LOOKUP = buildAliasLookup();

// ─── Adapter ────────────────────────────────────────────────────────────────

export const genericTargetMapper: ERPAdapter = {
  id: 'generic',
  name: 'Generic',
  fields: GENERIC_FIELDS,

  mapSourceRow(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const mappedKeys = new Set<string>();

    for (const [key, value] of Object.entries(row)) {
      const genericKey = ALIAS_LOOKUP.get(key.toLowerCase().trim());

      if (genericKey !== undefined && !mappedKeys.has(genericKey)) {
        result[genericKey] = value;
        mappedKeys.add(genericKey);
      }
    }

    for (const [key, value] of Object.entries(row)) {
      const genericKey = ALIAS_LOOKUP.get(key.toLowerCase().trim());

      if (genericKey === undefined) {
        result[key] = value;
      }
    }

    return result;
  },

  mapTargetRow(row: Record<string, unknown>): Record<string, unknown> {
    return { ...row };
  },

  getAccountTypes(): readonly string[] {
    return GENERIC_ACCOUNT_TYPES;
  },
};
