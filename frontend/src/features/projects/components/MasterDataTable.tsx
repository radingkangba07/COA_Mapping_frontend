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
// checkbox is selectable on its own (unless gated via row.disabled).
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
    <View testID={testID !== undefined ? `${testID}-row-${row.id}` : undefined}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <ChevronRight size={CHEVRON_SIZE} color={colors.mutedForeground} />
        <Text className="flex-1 font-heading text-base font-semibold text-card-foreground">
          {row.label}
        </Text>
        <View className="w-28 items-center">
          <Checkbox
            checked={row.dataConversion}
            onCheckedChange={handleDataConversion}
            isDisabled={row.disabled}
            testID={
              testID !== undefined
                ? `${testID}-${row.id}-dataConversion`
                : undefined
            }
          />
        </View>
        <View className="w-28 items-center">
          <Checkbox
            checked={row.mdm}
            onCheckedChange={handleMdm}
            isDisabled={row.disabled}
            testID={testID !== undefined ? `${testID}-${row.id}-mdm` : undefined}
          />
        </View>
      </View>

      {row.disabled ? (
        <Text
          className="px-4 pb-2 font-body text-xs text-muted-foreground"
          testID={
            testID !== undefined ? `${testID}-${row.id}-gated-hint` : undefined
          }
        >
          Test the connection to enable Chart of Accounts selection.
        </Text>
      ) : null}
    </View>
  );
}

export function MasterDataTable({
  rows,
  onToggleColumn,
  testID,
}: MasterDataTableProps): React.JSX.Element {
  return (
    <View className="gap-1" testID={testID}>
      {/* Column header row */}
      <View
        className="flex-row items-center gap-3 px-4 pb-1"
        testID={testID !== undefined ? `${testID}-header` : undefined}
      >
        {/* Spacer to align "Master Data" above the row label (past the chevron). */}
        <View style={{ width: CHEVRON_SIZE }} />
        <Text className="flex-1 font-heading text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Master Data
        </Text>
        <Text className="w-28 text-center font-heading text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Data Conversion
        </Text>
        <Text className="w-28 text-center font-heading text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Master Data Management
        </Text>
      </View>

      {rows.map((row) => (
        <MasterDataRow
          key={row.id}
          row={row}
          onToggleColumn={onToggleColumn}
          testID={testID}
        />
      ))}
    </View>
  );
}
