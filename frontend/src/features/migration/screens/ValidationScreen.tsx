import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
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
import { ValidationSkeleton } from '../components/ValidationSkeleton';
import { useHydrateProject } from '../hooks/useHydrateProject';
import { useValidationScreenViewModel } from '../hooks/useValidationScreenViewModel';
import { useMigrationStore } from '../store/migration.store';
import { useMigrationScreenRoute } from '@/navigation/types';
import { createProjectId } from '@/shared/types/common.types';
import { cn } from '@/shared/utils/string.utils';
import type { MigrationStackParamList } from '@/navigation/types';
import type { ConfidenceLevel } from '../types/mapping.types';
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

export const ValidationScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MigrationNavProp>();
  const route = useMigrationScreenRoute<'Validation'>();
  const { projectId } = route.params;
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

  const vm = useValidationScreenViewModel(projectId, navigateBack, navigateForward);

  const handleStepPress = useCallback(
    (step: number): void => {
      const storeBefore = useMigrationStore.getState();
      console.log('[ValidationScreen] handleStepPress', {
        step,
        sourceERP: storeBefore.sourceERP?.id ?? null,
        targetERP: storeBefore.targetERP?.id ?? null,
        currentStep: storeBefore.currentStep,
      });
      vm.handleStepPress(step);
      const screen = STEP_TO_SCREEN[step as MigrationStepValue];
      console.log('[ValidationScreen] navigating to', screen);
      navigation.navigate(screen as 'ERPSelect', { projectId });
    },
    [vm, navigation, projectId],
  );

  if (isHydrating) {
    return (
      <MigrationLayout title="COA Migration" projectId={projectId} onBack={handleGoBack} testID="validation-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
          <Text className="mt-4 font-body text-sm text-muted-foreground">Loading project data...</Text>
        </View>
      </MigrationLayout>
    );
  }

  if (error) {
    return (
      <MigrationLayout title="COA Migration" projectId={projectId} onBack={handleGoBack} testID="validation-screen">
        <NetworkErrorFallback error={new Error(error.message)} onRetry={retry} testID="validation-error" />
      </MigrationLayout>
    );
  }

  const sourceERPName = vm.sourceERP?.name ?? 'Source';
  const targetERPName = vm.targetERP?.name ?? 'Target';
  const isLoadingData = vm.stats.totalAccounts === 0 && vm.filteredMappings.length === 0;

  if (isLoadingData) {
    return (
      <MigrationLayout
        title="COA Migration"
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
      title="COA Migration"
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
                  {vm.sourceFile.name} &bull; {vm.stats.totalAccounts} rows
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
              onPress={() => navigation.navigate('FinalPreview', { projectId })}
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
          testID="mapping-stats-bar"
        />

        {/* Confirmation banner */}
        {vm.confidenceFilter !== null && (() => {
          const level = vm.confidenceFilter;
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
                    onPress={() => vm.handleConfirm(level)}
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
              Account Type Mappings
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Badge variant="outline" className="bg-card border-border">
              <Text className="text-xs text-muted-foreground">90%+ High</Text>
            </Badge>
            <Badge variant="outline" className="bg-card border-border">
              <Text className="text-xs text-muted-foreground">70-89% Med</Text>
            </Badge>
            <Badge variant="outline" className="bg-card border-border">
              <Text className="text-xs text-muted-foreground">&lt;70% Low</Text>
            </Badge>
          </View>
        </View>

        {/* Table header */}
        <View className="flex-row rounded-t-lg bg-gray-100 dark:bg-[#2D2D2D] border border-border px-4 py-2">
          <View className="w-[8%]">
            <Text className="text-xs font-semibold text-muted-foreground">Account #</Text>
          </View>
          <View className="w-[25%]">
            <Text className="text-xs font-semibold text-muted-foreground">
              Source Account ({sourceERPName})
            </Text>
          </View>
          <View className="w-[5%] items-center" />
          <View className="w-[22%]">
            <Text className="text-xs font-semibold text-muted-foreground">
              Target Account ({targetERPName})
            </Text>
          </View>
          <View className="w-[10%] items-center">
            <Text className="text-xs font-semibold text-muted-foreground">Score</Text>
          </View>
          <View className="w-[20%] items-center">
            <Text className="text-xs font-semibold text-muted-foreground">Remark</Text>
          </View>
          <View className="w-[10%] items-center">
            <Text className="text-xs font-semibold text-muted-foreground">Action</Text>
          </View>
        </View>

        {/* Account type groups */}
        <View className="gap-0">
          {vm.filteredMappings.map((group) => (
            <AccountTypeGroup
              key={group.source_type}
              sourceType={group.source_type}
              targetType={group.target_type}
              confidence={group.confidence}
              accounts={group.accounts}
              targetTypes={vm.targetTypes}
              targetAccountNames={vm.targetAccountNames}
              onTypeChange={vm.handleTypeChange}
              onAccountNameChange={vm.handleAccountNameChange}
              onDeleteAccount={vm.handleDeleteAccount}
              testID={`group-${group.source_type}`}
            />
          ))}
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
          <Button onPress={vm.handleContinue} disabled={!vm.allConfirmed} accessibilityLabel="Continue to export" testID="continue-button">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-medium text-primary-foreground">Continue to Export</Text>
              <ArrowRight size={ICON_SIZE} color={colors.primaryForeground} />
            </View>
          </Button>
        </View>
      </View>
    </MigrationLayout>
  );
};
