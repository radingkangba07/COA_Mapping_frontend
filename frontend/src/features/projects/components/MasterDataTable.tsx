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
    <View className="flex-1 flex-row items-center justify-between gap-3 pr-2">
      <Text className="flex-1 font-heading text-base font-semibold text-card-foreground">
        {row.label}
      </Text>
      <View className="flex-row items-center gap-4">
        <Checkbox
          checked={row.dataConversion}
          onCheckedChange={handleDataConversion}
          label="Data Conversion"
          testID={
            testID !== undefined
              ? `${testID}-${row.id}-dataConversion`
              : undefined
          }
        />
        <Checkbox
          checked={row.mdm}
          onCheckedChange={handleMdm}
          label="MDM"
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
