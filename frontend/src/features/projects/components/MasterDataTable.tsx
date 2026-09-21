import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import type { MasterDataRowVM } from '../hooks/useMigrationScopeViewModel';
import { ENABLED_SCOPE_IDS } from './MigrationScope.config';
import type { MasterDataColumn } from './MigrationScope.config';

interface MasterDataTableProps {
  readonly rows: readonly MasterDataRowVM[];
  readonly onToggleColumn: (id: string, column: MasterDataColumn) => void;
  /** Selection counter rendered next to the "Master Data" header title. */
  readonly counter?: React.ReactNode;
  readonly testID?: string;
}

interface MasterDataRowProps {
  readonly row: MasterDataRowVM;
  readonly onToggleColumn: (id: string, column: MasterDataColumn) => void;
  readonly testID?: string;
}

// A normal (non-collapsible) row: the label, then the Data Conversion checkbox.
function MasterDataRow({
  row,
  onToggleColumn,
  testID,
}: MasterDataRowProps): React.JSX.Element {
  const isEnabled = ENABLED_SCOPE_IDS.has(row.id);

  const handleDataConversion = useCallback(() => {
    onToggleColumn(row.id, 'dataConversion');
  }, [onToggleColumn, row.id]);

  return (
    <View
      className="w-full"
      testID={testID !== undefined ? `${testID}-row-${row.id}` : undefined}
    >
      <View className="w-[calc(100%+16px)] -ml-2 flex-row items-center gap-1.5 border-b border-border px-2 py-1">
        <View className="flex-1 flex-row items-center">
          <Text className={`w-[50%] font-body text-sm font-medium ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
            {row.label}
          </Text>
          <View className="w-[50%] items-center">
            <Checkbox
              checked={row.dataConversion}
              onCheckedChange={handleDataConversion}
              isDisabled={!isEnabled}
              testID={
                testID !== undefined
                  ? `${testID}-${row.id}-dataConversion`
                  : undefined
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export function MasterDataTable({
  rows,
  onToggleColumn,
  counter,
  testID,
}: MasterDataTableProps): React.JSX.Element {
  return (
    <View className="w-full" testID={testID}>
      {/* Column header row */}
      <View
        className="w-[calc(100%+16px)] -ml-2 flex-row items-center gap-1.5 border-b border-border px-2 pb-1"
        testID={testID !== undefined ? `${testID}-header` : undefined}
      >
        <View className="flex-1 flex-row items-center">
          <View className="w-[50%] flex-row flex-wrap items-center gap-2">
            <Text className="font-heading text-base font-semibold text-card-foreground">
              Master Data
            </Text>
            {counter}
          </View>
          <Text className="w-[50%] text-center font-body text-xs font-medium text-foreground">
            Data Conversion
          </Text>
        </View>
      </View>

      <View className="w-full">
        {rows.map((row) => (
          <MasterDataRow
            key={row.id}
            row={row}
            onToggleColumn={onToggleColumn}
            testID={testID}
          />
        ))}
      </View>
    </View>
  );
}
