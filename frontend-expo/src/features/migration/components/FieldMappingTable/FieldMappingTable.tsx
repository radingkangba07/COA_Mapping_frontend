import React, { useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Plus, Trash2, Download, CheckCircle2, X } from 'lucide-react-native';
import { Table } from '@/shared/components/ui/Table';
import { Button } from '@/shared/components/ui/Button';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { Card } from '@/shared/components/ui/Card';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';
import type { TypeMappingRow } from '@/features/migration/types/migration.types';

// ─── Props ─────────────────────────────────────────────────────────────────

interface FieldMappingTableProps {
  rows: readonly TypeMappingRow[];
  targetTypes: readonly string[];
  onUpdateRow: (id: string, update: Partial<TypeMappingRow>) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
  onSaveCSV?: (() => void) | undefined;
  testID?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const UNMATCHED_VALUE = '';
const STATUS_ICON_SIZE = 18;
const ACTION_ICON_SIZE = 16;

// ─── Sub-components ────────────────────────────────────────────────────────

interface MappingRowProps {
  row: TypeMappingRow;
  targetOptions: readonly SelectOption[];
  onUpdate: (id: string, update: Partial<TypeMappingRow>) => void;
  onDelete: (id: string) => void;
  testID: string | undefined;
}

const MappingRow = React.memo(function MappingRow({
  row,
  targetOptions,
  onUpdate,
  onDelete,
  testID,
}: MappingRowProps) {
  const isMatched = row.targetType.length > 0;
  const rowTestID = testID !== undefined ? `${testID}-row-${row.id}` : undefined;

  const handleTargetChange = useCallback(
    (value: string) => {
      onUpdate(row.id, { targetType: value });
    },
    [row.id, onUpdate],
  );

  const handleSourceChange = useCallback(
    (text: string) => {
      onUpdate(row.id, { sourceType: text });
    },
    [row.id, onUpdate],
  );

  const handleDelete = useCallback(() => {
    onDelete(row.id);
  }, [row.id, onDelete]);

  return (
    <Table.Row
      className={cn(
        isMatched ? 'bg-green-50' : 'bg-red-50',
      )}
      testID={rowTestID}
    >
      <Table.Cell className="items-center justify-center" width={40}>
        {isMatched ? (
          <CheckCircle2 size={STATUS_ICON_SIZE} color={colors.success} />
        ) : (
          <X size={STATUS_ICON_SIZE} color={colors.destructive} />
        )}
      </Table.Cell>

      <Table.Cell>
        {row.isCustom ? (
          <Input
            value={row.sourceType}
            onChangeText={handleSourceChange}
            placeholder="Enter source type"
            inputClassName="h-8 text-xs"
            testID={rowTestID !== undefined ? `${rowTestID}-source-input` : undefined}
          />
        ) : (
          <Text className="font-mono text-sm text-foreground">{row.sourceType}</Text>
        )}
      </Table.Cell>

      <Table.Cell>
        <Select
          options={[...targetOptions]}
          value={row.targetType.length > 0 ? row.targetType : UNMATCHED_VALUE}
          onValueChange={handleTargetChange}
          placeholder="Select target type"
          testID={rowTestID !== undefined ? `${rowTestID}-target-select` : undefined}
        />
      </Table.Cell>

      <Table.Cell className="items-center justify-center" width={48}>
        <Button
          variant="ghost"
          size="icon"
          onPress={handleDelete}
          testID={rowTestID !== undefined ? `${rowTestID}-delete` : undefined}
        >
          <Trash2 size={ACTION_ICON_SIZE} color={colors.destructive} />
        </Button>
      </Table.Cell>
    </Table.Row>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────

export const FieldMappingTable = ({
  rows,
  targetTypes,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
  onSaveCSV,
  testID,
}: FieldMappingTableProps) => {
  const targetOptions = useMemo<readonly SelectOption[]>(
    () => [
      { label: 'Unmatched', value: UNMATCHED_VALUE },
      ...targetTypes.map((type) => ({ label: type, value: type })),
    ],
    [targetTypes],
  );

  return (
    <Card testID={testID}>
      <Card.Header>
        <View className="flex-row items-center justify-between">
          <Card.Title>Type Mappings</Card.Title>
          <View className="flex-row gap-2">
            <Button variant="outline" size="sm" onPress={onAddRow} testID={testID !== undefined ? `${testID}-add` : undefined}>
              <View className="flex-row items-center gap-1.5">
                <Plus size={ACTION_ICON_SIZE} color={colors.foreground} />
                <Text className="font-body text-xs font-medium text-foreground">Add Row</Text>
              </View>
            </Button>
            {onSaveCSV !== undefined && (
              <Button variant="outline" size="sm" onPress={onSaveCSV} testID={testID !== undefined ? `${testID}-csv` : undefined}>
                <View className="flex-row items-center gap-1.5">
                  <Download size={ACTION_ICON_SIZE} color={colors.foreground} />
                  <Text className="font-body text-xs font-medium text-foreground">Save CSV</Text>
                </View>
              </Button>
            )}
          </View>
        </View>
      </Card.Header>

      <Card.Content>
        <Table testID={testID !== undefined ? `${testID}-table` : undefined}>
          <Table.Header>
            <Table.HeaderCell width={40}>
              <Text className="text-xs font-semibold text-muted-foreground" />
            </Table.HeaderCell>
            <Table.HeaderCell>Source Type</Table.HeaderCell>
            <Table.HeaderCell>Target Type</Table.HeaderCell>
            <Table.HeaderCell width={48} />
          </Table.Header>

          {rows.map((row) => (
            <MappingRow
              key={row.id}
              row={row}
              targetOptions={targetOptions}
              onUpdate={onUpdateRow}
              onDelete={onDeleteRow}
              testID={testID}
            />
          ))}
        </Table>

        {rows.length === 0 && (
          <View className="items-center py-8">
            <Text className="font-body text-sm text-muted-foreground">
              No type mappings. Press "Add Row" to create one.
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};
