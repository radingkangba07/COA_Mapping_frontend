import React from 'react';
import { Text, View } from 'react-native';
import { semantic, badgeTint } from '@/features/master-data-wizard/dp-kit/native/dp-theme';
import { useAppStore } from '@/shared/store/app.store';
import { cn } from '@/shared/utils/string.utils';

interface MetricBadgeProps {
  readonly tone: 'blocker' | 'warn' | 'neutral' | 'ok' | 'info' | 'muted';
  readonly children: React.ReactNode;
  /** Overrides alignment only — e.g. `self-center` for a table cell that centres its content. Defaults to self-start. */
  readonly className?: string;
  readonly testID?: string;
}

/**
 * Tinted numeral chip used by the KPI strip — data-metrictone +
 * data-badge="true" in the web design: `min-width:28px;height:24px;
 * padding:0 8px;border-radius:7px;font-size:13px` — a rounded rectangle,
 * not a pill. (Not the same shape as `GradientChip`, which really is a
 * full pill for a different reference chip.)
 */
export const MetricBadge = ({ tone, children, className, testID }: MetricBadgeProps): React.JSX.Element => {
  const mode = useAppStore((s) => s.theme);
  const { fg } = semantic('metricTone', tone, mode);

  return (
    <View
      className={cn('h-6 min-w-[28px] items-center justify-center self-start rounded-[7px] px-2', className)}
      style={{ backgroundColor: badgeTint(fg) }}
      testID={testID}
    >
      <Text className="font-mono text-[13px] font-bold" style={{ color: fg }}>
        {children}
      </Text>
    </View>
  );
};
