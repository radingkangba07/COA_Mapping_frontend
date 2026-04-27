import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Download, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { MigrationLayout } from '../components/MigrationLayout';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { Badge } from '@/shared/components/ui/Badge';
import { Spinner } from '@/shared/components/ui/Spinner';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { ExportFormatPicker } from '@/features/export/components/ExportFormatPicker';
import { useExportViewModel } from '@/features/export/hooks/useExportViewModel';
import { usePreviewScreenViewModel } from '../hooks/usePreviewScreenViewModel';
import { useMigrationStore } from '../store/migration.store';
import { MIGRATION_STEPS } from '@/shared/constants/migration-steps';
import { useHydrateProject } from '../hooks/useHydrateProject';
import { useOnlineGuard } from '@/shared/hooks/useOnlineGuard';
import { useMigrationScreenRoute } from '@/navigation/types';
import { createProjectId } from '@/shared/types/common.types';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';
import { getConfidenceBgClass, getConfidenceTextClass } from '@/shared/constants/mapping-confidence';
import type { MigrationStackParamList } from '@/navigation/types';
import { STEP_TO_SCREEN } from '@/shared/constants/migration-steps';
import type { MigrationStepValue } from '@/shared/constants/migration-steps';

type MigrationNavProp = NativeStackNavigationProp<MigrationStackParamList>;
const ICON_SIZE = 16;

function getScoreClasses(score: number): string {
  return `${getConfidenceBgClass(score)} ${getConfidenceTextClass(score)}`;
}

interface TableRowData {
  readonly sourceNumber: string; readonly sourceName: string;
  readonly targetName: string; readonly score: number;
  readonly sourceType: string; readonly targetType: string;
  readonly key: string;
}

