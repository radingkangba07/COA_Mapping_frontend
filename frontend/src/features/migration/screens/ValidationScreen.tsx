import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  FileSpreadsheet,
  FolderTree,
  Save,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronsUpDown,
  ChevronsDownUp,
} from 'lucide-react-native';
import { MigrationLayout } from '../components/MigrationLayout';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { Spinner } from '@/shared/components/ui/Spinner';
import { Collapsible } from '@/shared/components/ui/Collapsible';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { MappingStatsBar } from '../components/MappingStatsBar/MappingStatsBar';
import { AccountTypeGroup } from '../components/AccountTypeGroup/AccountTypeGroup';
import type { ScoreSortDirection } from '../components/AccountTypeGroup/AccountTypeGroup';
import { SelectionActionBar } from '../components/SelectionActionBar/SelectionActionBar';
import { ConfirmedReviewModal } from '../components/ConfirmedReviewModal/ConfirmedReviewModal';
import { Dialog } from '@/shared/components/ui/Dialog';
import { ValidationSkeleton } from '../components/ValidationSkeleton';
import { useHydrateProject } from '../hooks/useHydrateProject';
import { useValidationScreenViewModel } from '../hooks/useValidationScreenViewModel';
import { useJobStream } from '../hooks/useJobStream';
import { useMappingSuggestions } from '../hooks/useMappingSuggestions';
import { useMigrationStore } from '../store/migration.store';
import { adaptSuggestionsToGroupedMappings } from '../services/suggestion-adapter.service';
import { useMigrationScreenRoute } from '@/navigation/types';
import { createProjectId } from '@/shared/types/common.types';
import { useToast } from '@/shared/hooks/useToast';
import { cn } from '@/shared/utils/string.utils';
import type { MigrationStackParamList } from '@/navigation/types';
import type { ConfidenceLevel } from '../types/mapping.types';
import type { JobStatusEvent } from '../types/job-event.types';
import { colors } from '@/config/theme';
import { STEP_TO_SCREEN } from '@/shared/constants/migration-steps';
import type { MigrationStepValue } from '@/shared/constants/migration-steps';

type MigrationNavProp = NativeStackNavigationProp<MigrationStackParamList>;
const ICON_SIZE = 16;

const CONFIRMATION_TITLES: Record<ConfidenceLevel, string> = {
  high: 'High Score Accounts',
  medium: 'Medium Score Accounts',
  low: 'Low Score Accounts',
};

const CONFIRMATION_DESCRIPTIONS: Record<ConfidenceLevel, (count: number) => string> = {
  high: (count) => `Review the ${count} accounts with 90%+ confidence scores. These are the most reliable matches.`,
  medium: (count) => `Review the ${count} accounts with 70-89% confidence scores. These may need attention.`,
  low: (count) => `Review the ${count} accounts with <70% confidence scores. These likely need manual review.`,
};

const CONFIRMATION_BUTTON_CLASSES: Record<ConfidenceLevel, string> = {
  high: '',
  medium: '',
  low: '',
};

const CONFIRMATION_ICON_COLORS: Record<ConfidenceLevel, string> = {
  high: '#003399',
  medium: '#003399',
  low: '#DC2626',
};

const CONFIRMATION_CLASSES: Record<ConfidenceLevel, string> = {
  high: 'border-border bg-card',
  medium: 'border-border bg-card',
  low: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
};

const CONFIRM_BUTTON_LABELS: Record<ConfidenceLevel, string> = {
  high: 'CONFIRM HIGH SCORE',
  medium: 'CONFIRM MEDIUM SCORE',
  low: 'CONFIRM LOW SCORE',
};

