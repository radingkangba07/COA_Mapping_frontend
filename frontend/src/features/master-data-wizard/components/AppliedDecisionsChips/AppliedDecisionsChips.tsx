import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { tint } from '../../utils/colorMix';
import type { Decision } from '../../store/sourceProfile.store';

interface AppliedDecisionsChipsProps {
  readonly decisions: readonly Decision[];
  readonly onUndo: (decisionId: string) => void;
  readonly testID?: string;
}

/**
 * The reference's "Applied decisions" chip row — sits alongside "Visual
 * filters" and shows one removable, success-toned pill per confirmed/
 * ignored field, each with an "Undo" button calling back into the same
 * `undoDecision` path the drawer's own row-actions menu already uses.
 * Renders nothing until at least one decision exists.
 */
export function AppliedDecisionsChips({ decisions, onUndo, testID }: AppliedDecisionsChipsProps): React.JSX.Element | null {
  if (decisions.length === 0) return null;

  return (
    <View className="flex-row flex-wrap items-center gap-2" testID={testID}>
      <Text className="font-body text-[10px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
        Applied decisions
      </Text>
      {decisions.map((decision) => (
        <View
          key={decision.id}
          className="flex-row items-center gap-[7px] rounded-full border py-1 pl-2.5 pr-2"
          // Reference: `color-mix(in srgb, var(--success) 9%, transparent)`
          // — distinct from `badgeTint`'s fixed 13%.
          style={{ borderColor: colors.success, backgroundColor: tint(colors.success, 9) }}
        >
          <Check size={12} color={colors.success} strokeWidth={2.5} />
          <Text className="font-body text-xs" style={{ color: colors.success }}>
            {decision.label}
          </Text>
          <Pressable
            onPress={() => onUndo(decision.id)}
            hitSlop={6}
            testID={testID ? `${testID}-undo-${decision.id}` : undefined}
          >
            <Text
              className="font-body text-[11px] font-semibold underline"
              style={{ color: colors.success }}
            >
              Undo
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
