import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View, Text, ScrollView } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { Dialog } from '@/shared/components/ui/Dialog';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';

// ─── Props ──────────────────────────────────────────────────────────────────

interface MultiSelectProps {
  readonly values: readonly string[];
  readonly options: readonly string[];
  readonly onChange: (values: readonly string[]) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly searchable?: boolean;
  /** Maximum number of value chips rendered inline before the "+N more" badge. */
  readonly maxVisibleChips?: number;
  readonly testID?: string;
}

const DEFAULT_MAX_VISIBLE_CHIPS = 3;

// ─── Component ──────────────────────────────────────────────────────────────

export const MultiSelect = ({
  values,
  options,
  onChange,
  placeholder = 'Select options',
  disabled = false,
  searchable = true,
  maxVisibleChips = DEFAULT_MAX_VISIBLE_CHIPS,
  testID,
}: MultiSelectProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const openDialog = useCallback((): void => {
    if (disabled) return;
    setIsOpen(true);
  }, [disabled]);

  const closeDialog = useCallback((): void => {
    setIsOpen(false);
    setSearch('');
  }, []);

  const toggleValue = useCallback(
    (option: string, isChecked: boolean): void => {
      if (isChecked) {
        if (values.includes(option)) return;
        onChange([...values, option]);
      } else {
        onChange(values.filter((v) => v !== option));
      }
    },
    [values, onChange],
  );

  const removeValue = useCallback(
    (option: string): void => {
      if (disabled) return;
      onChange(values.filter((v) => v !== option));
    },
    [values, onChange, disabled],
  );

  const filteredOptions = useMemo<readonly string[]>(() => {
    if (!searchable || search.trim().length === 0) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(lower));
  }, [options, search, searchable]);

  const visibleChips = values.slice(0, maxVisibleChips);
  const extraCount = Math.max(values.length - maxVisibleChips, 0);
  const hasValues = values.length > 0;

  return (
    <View testID={testID}>
      <Pressable
        onPress={openDialog}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
        accessibilityState={{ disabled }}
        className={cn(
          'min-h-10 flex-row flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5',
          disabled && 'opacity-50',
        )}
        testID={testID !== undefined ? `${testID}-trigger` : undefined}
      >
        {hasValues ? (
          <>
            {visibleChips.map((value) => (
              <Badge
                key={value}
                variant="secondary"
                className="py-0.5 pr-1"
                testID={testID !== undefined ? `${testID}-chip-${value}` : undefined}
              >
                <View className="flex-row items-center gap-1">
                  <Text className="font-body text-xs font-medium text-secondary-foreground">
                    {value}
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      removeValue(value);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${value}`}
                    className="rounded-sm p-0.5"
                    testID={testID !== undefined ? `${testID}-chip-${value}-remove` : undefined}
                  >
                    <X size={12} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </Badge>
            ))}
            {extraCount > 0 && (
              <Badge variant="outline" className="py-0.5">
                <Text className="font-body text-xs font-medium text-foreground">
                  {`+${String(extraCount)} more`}
                </Text>
              </Badge>
            )}
          </>
        ) : (
          <Text className="font-body text-sm text-muted-foreground">
            {placeholder}
          </Text>
        )}
        <View className="ml-auto">
          <ChevronDown size={16} color={colors.mutedForeground} />
        </View>
      </Pressable>

      <Dialog
        visible={isOpen}
        onClose={closeDialog}
        testID={testID !== undefined ? `${testID}-dialog` : undefined}
      >
        <Dialog.Header>
          <Dialog.Title>{placeholder}</Dialog.Title>
          <Dialog.Close onPress={closeDialog} />
        </Dialog.Header>
        <Dialog.Content className="pb-2">
          {searchable && (
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
              className="mb-3"
              testID={testID !== undefined ? `${testID}-search` : undefined}
            />
          )}
          <ScrollView style={{ maxHeight: 320 }}>
            {filteredOptions.length === 0 ? (
              <Text className="py-4 text-center font-body text-sm text-muted-foreground">
                No options available.
              </Text>
            ) : (
              filteredOptions.map((option) => {
                const isChecked = values.includes(option);
                return (
                  <View key={option} className="py-1.5">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(next) => toggleValue(option, next)}
                      label={option}
                      testID={testID !== undefined ? `${testID}-option-${option}` : undefined}
                    />
                  </View>
                );
              })
            )}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Footer>
          <Button
            onPress={closeDialog}
            testID={testID !== undefined ? `${testID}-done` : undefined}
          >
            Done
          </Button>
        </Dialog.Footer>
      </Dialog>
    </View>
  );
};
