import type { ERPSystemId } from './erp-systems';

export interface ERPBrandConfig {
  readonly abbreviation: string;
  readonly bgColor: string;
  readonly textColor: string;
}

const DEFAULT_BRAND: ERPBrandConfig = {
  abbreviation: '?',
  bgColor: '#6B7280',
  textColor: '#FFFFFF',
};

export const ERP_BRAND_MAP: Record<ERPSystemId, ERPBrandConfig> = {
  sap: { abbreviation: 'S', bgColor: '#0070F2', textColor: '#FFFFFF' },
  oracle_netsuite: { abbreviation: 'N', bgColor: '#E87722', textColor: '#FFFFFF' },
  dynamics365: { abbreviation: 'D', bgColor: '#00A4EF', textColor: '#FFFFFF' },
  quickbooks: { abbreviation: 'Q', bgColor: '#2CA01C', textColor: '#FFFFFF' },
  sage_intacct: { abbreviation: 'Si', bgColor: '#00DC82', textColor: '#1A1A1A' },
  xero: { abbreviation: 'X', bgColor: '#13B5EA', textColor: '#FFFFFF' },
  odoo: { abbreviation: 'O', bgColor: '#714B67', textColor: '#FFFFFF' },
  syspro: { abbreviation: 'Sy', bgColor: '#E31937', textColor: '#FFFFFF' },
  accpac: { abbreviation: 'A', bgColor: '#0054A6', textColor: '#FFFFFF' },
};

export function getERPBrand(erpId: string): ERPBrandConfig {
  if (erpId in ERP_BRAND_MAP) {
    return ERP_BRAND_MAP[erpId as ERPSystemId];
  }
  return DEFAULT_BRAND;
}