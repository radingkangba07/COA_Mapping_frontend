import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { ArrowRight, Info, Search } from 'lucide-react-native';
import { Select } from '@/shared/components/ui/Select';
import type { SelectOption } from '@/shared/components/ui/Select';
import { colors } from '@/config/theme';
import {
  getERPById,
  getProductsByVendor,
  getUniqueVendors,
} from '@/shared/constants/erp-systems';
import type { ERPSystem } from '@/features/erp-config/types/erp-config.types';
import type { ConnectionMethod } from '../types/project-scope.types';

// ─── Constants ───────────────────────────────────────────────────────────────

const CONNECTION_METHOD_OPTIONS: SelectOption[] = [
  { label: 'MCP Server (Model Context Protocol)', value: 'mcp' },
  { label: 'CSV File Upload', value: 'csv' },
];

const VENDOR_OPTIONS: SelectOption[] = getUniqueVendors().map((v) => ({
  label: v,
  value: v,
}));

// ─── ErpCard ─────────────────────────────────────────────────────────────────

interface ErpCardProps {
  label: string;
  role: 'source' | 'target';
  selectedErpId: string | null;
  selectedMethod: ConnectionMethod;
  isLoading: boolean;
  onSelectErp: (id: string | null) => void;
  onSelectMethod: (method: ConnectionMethod) => void;
}

const ErpCard = ({
  label,
  role,
  selectedErpId,
  selectedMethod,
  isLoading,
  onSelectErp,
  onSelectMethod,
}: ErpCardProps): React.JSX.Element => {
  const [localVendor, setLocalVendor] = useState<string | null>(
    getERPById(selectedErpId ?? '')?.vendor ?? null,
  );

  // Sync vendor when ERP id is hydrated from draft or cleared externally
  useEffect(() => {
    setLocalVendor(getERPById(selectedErpId ?? '')?.vendor ?? null);
  }, [selectedErpId]);

  const productOptions: SelectOption[] = getProductsByVendor(
    localVendor ?? '',
  ).map((e) => ({ label: e.productName, value: e.id }));

  const handleVendorChange = useCallback(
    (vendor: string) => {
      setLocalVendor(vendor);
      onSelectErp(null); // clear product when vendor changes
    },
    [onSelectErp],
  );

  return (
    <View
      className="flex-1 rounded-lg border border-border bg-background p-2 gap-2"
      testID={`erp-card-${role}`}
    >
      <Text className="font-heading text-sm font-semibold text-foreground">
        {label}
      </Text>

      <View className="gap-1">
        <Text className="font-body text-sm font-bold text-foreground">
          Step 1: Select Vendor
        </Text>
        <Select
          options={VENDOR_OPTIONS}
          value={localVendor ?? undefined}
          onValueChange={handleVendorChange}
          placeholder="Select vendor"
          disabled={isLoading}
          testID={`erp-vendor-select-${role}`}
        />
      </View>

      <View className="gap-1">
        <Text className="font-body text-sm font-bold text-foreground">
          Step 2: Select Product
        </Text>
        <Select
          options={productOptions}
          value={selectedErpId ?? undefined}
          onValueChange={(v) => onSelectErp(v)}
          placeholder="Select product"
          disabled={localVendor === null || isLoading}
          testID={`erp-product-select-${role}`}
        />
      </View>

      <View className="gap-1">
        <View className="flex-row items-center gap-1">
          <Text className="font-body text-sm font-bold text-foreground">
            Step 3: Select Connection Method
          </Text>
          <Info size={14} color={colors.mutedForeground} />
        </View>
        <Select
          options={CONNECTION_METHOD_OPTIONS}
          value={selectedMethod}
          onValueChange={(v) => onSelectMethod(v as ConnectionMethod)}
          placeholder="Select connection method"
          disabled={selectedErpId === null}
          testID={`erp-method-select-${role}`}
        />
      </View>
    </View>
  );
};

// ─── ErpSectionSearch — rendered as headerRight in the section card ───────────

export const ErpSectionSearch = (): React.JSX.Element => (
  <View className="flex-col items-end gap-1 flex-shrink-0">
    <Text
      className="font-body text-xs font-medium text-foreground"
      accessibilityRole="link"
    >
      Need more ERP options?
    </Text>
    <View className="flex-row items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1">
      <Search size={14} color={colors.mutedForeground} />
      <TextInput
        placeholder="Search ERP systems..."
        placeholderTextColor={colors.mutedForeground}
        editable={false}
        className="font-body text-sm text-foreground w-36"
        accessibilityLabel="Search ERP systems"
      />
    </View>
  </View>
);

// ─── ErpSourceTargetSelect ────────────────────────────────────────────────────

export interface ErpSourceTargetSelectProps {
  erpSystems: ReadonlyArray<ERPSystem>;
  source: string | null;
  target: string | null;
  sourceMethod: ConnectionMethod;
  targetMethod: ConnectionMethod;
  isLoading?: boolean;
  onSelectSource: (id: string | null) => void;
  onSelectTarget: (id: string | null) => void;
  onSelectSourceMethod: (method: ConnectionMethod) => void;
  onSelectTargetMethod: (method: ConnectionMethod) => void;
  testID?: string;
}

export const ErpSourceTargetSelect = ({
  erpSystems,
  source,
  target,
  sourceMethod,
  targetMethod,
  isLoading = false,
  onSelectSource,
  onSelectTarget,
  onSelectSourceMethod,
  onSelectTargetMethod,
  testID,
}: ErpSourceTargetSelectProps): React.JSX.Element => {
  const loading = isLoading && erpSystems.length === 0;

  return (
    <View className="flex-col gap-2 lg:flex-row lg:items-stretch" testID={testID}>
      <ErpCard
        label="Source ERP (From)"
        role="source"
        selectedErpId={source}
        selectedMethod={sourceMethod}
        isLoading={loading}
        onSelectErp={onSelectSource}
        onSelectMethod={onSelectSourceMethod}
      />

      <View className="items-center justify-center py-1">
        <View className="h-10 w-10 items-center justify-center rounded-full border border-border bg-background">
          <ArrowRight size={16} color={colors.foreground} />
        </View>
      </View>

      <ErpCard
        label="Target ERP (To)"
        role="target"
        selectedErpId={target}
        selectedMethod={targetMethod}
        isLoading={loading}
        onSelectErp={onSelectTarget}
        onSelectMethod={onSelectTargetMethod}
      />
    </View>
  );
};
