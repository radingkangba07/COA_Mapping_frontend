import React, { useCallback, useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { Button } from '@/shared/components/ui/Button';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { useEntityPackPreview } from '../hooks/useEntityPackPreview';
import { usePipelineRunPoller } from '../hooks/usePipelineRunPoller';
import { getEntityPackFromApi } from '../services/entity-pack.service';
import { useFieldNav } from '../hooks/useFieldNav';
import { useSourceProfileStore } from '../store/sourceProfile.store';
import { buildEntityKey, useWizardStore } from '../store/wizard.store';
import { StepRail } from '@/shared/components/ui/StepRail';
import { toStepRail } from '../mappers/toStepRail';
import { ReadinessBanner } from '@/shared/components/ui/ReadinessBanner/ReadinessBanner';
import { KpiStrip } from '@/shared/components/ui/KpiStrip/KpiStrip';
import { VisualFiltersRow } from '@/shared/components/ui/VisualFiltersRow/VisualFiltersRow';
import { AppliedDecisionsChips } from '@/shared/components/ui/AppliedDecisionsChips/AppliedDecisionsChips';
import { FieldFilterDropdown } from '@/shared/components/ui/FieldFilterDropdown/FieldFilterDropdown';
import { ProfileCoveragePopover } from '@/shared/components/ui/ProfileCoverage/ProfileCoveragePopover';
import { FieldsTable } from '@/shared/components/ui/FieldsTable/FieldsTable';
import { FieldDetailDrawer } from '@/shared/components/ui/FieldDetailDrawer/FieldDetailDrawer';
import { CompareSelectionBar } from '@/shared/components/ui/CompareSelectionBar/CompareSelectionBar';
import { FieldComparisonModal } from '@/shared/components/ui/FieldComparisonModal/FieldComparisonModal';
import { ApprovalModal } from '@/shared/components/ui/ApprovalModal/ApprovalModal';
import { CopilotPanelShell } from '@/shared/components/ui/CopilotPanelShell/CopilotPanelShell';
import { SourceFileIcon } from '@/shared/components/icons/SourceFileIcon';
import { getStep, STEPS } from '../utils/taxonomy';
import { buildMetrics } from '../utils/fields';
import type { EntityId } from '../dp-kit/types/entity';
import type { StepId } from '../types/wizard.types';
import type { AppError } from '@/shared/types/result.types';
import { isAppError } from '@/shared/types/result.types';

interface SourceDataProfileScreenProps {
  /** Defaults to wizard.store's entityId (set by MasterDataWizardScreen); overridable for tests/preview. */
  readonly entityId?: EntityId;
  /**
   * Supplied by MasterDataWizardStack's Profile step wrapper — that's what
   * actually calls navigation.navigate('Upload'), keeping this component
   * free of any useNavigation()/useRoute() call so it still renders
   * standalone with no NavigationContainer ancestor (SourceDataProfileScreen.
   * test.tsx renders it with neither). No Back button when omitted.
   */
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
}

function LoadingSkeleton(): React.JSX.Element {
  return (
    <View className="gap-3" testID="source-profile-loading">
      <Skeleton height={70} borderRadius={12} />
      <View className="flex-row gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={54} borderRadius={10} />)}
      </View>
      <Skeleton height={36} width="40%" borderRadius={8} />
      {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={44} borderRadius={8} />)}
    </View>
  );
}

