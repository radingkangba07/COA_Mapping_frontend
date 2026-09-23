import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, badgeTint } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { Sheet } from '@/shared/components/ui/Sheet';
import { Button } from '@/shared/components/ui/Button';
import { SemanticBadge } from '@/shared/components/ui/SemanticBadge/SemanticBadge';
import { ProvenanceLabel } from '@/shared/components/ui/ProvenanceLabel/ProvenanceLabel';
import { StatTable, type StatTableRow } from '@/shared/components/ui/StatTable';
import { GradientChip } from '@/shared/components/ui/GradientChip';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { confidenceRamp } from '@/features/master-data-wizard/utils/metricRamp';
import type { MappingRow } from '@/features/master-data-wizard/utils/mappingRows';

const DRAWER_WIDTH = 480;

interface MappingFieldDrawerProps {
  readonly row: MappingRow | null;
  readonly onClose: () => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  /** Footer Accept/Exclude — same approval-gated handlers `MappingTable`
   *  already wires to the row actions (DA-378), not a separate write path. */
  readonly isAccepted: boolean;
  readonly isExcluded: boolean;
  readonly onAccept: () => void;
  readonly onExclude: () => void;
  readonly testID?: string;
}

function deterministicChecksRows(row: MappingRow): StatTableRow[] {
  const rows: StatTableRow[] = [{ label: 'Validation', value: row.validation }];
  if (row.sdtype !== '—') rows.push({ label: 'Source type', value: row.sdtype });
  if (row.targetDtype) rows.push({ label: 'Target type', value: row.targetDtype });
  return rows;
}

interface NavButtonProps {
  readonly onPress: () => void;
  readonly icon: (color: string) => React.ReactNode;
  readonly testID?: string;
}

// Same 30x30/border/surface treatment as FieldDetailDrawer's own (Profile-
// specific, unexported) NavButton — mirrored here rather than imported,
// since this drawer intentionally doesn't depend on Profile's drawer.
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

/**
 * DA-377 built the open/close/nav shell; DA-389 fills in the body — header
 * summary line, AI interpretation (prov: ai, only when `row.why` is
 * present), deterministic checks (prov: fact), evidence/sample chips, and
 * footer Accept/Exclude wired to the SAME approval-gated handlers as the
 * row actions (DA-378) — never a separate write path, per this ticket's
 * own DoD.
 */
