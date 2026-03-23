// ERPAdapter interface will move to features/migration/types/erp.types.ts in Phase 1.
// Defined here temporarily so the registry can be typed during scaffold phase.
export interface ERPAdapter {
  id: string;
  name: string;
  parseRow: (row: Record<string, unknown>) => Record<string, unknown>;
  getFieldSchema: () => Array<{ field: string; label: string; required: boolean }>;
  getAccountTypes: () => string[];
}

export const erpRegistry: Record<string, ERPAdapter> = {
  // Adapters will be registered here as they are implemented
};

export function getAdapter(id: string): ERPAdapter | undefined {
  return erpRegistry[id];
}

export function getRegisteredAdapters(): ERPAdapter[] {
  return Object.values(erpRegistry);
}
