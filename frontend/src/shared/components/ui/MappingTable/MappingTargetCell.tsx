import React from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/shared/components/ui/Button';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { SemanticBadge } from '@/shared/components/ui/SemanticBadge/SemanticBadge';
import { ProvenanceLabel } from '@/shared/components/ui/ProvenanceLabel/ProvenanceLabel';
import type { MappingRow } from '@/features/master-data-wizard/utils/mappingRows';

interface MappingTargetCellProps {
  readonly row: MappingRow;
  /** Built once per table render (not per row) — reference's own
   *  `targetOptions`: `[{id:'', label:'Not mapped'}, ...targetFields]`.
   *  Not `readonly` — passed straight through to `Select`'s own mutable
   *  `SelectOption[]` prop. */
  readonly targetOptions: SelectOption[];
  /** A confirmed `overridden` decision exists for this row — DA-378 is
   *  what will ever make this true; always false until then. */
  readonly isOverridden: boolean;
  readonly isEditing: boolean;
  readonly draftTargetId: string;
  readonly onDraftChange: (targetId: string) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
  readonly testID?: string;
}

/**
 * DA-374: Proposed Target column. Read view (label + dtype + handoff
 * chip + "Set manually" once overridden) toggles to an edit view (a
 * `targetFields` dropdown + Save/Cancel) — triggered by the pencil in
 * the Actions column (DA-376's `MappingActionsCell`, which calls
 * `MappingTable`'s `startEditTarget`), NOT a control inside this cell:
 * the reference's own read view has no pencil at all, confirmed
 * directly from its markup — this file wrongly had one until DA-376
 * relocated it. Save only raises an approval (`MappingTable`'s job, not
 * this component's) — "does NOT write directly" per DA-374's own ticket
 * text.
 */
export function MappingTargetCell({
  row,
  targetOptions,
  isOverridden,
  isEditing,
  draftTargetId,
  onDraftChange,
  onSave,
  onCancel,
  testID,
}: MappingTargetCellProps): React.JSX.Element {
  if (isEditing) {
    return (
      <View className="w-full gap-1.5 px-1 py-1">
        <Select
          options={targetOptions}
          value={draftTargetId}
          onValueChange={onDraftChange}
          className="w-full"
          dropdownWidth={220}
          testID={testID}
        />
        <Text className="font-body text-[10px] leading-[13px] text-muted-foreground">
          Saving asks for your approval before the mapping changes.
        </Text>
        <View className="flex-row gap-1.5">
          <Button
            variant="default"
            size="sm"
            className="h-auto rounded-[7px] px-[9px] py-[5px]"
            onPress={onSave}
            testID={testID !== undefined ? `${testID}-save` : undefined}
          >
            <Text className="text-xs font-semibold text-primary-foreground">Save</Text>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-auto rounded-[7px] px-[9px] py-[5px]"
            onPress={onCancel}
            testID={testID !== undefined ? `${testID}-cancel` : undefined}
          >
            <Text className="text-xs font-medium text-foreground">Cancel</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="items-center" testID={testID}>
      <Text className="text-center text-sm font-medium text-foreground">{row.targetLabel}</Text>
      {row.targetDtype.length > 0 ? (
        <Text className="font-mono text-[11px] text-muted-foreground">{row.targetDtype}</Text>
      ) : null}
      {row.handoff !== undefined || isOverridden ? (
        <View className="mt-0.5 flex-row flex-wrap items-center justify-center gap-1">
          {row.handoff !== undefined ? (
            <SemanticBadge family="find" state={row.handoffFind} size="compact">
              {row.handoff}
            </SemanticBadge>
          ) : null}
          {isOverridden ? <ProvenanceLabel state="action">Set manually</ProvenanceLabel> : null}
        </View>
      ) : null}
    </View>
  );
}
