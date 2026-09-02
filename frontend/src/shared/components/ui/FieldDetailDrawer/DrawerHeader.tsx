import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Sheet } from '@/shared/components/ui/Sheet';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { SemanticBadge } from '../SemanticBadge/SemanticBadge';
import { decisionStateFor, type DecisionState } from '@/features/master-data-wizard/utils/decisions';
import { impactLabel } from '@/features/master-data-wizard/utils/taxonomy';
import type { Decision } from '@/features/master-data-wizard/store/sourceProfile.store';
import type { EntityField } from '@/features/master-data-wizard/dp-kit/types/entity';

interface DrawerHeaderProps {
  readonly field: EntityField;
  readonly decisions: readonly Decision[];
  readonly onClose: () => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly testID?: string;
}

interface NavButtonProps {
  readonly onPress: () => void;
  readonly icon: (color: string) => React.ReactNode;
  readonly testID?: string;
}

// Reference: `width:30px;height:30px;border-radius:7px;border:1px solid
// var(--border);background:var(--surface);color:var(--fg);` with
// `style-hover="background:var(--surface-hi);"` — previously transparent
// with no hover and a muted (not full-fg) icon.
function NavButton({ onPress, icon, testID }: NavButtonProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      hitSlop={6}
      className="h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-border"
      style={{ backgroundColor: hovered ? colors.surfaceHighlight : colors.surface }}
      testID={testID}
    >
      {icon(colors.foreground)}
    </Pressable>
  );
}

function fieldStatusLabel(
  field: EntityField,
  state: DecisionState,
): 'Confirmed' | 'Ignored' | 'Needs confirmation' | 'Inferred' {
  if (state.confirmed) return 'Confirmed';
  if (state.ignored) return 'Ignored';
  if (field.role === 'Identifier candidate') return 'Needs confirmation';
  return 'Inferred';
}

export function DrawerHeader({
  field,
  decisions,
  onClose,
  onPrev,
  onNext,
  testID,
}: DrawerHeaderProps): React.JSX.Element {
  const decisionState = decisionStateFor(field.id, decisions);
  const status = fieldStatusLabel(field, decisionState);
  // Reference's own `buildDrawer`: `impact:f.confirmed && f.role==='Identifier
  // candidate' ? 'clean' : (f.transformed ? 'resolved' : f.impact)` — the
  // `transformed` branch has no reachable trigger in this build yet (same
  // reasoning as the table's own impact column), so only the confirmed-
  // identifier override is reproduced here. Note this drawer badge does
  // NOT get the table column's "ignored -> na" override — the reference
  // genuinely only applies that override in the table's own view model,
  // not in buildDrawer.
  const drawerImpact = decisionState.confirmed && field.role === 'Identifier candidate' ? 'clean' : field.impact;
  const roleValue = (
    <Text className="font-body text-xs font-semibold text-foreground">{field.role ?? '—'}</Text>
  );

  return (
    <Sheet.Header className="items-start px-[22px] pb-0 pt-[18px]">
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-[9px]">
          <Sheet.Title className="flex-none font-bold">{field.name}</Sheet.Title>
          {field.impactReason !== undefined && field.impactReason.length > 0 ? (
            <Tooltip content={field.impactReason} position="bottom">
              <SemanticBadge family="impact" state={drawerImpact} size="sm">
                {impactLabel(drawerImpact)}
              </SemanticBadge>
            </Tooltip>
          ) : (
            <SemanticBadge family="impact" state={drawerImpact} size="sm">
              {impactLabel(drawerImpact)}
            </SemanticBadge>
          )}
        </View>
        <View className="flex-row flex-wrap items-center gap-1">
          <Text className="font-body text-xs text-muted-foreground">Inferred role:</Text>
          {field.roleTip !== undefined && field.roleTip.length > 0 ? (
            <Tooltip content={field.roleTip} position="bottom">{roleValue}</Tooltip>
          ) : (
            roleValue
          )}
          <Text className="font-body text-xs text-muted-foreground">
            {` · confidence ${field.confidence !== undefined ? `${field.confidence}%` : '—'} · `}
          </Text>
          <Text className="font-body text-xs font-semibold text-foreground">{status}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-[5px]">
        <NavButton
          onPress={onPrev}
          icon={(color) => <ChevronLeft size={15} color={color} />}
          testID={testID ? `${testID}-prev` : undefined}
        />
        <NavButton
          onPress={onNext}
          icon={(color) => <ChevronRight size={15} color={color} />}
          testID={testID ? `${testID}-next` : undefined}
        />
        <Sheet.Close
          onPress={onClose}
          // Matches the boxed NavButton style beside it — the reference
          // gives the drawer's close button the same 30×30/border/surface
          // treatment as prev/next, not the shared Sheet default's plain
          // opacity-only icon.
          className="h-[30px] w-[30px] rounded-[7px] border border-border bg-surface opacity-100 hover:bg-surface-highlight active:opacity-100"
          size={15}
          iconColor={colors.foreground}
          testID={testID ? `${testID}-close` : undefined}
        />
      </View>
    </Sheet.Header>
  );
}
