import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { Button } from '@/shared/components/ui/Button';
import { tint } from '@/features/master-data-wizard/utils/colorMix';

interface MappingBulkToolbarProps {
  readonly selectedCount: number;
  readonly onClear: () => void;
  readonly onAcceptSelected: () => void;
  readonly testID?: string;
}

/**
 * DA-384's "Accept selected" toolbar — same bar-with-count-and-actions
 * shape as Profile's own CompareSelectionBar, generalized for a variable
 * count instead of that component's fixed "always exactly 2" gate. Renders
 * nothing when nothing is selected, same convention.
 */
export const MappingBulkToolbar = ({
  selectedCount,
  onClear,
  onAcceptSelected,
  testID,
}: MappingBulkToolbarProps): React.JSX.Element | null => {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);

  if (selectedCount === 0) return null;

  return (
    <View
      className="mb-3 flex-row items-center justify-between rounded-[10px] border px-3.5 py-2.5"
      style={{ backgroundColor: tint(colors.accent, 8), borderColor: colors.accent }}
      testID={testID}
    >
      <Text className="font-body text-xs font-medium text-foreground">
        {selectedCount} field{selectedCount === 1 ? '' : 's'} selected
      </Text>
      <View className="flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-auto rounded-lg px-3 py-[6px]"
          onPress={onClear}
          testID={testID ? `${testID}-clear` : undefined}
        >
          <Text className="text-xs font-medium text-foreground">Clear</Text>
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-auto rounded-lg bg-accent px-[13px] py-[6px]"
          onPress={onAcceptSelected}
          testID={testID ? `${testID}-accept` : undefined}
        >
          <Text className="text-xs font-semibold text-primary-foreground">Accept selected</Text>
        </Button>
      </View>
    </View>
  );
};