export function SourceDataProfileScreen({
  entityId: entityIdProp,
  onBack: onBackProp,
  onContinue,
}: SourceDataProfileScreenProps): React.JSX.Element {
  const storeEntityId = useWizardStore((s) => s.entityId);
  const entityId = entityIdProp ?? storeEntityId ?? 'items';
  const orgProjectId = useWizardStore((s) => s.orgProjectId);
  const parentProjectId = useWizardStore((s) => s.parentProjectId);
  // Keyed by project+entity (see wizard.store.ts's buildEntityKey) so this
  // project's Profile step never picks up another project's run id for the
  // same object.
  const runId = useWizardStore((s) => s.pipelineRunIdByEntity[buildEntityKey(parentProjectId ?? '', entityId)]);

  const canGoBack = Boolean(onBackProp);
  const handleBack = useCallback((): void => {
    onBackProp?.();
  }, [onBackProp]);

  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);
  const previewResult = useEntityPackPreview(entityId);
  const { run } = usePipelineRunPoller(runId ?? null);
  const livePackQuery = useQuery({
    queryKey: ['entity-pack-live', orgProjectId, entityId] as const,
    enabled: run?.status === 'complete',
    queryFn: async () => {
      const result = await getEntityPackFromApi(orgProjectId as string, entityId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    staleTime: Infinity,
  });

  const hasLiveRun = runId !== undefined;
  const liveError: AppError | null =
    livePackQuery.error != null
      ? isAppError(livePackQuery.error)
        ? livePackQuery.error
        : { code: 'entity_pack_live_unknown_error', message: String(livePackQuery.error) }
      : null;
  // While the profiler run is still pending/running (or its result hasn't
  // been fetched yet), render the screen's main content straight away using
  // the preview/fixture pack as a placeholder rather than a "processing"
  // loading state — once livePackQuery resolves, `pack` swaps to the real
  // profiled data with no further gate.
  const pack = hasLiveRun ? (livePackQuery.data ?? previewResult.pack) : previewResult.pack;
  const isLoading = hasLiveRun ? (pack === null && livePackQuery.isLoading) : previewResult.isLoading;
  const error = hasLiveRun ? (pack === null ? liveError : null) : previewResult.error;
  const refetch = hasLiveRun ? () => { void livePackQuery.refetch(); } : previewResult.refetch;

  const categoryFilter = useSourceProfileStore((s) => s.categoryFilter);
  const setCategoryFilter = useSourceProfileStore((s) => s.setCategoryFilter);
  const metricFilterId = useSourceProfileStore((s) => s.metricFilterId);
  const toggleMetricFilter = useSourceProfileStore((s) => s.toggleMetricFilter);
  const clearMetricFilter = useSourceProfileStore((s) => s.clearMetricFilter);
  const promptHighlightIds = useSourceProfileStore((s) => s.promptHighlightIds);
  const promptFilterIds = useSourceProfileStore((s) => s.promptFilterIds);
  const promptFilterLabel = useSourceProfileStore((s) => s.promptFilterLabel);
  const openFieldId = useSourceProfileStore((s) => s.openFieldId);
  const openFieldTab = useSourceProfileStore((s) => s.openFieldTab);
  const openField = useSourceProfileStore((s) => s.openField);
  const closeField = useSourceProfileStore((s) => s.closeField);
  const selectedIds = useSourceProfileStore((s) => s.selectedIds);
  const clearSelected = useSourceProfileStore((s) => s.clearSelected);
  const compareOpen = useSourceProfileStore((s) => s.compareOpen);
  const openCompare = useSourceProfileStore((s) => s.openCompare);
  const closeCompare = useSourceProfileStore((s) => s.closeCompare);
  const pendingApproval = useSourceProfileStore((s) => s.pendingApproval);
  const closeApproval = useSourceProfileStore((s) => s.closeApproval);
  const decisions = useSourceProfileStore((s) => s.decisions);
  const undoDecision = useSourceProfileStore((s) => s.undoDecision);

  const step = getStep('profile');
  const stepCount = STEPS.length;
  const stepRail = toStepRail('profile' as StepId);

  const handleCloseDrawer = useCallback(() => closeField(), [closeField]);
  // Called unconditionally (before the loading/error/empty early returns
  // below) per the Rules of Hooks — pack.fields isn't known yet at this
  // point, so this falls back to an empty array until it loads.
  const { onPrev, onNext } = useFieldNav(pack?.fields ?? [], openFieldId, openField);
  // Computed once here and threaded down to KpiStrip (tiles), FieldsTable
  // (row highlight/dim ids) and VisualFiltersRow (chip label) so all three
  // agree on the same active metric — never a second buildMetrics() call
  // per component.
  const metrics = useMemo(() => (pack ? buildMetrics(pack) : []), [pack]);
  const activeMetric = metrics.find((m) => m.id === metricFilterId) ?? null;
  const highlightIds = activeMetric?.highlight ?? promptHighlightIds;
  // A metric click always dims non-matching rows; a Copilot prompt only
  // does when it also sets `promptFilterIds` (mirrors the reference's own
  // `filterIds` — glow-only for most prompts, glow+dim for "idprob").
  const dimIds = activeMetric?.highlight ?? promptFilterIds;
  // Reference: `filters: id==='records' ? [] : [{id:'metric-'+id, label:labels[id]}]`
  // — every metric except "Total records" pushes a Visual-filters chip;
  // that one tile stays clickable (toggles active/accent) but never shows
  // a chip, since it has no meaningful filter to name.
  const visualFilterLabel = (activeMetric && activeMetric.id !== 'records' ? activeMetric.label : null) ?? promptFilterLabel;
  // Reference: `hasVisual: filters.length > 0 || highlightIds.length > 0 ||
  // metric !== null` — "Clear filters" stays reachable even when the
  // active state has no chip to show (e.g. the "Total records" tile,
  // whose click sets `metric` but never `filters`). `visualFilterLabel`
  // alone under-reports this case, which is why it's a separate value
  // rather than just `visualFilterLabel !== null`.
  const hasVisual = visualFilterLabel !== null || activeMetric !== null || promptHighlightIds.length > 0;

  if (isLoading || (!pack && !error)) {
    const content = (
      <View className="flex-1 flex-col bg-background" testID="source-profile-screen">
        <ScrollView className="flex-1 pr-5" keyboardShouldPersistTaps="handled">
          {/* ── Wizard stepper (all 8 taxonomy steps) ───────────────────────── */}
          <StepRail rail={stepRail} />
          <LoadingSkeleton />
        </ScrollView>
      </View>
    );
    return content;
  }

  if (error) {
    const content = (
      <View className="flex-1 flex-col bg-background" testID="source-profile-screen">
        <ScrollView className="flex-1 pr-5" keyboardShouldPersistTaps="handled">
          {/* ── Wizard stepper (all 8 taxonomy steps) ───────────────────────── */}
          <StepRail rail={stepRail} />
          <EmptyState
            title="Couldn't load the profile"
            description={error.message}
            action={{ label: 'Retry', onPress: refetch }}
            testID="source-profile-error"
          />
        </ScrollView>
      </View>
    );
    return content;
  }

  if (!pack) {
    const content = <View className="flex-1" testID="source-profile-screen" />;
    return content;
  }

  if (pack.fields.length === 0) {
    const content = (
      <View className="flex-1 flex-col bg-background" testID="source-profile-screen">
        <ScrollView className="flex-1 pr-5" keyboardShouldPersistTaps="handled">
          {/* ── Wizard stepper (all 8 taxonomy steps) ───────────────────────── */}
          <StepRail rail={stepRail} />
          <EmptyState
            title="No fields profiled for this pack yet"
            description="The profiler hasn't produced any field-level results."
            testID="source-profile-empty"
          />
        </ScrollView>
      </View>
    );
    return content;
  }

  const openedField = openFieldId !== null ? pack.fields.find((f) => f.id === openFieldId) ?? null : null;
  const [fieldAId, fieldBId] = selectedIds;
  const compareFieldA = fieldAId !== undefined ? pack.fields.find((f) => f.id === fieldAId) ?? null : null;
  const compareFieldB = fieldBId !== undefined ? pack.fields.find((f) => f.id === fieldBId) ?? null : null;
  const approvalField = pendingApproval ? pack.fields.find((f) => f.id === pendingApproval.fieldId) ?? null : null;

  const content = (
    <View className="flex-1 flex-col bg-background" testID="source-profile-screen">
      <View className="flex-1 flex-row">
        <ScrollView className="flex-1 pr-5" keyboardShouldPersistTaps="handled">
          {/* ── Wizard stepper (all 8 taxonomy steps) ───────────────────────── */}
          <StepRail rail={stepRail} />

          <View className="mt-8 mb-5 flex-row flex-wrap items-start justify-between gap-3">
            <View className="gap-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-heading text-[18px] font-bold text-foreground">{step.label}</Text>
                <Text className="font-body text-xs text-muted-foreground">
                  {`Step ${step.n} of ${stepCount}`}
                </Text>
              </View>
              <View className="mt-2 flex-row items-center gap-2">
                <SourceFileIcon size={15} color={colors.mutedForeground} />
                <Text className="font-body text-xs text-muted-foreground">
                  {`${pack.source.object} · ${(pack.source.rowCount ?? 0).toLocaleString('en-US')} rows`}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              {canGoBack ? (
                <Button variant="outline"  onPress={handleBack} testID="source-profile-back">
                  <View className="flex-row items-center justify-center gap-1.5">
                    <ArrowLeft size={14} color={colors.foreground} />
                    <Text className="text-sm font-medium text-foreground">Back</Text>
                  </View>
                </Button>
              ) : null}
              <Button variant="default"  onPress={onContinue} testID="source-profile-continue">
                <View className="flex-row items-center justify-center gap-2">
                  <Text className="text-sm font-semibold text-primary-foreground">
                    Confirm profile &amp; generate mappings
                  </Text>
                  <ArrowRight size={15} color={colors.primaryForeground} />
                </View>
              </Button>
            </View>
          </View>

          {pack.readiness ? (
            <ReadinessBanner
              readiness={pack.readiness}
              onOpenField={openField}
              testID="source-profile-readiness"
            />
          ) : null}

          <KpiStrip
            metrics={metrics}
            activeMetricId={metricFilterId}
            onToggleMetric={toggleMetricFilter}
            testID="source-profile-kpi"
          />

          <View className="mb-[6px] flex-row flex-wrap items-center gap-2">
            <VisualFiltersRow
              label={visualFilterLabel}
              hasVisual={hasVisual}
              onClear={clearMetricFilter}
              testID="source-profile-visual-filters"
            />
            <AppliedDecisionsChips
              decisions={decisions}
              onUndo={undoDecision}
              testID="source-profile-decisions"
            />
          </View>

          <CompareSelectionBar
            selectedCount={selectedIds.length}
            onClear={clearSelected}
            onCompare={openCompare}
            testID="source-profile-compare-bar"
          />

          <View className="mb-[10px] flex-row flex-wrap items-center justify-between gap-3">
            <FieldFilterDropdown
              fields={pack.fields}
              value={categoryFilter}
              onChange={setCategoryFilter}
              testID="source-profile-filter"
            />
            <ProfileCoveragePopover pack={pack} testID="source-profile-coverage" />
          </View>

          <FieldsTable pack={pack} highlightIds={highlightIds} dimIds={dimIds} testID="source-profile-table" />
        </ScrollView>

        <CopilotPanelShell pack={pack} testID="source-profile-copilot" />
      </View>

      <FieldDetailDrawer
        field={openedField}
        rowCount={pack.source.rowCount ?? 0}
        decisions={decisions}
        initialTab={openFieldTab}
        onClose={handleCloseDrawer}
        onPrev={onPrev}
        onNext={onNext}
        testID="source-profile-drawer"
      />

      <FieldComparisonModal
        visible={compareOpen}
        fieldA={compareFieldA}
        fieldB={compareFieldB}
        rowCount={pack.source.rowCount ?? 0}
        onClose={closeCompare}
        testID="source-profile-compare-modal"
      />

      <ApprovalModal
        pending={pendingApproval}
        field={approvalField}
        rowCount={pack.source.rowCount ?? 0}
        onClose={closeApproval}
        testID="source-profile-approval"
      />
    </View>
  );

  return content;
}
