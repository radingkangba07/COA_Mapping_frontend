import React from 'react';
import { Text, View } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { fmt } from '@/features/master-data-wizard/utils/fields';
import type { BuiltMetric } from '@/features/master-data-wizard/utils/fields';

/** Sentinel for "All fields" — the dropdown's own `Select` needs a plain
 *  string value; `null` (this component's public "nothing selected"
 *  contract, matching `cardFilter`/`KpiStrip.activeMetricId`) is only
 *  translated to/from this internally. */
const ALL_ID = 'all';

interface MappingFilterDropdownProps {
  /** DA-364/365's already-built KPI cards — reused as-is, not
   *  recomputed here. Reference: `mapFilters` is literally `[{id:null,
   *  label:'All fields'}, ...cards]`, the exact same `buildMappingCards()`
   *  output the KPI strip renders, not a separate mappingStatus list. */
  readonly cards: readonly BuiltMetric[];
  /** Total row count for "All fields" — reference: `fmt(stated.length)`. */
  readonly totalCount: number;
  readonly value: string | null;
  readonly onChange: (cardId: string | null) => void;
  readonly testID?: string;
}

/**
 * DA-370: structurally copies `FieldFilterDropdown`'s `Select`-popover
 * pattern (same trigger/option layout), but driven by the Mapping step's
 * cards instead of Profile's category taxonomy. Selecting an option is an
 * absolute set — never a toggle — so it stays in sync with (but behaves
 * differently from) the KPI cards' own click-to-toggle.
 */
export const MappingFilterDropdown = ({
  cards,
  totalCount,
  value,
  onChange,
  testID,
}: MappingFilterDropdownProps): React.JSX.Element => {
  const options: SelectOption[] = [
    { value: ALL_ID, label: 'All fields' },
    ...cards.map((card) => ({ value: card.id, label: card.label })),
  ];
  const selectValue = value ?? ALL_ID;
  const activeLabel = value === null ? 'All fields' : (cards.find((c) => c.id === value)?.label ?? 'All fields');
  const activeCount = value === null ? fmt(totalCount) : (cards.find((c) => c.id === value)?.value ?? fmt(totalCount));

  const countFor = (optionValue: string): string =>
    optionValue === ALL_ID ? fmt(totalCount) : (cards.find((c) => c.id === optionValue)?.value ?? '');

  const handleChange = (optionValue: string): void => {
    onChange(optionValue === ALL_ID ? null : optionValue);
  };

  return (
    <View className="flex-row items-center gap-[9px]">
      <Text className="font-heading text-[16px] font-semibold text-foreground">Filter source fields</Text>
      <Select
        options={options}
        value={selectValue}
        onValueChange={handleChange}
        className="min-w-[320px]"
        triggerClassName="h-[33px] rounded-lg pl-3 pr-[7px] hover:border-accent"
        dropdownWidth={340}
        testID={testID}
        renderTrigger={() => (
          <View className="flex-1 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="font-body text-sm text-foreground" numberOfLines={1}>
                {activeLabel}
              </Text>
              <Text className="font-mono text-[10.5px] text-muted-foreground">{activeCount}</Text>
            </View>
            <View className="h-[21px] w-[21px] items-center justify-center rounded-[6px] bg-surface">
              <ChevronDown size={14} color={colors.mutedForeground} />
            </View>
          </View>
        )}
        renderOption={(option, isSelected) => (
          <View className="flex-1 flex-row items-center gap-2">
            <Text className={isSelected ? 'font-body text-sm font-medium text-accent' : 'font-body text-sm text-foreground'}>
              {option.label}
            </Text>
            <Text className="font-mono text-[10.5px] text-muted-foreground">{countFor(option.value)}</Text>
            {isSelected ? <Check size={13} color={colors.primary} strokeWidth={2.5} /> : null}
          </View>
        )}
      />
    </View>
  );
};
