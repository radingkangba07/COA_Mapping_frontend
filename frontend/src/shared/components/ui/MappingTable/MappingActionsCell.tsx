import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, Bookmark } from 'lucide-react-native';
import { colors, semantic } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { EditPencilIcon } from '@/shared/components/icons/EditPencilIcon';
import { ExcludeIcon } from '@/shared/components/icons/ExcludeIcon';
import type { MappingRow } from '@/features/master-data-wizard/utils/mappingRows';

interface MappingActionsCellProps {
  readonly row: MappingRow;
  readonly isAccepted: boolean;
  readonly isExcluded: boolean;
  readonly isBookmarked: boolean;
  readonly onAccept: () => void;
  readonly onExclude: () => void;
  readonly onEdit: () => void;
  readonly onToggleBookmark: () => void;
  readonly testID?: string;
}

/**
 * Reference's exact button chrome: a 28x28, 7px-radius square, bordered
 * (`--border`) and filled (`--card`), that only swaps its background to
 * `--surface` on hover — nothing else changes, except Edit's own hover
 * also turns the border `--accent`. Each icon carries its own fixed
 * color via its `children` — Accept: `data-metrictone="ok"` (green);
 * Edit: `data-prov="action"` (primary/blue, since retargeting is a
 * user-invoked action per dp-kit's own provenance taxonomy); Exclude:
 * `color:var(--muted)` — matching the reference's own per-button
 * declarations exactly. This wrapper only owns the container chrome.
 */
function ActionIconButton({
  onPress,
  hoverBorderColor,
  accessibilityLabel,
  testID,
  children,
}: {
  onPress: () => void;
  hoverBorderColor?: string;
  accessibilityLabel: string;
  testID?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      hitSlop={4}
      className="h-[28px] w-[28px] items-center justify-center rounded-[7px] border"
      style={{
        borderColor: hovered && hoverBorderColor !== undefined ? hoverBorderColor : colors.border,
        backgroundColor: hovered ? colors.surface : colors.card,
      }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

/** A settled (non-interactive) state — reference's own `isAccepted` span:
 *  the same 28x28 square, but borderless/transparent, tinted by the
 *  taxonomy state instead of a fixed color. */
function ActionIndicator({ testID, children }: { testID?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View className="h-[28px] w-[28px] items-center justify-center rounded-[7px]" testID={testID}>
      {children}
    </View>
  );
}

/**
 * DA-376: column 11. Accept/Edit raise approval and stop there (DA-378
 * is what confirms them — see MappingTable's own doc comment); Exclude
 * writes directly via wizard.store's excludeField (its own documented
 * design — confirmed with the user, since this ticket's own text
 * suggested otherwise); Bookmark is pure local UI state, no store
 * involvement at all.
 */
export function MappingActionsCell({
  row,
  isAccepted,
  isExcluded,
  isBookmarked,
  onAccept,
  onExclude,
  onEdit,
  onToggleBookmark,
  testID,
}: MappingActionsCellProps): React.JSX.Element {
  const mode = useAppStore((s) => s.theme);
  const canAccept = row.status === 'Suggested' || row.status === 'Review required';
  const canExclude = row.status !== 'Excluded' && row.status !== 'Missing target';

  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {isAccepted ? (
        <ActionIndicator testID={testID !== undefined ? `${testID}-accepted` : undefined}>
          <Check size={14} color={semantic('impact', 'clean', mode).fg} strokeWidth={2.5} />
        </ActionIndicator>
      ) : canAccept ? (
        <ActionIconButton onPress={onAccept} accessibilityLabel="Accept mapping" testID={testID !== undefined ? `${testID}-accept` : undefined}>
          <Check size={14} color={semantic('metricTone', 'ok', mode).fg} strokeWidth={2.5} />
        </ActionIconButton>
      ) : null}

      {isExcluded ? (
        <ActionIndicator testID={testID !== undefined ? `${testID}-excluded` : undefined}>
          <ExcludeIcon size={14} color={semantic('impact', 'na', mode).fg} />
        </ActionIndicator>
      ) : canExclude ? (
        <ActionIconButton onPress={onExclude} accessibilityLabel="Exclude field" testID={testID !== undefined ? `${testID}-exclude` : undefined}>
          <ExcludeIcon size={14} color={colors.mutedForeground} />
        </ActionIconButton>
      ) : null}

      <ActionIconButton
        onPress={onEdit}
        hoverBorderColor={colors.accent}
        accessibilityLabel="Edit proposed target"
        testID={testID !== undefined ? `${testID}-edit` : undefined}
      >
        <EditPencilIcon size={14} color={semantic('prov', 'action', mode).fg} />
      </ActionIconButton>

      <ActionIconButton
        onPress={onToggleBookmark}
        accessibilityLabel="Bookmark for later review"
        testID={testID !== undefined ? `${testID}-bookmark` : undefined}
      >
        <Bookmark size={14} color={isBookmarked ? colors.accent : colors.foreground} fill={isBookmarked ? colors.accent : 'none'} />
      </ActionIconButton>
    </View>
  );
}
