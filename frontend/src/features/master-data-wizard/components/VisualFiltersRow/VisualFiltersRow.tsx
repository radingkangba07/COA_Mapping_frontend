import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '@/config/theme';

interface VisualFiltersRowProps {
  readonly label: string | null;
  /**
   * Reference: `hasVisual: filters.length > 0 || highlightIds.length > 0 ||
   * metric !== null` — a strictly broader condition than "there's a chip
   * to show" (`label`). The "Total records" tile is the concrete case
   * where they diverge: clicking it sets `metric` with no `filters` entry,
   * so `label` is null but `hasVisual` is still true — "Clear filters"
   * must stay reachable to deselect that tile even though no chip renders.
   */
  readonly hasVisual: boolean;
  readonly onClear: () => void;
  readonly testID?: string;
}

/**
 * The reference's "Visual filters" row — one shared `label`/`onClear` pair
 * fed by either the KPI strip's own metric filter or a Copilot
 * suggested-prompt highlight (see SourceDataProfileScreen's `activeMetric?.label
 * ?? promptFilterLabel`), matching the reference's own single `filters`
 * state that both `clickMetric` and `runPrompt` write into. The field-filter
 * dropdown's `categoryFilter` never produces a chip here. The "Visual
 * filters" label + removable dashed-border pill only render when there's a
 * `label`; "Clear filters" renders whenever `hasVisual` is true, which is
 * strictly broader (see its own doc comment). Renders nothing when neither
 * is active.
 */
export function VisualFiltersRow({ label, hasVisual, onClear, testID }: VisualFiltersRowProps): React.JSX.Element | null {
  const [removeHovered, setRemoveHovered] = useState(false);
  const [clearHovered, setClearHovered] = useState(false);

  if (!hasVisual) return null;

  return (
    <View className="flex-row flex-wrap items-center gap-2" testID={testID}>
      {label ? (
        <>
          <Text className="font-body text-[10px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
            Visual filters
          </Text>
          <View className="flex-row items-center gap-1.5 rounded-full border border-dashed border-border bg-surface py-1 pl-2.5 pr-1.5">
            <Text className="font-body text-xs text-foreground">{label}</Text>
            <Pressable
              onPress={onClear}
              onHoverIn={() => setRemoveHovered(true)}
              onHoverOut={() => setRemoveHovered(false)}
              hitSlop={6}
              testID={testID ? `${testID}-remove` : undefined}
            >
              <X size={13} color={removeHovered ? colors.foreground : colors.mutedForeground} />
            </Pressable>
          </View>
        </>
      ) : null}
      <Pressable
        onPress={onClear}
        onHoverIn={() => setClearHovered(true)}
        onHoverOut={() => setClearHovered(false)}
        testID={testID ? `${testID}-clear` : undefined}
      >
        <Text
          className="font-body text-xs font-medium"
          style={{ color: clearHovered ? colors.foreground : colors.mutedForeground }}
        >
          Clear filters
        </Text>
      </Pressable>
    </View>
  );
}
