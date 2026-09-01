import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { STEPS } from '../../utils/taxonomy';
import type { StepId } from '../../dp-kit/types/entity';

interface StepRailProps {
  readonly activeStepId: StepId;
  readonly testID?: string;
}

/** The 8-step rail — labels and order come from dp-taxonomies.json, never hardcoded. */
export const StepRail = ({ activeStepId, testID }: StepRailProps): React.JSX.Element => {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);
  const activeIndex = STEPS.findIndex((s) => s.id === activeStepId);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // No border here — the reference's step rail has none (just
      // padding-bottom below the steps), confirmed against the decoded
      // reference template.
      // react-native-web's ScrollView root defaults to flex:1, which would
      // otherwise stretch this to share vertical space with the page body
      // below it instead of sizing to its own content (found + fixed during
      // Step 1's build).
      style={{ flexGrow: 0, flexShrink: 0 }}
      // Horizontal padding dropped — this now nests inside the page's own
      // ScrollView (SourceDataProfileScreen), which already applies
      // padding: 20, so a second 20px inset here would double it and
      // misalign the step badges against the rest of the content column.
      // Reference: `padding-bottom:18px` only — no top padding at all.
      contentContainerStyle={{ alignItems: 'center', paddingBottom: 18 }}
      testID={testID}
    >
      {STEPS.map((step, index) => {
        const isActive = step.id === activeStepId;
        const isDone = index < activeIndex;
        return (
          <View key={step.id} className="flex-row items-center">
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={
                  isActive || isDone
                    ? { backgroundColor: colors.primary }
                    : { borderWidth: 1, borderColor: colors.border }
                }
              >
                {isDone ? (
                  <Check size={13} color={colors.primaryForeground} strokeWidth={3.2} />
                ) : (
                  <Text
                    className={isActive ? 'font-mono text-xs font-bold' : 'font-mono text-xs font-medium'}
                    style={{ color: isActive ? colors.primaryForeground : colors.mutedForeground }}
                  >
                    {step.n}
                  </Text>
                )}
              </View>
              <Text
                className="text-xs"
                numberOfLines={1}
                style={{ color: colors.foreground, fontWeight: isActive ? '700' : '600' }}
              >
                {step.short}
              </Text>
            </View>
            {index < STEPS.length - 1 ? (
              <View
                style={{
                  width: 14,
                  height: 1.5,
                  marginHorizontal: 7,
                  backgroundColor: isDone ? colors.primary : colors.border,
                }}
              />
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
};
