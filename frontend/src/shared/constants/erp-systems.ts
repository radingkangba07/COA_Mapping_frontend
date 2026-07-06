const ERP_SYSTEMS_DATA = [
  {
    id: 'sap',
    name: 'SAP',
    description: 'SAP ERP / S/4HANA financial accounting',
    isStub: false,
    brandColor: '#0070F2',
  },
  {
    id: 'oracle_netsuite',
    name: 'Oracle NetSuite',
    description: 'Oracle NetSuite cloud ERP accounting',
    isStub: false,
    brandColor: '#F80000',
  },
  {
    id: 'dynamics365',
    name: 'Microsoft Dynamics 365',
    description: 'Microsoft Dynamics 365 Finance & Operations',
    isStub: false,
    brandColor: '#107C10',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Intuit QuickBooks Online / Desktop accounting',
    isStub: false,
    brandColor: '#2CA01C',
  },
  {
    id: 'sage_intacct',
    name: 'Sage Intacct',
    description: 'Sage Intacct cloud financial management',
    isStub: false,
    brandColor: '#00B050',
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Xero cloud-based accounting platform',
    isStub: false,
    brandColor: '#1AB4D7',
  },
  {
    id: 'odoo',
    name: 'Odoo',
    description: 'Odoo open-source ERP accounting module',
    isStub: true,
    brandColor: '#E86C1B',
  },
  {
    id: 'syspro',
    name: 'Syspro',
    description: 'Syspro ERP for manufacturing and distribution',
    isStub: true,
    brandColor: '#005BAC',
  },
  {
    id: 'accpac',
    name: 'Accpac',
    description: 'Sage 300 (Accpac) business management',
    isStub: true,
    brandColor: '#C8002F',
  },
] as const;

export type ERPSystemId = (typeof ERP_SYSTEMS_DATA)[number]['id'];

export interface ERPSystemInfo {
  readonly id: ERPSystemId;
  readonly name: string;
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
