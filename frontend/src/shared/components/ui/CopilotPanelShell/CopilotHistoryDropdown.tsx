import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '@/config/theme';

export interface HistoryEntryView {
  readonly id: string;
  readonly endedAtLabel: string;
  readonly preview: string;
}

interface CopilotHistoryDropdownProps {
  readonly entries: readonly HistoryEntryView[];
  readonly onSelectEntry: (id: string) => void;
  readonly testID?: string;
}

/**
 * Presentational only — the caller (`CopilotPanelShell.tsx`) hosts this
 * inside a `Modal`, the same way `RowActionsMenu.tsx` floats its own panel
 * above sibling content: a bare `position:absolute` view here would get
 * painted over by the messages `ScrollView` sitting next to it in the panel.
 */
export function CopilotHistoryDropdown({ entries, onSelectEntry, testID }: CopilotHistoryDropdownProps): React.JSX.Element {
  return (
    <View className="w-72 overflow-hidden rounded-[10px] border border-border bg-card shadow-lg" testID={testID}>
      <View className="border-b border-border px-3 py-2">
        <Text className="font-body text-[11.5px] font-semibold text-foreground">Previous conversations</Text>
      </View>
      {entries.length === 0 ? (
        <View className="px-3 py-4">
          <Text className="text-center font-body text-[11.5px] text-muted-foreground">No archived conversations yet</Text>
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 240 }}>
          {entries.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => onSelectEntry(entry.id)}
              className="border-b border-border px-3 py-2.5 last:border-b-0"
              testID={testID !== undefined ? `${testID}-entry-${entry.id}` : undefined}
            >
              <Text className="font-mono text-[10px] text-muted-foreground">{entry.endedAtLabel}</Text>
              <Text className="mt-0.5 font-body text-[12px]" style={{ color: colors.foreground }} numberOfLines={2}>
                {entry.preview || 'No messages'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
