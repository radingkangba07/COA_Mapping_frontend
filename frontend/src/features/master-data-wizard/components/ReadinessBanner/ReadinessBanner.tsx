import React, { useState } from 'react';
import { Pressable, Text, View, type TextStyle } from 'react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { isWeb } from '@/shared/utils/platform.utils';
import { Card } from '@/shared/components/ui/Card';
import { ProvenanceLabel } from '../ProvenanceLabel/ProvenanceLabel';
import { SparklesIcon } from '../icons/SparklesIcon';
import { EvidenceEyeIcon } from '../icons/EvidenceEyeIcon';
import { semantic } from '../../dp-kit/native/dp-theme';
import type { EntityReadiness } from '../../dp-kit/types/entity';

interface ReadinessBannerProps {
  readonly readiness: EntityReadiness;
  readonly onOpenField: (fieldId: string) => void;
  readonly testID?: string;
}

export const ReadinessBanner = ({ readiness, onOpenField, testID }: ReadinessBannerProps): React.JSX.Element => {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  const mode = useAppStore((s) => s.theme);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [hoveredStepLabel, setHoveredStepLabel] = useState<string | null>(null);

  const recommendedOrder = readiness.recommendedOrder ?? [];
  const evidence = readiness.evidence ?? [];
  const { fg: headlineColor } = semantic('metricTone', readiness.tone ?? 'neutral', mode);

  return (
    <Card className="mb-4 rounded-xl shadow-none" testID={testID}>
      <Card.Content className="px-[18px] py-4">
        <Pressable
          onPress={() => setIsExpanded((prev) => !prev)}
          className="flex-row flex-wrap items-center gap-2"
          testID={testID !== undefined ? `${testID}-toggle` : undefined}
        >
          <SparklesIcon size={14} color={colors.accent} />
          <Text className="font-heading text-base font-semibold" style={{ color: headlineColor }}>
            {readiness.headline ?? ''}
          </Text>
          <View className="flex-1" />
          <Text className="font-body text-xs font-semibold text-accent">
            {isExpanded ? 'Show less' : 'Show more'}
          </Text>
          <Text
            className="font-body text-[11px]"
            style={
              {
                color: colors.accent,
                transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                // Reference: `display:block;transition:transform .16s
                // ease` on the caret itself — a plain rotating glyph, not
                // an icon. Web-only (RN's ViewStyle/TextStyle type has no
                // transition properties at all).
                ...(isWeb ? { transitionProperty: 'transform', transitionDuration: '160ms', transitionTimingFunction: 'ease' } : undefined),
              } as TextStyle
            }
          >
            ▾
          </Text>
        </Pressable>

        <Text
          className="mt-2 font-body text-xs leading-5 text-foreground"
          numberOfLines={isExpanded ? undefined : 2}
        >
          {readiness.narrative ?? ''}
        </Text>

        {isExpanded ? (
          <>
            {/* Reference renders this label unconditionally whenever
                expanded — only the chip list itself is naturally empty
                when there's nothing to recommend, not the whole section. */}
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              <View className="mr-0.5">
                <ProvenanceLabel state="action">Recommended order</ProvenanceLabel>
              </View>
              {recommendedOrder.map((step, index) => {
                const isHovered = hoveredStepLabel === step.label;
                return (
                  <Pressable
                    key={step.label}
                    onPress={() => step.target !== undefined && onOpenField(step.target)}
                    onHoverIn={() => setHoveredStepLabel(step.label)}
                    onHoverOut={() => setHoveredStepLabel(null)}
                    className="flex-row items-center gap-1.5 rounded-full border bg-surface px-3 py-1.5"
                    style={{ borderColor: isHovered ? colors.accent : colors.border }}
                    testID={testID !== undefined ? `${testID}-recommended-${index}` : undefined}
                  >
                    <Text className="font-mono text-[10px] text-accent">{index + 1}</Text>
                    <Text
                      className="font-body text-xs font-medium"
                      style={{ color: isHovered ? colors.accent : colors.foreground }}
                    >
                      {step.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Same reasoning — the toggle itself renders unconditionally;
                only the evidence panel content below is naturally empty. */}
            <Pressable
              onPress={() => setIsEvidenceOpen((prev) => !prev)}
              className="mt-3 flex-row items-center gap-1.5"
              testID={testID !== undefined ? `${testID}-evidence-toggle` : undefined}
            >
              <EvidenceEyeIcon size={14} color={colors.accent} />
              <Text className="font-body text-xs font-semibold text-accent">
                {isEvidenceOpen ? 'Hide supporting evidence' : 'Show supporting evidence'}
              </Text>
            </Pressable>

            {isEvidenceOpen ? (
              <View className="mt-2.5 rounded-[10px] border border-border bg-surface p-3">
                <View className="mb-2 flex-row flex-wrap items-center gap-1.5">
                  <ProvenanceLabel state="fact">Calculated evidence</ProvenanceLabel>
                  <Text className="font-body text-[11px] text-muted-foreground">
                    — deterministic profiling, not model output
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
                  {evidence.map((item) => (
                    <View key={item.label} className="min-w-[45%] flex-row items-start gap-2">
                      <Text className="font-mono text-xs font-semibold text-foreground">{item.value}</Text>
                      <Text className="flex-1 font-body text-xs text-muted-foreground">{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </Card.Content>
    </Card>
  );
};
