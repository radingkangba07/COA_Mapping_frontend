import React, { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { colors } from '@/config/theme';
import type { MasterDataRowVM } from '../hooks/useMigrationScopeViewModel';
import type { MasterDataColumn } from './MigrationScope.config';

const CHEVRON_SIZE = 16;

// Fix the rows area to ~5 rows tall; the rest scroll within.
const VISIBLE_ROWS = 5;
const APPROX_ROW_HEIGHT = 52; // ~48px row content + 4px gap
const ROWS_MAX_HEIGHT = VISIBLE_ROWS * APPROX_ROW_HEIGHT;

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
    <View testID={testID !== undefined ? `${testID}-row-${row.id}` : undefined}>
      <View className="flex-row items-center gap-3 py-3">
        <ChevronRight size={CHEVRON_SIZE} color={colors.mutedForeground} />
        <Text className="flex-1 font-heading text-base font-semibold text-card-foreground">
          {row.label}
        </Text>
        <View className="w-32 items-center">
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
        <View className="w-36 items-center">
          <Checkbox
            checked={row.mdm}
            onCheckedChange={handleMdm}
            testID={testID !== undefined ? `${testID}-${row.id}-mdm` : undefined}
          />
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
    <View className="gap-1" testID={testID}>
      {/* Column header row */}
      <View
        className="flex-row items-center gap-3 pb-1"
        testID={testID !== undefined ? `${testID}-header` : undefined}
      >
        {/* Spacer to align "Master Data" above the row label (past the chevron). */}
        <View style={{ width: CHEVRON_SIZE }} />
        <Text className="flex-1 font-heading text-[10px] font-medium text-muted-foreground" numberOfLines={1}>
          Master Data
        </Text>
        <Text className="w-32 text-center font-heading text-[10px] font-medium text-muted-foreground" numberOfLines={1}>
          Data Conversion
        </Text>
        <Text className="w-36 text-center font-heading text-[10px] font-medium text-muted-foreground" numberOfLines={1}>
          Master Data Management
        </Text>
      </View>

      <ScrollView
        style={{ maxHeight: ROWS_MAX_HEIGHT }}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        testID={testID !== undefined ? `${testID}-scroll` : undefined}
      >
        <View className="gap-1">
          {rows.map((row) => (
            <MasterDataRow
              key={row.id}
              row={row}
              onToggleColumn={onToggleColumn}
              testID={testID}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
