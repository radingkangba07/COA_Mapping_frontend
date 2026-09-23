import React, { useState } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/config/theme';
import { isWeb } from '@/shared/utils/platform.utils';
import { Table } from '@/shared/components/ui/Table';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { GradientChip } from '@/shared/components/ui/GradientChip';
import { SemanticBadge } from '@/shared/components/ui/SemanticBadge/SemanticBadge';
import { confidenceRamp } from '@/features/master-data-wizard/utils/metricRamp';
import { MappingTargetCell } from './MappingTargetCell';
import { MappingActionsCell } from './MappingActionsCell';
import type { SelectOption } from '@/shared/components/ui/Select';
import type { MappingRow } from '@/features/master-data-wizard/utils/mappingRows';

/** Column widths, shared with `MappingTable`'s header row so cells line
 *  up. Reference gives an explicit `min-width:190px` only for Sample
 *  values; the rest are this component's own reasonable widths, same
 *  liberty `FieldsTable`'s own `COL` constants already take. */
export const CHECKBOX_WIDTH = 26;
export const ROW_NO_WIDTH = 40;
export const SOURCE_WIDTH = 180;
export const SAMPLE_WIDTH = 190;
export const ROLE_WIDTH = 140;
export const TARGET_WIDTH = 200;
export const EVIDENCE_WIDTH = 150;
export const CONFIDENCE_WIDTH = 96;
export const VALIDATION_WIDTH = 130;
export const STATUS_WIDTH = 140;
export const ACTIONS_WIDTH = 120;

/** Checkbox, #, and Source field freeze in place on horizontal scroll —
 *  same `position:sticky` + cumulative `left` offset technique as
 *  `FieldsTable`'s own frozen leading columns (RN has no built-in
 *  equivalent; react-native-web passes `position:'sticky'` straight
 *  through to real CSS, so this only takes effect on web). Widths here
 *  are fixed constants rather than `FieldsTable`'s dynamic `rowNoWidth`,
 *  so the offsets are plain constants too. */
export const FROZEN_LEFT = {
  checkbox: 0,
  rowNo: CHECKBOX_WIDTH,
  source: CHECKBOX_WIDTH + ROW_NO_WIDTH,
} as const;

export function stickyLeft(left: number): StyleProp<ViewStyle> {
  if (!isWeb) return undefined;
  return { position: 'sticky' as unknown as 'relative', left, zIndex: 2 };
}

interface MappingTableRowProps {
  readonly row: MappingRow;
  readonly rowNo: number;
  /** `SAMPLE_WIDTH` or more — `MappingTable`'s own container-width-driven
   *  computation, so Sample values can grow to fill leftover space on a
   *  wide screen instead of staying pinned at its 190px minimum. */
  readonly sampleWidth: number;
  readonly selected: boolean;
  readonly onToggleSelect: () => void;
  readonly targetOptions: SelectOption[];
  readonly isOverridden: boolean;
  readonly isEditingTarget: boolean;
  readonly draftTargetId: string;
  readonly onStartEditTarget: () => void;
  readonly onDraftTargetChange: (targetId: string) => void;
  readonly onSaveTarget: () => void;
  readonly onCancelEditTarget: () => void;
  readonly isAccepted: boolean;
  readonly isExcluded: boolean;
  readonly isBookmarked: boolean;
  readonly onAccept: () => void;
  readonly onExclude: () => void;
  readonly onToggleBookmark: () => void;
  /** DA-377: opens the detail drawer for this row. */
  readonly onOpen: () => void;
  readonly testID?: string;
}

