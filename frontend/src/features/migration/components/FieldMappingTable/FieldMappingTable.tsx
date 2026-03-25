import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Plus, Download } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { type SelectOption } from '@/shared/components/ui/Select';
import { Card } from '@/shared/components/ui/Card';
import { colors } from '@/config/theme';
import type { TypeMappingRow } from '@/features/migration/types/migration.types';
import { MappingRow } from './MappingRow';

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
const ACTION_ICON_SIZE = 16;

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
        {/* Desktop header - hidden on mobile */}
        <View className="hidden border-b border-border pb-2 md:flex-row" testID={testID !== undefined ? `${testID}-table-header` : undefined}>
          <View className="w-10" />
          <View className="flex-1 px-2">
            <Text className="text-xs font-semibold text-muted-foreground">Source Type</Text>
          </View>
          <View className="flex-1 px-2">
            <Text className="text-xs font-semibold text-muted-foreground">Target Type</Text>
          </View>
          <View className="w-12" />
        </View>

        {/* Rows */}
        <View className="flex-col gap-3 md:gap-0">
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
        </View>

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