export const PreviewScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MigrationNavProp>();
  const route = useMigrationScreenRoute<'Preview'>();
  const { projectId } = route.params;
  const { isHydrating, error, retry } = useHydrateProject(createProjectId(projectId));

  const navigateBack = useCallback(
    (id: string) => navigation.navigate('Validation', { projectId: id }),
    [navigation],
  );

  const { height: windowHeight } = useWindowDimensions();
  const { isOnline } = useOnlineGuard();
  const vm = usePreviewScreenViewModel(projectId, navigateBack);

  const handleStepPress = useCallback(
    (step: number): void => {
      vm.handleStepPress(step);
      const screen = STEP_TO_SCREEN[step as MigrationStepValue];
      navigation.navigate(screen as 'ERPSelect', { projectId });
    },
    [vm, navigation, projectId],
  );

  const completeStep = useMigrationStore((s) => s.completeStep);

  // Strip locally-deleted accounts before handing off to export — the export
  // VM doesn't know about is_active and would otherwise write tombstoned rows
  // into the output file.
  const exportableMappings = useMemo(
    () =>
      vm.groupedMappings
        .map((group) => ({
          ...group,
          accounts: group.accounts.filter((a) => a.is_active !== false),
        }))
        .filter((group) => group.accounts.length > 0),
    [vm.groupedMappings],
  );

  const { performExport, markComplete, changeFormat, isExporting, isCompleting, exportFormat } = useExportViewModel({
    groupedMappings: exportableMappings,
    projectId,
  });

  const tableRows = useMemo((): readonly TableRowData[] =>
    vm.groupedMappings.flatMap((group) =>
      group.accounts
        .filter((account) => account.is_active !== false)
        .map((account, idx) => ({
          sourceNumber: account.source_number,
          sourceName: account.source_name,
          targetName: account.target_name,
          score: Math.round(account.score),
          sourceType: group.source_type,
          targetType: group.target_type,
          key: `${group.source_type}-${account.source_number}-${idx}`,
        })),
    ), [vm.groupedMappings]);

  const reviewCount = vm.stats.mediumConfidence + vm.stats.lowConfidence;

  const handleExport = useCallback(async (): Promise<void> => {
    await performExport();
  }, [performExport]);

  const handleComplete = useCallback(async (): Promise<void> => {
    const success = await markComplete();
    if (success) {
      completeStep(MIGRATION_STEPS.FINAL_PREVIEW);
    }
  }, [markComplete, completeStep]);

  if (isHydrating) {
    return (
      <MigrationLayout title="COA Migration" projectId={projectId} onBack={() => navigation.goBack()} testID="preview-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
          <Text className="mt-4 font-body text-sm text-muted-foreground">Loading project data...</Text>
        </View>
      </MigrationLayout>
    );
  }

  if (error) {
    return (
      <MigrationLayout title="COA Migration" projectId={projectId} onBack={() => navigation.goBack()} testID="preview-screen">
        <NetworkErrorFallback error={new Error(error.message)} onRetry={retry} testID="preview-error" />
      </MigrationLayout>
    );
  }

  return (
    <MigrationLayout
      title="COA Migration"
      subtitle="Preview and export mapped data"
      projectId={projectId}
      onBack={() => navigation.goBack()}
      scroll
      testID="preview-screen"
    >
      <View className="max-w-4xl lg:max-w-6xl flex-1 self-center w-full py-6 gap-6">
        <MigrationStepper
          currentStep={4}
          completedSteps={vm.completedSteps}
          onStepPress={handleStepPress}
        />

        <View className="mb-4">
          <Text className="font-heading text-lg font-bold text-foreground">Export Preview</Text>
          <Text className="mt-1 font-body text-sm text-muted-foreground">
            Review your mapped data before downloading
          </Text>
        </View>

        {/* Single card: Stats + Table + Export format */}
        <Card testID="export-preview-card">
          <Card.Content>
            {/* Stats row */}
            <View className="flex-row flex-wrap gap-4 mb-4">
              <View testID="stat-types" className="flex-1 min-w-[100px]">
                <Text className="text-xs font-body text-muted-foreground">Account Types</Text>
                <Text className="text-xl font-heading font-bold text-foreground mt-0.5">{vm.stats.totalTypes}</Text>
              </View>
              <View testID="stat-accounts" className="flex-1 min-w-[100px]">
                <Text className="text-xs font-body text-muted-foreground">Accounts Mapped</Text>
                <Text className="text-xl font-heading font-bold text-foreground mt-0.5">{vm.stats.totalAccounts}</Text>
              </View>
              <View testID="stat-high" className="flex-1 min-w-[100px]">
                <Text className="text-xs font-body text-muted-foreground">High Confidence</Text>
                <Text className="text-xl font-heading font-bold text-primary mt-0.5">{vm.stats.highConfidence}</Text>
              </View>
              <View testID="stat-review" className="flex-1 min-w-[100px]">
                <Text className="text-xs font-body text-muted-foreground">Review Needed</Text>
                <Text className="text-xl font-heading font-bold text-yellow-600 mt-0.5">{reviewCount}</Text>
              </View>
            </View>

            {/* Divider */}
            <View className="border-t border-border my-4" />

            {/* Preview table */}
            {tableRows.length === 0 ? (
              <EmptyState
                title="No mapping data"
                description="Complete the mapping and validation steps to see your export preview"
                testID="preview-empty-state"
              />
            ) : (
              <View testID="mapping-preview-table">
                <View className="flex-row items-center gap-2 mb-3">
                  <Text className="font-heading text-sm font-semibold text-foreground">
                    Mapping Preview
                  </Text>
                  <Badge variant="outline">{String(tableRows.length)}</Badge>
                </View>

                <View className="w-full" style={{ maxHeight: windowHeight * 0.5 }}>
                  <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
                    <View className="min-w-[700px] lg:min-w-[900px] flex-1">
                      <View className="flex-row border-b border-border pb-2 mb-1">
                        {['Source #', 'Source Name', 'Target Name', 'Score', 'Source Type', 'Target Type'].map(
                          (label, i) => {
                            const w = i === 0 ? 'w-[80px] lg:w-[100px]' : i === 3 ? 'w-[60px] lg:w-[100px]' : i >= 4 ? 'w-[100px] lg:w-[130px]' : 'flex-1';
                            return <Text key={label} className={cn(w, 'text-xs font-semibold text-muted-foreground')}>{label}</Text>;
                          },
                        )}
                      </View>

                      <ScrollView nestedScrollEnabled>
                        {tableRows.map((row, idx) => (
                          <View
                            key={row.key}
                            className={cn(
                              'flex-row items-center py-2 px-1 rounded',
                              idx % 2 === 0 ? 'bg-muted/50' : 'bg-background',
                            )}
                          >
                            <Text className="w-[80px] lg:w-[100px] font-mono text-xs text-foreground">{row.sourceNumber}</Text>
                            <Text className="flex-1 text-xs text-foreground" numberOfLines={1}>{row.sourceName}</Text>
                            <Text className="flex-1 text-xs text-foreground" numberOfLines={1}>{row.targetName}</Text>
                            <View className="w-[60px] lg:w-[100px]">
                              <View className={cn('rounded-full px-1.5 py-0.5 self-start', getScoreClasses(row.score))}>
                                <Text className={cn('font-mono text-xs font-medium', getScoreClasses(row.score))}>
                                  {row.score}%
                                </Text>
                              </View>
                            </View>
                            <Text className="w-[100px] lg:w-[130px] text-xs text-muted-foreground" numberOfLines={1}>{row.sourceType}</Text>
                            <Text className="w-[100px] lg:w-[130px] text-xs text-muted-foreground" numberOfLines={1}>{row.targetType}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Divider */}
            <View className="border-t border-border my-4" />

            {/* Export format */}
            <ExportFormatPicker
              value={exportFormat}
              onChange={changeFormat}
              disabled={isExporting}
              testID="export-format-picker"
            />
          </Card.Content>
        </Card>

        {/* Footer buttons — right aligned */}
        <View className="mt-4 flex-row items-center justify-end gap-3">
          <Button variant="outline" onPress={vm.handleBack} accessibilityLabel="Back to validation" testID="back-button">
            <View className="flex-row items-center gap-2">
              <ArrowLeft size={ICON_SIZE} color={colors.foreground} />
              <Text className="text-sm font-medium text-foreground">Back</Text>
            </View>
          </Button>
          <Button variant="outline" onPress={handleExport} disabled={isExporting || !isOnline} accessibilityLabel="Download export" testID="download-button">
            <View className="flex-row items-center gap-2">
              <Download size={ICON_SIZE} color={colors.foreground} />
              <Text className="text-sm font-medium text-foreground">
                {isExporting ? 'Exporting...' : 'Download'}
              </Text>
            </View>
          </Button>
          <Button onPress={handleComplete} disabled={isCompleting || !isOnline} accessibilityLabel="Mark migration complete" testID="complete-button">
            <View className="flex-row items-center gap-2">
              <CheckCircle2 size={ICON_SIZE} color={colors.primaryForeground} />
              <Text className="text-sm font-medium text-primary-foreground">
                {isCompleting ? 'Completing...' : 'Complete'}
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </MigrationLayout>
  );
};
