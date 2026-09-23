import React, { useCallback, useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { Button } from '@/shared/components/ui/Button';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ReadinessBanner } from '@/shared/components/ui/ReadinessBanner/ReadinessBanner';
import { KpiStrip } from '@/shared/components/ui/KpiStrip/KpiStrip';
import { VisualFiltersRow } from '@/shared/components/ui/VisualFiltersRow/VisualFiltersRow';
import { MappingFilterDropdown } from '@/shared/components/ui/MappingFilterDropdown/MappingFilterDropdown';
import { MappingTable } from '@/shared/components/ui/MappingTable/MappingTable';
import { useMappingData } from '../hooks/useMappingData';
import { useEntityPackPreview } from '../hooks/useEntityPackPreview';
import { useSyncWizardRightPanel } from '../hooks/useSyncWizardRightPanel';
import { useMappingScreenStore } from '../store/mappingScreen.store';
import { useWizardStore } from '../store/wizard.store';
import { CopilotPanelShell } from '@/shared/components/ui/CopilotPanelShell/CopilotPanelShell';
import { StepRail } from '@/shared/components/ui/StepRail';
import { toStepRail } from '../mappers/toStepRail';
import { getStep, STEPS } from '../utils/taxonomy';
import { buildMappingCards, mappingRowCount, toMappingReadiness, deriveInterimReadiness } from '../utils/mapping';
import { buildMappingRows, canBulkAccept, toBulkAcceptField } from '../utils/mappingRows';
import type { EntityId } from '../dp-kit/types/entity';
import type { StepId } from '../types/wizard.types';

interface FieldMappingScreenProps {
  /** Defaults to wizard.store's entityId (set by MasterDataWizardScreen); overridable for tests/preview. */
  readonly entityId?: EntityId;
  /**
   * Supplied by MasterDataWizardStack's Mapping step wrapper — same
   * plain-callback contract as SourceDataProfileScreen (see its own props
   * doc comment): this component never calls useNavigation()/useRoute()
   * itself, so it still renders standalone with no NavigationContainer
   * ancestor (FieldMappingScreen.test.tsx renders it with neither).
   */
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
}

function LoadingSkeleton(): React.JSX.Element {
  return (
    <View className="gap-3" testID="mapping-loading">
      <Skeleton height={70} borderRadius={12} />
      <View className="flex-row gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={54} borderRadius={10} />)}
      </View>
      <Skeleton height={36} width="40%" borderRadius={8} />
      {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={44} borderRadius={8} />)}
    </View>
  );
}

