import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, View, type LayoutRectangle } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';
import { ChartCoverageIcon } from '@/shared/components/icons/ChartCoverageIcon';
import { countByCategory } from '@/features/master-data-wizard/utils/fields';
import { COVERAGE_DIMENSIONS } from '@/features/master-data-wizard/utils/taxonomy';
import { BORDERED_CHIP_WIDTH } from '@/features/master-data-wizard/utils/style';
import type { EntityPack } from '@/features/master-data-wizard/dp-kit/types/entity';

interface ProfileCoveragePopoverProps {
  readonly pack: EntityPack;
  readonly testID?: string;
}

interface CoverageStat {
  readonly label: string;
  readonly value: number;
}

export function ProfileCoveragePopover({ pack, testID }: ProfileCoveragePopoverProps): React.JSX.Element {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggerHovered, setIsTriggerHovered] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<LayoutRectangle | null>(null);
  const triggerRef = useRef<View>(null);

  const stats: readonly CoverageStat[] = useMemo(() => {
    const fields = pack.fields;

    return [
      { label: 'Total fields', value: fields.length },
      { label: 'Clean fields', value: fields.filter((f) => f.impact === 'clean').length },
      { label: 'Blocker fields', value: fields.filter((f) => f.impact === 'blocker').length },
      { label: 'Review fields', value: fields.filter((f) => f.impact === 'review' || f.impact === 'warning').length },
      { label: 'Identifier candidates', value: countByCategory(fields, 'identifiers') },
      { label: 'Enumeration candidates', value: countByCategory(fields, 'enums') },
      { label: 'Fields with missing values', value: countByCategory(fields, 'missing') },
      { label: 'Near-empty fields', value: countByCategory(fields, 'nearEmpty') },
      { label: 'Fields with duplicates', value: countByCategory(fields, 'duplicates') },
      { label: 'Fields with pattern anomalies', value: countByCategory(fields, 'patterns') },
      { label: 'Fields with outliers', value: countByCategory(fields, 'outliers') },
      { label: 'Reference failures', value: countByCategory(fields, 'refFailures') },
    ];
  }, [pack.fields]);

  const handleOpen = (): void => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setIsOpen(true);
    });
  };

  const handleClose = (): void => setIsOpen(false);

  const popoverStyle = triggerLayout
    ? { top: triggerLayout.y + triggerLayout.height + 4, left: Math.max(8, triggerLayout.x + triggerLayout.width - 420) }
    : undefined;

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={handleOpen}
        onHoverIn={() => setIsTriggerHovered(true)}
        onHoverOut={() => setIsTriggerHovered(false)}
        className="flex-row items-center gap-[7px] rounded-lg bg-card px-[13px] py-[7px]"
        style={{
          // Same shared thickness as the KPI tiles and Copilot suggested-
          // prompt chips (see `utils/style.ts`) — constant across states,
          // only `borderColor` (and, while open, background) change.
          borderWidth: BORDERED_CHIP_WIDTH,
          borderColor: isOpen || isTriggerHovered ? colors.accent : colors.border,
          ...(isOpen ? { backgroundColor: `${colors.accent}1F` } : undefined),
        }}
        testID={testID}
      >
        <ChartCoverageIcon size={14} color={isOpen ? colors.accent : colors.foreground} />
        <Text
          className="text-[12.5px] font-medium"
          style={{ color: isOpen ? colors.accent : colors.foreground }}
        >
          Profile coverage
        </Text>
      </Pressable>

      <Modal visible={isOpen} transparent animationType={isWeb ? 'none' : 'fade'} onRequestClose={handleClose}>
        <Pressable className={cn('flex-1', isWeb ? 'bg-transparent' : 'bg-black/40')} onPress={handleClose}>
          <View
            className="absolute w-[420px] max-w-[90%] rounded-xl border border-border bg-card px-[18px] py-4 shadow-lg"
            style={popoverStyle}
            onStartShouldSetResponder={() => true}
            testID={testID !== undefined ? `${testID}-panel` : undefined}
          >
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="font-heading text-sm font-bold text-foreground">Profile coverage</Text>
              <Pressable
                onPress={handleClose}
                onHoverIn={() => setIsCloseHovered(true)}
                onHoverOut={() => setIsCloseHovered(false)}
                hitSlop={6}
                testID={testID !== undefined ? `${testID}-close` : undefined}
              >
                <X size={15} color={isCloseHovered ? colors.foreground : colors.mutedForeground} />
              </Pressable>
            </View>

            <View className="mb-3 flex-row items-center gap-1.5">
              <Check size={14} color={colors.success} strokeWidth={2.5} />
              <Text className="text-xs font-semibold" style={{ color: colors.success }}>
                {COVERAGE_DIMENSIONS.length} of {COVERAGE_DIMENSIONS.length} profiling dimensions calculated
              </Text>
            </View>

            <View className="mb-3.5 flex-row flex-wrap" style={{ columnGap: 16, rowGap: 6 }}>
              {stats.map((stat) => (
                <View
                  key={stat.label}
                  className="flex-row items-baseline justify-between border-b border-border py-[5px]"
                  style={{ width: '46%' }}
                >
                  <Text className="text-xs text-muted-foreground">{stat.label}</Text>
                  <Text className="font-mono text-xs font-semibold text-foreground">{stat.value}</Text>
                </View>
              ))}
            </View>

            <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
              Profiling dimensions
            </Text>
            <View className="flex-row flex-wrap" style={{ columnGap: 16, rowGap: 5 }}>
              {COVERAGE_DIMENSIONS.map((dim) => (
                <View key={dim} className="flex-row items-center gap-[7px]" style={{ width: '46%' }}>
                  <Check size={12} color={colors.success} strokeWidth={3} />
                  <Text className="text-[11.5px] text-foreground">{dim}</Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
