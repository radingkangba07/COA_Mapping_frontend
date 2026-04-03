import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Download, RefreshCw, ArrowLeft } from 'lucide-react-native';
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
import { useHydrateProject } from '../hooks/useHydrateProject';
import { useOnlineGuard } from '@/shared/hooks/useOnlineGuard';
import { useMigrationScreenRoute } from '@/navigation/types';
import { createProjectId } from '@/shared/types/common.types';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';
import { getConfidenceBgClass, getConfidenceTextClass } from '@/shared/constants/mapping-confidence';
import type { MigrationStackParamList } from '@/navigation/types';

type MigrationNavProp = NativeStackNavigationProp<MigrationStackParamList>;
const ICON_SIZE = 16;

function getScoreClasses(score: number): string {
  return `${getConfidenceBgClass(score)} ${getConfidenceTextClass(score)}`;
}

const StatCard = React.memo(({ title, value, colorClass, testID }: {
  readonly title: string; readonly value: number;
  readonly colorClass?: string; readonly testID: string;
}): React.JSX.Element => (
  <Card className="flex-1 min-w-[140px]" testID={testID}>
    <Card.Content className="py-3 px-4">
      <Text className="text-xs font-body text-muted-foreground">{title}</Text>
      <Text className={cn('text-2xl font-heading font-bold mt-1', colorClass ?? 'text-foreground')}>
        {value}
      </Text>
    </Card.Content>
  </Card>
));

StatCard.displayName = 'StatCard';

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

  const { isOnline } = useOnlineGuard();
  const vm = usePreviewScreenViewModel(projectId, navigateBack);

  const { performExport, changeFormat, isExporting, exportFormat } = useExportViewModel({
    groupedMappings: vm.groupedMappings,
    projectId,
  });

  const tableRows = useMemo((): readonly TableRowData[] =>
    vm.groupedMappings.flatMap((group) =>
      group.accounts.map((account, idx) => ({
        sourceNumber: account.source_number,
        sourceName: account.source_name,
        targetName: account.target_name,
        score: account.score,
        sourceType: group.source_type,
        targetType: group.target_type,
        key: `${group.source_type}-${account.source_number}-${idx}`,
      })),
    ), [vm.groupedMappings]);

  const reviewCount = vm.stats.mediumConfidence + vm.stats.lowConfidence;

  const handleStartNew = useCallback((): void => {
    vm.resetMigration();
    navigation.navigate('ERPSelect', { projectId });
  }, [vm, navigation, projectId]);

  const handleExport = useCallback(async (): Promise<void> => {
    await performExport();
  }, [performExport]);

  if (isHydrating) {
    return (
      <Screen testID="preview-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
          <Text className="mt-4 font-body text-sm text-muted-foreground">Loading project data...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen testID="preview-screen">
        <NetworkErrorFallback error={new Error(error.message)} onRetry={retry} testID="preview-error" />
      </Screen>
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
        <MigrationStepper
          currentStep={4}
          completedSteps={vm.completedSteps}
          onStepPress={vm.handleStepPress}
        />

        <View className="mt-8 mb-4">
          <Text className="font-heading text-2xl font-bold text-foreground">Export Preview</Text>
          <Text className="mt-1 font-body text-sm text-muted-foreground">
            Review your mapped data before downloading
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <StatCard title="Account Types" value={vm.stats.totalTypes} testID="stat-types" />
          <StatCard title="Accounts Mapped" value={vm.stats.totalAccounts} testID="stat-accounts" />
          <StatCard title="High Confidence" value={vm.stats.highConfidence} colorClass="text-green-600" testID="stat-high" />
          <StatCard title="Review Needed" value={reviewCount} colorClass="text-yellow-600" testID="stat-review" />
        </View>

        {tableRows.length === 0 ? (
          <Card className="mt-6" testID="preview-empty-state">
            <Card.Content>
              <EmptyState
                title="No mapping data"
                description="Complete the mapping and validation steps to see your export preview"
                testID="preview-empty"
              />
            </Card.Content>
          </Card>
        ) : (
          <Card className="mt-6" testID="mapping-preview-table">
            <Card.Content className="py-4 px-4">
              <View className="flex-row items-center gap-2 mb-4">
                <Text className="font-heading text-lg font-semibold text-foreground">
                  Mapping Preview
                </Text>
                <Badge variant="outline">{String(tableRows.length)}</Badge>
              </View>

              <ScrollView horizontal>
                <View className="min-w-[700px] lg:min-w-[900px]">
                  <View className="flex-row border-b border-border pb-2 mb-1">
                    {['Source #', 'Source Name', 'Target Name', 'Score', 'Source Type', 'Target Type'].map(
                      (label, i) => {
                        const w = i === 0 ? 'w-[80px] lg:w-[100px]' : i === 3 ? 'w-[60px] lg:w-[100px]' : i >= 4 ? 'w-[100px] lg:w-[130px]' : 'flex-1';
                        return <Text key={label} className={cn(w, 'text-xs font-semibold text-muted-foreground')}>{label}</Text>;
                      },
                    )}
                  </View>

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
                </View>
              </ScrollView>
            </Card.Content>
          </Card>
        )}

        <View className="mt-6">
          <ExportFormatPicker
            value={exportFormat}
            onChange={changeFormat}
            disabled={isExporting}
            testID="export-format-picker"
          />
        </View>

        <View className="mt-4 flex-row gap-3">
          <Button variant="outline" size="lg" onPress={vm.handleBack} accessibilityLabel="Back to validation" className="flex-1" testID="back-button">
            <View className="flex-row items-center gap-2">
              <ArrowLeft size={ICON_SIZE} color={colors.foreground} />
              <Text className="text-sm font-medium text-foreground">Back</Text>
            </View>
          </Button>
          <Button size="lg" onPress={handleExport} disabled={isExporting || !isOnline} accessibilityLabel="Download export" className="flex-1" testID="download-button">
            <View className="flex-row items-center gap-2">
              <Download size={ICON_SIZE} color={colors.primaryForeground} />
              <Text className="text-sm font-medium text-primary-foreground">
                {isExporting ? 'Exporting...' : 'Download'}
              </Text>
            </View>
          </Button>
        </View>
        <Button variant="outline" size="lg" onPress={handleStartNew} accessibilityLabel="Start new migration" className="mt-3 w-full" testID="start-new-button">
          <View className="flex-row items-center gap-2">
            <RefreshCw size={ICON_SIZE} color={colors.foreground} />
            <Text className="text-sm font-medium text-foreground">Start New Migration</Text>
          </View>
        </Button>
    </MigrationLayout>
  );
};
