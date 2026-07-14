import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { ArrowRight, Info, Search } from 'lucide-react-native';
import { Select } from '@/shared/components/ui/Select';
import { colors } from '@/config/theme';
import { useErpCascade } from '../hooks/useErpCascade';
import type { ERPSystem } from '@/features/erp-config/types/erp-config.types';
import type { ConnectionMethod } from '../types/project-scope.types';

// ─── ErpCard ─────────────────────────────────────────────────────────────────

interface ErpCardProps {
  label: string;
  role: 'source' | 'target';
  selectedErpId: string | null;
  selectedMethod: ConnectionMethod;
  isLoading: boolean;
  onSelectErp: (id: string | null) => void;
  onSelectMethod: (method: ConnectionMethod) => void;
  onVendorResolved?: (vendor: string | null) => void;
}

const ErpCard = ({
  label,
  role,
  selectedErpId,
  selectedMethod,
  isLoading,
  onSelectErp,
  onSelectMethod,
  onVendorResolved,
}: ErpCardProps): React.JSX.Element => {
  const {
    vendorOptions,
    productOptions,
    connectionMethodOptions,
    selectedVendor,
    isLoadingVendors,
    isLoadingProducts,
    onVendorChange,
    onProductChange,
  } = useErpCascade(selectedErpId, onSelectErp, onSelectMethod, role, onVendorResolved);

  const disabled = isLoading;

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
          options={vendorOptions}
          value={selectedVendor ?? undefined}
          onValueChange={onVendorChange}
          placeholder={isLoadingVendors ? 'Loading vendors…' : 'Select vendor'}
          disabled={disabled || isLoadingVendors}
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
          onValueChange={onProductChange}
          placeholder={isLoadingProducts ? 'Loading products…' : 'Select product'}
          disabled={disabled || selectedVendor === null || isLoadingProducts}
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
          options={connectionMethodOptions}
          value={selectedMethod}
          onValueChange={(v) => onSelectMethod(v as ConnectionMethod)}
          placeholder="Select connection method"
          disabled={disabled || selectedErpId === null || connectionMethodOptions.length === 0}
          testID={`erp-method-select-${role}`}
        />
      </View>
    </View>
  );
};

// ─── ErpSectionSearch ─────────────────────────────────────────────────────────

export const ErpSectionSearch = (): React.JSX.Element => (
  <View className="flex-col items-end gap-1 flex-shrink-0">
    <Text
      className="font-body text-sm text-primary"
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
  onSelectSourceVendor?: (vendor: string | null) => void;
  onSelectTargetVendor?: (vendor: string | null) => void;
  testID?: string;
}

export const ErpSourceTargetSelect = ({
  source,
  target,
  sourceMethod,
  targetMethod,
  isLoading = false,
  onSelectSource,
  onSelectTarget,
  onSelectSourceMethod,
  onSelectTargetMethod,
  onSelectSourceVendor,
  onSelectTargetVendor,
  testID,
}: ErpSourceTargetSelectProps): React.JSX.Element => {
  const loading = isLoading;

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
        onVendorResolved={onSelectSourceVendor}
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
        onVendorResolved={onSelectTargetVendor}
      />
    </View>
  );
};