export function MappingFieldDrawer({
  row,
  onClose,
  onPrev,
  onNext,
  isAccepted,
  isExcluded,
  onAccept,
  onExclude,
  testID,
}: MappingFieldDrawerProps): React.JSX.Element {
  const mode = useAppStore((s) => s.theme);
  const canAccept = row !== null && (row.status === 'Suggested' || row.status === 'Review required');
  const canExclude = row !== null && row.status !== 'Excluded' && row.status !== 'Missing target';

  return (
    <Sheet visible={row !== null} onClose={onClose} side="right" width={DRAWER_WIDTH} testID={testID}>
      {row ? (
        <>
          <Sheet.Header className="flex-col items-start justify-start gap-2 px-[22px] pb-3 pt-[18px]">
            <View className="w-full flex-row items-start justify-between">
              <Sheet.Title className="flex-1 font-bold" testID={testID !== undefined ? `${testID}-title` : undefined}>
                {row.name ?? 'Field'}
              </Sheet.Title>
              <View className="flex-row items-center gap-[5px]">
                <NavButton onPress={onPrev} icon={(color) => <ChevronLeft size={15} color={color} />} testID={testID !== undefined ? `${testID}-prev` : undefined} />
                <NavButton onPress={onNext} icon={(color) => <ChevronRight size={15} color={color} />} testID={testID !== undefined ? `${testID}-next` : undefined} />
                <Sheet.Close
                  onPress={onClose}
                  className="h-[30px] w-[30px] rounded-[7px] border border-border bg-surface opacity-100 hover:bg-surface-highlight active:opacity-100"
                  size={15}
                  iconColor={colors.foreground}
                  testID={testID !== undefined ? `${testID}-close` : undefined}
                />
              </View>
            </View>
            <View className="flex-row flex-wrap items-center gap-2">
              <SemanticBadge family="impact" state={row.statusImpact} size="sm" testID={testID !== undefined ? `${testID}-status` : undefined}>
                {row.status}
              </SemanticBadge>
              <Text className="font-mono text-xs text-muted-foreground" testID={testID !== undefined ? `${testID}-summary` : undefined}>
                {row.sdtype} → {row.targetLabel}
                {row.targetDtype ? ` (${row.targetDtype})` : ''}
                {row.conf !== undefined ? ` · ${row.conf}% confidence` : ''}
              </Text>
            </View>
          </Sheet.Header>

          <Sheet.Content className="flex-1 p-0">
          <ScrollView className="flex-1 px-[22px] py-[18px]" contentContainerClassName="gap-4">
            {row.why ? (
              <View className="gap-2">
                <ProvenanceLabel state="ai">AI interpretation</ProvenanceLabel>
                <View
                  className="rounded-r-lg px-3.5 py-3"
                  style={{ borderLeftWidth: 2, borderLeftColor: colors.accent, backgroundColor: badgeTint(colors.accent) }}
                >
                  <Text className="font-body text-sm leading-[22px] text-foreground">{row.why}</Text>
                </View>
              </View>
            ) : null}

            <View className="gap-2">
              <ProvenanceLabel state="fact">Deterministic checks</ProvenanceLabel>
              <StatTable rows={deterministicChecksRows(row)} />
              {row.handoff ? (
                <SemanticBadge family="find" state={row.handoffFind} size="sm" className="self-start" testID={testID !== undefined ? `${testID}-handoff` : undefined}>
                  {row.handoff}
                </SemanticBadge>
              ) : null}
            </View>

            {row.evidence.length > 0 ? (
              <View className="gap-2">
                <Text className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</Text>
                <View className="flex-row flex-wrap items-center gap-1.5" testID={testID !== undefined ? `${testID}-evidence` : undefined}>
                  {row.evidence.map((e) => (
                    <Tooltip key={e.code} content={e.label} position="bottom">
                      <View className="rounded-full border border-border bg-surface px-2.5 py-1">
                        <Text className="font-mono text-[10.5px] text-muted-foreground">{e.short}</Text>
                      </View>
                    </Tooltip>
                  ))}
                </View>
              </View>
            ) : null}

            {row.samples.length > 0 ? (
              <View className="gap-2">
                <Text className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sample values</Text>
                <View className="flex-row flex-wrap items-center gap-1.5" testID={testID !== undefined ? `${testID}-samples` : undefined}>
                  {row.samples.map((sample, i) => (
                    <View key={`${sample}-${i}`} className="rounded-md border border-border bg-surface px-2.5 py-1">
                      <Text className="font-mono text-xs text-foreground">{sample}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <GradientChip {...confidenceRamp(row.conf)} size="confidence" className="self-start" testID={testID !== undefined ? `${testID}-confidence` : undefined}>
              {row.conf !== undefined ? `${row.conf}% confidence` : 'No confidence score'}
            </GradientChip>
          </ScrollView>
          </Sheet.Content>

          <Sheet.Footer>
            {isExcluded ? (
              <Text className="font-body text-xs font-medium text-muted-foreground">Excluded</Text>
            ) : canExclude ? (
              <Button variant="outline" size="sm" onPress={onExclude} testID={testID !== undefined ? `${testID}-exclude` : undefined}>
                <Text className="text-xs font-medium text-foreground">Exclude</Text>
              </Button>
            ) : null}
            {isAccepted ? (
              <Text className="font-body text-xs font-medium text-muted-foreground">Accepted</Text>
            ) : canAccept ? (
              <Button variant="default" size="sm" onPress={onAccept} testID={testID !== undefined ? `${testID}-accept` : undefined}>
                <Text className="text-xs font-semibold text-primary-foreground">Accept mapping</Text>
              </Button>
            ) : null}
          </Sheet.Footer>
        </>
      ) : null}
    </Sheet>
  );
}
