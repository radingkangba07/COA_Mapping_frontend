import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { Collapsible } from '@/shared/components/ui/Collapsible';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import type {
  MasterDataRowVM,
} from '../hooks/useMigrationScopeViewModel';
import type { MasterDataColumn } from './MigrationScope.config';

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

function MasterDataRow({
  row,
  onToggleColumn,
  testID,
}: MasterDataRowProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleDataConversion = useCallback(() => {
    onToggleColumn(row.id, 'dataConversion');
  }, [onToggleColumn, row.id]);

  const handleMdm = useCallback(() => {
    onToggleColumn(row.id, 'mdm');
  }, [onToggleColumn, row.id]);

  const title = (
    <View className="flex-1 flex-row items-center gap-3 pr-1">
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
  );

  return (
    <Collapsible
      isOpen={isOpen}
      onToggle={handleToggleOpen}
      title={title}
      testID={testID !== undefined ? `${testID}-row-${row.id}` : undefined}
    >
      <Text className="font-body text-sm text-muted-foreground">
        {row.description}
      </Text>
      {row.disabled ? (
        <Text
          className="mt-1 font-body text-xs text-muted-foreground"
          testID={
            testID !== undefined
              ? `${testID}-${row.id}-gated-hint`
              : undefined
          }
        >
          Test the connection to enable Chart of Accounts selection.
        </Text>
      ) : null}
    </Collapsible>
  );
}

export function MasterDataTable({
  rows,
  onToggleColumn,
  testID,
}: MasterDataTableProps): React.JSX.Element {
  return (
    <View className="gap-2" testID={testID}>
      {/* Column header row */}
      <View
        className="flex-row items-center gap-3 px-4 pb-1"
        testID={testID !== undefined ? `${testID}-header` : undefined}
      >
        <Text className="flex-1 font-heading text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Master Data
        </Text>
        <Text className="w-28 text-center font-heading text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Data Conversion
        </Text>
        <Text className="w-28 text-center font-heading text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Master Data Management
        </Text>
        {/* Spacer to align headers above the row checkboxes (past the chevron). */}
        <View className="w-5" />
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
