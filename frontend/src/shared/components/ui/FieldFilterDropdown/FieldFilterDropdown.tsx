import React from 'react';
import { Text, View } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { PROFILE_FILTERS } from '@/features/master-data-wizard/utils/taxonomy';
import { countByCategory } from '@/features/master-data-wizard/utils/fields';
import type { EntityField } from '@/features/master-data-wizard/dp-kit/types/entity';

interface FieldFilterDropdownProps {
  readonly fields: readonly EntityField[];
  readonly value: string;
  readonly onChange: (categoryId: string) => void;
  readonly testID?: string;
}

export const FieldFilterDropdown = ({ fields, value, onChange, testID }: FieldFilterDropdownProps): React.JSX.Element => {
  // Plain label only — the reference never joins label+count into one
  // string with a separator; both the trigger and each dropdown row render
  // them as two separately-styled spans (`renderTrigger`/`renderOption`
  // below), so `SelectOption.label` here only needs to carry the label.
  const options: SelectOption[] = PROFILE_FILTERS.map((filter) => ({
    value: filter.id,
    label: filter.label,
    tip: filter.tip,
  }));
  const activeFilter = PROFILE_FILTERS.find((f) => f.id === value);
  const activeCount = activeFilter ? countByCategory(fields, activeFilter.id) : 0;

  return (
    <View className="flex-row items-center gap-[9px]">
      <Text className="font-heading text-[16px] font-semibold text-foreground">Filter Source fields</Text>
      <Select
        options={options}
        value={value}
        onValueChange={onChange}
        className="min-w-[320px]"
        triggerClassName="h-[33px] rounded-lg pl-3 pr-[7px] hover:border-accent"
        dropdownWidth={340}
        testID={testID}
        renderTrigger={() => (
          // Reference: the label+count sit together as one group
          // (`gap:8px`), and only THAT group is pushed apart from the
          // chevron by the button's own `justify-content:space-between`
          // — not label/count/chevron all spread across the full width,
          // which is what an earlier pass got wrong (count read as
          // right-aligned, far from its label).
          <View className="flex-1 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="font-body text-sm text-foreground" numberOfLines={1}>
                {activeFilter?.label ?? 'Select…'}
              </Text>
              <Text className="font-mono text-[10.5px] text-muted-foreground">{activeCount}</Text>
            </View>
            <View className="h-[21px] w-[21px] items-center justify-center rounded-[6px] bg-surface">
              <ChevronDown size={14} color={colors.mutedForeground} />
            </View>
          </View>
        )}
        renderOption={(option, isSelected) => (
          // Reference's list row: label + a separately-styled mono count
          // span, `gap:8px`, no bullet/dot separator between them, and a
          // primary-colored (not accent) 13px checkmark when active.
          <View className="flex-1 flex-row items-center gap-2">
            <Text className={isSelected ? 'font-body text-sm font-medium text-accent' : 'font-body text-sm text-foreground'}>
              {option.label}
            </Text>
            <Text className="font-mono text-[10.5px] text-muted-foreground">
              {countByCategory(fields, option.value)}
            </Text>
            {isSelected ? <Check size={13} color={colors.primary} strokeWidth={2.5} /> : null}
          </View>
        )}
      />
    </View>
  );
};
