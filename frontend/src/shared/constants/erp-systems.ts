const ERP_SYSTEMS_DATA = [
  {
    id: 'sap',
    name: 'SAP',
    vendor: 'SAP',
    productName: 'SAP S/4HANA',
    description: 'SAP ERP / S/4HANA financial accounting',
    isStub: false,
  },
  {
    id: 'oracle_netsuite',
    name: 'Oracle NetSuite',
    vendor: 'Oracle',
    productName: 'NetSuite ERP',
    description: 'Oracle NetSuite cloud ERP accounting',
    isStub: false,
  },
  {
    id: 'dynamics365',
    name: 'Microsoft Dynamics 365',
    vendor: 'Microsoft',
    productName: 'Dynamics 365',
    description: 'Microsoft Dynamics 365 Finance & Operations',
    isStub: false,
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    vendor: 'Intuit',
    productName: 'QuickBooks',
    description: 'Intuit QuickBooks Online / Desktop accounting',
    isStub: false,
  },
  {
    id: 'sage_intacct',
    name: 'Sage Intacct',
    vendor: 'Sage',
    productName: 'Sage Intacct',
    description: 'Sage Intacct cloud financial management',
    isStub: false,
  },
  {
    id: 'xero',
    name: 'Xero',
    vendor: 'Xero',
    productName: 'Xero',
    description: 'Xero cloud-based accounting platform',
    isStub: false,
  },
  {
    id: 'odoo',
    name: 'Odoo',
    vendor: 'Odoo',
    productName: 'Odoo',
    description: 'Odoo open-source ERP accounting module',
    isStub: true,
  },
  {
    id: 'syspro',
    name: 'Syspro',
    vendor: 'SYSPRO',
    productName: 'SYSPRO ERP',
    description: 'Syspro ERP for manufacturing and distribution',
    isStub: true,
  },
  {
    id: 'accpac',
    name: 'Accpac',
    vendor: 'Sage',
    productName: 'Sage 300 (Accpac)',
    description: 'Sage 300 (Accpac) business management',
    isStub: true,
  },
] as const;

export type ERPSystemId = (typeof ERP_SYSTEMS_DATA)[number]['id'];

export interface ERPSystemInfo {
  readonly id: ERPSystemId;
  readonly name: string;
  readonly vendor: string;
  readonly productName: string;
  readonly description: string;
  readonly isStub: boolean;
}

export const ERP_SYSTEMS: readonly ERPSystemInfo[] = ERP_SYSTEMS_DATA;

export const ERP_SYSTEM_IDS: readonly ERPSystemId[] = ERP_SYSTEMS_DATA.map((erp) => erp.id);

export function getERPById(id: string): ERPSystemInfo | undefined {
  return ERP_SYSTEMS.find((erp) => erp.id === id);
}

export function getActiveERPs(): readonly ERPSystemInfo[] {
  return ERP_SYSTEMS.filter((erp) => !erp.isStub);
}

export function getUniqueVendors(): readonly string[] {
  const seen = new Set<string>();
  const vendors: string[] = [];
  for (const erp of ERP_SYSTEMS) {
    if (!seen.has(erp.vendor)) {
      seen.add(erp.vendor);
      vendors.push(erp.vendor);
    }
  }
  return vendors;
}

export function getProductsByVendor(vendor: string): readonly ERPSystemInfo[] {
  return ERP_SYSTEMS.filter((erp) => erp.vendor === vendor);
}
