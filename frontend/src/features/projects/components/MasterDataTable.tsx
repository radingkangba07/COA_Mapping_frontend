import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import type { MasterDataRowVM } from '../hooks/useMigrationScopeViewModel';
import { CHART_OF_ACCOUNTS_ID } from './MigrationScope.config';
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

// A normal (non-collapsible) row: a left chevron, the label, then the two
// independent checkbox columns. Each checkbox is its own control, so a row's
// checkbox is selectable on its own.
function MasterDataRow({
  row,
  onToggleColumn,
  testID,
}: MasterDataRowProps): React.JSX.Element {
  const isMuted = row.id !== CHART_OF_ACCOUNTS_ID;

  const handleDataConversion = useCallback(() => {
    onToggleColumn(row.id, 'dataConversion');
  }, [onToggleColumn, row.id]);

  const handleMdm = useCallback(() => {
    onToggleColumn(row.id, 'mdm');
  }, [onToggleColumn, row.id]);

  return (
    <View
      className="w-full"
      testID={testID !== undefined ? `${testID}-row-${row.id}` : undefined}
    >
      <View className="w-[calc(100%+16px)] -ml-2 flex-row items-center gap-1.5 border-b border-border px-2 py-1">
        <View className="flex-1 flex-row items-center">
          <Text
            className={
              isMuted
                ? 'w-[50%] font-body text-sm font-medium text-muted-foreground'
                : 'w-[50%] font-body text-sm font-medium text-foreground'
            }
          >
            {row.label}
          </Text>
          <View className="w-[20%] items-center">
            <Checkbox
              checked={row.dataConversion}
              onCheckedChange={handleDataConversion}
              isDisabled={row.id !== CHART_OF_ACCOUNTS_ID}
              testID={
                testID !== undefined
                  ? `${testID}-${row.id}-dataConversion`
                  : undefined
              }
            />
          </View>
          <View className="w-[30%] items-center">
            <Checkbox
              checked={row.mdm}
              onCheckedChange={handleMdm}
              isDisabled
              testID={testID !== undefined ? `${testID}-${row.id}-mdm` : undefined}
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
          <Text className="w-[20%] text-center font-body text-xs font-medium text-foreground">
            Data Conversion
          </Text>
          <Text className="w-[30%] text-center font-body text-xs font-medium text-foreground">
            Master Data Management
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
