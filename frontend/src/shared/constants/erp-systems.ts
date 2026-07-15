const ERP_SYSTEMS_DATA = [
  {
    id: 'sap',
    name: 'SAP',
    vendor: 'SAP',
    vendorId: 'sap',
    productName: 'SAP S/4HANA',
    description: 'SAP ERP / S/4HANA financial accounting',
    isStub: false,
    brandColor: '#0070F2',
  },
  {
    id: 'oracle_netsuite',
    name: 'Oracle NetSuite',
    vendor: 'Oracle',
    vendorId: 'oracle',
    productName: 'NetSuite ERP',
    description: 'Oracle NetSuite cloud ERP accounting',
    isStub: false,
    brandColor: '#F80000',
  },
  {
    id: 'dynamics365',
    name: 'Microsoft Dynamics 365',
    vendor: 'Microsoft',
    vendorId: 'microsoft',
    productName: 'Dynamics 365',
    description: 'Microsoft Dynamics 365 Finance & Operations',
    isStub: false,
    brandColor: '#107C10',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    vendor: 'Intuit',
    vendorId: 'intuit',
    productName: 'QuickBooks',
    description: 'Intuit QuickBooks Online / Desktop accounting',
    isStub: false,
    brandColor: '#2CA01C',
  },
  {
    id: 'sage_intacct',
    name: 'Sage Intacct',
    vendor: 'Sage',
    vendorId: 'sage',
    productName: 'Sage Intacct',
    description: 'Sage Intacct cloud financial management',
    isStub: false,
    brandColor: '#00B050',
  },
  {
    id: 'xero',
    name: 'Xero',
    vendor: 'Xero',
    vendorId: 'xero',
    productName: 'Xero',
    description: 'Xero cloud-based accounting platform',
    isStub: false,
    brandColor: '#1AB4D7',
  },
  {
    id: 'odoo',
    name: 'Odoo',
    vendor: 'Odoo',
    vendorId: 'odoo',
    productName: 'Odoo',
    description: 'Odoo open-source ERP accounting module',
    isStub: true,
    brandColor: '#E86C1B',
  },
  {
    id: 'syspro',
    name: 'Syspro',
    vendor: 'SYSPRO',
    vendorId: 'syspro',
    productName: 'SYSPRO ERP',
    description: 'Syspro ERP for manufacturing and distribution',
    isStub: true,
    brandColor: '#005BAC',
  },
  {
    id: 'accpac',
    name: 'Accpac',
    vendor: 'Sage',
    vendorId: 'sage',
    productName: 'Sage 300 (Accpac)',
    description: 'Sage 300 (Accpac) business management',
    isStub: true,
    brandColor: '#C8002F',
  },
] as const;

export type ERPSystemId = (typeof ERP_SYSTEMS_DATA)[number]['id'];

export interface ERPSystemInfo {
  readonly id: ERPSystemId;
  readonly name: string;
  readonly vendor: string;
  /** Backend catalog vendor key — sent as source/target_vendor_id on create. */
  readonly vendorId: string;
  readonly productName: string;
  readonly description: string;
  readonly isStub: boolean;
  readonly brandColor: string;
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
