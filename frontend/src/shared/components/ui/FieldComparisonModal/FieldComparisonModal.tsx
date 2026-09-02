import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { Dialog } from '@/shared/components/ui/Dialog';
import { cn } from '@/shared/utils/string.utils';
import { buildFieldComparison, type FieldComparison } from '@/features/master-data-wizard/utils/fields';
import type { EntityField } from '@/features/master-data-wizard/dp-kit/types/entity';

interface FieldComparisonModalProps {
  readonly visible: boolean;
  readonly fieldA: EntityField | null;
  readonly fieldB: EntityField | null;
  readonly rowCount: number;
  readonly onClose: () => void;
  readonly testID?: string;
}

const LABEL_COL_WIDTH = 150;

interface ComparisonRowProps {
  readonly label: string;
  readonly a: string;
  readonly b: string;
  // Null rate/Cardinality/Sample values are JetBrains Mono in the
  // reference; Semantic role is the only plain-body row.
  readonly mono?: boolean;
  // Sample values renders one size down (11px vs the grid's 12.5px).
  readonly small?: boolean;
}

function ComparisonRow({ label, a, b, mono, small }: ComparisonRowProps): React.JSX.Element {
  const valueClassName = cn('text-foreground', mono ? 'font-mono' : 'font-body', small ? 'text-[11px]' : 'text-[12.5px]');
  return (
    // Reference's grid cells only ever carry `border-bottom`, never
    // `border-top` — using `border-t` here meant this row's own top
    // border stacked with the row above's `border-b` at the same
    // boundary (visibly thicker than every other row divider).
    <View className="flex-row border-b border-border">
      <View className="justify-center px-[13px] py-[11px]" style={{ width: LABEL_COL_WIDTH }}>
        <Text className="text-[12.5px] text-muted-foreground">{label}</Text>
      </View>
      <View className="flex-1 justify-center border-l border-border px-[13px] py-[11px]">
        <Text className={valueClassName}>{a}</Text>
      </View>
      <View className="flex-1 justify-center border-l border-border px-[13px] py-[11px]">
        <Text className={valueClassName}>{b}</Text>
      </View>
    </View>
  );
}

function ComparisonGrid({ comparison }: { readonly comparison: FieldComparison }): React.JSX.Element {
  const { a, b } = comparison;
  return (
    <View className="overflow-hidden rounded-[10px] border border-border">
      <View className="flex-row border-b border-border">
        <View className="bg-surface" style={{ width: LABEL_COL_WIDTH }} />
        <View className="flex-1 border-l border-border bg-surface px-[13px] py-[11px]">
          <Text className="font-heading text-[12.5px] font-bold text-foreground">{a.name}</Text>
          <Text className="mt-0.5 text-[11px] text-muted-foreground">{a.role}</Text>
        </View>
        <View className="flex-1 border-l border-border bg-surface px-[13px] py-[11px]">
          <Text className="font-heading text-[12.5px] font-bold text-foreground">{b.name}</Text>
          <Text className="mt-0.5 text-[11px] text-muted-foreground">{b.role}</Text>
        </View>
      </View>
      <ComparisonRow label="Null rate" a={a.nullRate} b={b.nullRate} mono />
      <ComparisonRow label="Cardinality" a={a.cardinality} b={b.cardinality} mono />
      <ComparisonRow label="Sample values" a={a.sample} b={b.sample} mono small />
      <ComparisonRow label="Semantic role" a={a.semanticRole} b={b.semanticRole} />
    </View>
  );
}

/**
 * Centered dialog (not Sheet — that's for the single-field slide-in
 * drawer elsewhere in this feature) showing a side-by-side comparison of
 * exactly the 2 fields selected in FieldsTable, matching the reference's
 * centered-overlay comparison markup — including its exact chrome
 * (720px/14px-radius/18px-22px padding, same override pattern already
 * used for ApprovalModal) and its plain neutral overlap box (the
 * reference never colour-tints it; the previous version here invented a
 * metricTone-info tint that isn't in the reference at all).
 */
export const FieldComparisonModal = ({
  visible,
  fieldA,
  fieldB,
  rowCount,
  onClose,
  testID,
}: FieldComparisonModalProps): React.JSX.Element => {
  const comparison = fieldA && fieldB ? buildFieldComparison(fieldA, fieldB, rowCount) : null;

  return (
    <Dialog visible={visible} onClose={onClose} className="w-[720px] max-w-[94vw] rounded-[14px] shadow-2xl" testID={testID}>
      <Dialog.Header className="border-b border-border px-[22px] py-[18px]">
        <Dialog.Title className="text-base font-bold">Field comparison</Dialog.Title>
        <Dialog.Close
          onPress={onClose}
          // Reference has no `style-hover` at all for this button (full
          // opacity always) and specifies a border + surface background
          // the shared Dialog.Close default doesn't have.
          className="h-8 w-8 rounded-[7px] border border-border bg-surface opacity-100 active:opacity-100"
          size={15}
          iconColor={colors.foreground}
          testID={testID ? `${testID}-close` : undefined}
        />
      </Dialog.Header>
      <Dialog.Content className="px-[22px] py-[18px]">
        {comparison ? (
          <>
            <ComparisonGrid comparison={comparison} />
            <View className="mt-3.5 flex-row items-center gap-[9px] rounded-[10px] border border-border bg-surface px-[14px] py-[11px]">
              <Text className="flex-1 text-[12.5px] leading-5 text-foreground">
                Value overlap: <Text className="font-semibold">{comparison.overlap}</Text>. {comparison.note}
              </Text>
            </View>
          </>
        ) : null}
      </Dialog.Content>
    </Dialog>
  );
};