export function MappingTableRow({
  row,
  rowNo,
  sampleWidth,
  selected,
  onToggleSelect,
  targetOptions,
  isOverridden,
  isEditingTarget,
  draftTargetId,
  onStartEditTarget,
  onDraftTargetChange,
  onSaveTarget,
  onCancelEditTarget,
  isAccepted,
  isExcluded,
  isBookmarked,
  onAccept,
  onExclude,
  onToggleBookmark,
  onOpen,
  testID,
}: MappingTableRowProps): React.JSX.Element {
  // Frozen cells (checkbox/#/Source field) each pin their own background to
  // `colors.card` (see stickyLeft's own doc comment) so they stay opaque
  // over horizontally-scrolled content — that also means they don't pick up
  // this hover tint, same as FieldsTable's own frozen columns; only the
  // unfrozen cells show it, via the row's own background showing through.
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onOpen}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      className="flex-row border-b border-border focus:outline-none"
      style={{ backgroundColor: hovered ? colors.surfaceHighlight : colors.card }}
      testID={testID !== undefined ? `${testID}-row-${row.id}` : undefined}
    >
      <Table.Cell
        stopPropagation
        width={CHECKBOX_WIDTH}
        className="items-center px-1 py-2.5"
        style={[stickyLeft(FROZEN_LEFT.checkbox), { backgroundColor: colors.card }]}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          size="sm"
          className="focus:ring-0 focus:ring-offset-0"
          accessibilityLabel={`Select ${row.name ?? 'row'}`}
          testID={testID !== undefined ? `${testID}-select-${row.id}` : undefined}
        />
      </Table.Cell>
      <Table.Cell
        width={ROW_NO_WIDTH}
        className="items-center px-1 py-2.5"
        style={[stickyLeft(FROZEN_LEFT.rowNo), { backgroundColor: colors.card }]}
      >
        <Text className="text-center font-mono text-xs text-muted-foreground">{rowNo}</Text>
      </Table.Cell>
      <Table.Cell
        width={SOURCE_WIDTH}
        className="items-center px-3 py-2.5"
        style={[stickyLeft(FROZEN_LEFT.source), { backgroundColor: colors.card }]}
      >
        <Text className="text-center text-sm font-semibold text-foreground">{row.name}</Text>
        <Text className="mt-0.5 text-center font-mono text-[11px] text-muted-foreground">{row.sdtype}</Text>
      </Table.Cell>
      <Table.Cell stopPropagation width={TARGET_WIDTH} className="items-center px-3 py-2.5">
        <MappingTargetCell
          row={row}
          targetOptions={targetOptions}
          isOverridden={isOverridden}
          isEditing={isEditingTarget}
          draftTargetId={draftTargetId}
          onDraftChange={onDraftTargetChange}
          onSave={onSaveTarget}
          onCancel={onCancelEditTarget}
          testID={testID !== undefined ? `${testID}-target-${row.id}` : undefined}
        />
      </Table.Cell>
      <Table.Cell
        width={sampleWidth}
        className="items-center px-3 py-2.5"
        testID={testID !== undefined ? `${testID}-sample-${row.id}` : undefined}
      >
        <Text className="text-center font-mono text-xs text-muted-foreground">{row.sampleLine}</Text>
      </Table.Cell>
      <Table.Cell width={ROLE_WIDTH} className="items-center px-3 py-2.5">
        <Text className="text-center text-[12.5px] text-foreground">{row.role}</Text>
      </Table.Cell>
      <Table.Cell width={EVIDENCE_WIDTH} className="items-center px-2 py-2.5">
        <View
          className="flex-row flex-wrap items-center justify-center gap-1"
          testID={testID !== undefined ? `${testID}-evidence-${row.id}` : undefined}
        >
          {row.evidence.map((e) => (
            <Tooltip key={e.code} content={e.label} position="bottom">
              <View className="rounded-full border border-border bg-surface px-2 py-0.5">
                <Text className="font-mono text-[9.5px] text-muted-foreground">{e.short}</Text>
              </View>
            </Tooltip>
          ))}
        </View>
      </Table.Cell>
      <Table.Cell width={CONFIDENCE_WIDTH} className="items-center px-3 py-2.5">
        <GradientChip
          {...confidenceRamp(row.conf)}
          size="confidence"
          className="self-center"
          testID={testID !== undefined ? `${testID}-confidence-${row.id}` : undefined}
        >
          {row.conf !== undefined ? `${row.conf}%` : '—'}
        </GradientChip>
      </Table.Cell>
      <Table.Cell width={VALIDATION_WIDTH} className="items-center px-3 py-2.5">
        <SemanticBadge
          family="impact"
          state={row.validationImpact}
          className="self-center"
          testID={testID !== undefined ? `${testID}-validation-${row.id}` : undefined}
        >
          {row.validation}
        </SemanticBadge>
      </Table.Cell>
      <Table.Cell width={STATUS_WIDTH} className="items-center px-3 py-2.5">
        <SemanticBadge
          family="impact"
          state={row.statusImpact}
          className="self-center"
          testID={testID !== undefined ? `${testID}-status-${row.id}` : undefined}
        >
          {row.status}
        </SemanticBadge>
      </Table.Cell>
      <Table.Cell stopPropagation width={ACTIONS_WIDTH} className="items-center px-2 py-2.5">
        <MappingActionsCell
          row={row}
          isAccepted={isAccepted}
          isExcluded={isExcluded}
          isBookmarked={isBookmarked}
          onAccept={onAccept}
          onExclude={onExclude}
          onEdit={onStartEditTarget}
          onToggleBookmark={onToggleBookmark}
          testID={testID !== undefined ? `${testID}-actions-${row.id}` : undefined}
        />
      </Table.Cell>
    </Pressable>
  );
}
