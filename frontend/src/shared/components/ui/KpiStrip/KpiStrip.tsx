import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { MetricBadge } from '../SemanticBadge/MetricBadge';
import { BORDERED_CHIP_WIDTH } from '@/features/master-data-wizard/utils/style';
import { tint } from '@/features/master-data-wizard/utils/colorMix';
import type { BuiltMetric } from '@/features/master-data-wizard/utils/fields';

interface KpiStripProps {
  readonly metrics: readonly BuiltMetric[];
  readonly activeMetricId: string | null;
  readonly onToggleMetric: (metricId: string) => void;
  readonly testID?: string;
}

/**
 * A tile's active state is its own id matching `activeMetricId` — the
 * reference's `active: activeId === m.id` — entirely separate from the
 * field-filter dropdown's own `categoryFilter`. Clicking a tile highlights
 * matching rows in the table and dims the rest; it never changes the
 * dropdown's selection.
 *
 * Every tile is clickable, including "Total records" — the reference's own
 * `metrics` view-model sets `onClick: () => this.clickMetric(m.id)`
 * unconditionally for every metric, never gated on whether that metric
 * happens to compute a non-empty `highlight` set. A metric with no
 * `highlight` (like "records", which has no `field`/`highlight` in its
 * taxonomy entry) still toggles `metric`/`active` state on click — it just
 * produces an empty highlight/dim set, a real but valid no-visible-effect
 * outcome, not a reason to disable the button.
 */
export const KpiStrip = ({ metrics, activeMetricId, onToggleMetric, testID }: KpiStripProps): React.JSX.Element => {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);
  const [hoveredMetricId, setHoveredMetricId] = useState<string | null>(null);

  return (
    <View className="mb-[6px] flex-row flex-wrap gap-2.5" testID={testID}>
      {metrics.map((metric) => {
        const isActive = metric.id === activeMetricId;
        const isHovered = hoveredMetricId === metric.id;
        const tile = (
          <Pressable
            key={metric.id}
            onPress={() => onToggleMetric(metric.id)}
            onHoverIn={() => setHoveredMetricId(metric.id)}
            onHoverOut={() => setHoveredMetricId(null)}
            className="flex-1 flex-row items-center justify-between gap-3 rounded-[10px] py-[9px] pl-[13px] pr-[11px]"
            style={{
              // Same shared thickness as the Copilot suggested-prompt
              // chips (see `utils/style.ts`) — the reference's own
              // literal 1px reads as too thin at this component's actual
              // rendered size, same reasoning already applied there.
              borderWidth: BORDERED_CHIP_WIDTH,
              borderColor: isActive ? colors.accent : isHovered ? colors.accent : colors.border,
              // Reference: `button[data-active="true"]{background:
              // color-mix(in srgb, var(--accent) 12%, transparent)}` — a
              // distinct 12% from `badgeTint`'s fixed 13% (that helper is
              // meant for `data-badge` count chips, not active buttons).
              backgroundColor: isActive ? tint(colors.accent, 12) : colors.card,
              minWidth: 160,
            }}
            testID={testID !== undefined ? `${testID}-${metric.id}` : undefined}
          >
            <Text
              className="font-body text-xs text-foreground"
              style={isActive ? { color: colors.accent } : undefined}
              numberOfLines={1}
            >
              {metric.label}
            </Text>
            <MetricBadge tone={metric.tone}>{metric.value}</MetricBadge>
          </Pressable>
        );

        if (metric.tip.length === 0) return tile;

        return (
          <Tooltip key={metric.id} content={metric.tip} position="bottom" className="min-w-[160px] flex-1">
            {tile}
          </Tooltip>
        );
      })}
    </View>
  );
};
