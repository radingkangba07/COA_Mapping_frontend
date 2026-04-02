import React from 'react';
import { Text, View } from 'react-native';
import type { ERPInfo } from './sidebar.types';

const ERP_BADGE_COLORS = {
  sap: 'bg-blue-600',
  oracle_netsuite: 'bg-orange-500',
  dynamics365: 'bg-green-600',
  quickbooks: 'bg-emerald-500',
  sage_intacct: 'bg-teal-600',
  xero: 'bg-sky-500',
  odoo: 'bg-purple-600',
  syspro: 'bg-rose-600',
  accpac: 'bg-cyan-600',
} as const satisfies Record<string, string>;

const ERP_INITIALS = {
  sap: 'S',
  oracle_netsuite: 'N',
  dynamics365: 'D',
  quickbooks: 'Q',
  sage_intacct: 'S',
  xero: 'X',
  odoo: 'O',
  syspro: 'Y',
  accpac: 'A',
} as const satisfies Record<string, string>;

export function getERPBadgeColor(erpId: string): string {
  return (ERP_BADGE_COLORS as Record<string, string>)[erpId] ?? 'bg-gray-500';
}

export function getERPInitial(erpId: string): string {
  return (ERP_INITIALS as Record<string, string>)[erpId] ?? erpId.charAt(0).toUpperCase();
}

interface ERPBadgeProps {
  readonly erp: ERPInfo | null;
  readonly label: string;
  readonly className?: string;
  readonly labelClassName?: string;
  readonly testID?: string;
}

export const ERPBadge = ({ erp, label, className, labelClassName, testID }: ERPBadgeProps) => (
  <View className={`rounded-lg border border-border ${className ?? ''} p-3`} testID={testID}>
    <Text className={`mb-1 font-body text-[10px] font-semibold uppercase tracking-wide ${labelClassName ?? 'text-muted-foreground'}`}>
      {label}
    </Text>
    {erp ? (
      <View className="flex-row items-center gap-2">
        <View className={`h-7 w-7 items-center justify-center rounded-full ${getERPBadgeColor(erp.id)}`}>
          <Text className="font-body text-xs font-bold text-white">
            {getERPInitial(erp.id)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-body text-sm font-semibold text-foreground">
            {erp.name}
          </Text>
          <Text className="font-mono text-xs text-muted-foreground">
            {erp.fieldCount} fields
          </Text>
        </View>
      </View>
    ) : (
      <Text className="font-body text-sm italic text-muted-foreground">
        Not selected
      </Text>
    )}
  </View>
);
