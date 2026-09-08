export type MasterDataColumn = 'dataConversion' | 'mdm';

export interface MasterDataItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export const CHART_OF_ACCOUNTS_ID = 'chart-of-accounts';

// Every master-data scope now has an active migration flow: Chart of
// Accounts through the existing migration feature, and every other entity
// through the generic master-data wizard (see useOpenWorkstream.ts's
// MASTER_DATA_NAMES) — none of it branches per entity (see root CLAUDE.md),
// so there's no reason left to gate the Data Conversion checkbox per row.
export const ENABLED_SCOPE_IDS = new Set([
  CHART_OF_ACCOUNTS_ID,
  'customers',
  'vendors',
  'items',
  'locations',
  'contacts',
  'vehicles',
  'equipment',
  'fixed-assets',
]);

export const MASTER_DATA_ITEMS: readonly MasterDataItem[] = [
  {
    id: CHART_OF_ACCOUNTS_ID,
    label: 'Chart of Accounts',
    description: 'General ledger account structure and hierarchy.',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Customer master records and contact details.',
  },
  {
    id: 'vendors',
    label: 'Vendors',
    description: 'Supplier master records and contact details.',
  },
  {
    id: 'items',
    label: 'Items',
    description: 'Product and item catalog definitions.',
  },
  {
    id: 'locations',
    label: 'Locations',
    description: 'Physical and logical location definitions.',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Contact records linked to customers and vendors.',
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    description: 'Vehicle asset records and fleet data.',
  },
  {
    id: 'equipment',
    label: 'Equipment',
    description: 'Equipment asset records and details.',
  },
  {
    id: 'fixed-assets',
    label: 'Fixed Assets',
    description: 'Fixed asset register and depreciation data.',
  },
];

export interface OpeningBalanceItem {
  readonly id: string;
  readonly label: string;
}

export const OPENING_BALANCE_ITEMS: readonly OpeningBalanceItem[] = [
  { id: 'historical-balance-sheet-start', label: 'Historical Balance Sheet Start' },
  { id: 'trial-balance-movement', label: 'Trial Balance Movement' },
  { id: 'open-ar', label: 'Open Accounts Receivable' },
  { id: 'open-ap', label: 'Open Accounts Payables' },
  { id: 'stock-on-hand', label: 'Stock On Hand' },
];