export const ValidationScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MigrationNavProp>();
  const route = useMigrationScreenRoute<'Validation'>();
  const { projectId } = route.params;
  const [scoreSortDirection, setScoreSortDirection] = useState<ScoreSortDirection>('none');
  const [allExpanded, setAllExpanded] = useState(true);
  const handleToggleAllGroups = useCallback(() => setAllExpanded((v) => !v), []);
  const { isHydrating, error, retry } = useHydrateProject(createProjectId(projectId));

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const navigateBack = useCallback(
    (id: string) => navigation.navigate('Mapping', { projectId: id }),
    [navigation],
  );
  const navigateForward = useCallback(
    (id: string) => navigation.navigate('Preview', { projectId: id }),
    [navigation],
  );
  const navigateToFinalPreview = useCallback(
    (id: string) => navigation.navigate('FinalPreview', { projectId: id }),
    [navigation],
  );

  const vm = useValidationScreenViewModel(projectId, navigateBack, navigateForward, navigateToFinalPreview);

  // 'closed' = modal hidden; null = show all confirmed accounts
  const [reviewLevel, setReviewLevel] = useState<ConfidenceLevel | null | 'closed'>('closed');
  const handleOpenAllReview = useCallback(() => setReviewLevel(null), []);
  const handleCloseReview = useCallback(() => setReviewLevel('closed'), []);

  const { showSuccess, showError, showWarning } = useToast();
  // ValidationScreen shows all groups at once, so request the backend's max
  // page size (500) instead of paginating. `total` from the response is the
  // authoritative row count surfaced in the header.
  const suggestions = useMappingSuggestions(projectId);
  const setGroupedMappings = useMigrationStore((s) => s.setGroupedMappings);

  // Push suggestion snapshots into the store so the existing VM (stats,
  // filters, confirmation, edit/delete UI) sees them without any rewiring.
  // Wait for hydration to finish — hydration calls store.reset() asynchronously,
  // which would wipe groupedMappings after this effect runs if we don't wait.
  // Skip the update when the query errored — don't wipe existing store data.
  useEffect((): void => {
    if (isHydrating) return;
    if (suggestions.isLoading) return;
    if (suggestions.error !== null) return;
    setGroupedMappings(adaptSuggestionsToGroupedMappings(suggestions.suggestions));
  }, [isHydrating, suggestions.isLoading, suggestions.error, suggestions.suggestions, setGroupedMappings]);

  const refetchRef = useRef(suggestions.refetch);
  refetchRef.current = suggestions.refetch;

  const handleJobComplete = useCallback(
    (event: JobStatusEvent): void => {
      if (event.jobType !== 'account_matching' && event.jobType !== 'mapping') {
        return;
      }
      void refetchRef.current();
      showSuccess('Mapping complete', 'Latest suggestions loaded.');
    },
    [showSuccess],
  );

  const handleJobFailed = useCallback(
    (event: JobStatusEvent): void => {
      if (event.jobType !== 'account_matching' && event.jobType !== 'mapping') {
        return;
      }
      showError('Mapping failed', event.errorMessage ?? 'Please try again.');
    },
    [showError],
  );

  const jobStream = useJobStream(projectId, {
    onComplete: handleJobComplete,
    onFailed: handleJobFailed,
  });


  const liveErrorSurfacedRef = useRef(false);
  useEffect((): void => {
    if (jobStream.error !== null && !liveErrorSurfacedRef.current) {
      liveErrorSurfacedRef.current = true;
      showWarning('Live updates unavailable', 'Refresh to check status.');
    }
    if (jobStream.error === null) {
      liveErrorSurfacedRef.current = false;
    }
  }, [jobStream.error, showWarning]);

  const handleStepPress = useCallback(
    (step: number): void => {
      vm.handleStepPress(step);
      const screen = STEP_TO_SCREEN[step as MigrationStepValue];
      navigation.navigate(screen as 'ERPSelect', { projectId });
    },
    [vm, navigation, projectId],
  );

  const handleToggleScoreSort = useCallback(() => {
    setScoreSortDirection((current) => {
      if (current === 'none') return 'desc';
      if (current === 'desc') return 'asc';
      return 'none';
    });
  }, []);

  const ScoreSortIcon =
    scoreSortDirection === 'desc'
      ? ArrowDown
      : scoreSortDirection === 'asc'
        ? ArrowUp
        : ArrowUpDown;

  if (isHydrating) {
    return (
      <MigrationLayout title="DataPortation" projectId={projectId} onBack={handleGoBack} testID="validation-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
          <Text className="mt-4 font-body text-sm text-muted-foreground">Loading project data...</Text>
        </View>
      </MigrationLayout>
    );
  }

  if (error) {
    return (
      <MigrationLayout title="DataPortation" projectId={projectId} onBack={handleGoBack} testID="validation-screen">
        <NetworkErrorFallback error={new Error(error.message)} onRetry={retry} testID="validation-error" />
      </MigrationLayout>
    );
  }

  const isLoadingData = suggestions.isLoading && vm.stats.totalAccounts === 0 && vm.filteredMappings.length === 0;

  if (isLoadingData) {
    return (
      <MigrationLayout
        title="DataPortation"
        subtitle="Review validation results"
        projectId={projectId}
        onBack={handleGoBack}
        scroll
        testID="validation-screen"
      >
        <View className="max-w-4xl lg:max-w-6xl flex-1 self-center w-full py-6 gap-6">
          <MigrationStepper
            currentStep={vm.currentStep}
            completedSteps={vm.completedSteps}
            onStepPress={handleStepPress}
          />
          <View className="mt-8 mb-4">
            <Skeleton height={28} className="w-48 rounded" />
            <Skeleton height={14} className="w-64 rounded mt-2" />
          </View>
          <ValidationSkeleton testID="validation-skeleton" />
        </View>
      </MigrationLayout>
    );
  }

  return (
    <MigrationLayout
      title="DataPortation"
      subtitle="Review validation results"
      projectId={projectId}
      onBack={handleGoBack}
      scroll
      testID="validation-screen"
    >
      <View className="max-w-4xl lg:max-w-6xl flex-1 self-center w-full py-6 gap-6">
        <MigrationStepper
          currentStep={vm.currentStep}
          completedSteps={vm.completedSteps}
          onStepPress={handleStepPress}
        />

        {/* Header: Title + file info + progress + action button */}
        <View className="mt-4 mb-4 flex-row items-start justify-between">
          <View>
            <Text className="font-heading text-lg font-bold text-foreground">COA Mapping</Text>
            {vm.sourceFile !== null && (
              <View className="mt-1 flex-row items-center gap-1.5">
                <FileSpreadsheet size={14} color={colors.mutedForeground} />
                <Text className="font-body text-sm text-muted-foreground">
                  {vm.sourceFile.name} &bull; {suggestions.total > 0 ? suggestions.total : vm.stats.totalAccounts} rows
                </Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-4">
            <View className="items-end gap-1.5">
              <Text className="font-body text-sm font-medium text-foreground">
                {vm.stats.totalTypes} / {vm.stats.totalTypes} types mapped
              </Text>
              <View className="h-2 w-32 rounded-full bg-gray-200 dark:bg-[#3E3E42] overflow-hidden">
                <View className="h-full rounded-full bg-primary" style={{ width: '100%' }} />
              </View>
            </View>
            <Button
              onPress={vm.handleReviewSave}
              disabled={!vm.allConfirmed}
              accessibilityLabel="Review and save"
              testID="review-save-button"
            >
              <View className="flex-row items-center gap-1.5">
                <Save size={ICON_SIZE} color="#FFFFFF" />
                <Text className="text-sm font-medium text-white">Review &amp; Save</Text>
              </View>
            </Button>
          </View>
        </View>

        {/* Mappings saved banner */}
        {vm.hasMappingsSaved && (
          <Card className="mt-4 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" testID="mappings-saved-banner">
            <Card.Content className="py-3 flex-row items-center gap-3">
              <CheckCircle2 size={20} color="#16A34A" />
              <View className="flex-1">
                <Text className="font-heading text-sm font-semibold text-foreground">Mappings Saved</Text>
                <Text className="font-body text-xs text-muted-foreground mt-0.5">Your account mappings have been saved successfully.</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Stats filter cards */}
        <MappingStatsBar
          totalAccounts={vm.stats.totalAccounts}
          highConfidence={vm.stats.highConfidence}
          mediumConfidence={vm.stats.mediumConfidence}
          lowConfidence={vm.stats.lowConfidence}
          confirmedCount={vm.stats.confirmedCount}
          confirmedHigh={vm.confirmedHigh}
          confirmedMedium={vm.confirmedMedium}
          confirmedLow={vm.confirmedLow}
          activeFilter={vm.confidenceFilter}
          onFilterPress={vm.handleFilterPress}
          onConfirmedPress={handleOpenAllReview}
          testID="mapping-stats-bar"
        />

        {/* Confirmation banner — falls back to the first confirmed band so
            "Edit & Reconfirm" stays visible after a reload or on a new
            session/browser, where the ephemeral confidenceFilter selection
            hasn't been made yet even though the confirmation itself is real
            (persisted server-side). */}
        {(() => {
          const fallbackLevel = vm.confirmedHigh ? 'high' : vm.confirmedMedium ? 'medium' : vm.confirmedLow ? 'low' : null;
          const level = vm.confidenceFilter ?? fallbackLevel;
          if (level === null) return null;
          const isConfirmed =
            level === 'high' ? vm.confirmedHigh :
            level === 'medium' ? vm.confirmedMedium :
            vm.confirmedLow;
          const accountCount =
            level === 'high' ? vm.stats.highConfidence :
            level === 'medium' ? vm.stats.mediumConfidence :
            vm.stats.lowConfidence;
          const iconColor = CONFIRMATION_ICON_COLORS[level];

          return (
            <Card className={cn('mt-4', CONFIRMATION_CLASSES[level])} testID="confirmation-card">
              <Card.Content className="py-3 flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-3 flex-1">
                  {isConfirmed ? (
                    <CheckCircle2 size={20} color="#003399" />
                  ) : (
                    <AlertTriangle size={20} color={iconColor} />
                  )}
                  <View className="flex-1">
                    <Text className="font-heading text-sm font-semibold text-foreground">
                      {isConfirmed
                        ? `${CONFIRMATION_TITLES[level]} Confirmed`
                        : CONFIRMATION_TITLES[level]}
                    </Text>
                    <Text className="font-body text-xs text-muted-foreground mt-0.5">
                      {isConfirmed
                        ? 'You can still make edits if needed'
                        : CONFIRMATION_DESCRIPTIONS[level](accountCount)}
                    </Text>
                  </View>
                </View>
                {isConfirmed ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => vm.handleResetBand(level)}
                    accessibilityLabel={`Edit and reconfirm ${level} score`}
                    testID={`confirm-${level}`}
                  >
                    <View className="flex-row items-center gap-1.5">
                      <Edit3 size={14} color={colors.foreground} />
                      <Text className="text-xs font-medium text-foreground">Edit &amp; Reconfirm</Text>
                    </View>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className={CONFIRMATION_BUTTON_CLASSES[level]}
                    onPress={() => vm.handleConfirm(level)}
                    accessibilityLabel={`Confirm ${level} score`}
                    testID={`confirm-${level}`}
                  >
                    <Text className="text-xs font-medium text-white">
                      Confirm {level.charAt(0).toUpperCase() + level.slice(1)} Score
                    </Text>
                  </Button>
                )}
              </Card.Content>
            </Card>
          );
        })()}


        {/* Deleted accounts */}
        {vm.deletedAccounts.length > 0 && (
          <View className="mt-4">
            <Collapsible
              isOpen={vm.isDeletedOpen}
              onToggle={vm.handleToggleDeleted}
              title={`Deleted Accounts (${vm.deletedAccounts.length})`}
              className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
              testID="deleted-accounts"
            >
              {vm.deletedAccounts.map((account, index) => (
                <View
                  key={`${account.sourceNumber}-${account.sourceName}`}
                  className="flex-row items-center justify-between border-b border-red-100 dark:border-red-800 py-2 last:border-b-0"
                >
                  <View className="flex-1">
                    <Text className="font-mono text-xs text-muted-foreground">{account.sourceNumber}</Text>
                    <Text className="text-sm text-foreground">{account.sourceName}</Text>
                    <Text className="text-xs text-muted-foreground">{account.sourceType}</Text>
                  </View>
                  <Button variant="outline" size="sm" onPress={() => vm.handleRestoreAccount(index)} accessibilityLabel={`Restore ${account.sourceName}`} testID={`restore-${index}`}>
                    <View className="flex-row items-center gap-1">
                      <RotateCcw size={ICON_SIZE} color={colors.foreground} />
                      <Text className="text-xs font-medium text-foreground">Restore</Text>
                    </View>
                  </Button>
                </View>
              ))}
            </Collapsible>
          </View>
        )}

        {/* Account Type Mappings section title + legend */}
        <View className="mt-6 mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <FolderTree size={18} color={colors.primary} />
            <Text className="font-heading text-base font-semibold text-foreground">
              Account Name Mappings
            </Text>
            <Button
              size="sm"
              variant="outline"
              onPress={handleToggleAllGroups}
              className="h-7 px-2 ml-1"
              accessibilityLabel={allExpanded ? 'Collapse all groups' : 'Expand all groups'}
            >
              <View className="flex-row items-center gap-1">
                {allExpanded ? (
                  <ChevronsDownUp size={13} color={colors.mutedForeground} />
                ) : (
                  <ChevronsUpDown size={13} color={colors.mutedForeground} />
                )}
                <Text className="text-xs text-muted-foreground">
                  {allExpanded ? 'Collapse All' : 'Expand All'}
                </Text>
              </View>
            </Button>
          </View>
        </View>

        {/* Confirm instructions — reflects whichever confidence band is active */}
        <Text className="font-body text-xs text-muted-foreground mb-3">
          {(() => {
            const activeLevel = vm.confidenceFilter ?? 'high';
            const levelLabel = CONFIRM_BUTTON_LABELS[activeLevel];
            return `To confirm all the account types/names press ${levelLabel}. For partial selection use check boxes and then press ${levelLabel}.`;
          })()}
        </Text>

        {/* Bulk selection action bar — visible when ≥1 row is selected */}
        <SelectionActionBar
          count={vm.selectedCount}
          onDelete={vm.handleBulkDelete}
          onClear={vm.handleClearSelection}
          testID="selection-action-bar"
        />

        {/* Table — single bordered container: header + all groups */}
        <View className="rounded-lg border border-border overflow-hidden">
          {/* Table header */}
          <View className="flex-row bg-gray-100 dark:bg-[#2D2D2D] border-b border-border px-6 py-2.5">
            {/* Spacer to align with row checkboxes below */}
            <View className="w-8" />
            <View className="w-[8%] pr-2">
              <Text className="text-sm font-semibold text-muted-foreground" numberOfLines={1}>
                Src #
              </Text>
            </View>
            <View className="w-[26%] pr-4">
              <Text className="text-sm font-semibold text-muted-foreground" numberOfLines={1}>
                Source Account
              </Text>
            </View>
            <View className="w-[2%] items-center" />
            <View className="w-[7%] pl-2 pr-1">
              <Text className="text-sm font-semibold text-muted-foreground" numberOfLines={1}>
                Tgt #
              </Text>
            </View>
            <View className="w-[26%] pr-4">
              <Text className="text-sm font-semibold text-muted-foreground" numberOfLines={1}>
                Target Account
              </Text>
            </View>
            <View className="w-[8%] items-center">
              <Pressable
                onPress={handleToggleScoreSort}
                className="flex-row items-center gap-1 rounded px-1 py-0.5"
                accessibilityRole="button"
                accessibilityLabel="Sort account mappings by score within each account type"
                testID="score-sort-button"
              >
                <Text className="text-sm font-semibold text-muted-foreground">Score</Text>
                <ScoreSortIcon size={12} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <View className="w-[13%] items-center">
              <Text className="text-sm font-semibold text-muted-foreground">Remark</Text>
            </View>
            <View className="w-[10%] items-center">
              <Text className="text-sm font-semibold text-muted-foreground">Action</Text>
            </View>
          </View>

          {/* Account type groups — no outer border, share the container */}
          <View>
            {vm.filteredMappings.map((group) => {
              const groupKey = `${group.source_type}__${group.target_type}`;
              return (
                <AccountTypeGroup
                  key={groupKey}
                  sourceType={group.source_type}
                  targetType={group.target_type}
                  confidence={group.confidence}
                  accounts={group.accounts}
                  targetTypes={vm.targetTypes}
                  targetAccounts={vm.targetAccounts}
                  onTypeChange={vm.handleTypeChange}
                  onAccountNameChange={vm.handleAccountNameChange}
                  onDeleteAccount={vm.handleDeleteAccount}
                  forceOpen={allExpanded}
                  scoreSortDirection={scoreSortDirection}
                  testID={`group-${groupKey}`}
                  selection={vm.selection}
                  lockedKeys={vm.lockedKeys}
                  onToggleGroupSelect={(checked, groupKeys) => vm.handleToggleGroup(group.source_type, checked, groupKeys)}
                  onToggleRowSelect={vm.handleToggleRow}
                />
              );
            })}
          </View>
        </View>

        {/* Footer buttons */}
        <View className="mt-6 flex-row items-center justify-end gap-3">
          <Button variant="outline" onPress={vm.handleBack} accessibilityLabel="Back to mapping" testID="back-button">
            <View className="flex-row items-center gap-2">
              <ArrowLeft size={ICON_SIZE} color={colors.foreground} />
              <Text className="text-sm font-medium text-foreground">Back</Text>
            </View>
          </Button>
          <Button
            variant="outline"
            onPress={vm.handleSaveMappings}
            disabled={vm.isSaving}
            isLoading={vm.isSaving}
            accessibilityLabel="Save mapping changes"
            testID="save-button"
          >
            <View className="flex-row items-center gap-2">
              <Save size={ICON_SIZE} color={colors.foreground} />
              <Text className="text-sm font-medium text-foreground">Save Mapping</Text>
            </View>
          </Button>
          <Button onPress={vm.handleContinue} disabled={!vm.allConfirmed || vm.isSaving || (vm.stats.totalAccounts > 0 && !vm.hasMappingsSaved)} isLoading={vm.isSaving} accessibilityLabel="Continue to export" testID="continue-button">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-medium text-primary-foreground">Continue to Export</Text>
              <ArrowRight size={ICON_SIZE} color={colors.primaryForeground} />
            </View>
          </Button>
        </View>
      </View>

      <ConfirmedReviewModal
        visible={reviewLevel !== 'closed'}
        level={reviewLevel === 'closed' ? null : reviewLevel}
        onClose={handleCloseReview}
      />

      {vm.noSelectionDialogVisible && vm.noSelectionDialogOptions !== null && (
        <Dialog
          visible={vm.noSelectionDialogVisible}
          onClose={vm.handleNoSelectionDialogCancel}
          testID="no-selection-confirm-dialog"
        >
          <Dialog.Header>
            <Dialog.Title>{vm.noSelectionDialogOptions.title}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Content>
            <Text className="font-body text-sm text-foreground">
              {vm.noSelectionDialogOptions.message}
            </Text>
          </Dialog.Content>
          <Dialog.Footer>
            <Button
              onPress={vm.handleNoSelectionDialogConfirm}
              testID="no-selection-confirm-ok"
            >
              <Text className="text-xs font-medium text-white">OK</Text>
            </Button>
          </Dialog.Footer>
        </Dialog>
      )}
    </MigrationLayout>
  );
};
