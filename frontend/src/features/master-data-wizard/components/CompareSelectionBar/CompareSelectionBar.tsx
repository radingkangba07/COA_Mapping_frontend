import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { Button } from '@/shared/components/ui/Button';
import { tint } from '../../utils/colorMix';

interface CompareSelectionBarProps {
  readonly selectedCount: number;
  readonly onClear: () => void;
  readonly onCompare: () => void;
  readonly testID?: string;
}

/**
 * Mirrors the reference's canCompare gate (selectedIds.length === 2) —
 * selection is hard-capped at 2 by sourceProfile.store.ts, so this only
 * ever needs to render for exactly that count, never a variable "N
 * selected" message.
 */
export const CompareSelectionBar = ({
  selectedCount,
  onClear,
  onCompare,
  testID,
}: CompareSelectionBarProps): React.JSX.Element | null => {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);

  if (selectedCount !== 2) return null;

  return (
    <View
      className="mb-5 flex-row items-center justify-between rounded-[10px] border px-3.5 py-2.5"
      // Reference: `background:color-mix(in srgb, var(--accent) 8%,
      // transparent)` — distinct from `badgeTint`'s fixed 13%.
      style={{ backgroundColor: tint(colors.accent, 8), borderColor: colors.accent }}
      testID={testID}
    >
      <Text className="font-body text-xs font-medium text-foreground">2 fields selected for comparison</Text>
      <View className="flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          // Reference: `border-radius:8px;padding:6px 12px` — a content-
          // driven height, not the shared `size="sm"`'s fixed 32px.
          className="h-auto rounded-lg px-3 py-[6px]"
          onPress={onClear}
          testID={testID ? `${testID}-clear` : undefined}
        >
          <Text className="text-xs font-medium text-foreground">Clear</Text>
        </Button>
        <Button
          variant="default"
          size="sm"
          // Reference: `border-radius:8px;padding:6px 13px`.
          className="h-auto rounded-lg bg-accent px-[13px] py-[6px]"
          onPress={onCompare}
          testID={testID ? `${testID}-compare` : undefined}
        >
          <Text className="text-xs font-semibold text-primary-foreground">Compare fields</Text>
        </Button>
      </View>
    </View>
  );
};
