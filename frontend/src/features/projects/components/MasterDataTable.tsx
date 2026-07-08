import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { colors } from '@/config/theme';
import type { MasterDataRowVM } from '../hooks/useMigrationScopeViewModel';
import type { MasterDataColumn } from './MigrationScope.config';

const CHEVRON_SIZE = 16;

interface MasterDataTableProps {
  readonly rows: readonly MasterDataRowVM[];
  readonly onToggleColumn: (id: string, column: MasterDataColumn) => void;
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
        <ChevronRight size={CHEVRON_SIZE} color={colors.mutedForeground} />
        <View className="flex-1 flex-row items-center">
          <Text className="w-[50%] font-heading text-sm font-semibold text-card-foreground">
            {row.label}
          </Text>
          <View className="w-[20%] items-center">
            <Checkbox
              checked={row.dataConversion}
              onCheckedChange={handleDataConversion}
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
  testID,
}: MasterDataTableProps): React.JSX.Element {
  return (
    <View className="w-full" testID={testID}>
      {/* Column header row */}
      <View
        className="w-[calc(100%+16px)] -ml-2 flex-row items-center gap-1.5 border-b border-border px-2 pb-1"
        testID={testID !== undefined ? `${testID}-header` : undefined}
      >
        {/* Spacer to align "Master Data" above the row label (past the chevron). */}
        <View style={{ width: CHEVRON_SIZE }} />
        <View className="flex-1 flex-row items-center">
          <Text className="w-[50%] font-heading text-xs font-bold text-foreground">
            Master Data
          </Text>
          <Text className="w-[20%] text-center font-heading text-xs font-bold text-foreground">
            Data Conversion
          </Text>
          <Text className="w-[30%] text-center font-heading text-xs font-bold text-foreground">
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
