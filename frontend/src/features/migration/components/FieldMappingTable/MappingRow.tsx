import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2, X, Trash2 } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';
import type { TypeMappingRow } from '@/features/migration/types/migration.types';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_ICON_SIZE = 18;
const ACTION_ICON_SIZE = 16;

// ─── Props ──────────────────────────────────────────────────────────────────

interface MappingRowProps {
  row: TypeMappingRow;
  targetOptions: readonly SelectOption[];
  onUpdate: (id: string, update: Partial<TypeMappingRow>) => void;
  onDelete: (id: string) => void;
  testID: string | undefined;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const MappingRow = React.memo(function MappingRow({
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
    <View
      className={cn(
        'flex-col gap-2 rounded-lg border border-border p-3 md:flex-row md:items-center md:gap-0 md:rounded-none md:border-0 md:p-0',
        isMatched ? 'bg-green-50' : 'bg-red-50',
      )}
      testID={rowTestID}
    >
      {/* Status icon */}
      <View className="flex-row items-center gap-2 md:w-10 md:justify-center">
        {isMatched ? (
          <CheckCircle2 size={STATUS_ICON_SIZE} color={colors.success} />
        ) : (
          <X size={STATUS_ICON_SIZE} color={colors.destructive} />
        )}
        <Text className="text-xs font-medium text-muted-foreground md:hidden">
          {isMatched ? 'Matched' : 'Unmatched'}
        </Text>
      </View>

      {/* Source type */}
      <View className="flex-1">
        <Text className="mb-1 text-xs font-medium text-muted-foreground md:hidden">Source Type</Text>
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
      </View>

      {/* Target type */}
      <View className="flex-1">
        <Text className="mb-1 text-xs font-medium text-muted-foreground md:hidden">Target Type</Text>
        <Select
          options={[...targetOptions]}
          value={row.targetType.length > 0 ? row.targetType : ''}
          onValueChange={handleTargetChange}
          placeholder="Select target type"
          testID={rowTestID !== undefined ? `${rowTestID}-target-select` : undefined}
        />
      </View>

      {/* Delete button */}
      <View className="items-end md:w-12 md:items-center md:justify-center">
        <Button
          variant="ghost"
          size="icon"
          onPress={handleDelete}
          accessibilityLabel={`Delete ${row.sourceType} mapping`}
          testID={rowTestID !== undefined ? `${rowTestID}-delete` : undefined}
        >
          <Trash2 size={ACTION_ICON_SIZE} color={colors.destructive} />
        </Button>
      </View>
    </View>
  );
});
