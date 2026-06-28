export type MasterDataColumn = 'dataConversion' | 'mdm';

export interface MasterDataItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export const CHART_OF_ACCOUNTS_ID = 'chart-of-accounts';

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
    label: 'Items & Products',
    description: 'Product and item catalog definitions.',
  },
  {
    id: 'tax-codes',
    label: 'Tax Codes',
    description: 'Tax rate codes and jurisdiction rules.',
  },
  {
    id: 'currencies',
    label: 'Currencies',
    description: 'Currency definitions and exchange settings.',
  },
  {
    id: 'payment-terms',
    label: 'Payment Terms',
    description: 'Payment term schedules and due-date rules.',
  },
  {
    id: 'cost-centers',
    label: 'Cost Centers',
    description: 'Cost center structure for expense allocation.',
  },
  {
    id: 'dimensions',
    label: 'Dimensions',
    description: 'Analytical reporting dimensions and segments.',
  },
];

export interface OpeningBalanceItem {
  readonly id: string;
  readonly label: string;
}

export const OPENING_BALANCE_ITEMS: readonly OpeningBalanceItem[] = [
  { id: 'gl-balances', label: 'General Ledger Balances' },
  { id: 'ar-balances', label: 'Accounts Receivable' },
  { id: 'ap-balances', label: 'Accounts Payable' },
  { id: 'inventory-balances', label: 'Inventory' },
  { id: 'bank-balances', label: 'Bank Balances' },
];