export function FieldMappingScreen({
  entityId: entityIdProp,
  onBack: onBackProp,
  onContinue,
}: FieldMappingScreenProps): React.JSX.Element {
  const storeEntityId = useWizardStore((s) => s.entityId);
  const entityId = entityIdProp ?? storeEntityId ?? 'items';

  const canGoBack = Boolean(onBackProp);
  const handleBack = useCallback((): void => {
    onBackProp?.();
  }, [onBackProp]);

  const completeStep = useWizardStore((s) => s.completeStep);
  const canContinue = Boolean(onContinue);
  const handleContinue = useCallback((): void => {
    completeStep(entityId, 'mapping' as StepId);
    onContinue?.();
  }, [completeStep, entityId, onContinue]);

  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes (matches SourceDataProfileScreen).
  useAppStore((s) => s.theme);
  const { pack, bookmarkedIds, isLoading, error, refetch } = useMappingData(entityId);
  // Copilot needs the full entity pack (copilotPrompts/copilotResponses/
  // fields) — useMappingData's own `pack` is deliberately narrow (just
  // {mapping}, see its header comment), so this reuses the same fixture-
  // backed hook Profile's screen already calls, purely to source Copilot's
  // content. Not a second source of mapping truth — mappingPack.mapping is
  // never read here, only mappingPack.copilotPrompts/.fields via the shell.
  const { pack: copilotPack } = useEntityPackPreview(entityId);
  // Registers into the wizard's single rightPanel slot (owned by
  // MasterDataWizardScreen) instead of this screen wrapping itself in a
  // second MigrationLayout — see useSyncWizardRightPanel's doc comment.
  // Called unconditionally, before the loading/error/empty early returns
  // below, per the Rules of Hooks.
  const isMappingReady = !isLoading && !error && Boolean(pack);
  const copilotPanel = isMappingReady && copilotPack ? <CopilotPanelShell pack={copilotPack} testID="mapping-copilot" /> : null;
  useSyncWizardRightPanel(copilotPanel);
  const cardFilter = useMappingScreenStore((s) => s.cardFilter);
  const setCardFilter = useMappingScreenStore((s) => s.setCardFilter);
  const pickCardFilter = useMappingScreenStore((s) => s.pickCardFilter);
  const clearCardFilter = useMappingScreenStore((s) => s.clearCardFilter);
  // Called unconditionally (before the loading/error/empty early returns
  // below) per the Rules of Hooks — `pack` isn't known yet at this point,
  // so these fall back to undefined/empty until it loads, matching
  // SourceDataProfileScreen's own useFieldNav/buildMetrics placement.
  const mapping = pack?.mapping;
  const mappingCards = useMemo(() => buildMappingCards(mapping), [mapping]);
  // DA-401 interim mitigation: real backend readiness always wins when
  // present; falls back to a client-derived summary only because the
  // real fields don't exist yet (see deriveInterimReadiness's own doc
  // comment) — this line auto-upgrades once backend ships them, no
  // further frontend change needed.
  const mappingReadiness = useMemo(
    () => toMappingReadiness(mapping?.readiness) ?? deriveInterimReadiness(mapping),
    [mapping],
  );
  // DA-377: the same store write MappingTable's own row-click uses, so the
  // readiness banner's field links and the table stay in sync on one state.
  const handleOpenField = useMappingScreenStore((s) => s.openField);

  // Reference (mapping.page.html pageHeader): "Accept N high-confidence"
  // lives next to Back/Continue, not as an in-table banner — corrects
  // DA-384's original placement. Same set the KPI "High confidence" card
  // counts (status === 'Suggested' with a real proposed target).
  const raiseApproval = useWizardStore((s) => s.raiseApproval);
  const highConfidenceRows = useMemo(
    () => buildMappingRows(mapping, null).filter((row) => row.status === 'Suggested' && canBulkAccept(row)),
    [mapping],
  );
  const handleAcceptHighConfidence = useCallback((): void => {
    const bulkFields = highConfidenceRows.map(toBulkAcceptField);
    if (bulkFields.length === 0) return;
    raiseApproval({
      entityId,
      fieldId: '',
      reason: 'bulk-accept',
      proposedTargetId: null,
      previousTargetId: null,
      bulkFields,
    });
  }, [highConfidenceRows, raiseApproval, entityId]);

  const step = getStep('mapping');
  // Reference: continueLabel = 'Continue to ' + DP_TAX.steps[3].label —
  // read from the taxonomy rather than hardcoded (wizard rule #3).
  const nextStep = getStep('values');
  const stepCount = STEPS.length;
  const stepRail = toStepRail('mapping' as StepId);

  if (isLoading || (!pack && !error)) {
    const content = (
      <View className="-mx-4 -my-4 flex-1 flex-col bg-background md:-mx-6 lg:-mx-8" testID="mapping-screen">
        <ScrollView
          className="flex-1 pr-5"
          contentContainerClassName="px-4 py-4 md:px-6 lg:px-8"
          keyboardShouldPersistTaps="handled"
        >
          <StepRail rail={stepRail} />
          <LoadingSkeleton />
        </ScrollView>
      </View>
    );
    return content;
  }

  if (error) {
    const content = (
      <View className="-mx-4 -my-4 flex-1 flex-col bg-background md:-mx-6 lg:-mx-8" testID="mapping-screen">
        <ScrollView
          className="flex-1 pr-5"
          contentContainerClassName="px-4 py-4 md:px-6 lg:px-8"
          keyboardShouldPersistTaps="handled"
        >
          <StepRail rail={stepRail} />
          <EmptyState
            title="Couldn't load the field mappings"
            description={error.message}
            action={{ label: 'Retry', onPress: refetch }}
            testID="mapping-error"
          />
        </ScrollView>
      </View>
    );
    return content;
  }

  if (!pack) {
    const content = <View className="flex-1" testID="mapping-screen" />;
    return content;
  }

  const activeCard = mappingCards.find((c) => c.id === cardFilter) ?? null;

  const content = (
    <View className="-mx-4 -my-4 flex-1 flex-col bg-background md:-mx-6 lg:-mx-8" testID="mapping-screen">
      <ScrollView
        className="flex-1 pr-5"
        contentContainerClassName="px-4 py-4 md:px-6 lg:px-8"
        keyboardShouldPersistTaps="handled"
      >
        <StepRail rail={stepRail} />

        <View className="mt-8 mb-5 flex-row flex-wrap items-start justify-between gap-3">
          <View className="gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-heading text-[18px] font-bold text-foreground">{step.label}</Text>
              <Text className="font-body text-xs text-muted-foreground">
                {`Step ${step.n} of ${stepCount}`}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            {canGoBack ? (
              <Button variant="outline" onPress={handleBack} testID="mapping-back">
                <View className="flex-row items-center justify-center gap-1.5">
                  <ArrowLeft size={14} color={colors.foreground} />
                  <Text className="text-sm font-medium text-foreground">Back</Text>
                </View>
              </Button>
            ) : null}
            {highConfidenceRows.length > 0 ? (
              <Button variant="outline" onPress={handleAcceptHighConfidence} testID="mapping-accept-high-confidence">
                <Text className="text-sm font-semibold text-foreground">
                  Accept {highConfidenceRows.length} high-confidence
                </Text>
              </Button>
            ) : null}
            {canContinue ? (
              <Button variant="default" onPress={handleContinue} testID="mapping-continue">
                <View className="flex-row items-center justify-center gap-2">
                  <Text className="text-sm font-semibold text-primary-foreground">
                    Continue to {nextStep.label}
                  </Text>
                  <ArrowRight size={15} color={colors.primaryForeground} />
                </View>
              </Button>
            ) : null}
          </View>
        </View>

        {mapping ? (
          <>
            {mappingReadiness ? (
              <ReadinessBanner
                readiness={mappingReadiness}
                onOpenField={handleOpenField}
                testID="mapping-readiness"
              />
            ) : null}

            <KpiStrip
              metrics={mappingCards}
              activeMetricId={cardFilter}
              onToggleMetric={setCardFilter}
              testID="mapping-kpi"
            />

            <View className="mb-[6px] flex-row flex-wrap items-center gap-2">
              <VisualFiltersRow
                label={activeCard?.label ?? null}
                hasVisual={cardFilter !== null}
                onClear={clearCardFilter}
                testID="mapping-visual-filters"
              />
            </View>

            <View className="mb-3">
              <MappingFilterDropdown
                cards={mappingCards}
                totalCount={mappingRowCount(mapping)}
                value={cardFilter}
                onChange={pickCardFilter}
                testID="mapping-filter"
              />
            </View>

            {/* MappingTable owns its own row-click drawer (DA-377), whose
                content (DA-389) and approval modal (DA-378) are both done —
                see MappingTable.tsx/MappingFieldDrawer.tsx. */}
            <MappingTable entityId={entityId} mapping={mapping} bookmarkedIds={bookmarkedIds} testID="mapping-table" />
          </>
        ) : (
          <EmptyState
            title="No field mappings for this entity yet"
            description="This entity pack doesn't have a mapping block."
            testID="mapping-empty"
          />
        )}
      </ScrollView>
    </View>
  );

  return content;
}
