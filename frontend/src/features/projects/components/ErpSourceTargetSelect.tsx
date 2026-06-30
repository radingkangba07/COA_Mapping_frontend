import React from 'react';
import { View, Text } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { Select } from '@/shared/components/ui/Select';
import { colors } from '@/config/theme';
import type { ConnectionMethod } from '../types/project-scope.types';
import { ConnectionMethodSelect } from './ConnectionMethodSelect';

const ARROW_SIZE = 20;

interface ErpOption {
  readonly id: string;
  readonly name: string;
}

interface ErpSourceTargetSelectProps {
  erpSystems: ReadonlyArray<ErpOption>;
  source: string | null;
  target: string | null;
  sourceMethod: ConnectionMethod;
  targetMethod: ConnectionMethod;
  isLoading?: boolean;
  onSelectSource: (id: string) => void;
  onSelectTarget: (id: string) => void;
  onSelectSourceMethod: (method: ConnectionMethod) => void;
  onSelectTargetMethod: (method: ConnectionMethod) => void;
  testID?: string;
}

interface ErpPillGroupProps {
  label: string;
  groupRole: 'source' | 'target';
  erpSystems: ReadonlyArray<ErpOption>;
  selected: string | null;
  isLoading: boolean;
  method: ConnectionMethod;
  onSelect: (id: string) => void;
  onSelectMethod: (method: ConnectionMethod) => void;
}

const ErpPillGroup = ({
  label,
  groupRole,
  erpSystems,
  selected,
  isLoading,
  method,
  onSelect,
  onSelectMethod,
}: ErpPillGroupProps): React.JSX.Element => {
  const showLoading = isLoading && erpSystems.length === 0;

  return (
    <View className="gap-2" testID={`erp-group-${groupRole}`}>
      <Text className="font-body text-sm font-medium text-foreground">
        {label}
      </Text>

      {showLoading ? (
        <Text className="font-body text-sm text-muted-foreground">
          Loading ERP systems…
        </Text>
      ) : (
        <Select
          options={erpSystems.map((erp) => ({
            label: erp.name,
            value: erp.id,
          }))}
          value={selected ?? undefined}
          onValueChange={onSelect}
          placeholder={`Select ${label}…`}
          searchable
          testID={`erp-select-${groupRole}`}
        />
      )}

      <ConnectionMethodSelect
        value={method}
        onChange={onSelectMethod}
        testID={`connection-method-${groupRole}`}
      />
    </View>
  );
};

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
  return (
    <View
      className="flex-col gap-4 lg:flex-row lg:items-start lg:gap-3"
      testID={testID}
    >
      <View className="lg:flex-1">
        <ErpPillGroup
          label="Source ERP"
          groupRole="source"
          erpSystems={erpSystems}
          selected={source}
          isLoading={isLoading}
          method={sourceMethod}
          onSelect={onSelectSource}
          onSelectMethod={onSelectSourceMethod}
        />
      </View>

      {/* Connecting arrow — shown only when the two sit side by side (lg+). */}
      <View className="hidden lg:flex lg:self-center lg:pt-6">
        <ArrowRight size={ARROW_SIZE} color={colors.mutedForeground} />
      </View>

      <View className="lg:flex-1">
        <ErpPillGroup
          label="Target ERP"
          groupRole="target"
          erpSystems={erpSystems}
          selected={target}
          isLoading={isLoading}
          method={targetMethod}
          onSelect={onSelectTarget}
          onSelectMethod={onSelectTargetMethod}
        />
      </View>
    </View>
  );
};
