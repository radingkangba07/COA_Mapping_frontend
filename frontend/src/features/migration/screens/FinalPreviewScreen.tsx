import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  Save,
  X,
} from 'lucide-react-native';
import { MigrationLayout } from '../components/MigrationLayout';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { useHydrateProject } from '../hooks/useHydrateProject';
import { useSaveMappings } from '../hooks/useSaveMappings';
import { useMigrationStore } from '../store/migration.store';
import { useShallow } from 'zustand/react/shallow';
import { selectMappingStats } from '../store/migration.selectors';
import { useMigrationScreenRoute } from '@/navigation/types';
import { createProjectId } from '@/shared/types/common.types';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';
import type { MigrationStackParamList } from '@/navigation/types';
import { STEP_TO_SCREEN } from '@/shared/constants/migration-steps';
import type { MigrationStepValue } from '@/shared/constants/migration-steps';

type MigrationNavProp = NativeStackNavigationProp<MigrationStackParamList>;
const ICON_SIZE = 16;

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
  return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
}

interface PreviewRow {
  readonly key: string;
  readonly sourceNumber: string;
  readonly sourceName: string;
  readonly sourceType: string;
  readonly targetName: string;
  readonly targetType: string;
  readonly score: number;
  readonly isConfirmed: boolean;
}

export const FinalPreviewScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MigrationNavProp>();
  const route = useMigrationScreenRoute<'FinalPreview'>();
  const { projectId } = route.params;
  const { isHydrating, error, retry } = useHydrateProject(createProjectId(projectId));

  // Read grouped mappings directly from the migration store — the Validation
  // screen (via useMappingSuggestions → adaptSuggestionsToGroupedMappings)
  // and the hydration service both populate this field, so it's already the
  // authoritative dataset by the time the user reaches Final Preview.
  const groupedMappings = useMigrationStore((s) => s.groupedMappings);
  const currentStep = useMigrationStore((s) => s.currentStep);
  const completedSteps = useMigrationStore((s) => s.completedSteps);
  const sourceFile = useMigrationStore((s) => s.sourceFile);
  const confirmedHigh = useMigrationStore((s) => s.confirmedHigh);
  const confirmedMedium = useMigrationStore((s) => s.confirmedMedium);
  const confirmedLow = useMigrationStore((s) => s.confirmedLow);
  const completeStep = useMigrationStore((s) => s.completeStep);
  const setStep = useMigrationStore((s) => s.setStep);
  const stats = useMigrationStore(useShallow(selectMappingStats));
  const { save, isSaving } = useSaveMappings(projectId);

  const rows = useMemo((): readonly PreviewRow[] =>
    groupedMappings.flatMap((group) =>
      group.accounts
        .filter((account) => account.is_active !== false)
        .map((account, idx) => {
          const score = Math.round(account.score);
          const isConfirmed =
            (score >= 90 && confirmedHigh) ||
            (score >= 70 && score < 90 && confirmedMedium) ||
            (score < 70 && confirmedLow);
          return {
            key: `${group.source_type}-${account.source_number}-${idx}`,
            sourceNumber: account.source_number,
            sourceName: account.source_name,
            sourceType: group.source_type,
            targetName: account.target_name,
            targetType: group.target_type,
            score,
            isConfirmed,
          };
        }),
    ),
  [groupedMappings, confirmedHigh, confirmedMedium, confirmedLow]);

  const confirmedCount = rows.filter((r) => r.isConfirmed).length;
  const notConfirmedCount = rows.length - confirmedCount;

  const handleBack = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  const handleContinueToExport = useCallback(async (): Promise<void> => {
    // The user has reviewed the final mapping table — this is the commit
    // point. Save (including is_active=false tombstones for deletes) before
    // moving to the export screen. Bail on failure so the user stays here
    // instead of exporting stale data.
    const saved = await save();
    if (!saved) return;
    completeStep(3);
    setStep(4);
    navigation.navigate('Preview', { projectId });
  }, [save, completeStep, setStep, navigation, projectId]);

  const handleStepPress = useCallback(
    (step: number): void => {
      setStep(step);
      const screen = STEP_TO_SCREEN[step as MigrationStepValue];
      navigation.navigate(screen as 'ERPSelect', { projectId });
    },
    [setStep, navigation, projectId],
  );

  if (isHydrating) {
    return (
      <MigrationLayout title="DataPortation" projectId={projectId} onBack={handleBack} testID="final-preview-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
          <Text className="mt-4 font-body text-sm text-muted-foreground">
            Loading project data...
          </Text>
        </View>
      </MigrationLayout>
    );
  }

  if (error) {
    return (
      <MigrationLayout title="DataPortation" projectId={projectId} onBack={handleBack} testID="final-preview-screen">
        <NetworkErrorFallback
          error={new Error(error.message)}
          onRetry={retry}
          testID="final-preview-error"
        />
      </MigrationLayout>
    );
  }

  return (
    <MigrationLayout
      title="DataPortation"
      subtitle="Final review before export"
      projectId={projectId}
      onBack={() => navigation.goBack()}
      scroll
      testID="final-preview-screen"
    >
      <View className="max-w-4xl lg:max-w-6xl flex-1 self-center w-full py-6 gap-6">
        <MigrationStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepPress={handleStepPress}
        />

        {/* COA Mapping header — same as ValidationScreen */}
        <View className="mt-4 mb-4 flex-row items-start justify-between">
          <View>
            <Text className="font-heading text-lg font-bold text-foreground">COA Mapping</Text>
            {sourceFile !== null && (
              <View className="mt-1 flex-row items-center gap-1.5">
                <FileSpreadsheet size={14} color={colors.mutedForeground} />
                <Text className="font-body text-sm text-muted-foreground">
                  {sourceFile.name} &bull; {stats.totalAccounts} rows
                </Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-4">
            <View className="items-end gap-1.5">
              <Text className="font-body text-sm font-medium text-foreground">
                {stats.totalTypes} / {stats.totalTypes} types mapped
              </Text>
              <View className="h-2 w-32 rounded-full bg-gray-200 dark:bg-[#3E3E42] overflow-hidden">
                <View className="h-full rounded-full bg-primary" style={{ width: '100%' }} />
              </View>
            </View>
            <Button
              onPress={handleContinueToExport}
              disabled={isSaving}
              isLoading={isSaving}
              accessibilityLabel="Continue to export"
              testID="continue-to-export"
            >
              <View className="flex-row items-center gap-1.5">
                <Save size={ICON_SIZE} color="#FFFFFF" />
                <Text className="text-sm font-medium text-white">Continue to Export</Text>
              </View>
            </Button>
          </View>
        </View>

        {/* Final Mapping Preview card */}
        <Card className="bg-card" testID="final-preview-card">
          <Card.Content>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Text className="font-heading text-lg font-semibold text-foreground">
                  Final Mapping Preview
                </Text>
                <Badge variant="outline" className="border-blue-200 dark:border-blue-800 bg-card px-2.5 py-1">
                  <View className="flex-row items-center gap-1.5">
                    <CheckCircle2 size={12} color="#003399" />
                    <Text className="text-xs font-medium text-primary dark:text-blue-400">
                      {confirmedCount} Confirmed
                    </Text>
                  </View>
                </Badge>
                <Badge variant="outline" className="border-red-300 dark:border-red-800 bg-card px-2.5 py-1">
                  <View className="flex-row items-center gap-1.5">
                    <X size={12} color="#DC2626" />
                    <Text className="text-xs font-medium text-red-700 dark:text-red-400">
                      {notConfirmedCount} Not Confirmed
                    </Text>
                  </View>
                </Badge>
              </View>
              <View className="flex-row items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleBack}
                  accessibilityLabel="Back to mapping"
                  testID="back-to-mapping"
                >
                  <View className="flex-row items-center gap-1.5">
                    <ArrowLeft size={14} color={colors.foreground} />
                    <Text className="text-xs font-medium text-foreground">Back to Mapping</Text>
                  </View>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleBack}
                  accessibilityLabel="Edit mappings"
                  testID="edit-mappings"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Edit3 size={14} color={colors.foreground} />
                    <Text className="text-xs font-medium text-foreground">Edit</Text>
                  </View>
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Table card */}
        <Card className="mt-4" testID="final-preview-table">
              {/* Table header */}
              <View className="flex-row bg-gray-100 dark:bg-[#2D2D2D] border-b border-border px-4 py-2 rounded-t-lg">
                <View className="w-[8%]">
                  <Text className="text-xs font-semibold text-muted-foreground">Account #</Text>
                </View>
                <View className="w-[20%]">
                  <Text className="text-xs font-semibold text-muted-foreground">Source Account Name</Text>
                </View>
                <View className="w-[12%]">
                  <Text className="text-xs font-semibold text-muted-foreground">Source Type</Text>
                </View>
                <View className="w-[20%]">
                  <Text className="text-xs font-semibold text-muted-foreground">Target Account Name</Text>
                </View>
                <View className="w-[12%]">
                  <Text className="text-xs font-semibold text-muted-foreground">Target Type</Text>
                </View>
                <View className="w-[10%] items-center">
                  <Text className="text-xs font-semibold text-muted-foreground">Score</Text>
                </View>
                <View className="w-[18%] items-center">
                  <Text className="text-xs font-semibold text-muted-foreground">Status</Text>
                </View>
              </View>

              {/* Table rows */}
              <ScrollView>
                {rows.map((row, idx) => {
                  const scoreColor = getScoreColor(row.score);
                  return (
                    <View
                      key={row.key}
                      className={cn(
                        'flex-row items-center px-4 py-2 border-b border-border last:border-b-0',
                        idx % 2 === 0 ? 'bg-card' : 'bg-surface-highlight',
                      )}
                    >
                      <View className="w-[8%]">
                        <Text className="font-mono text-xs text-muted-foreground">{row.sourceNumber}</Text>
                      </View>
                      <View className="w-[20%]">
                        <Text className="text-xs text-foreground" numberOfLines={1}>{row.sourceName}</Text>
                      </View>
                      <View className="w-[12%]">
                        <Text className="text-xs text-muted-foreground" numberOfLines={1}>{row.sourceType}</Text>
                      </View>
                      <View className="w-[20%]">
                        <Text className="text-xs text-foreground" numberOfLines={1}>{row.targetName}</Text>
                      </View>
                      <View className="w-[12%]">
                        <Text className="text-xs text-muted-foreground" numberOfLines={1}>{row.targetType}</Text>
                      </View>
                      <View className="w-[10%] items-center">
                        <Badge className={cn(scoreColor, 'px-1.5 py-0.5')}>
                          <Text className={cn('text-xs font-mono font-medium', scoreColor)}>
                            {row.score}%
                          </Text>
                        </Badge>
                      </View>
                      <View className="w-[18%] items-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'px-2 py-0.5 bg-card',
                            row.isConfirmed ? 'border-blue-200 dark:border-blue-800' : 'border-red-300 dark:border-red-800',
                          )}
                        >
                          <Text
                            className={cn(
                              'text-xs font-medium',
                              row.isConfirmed ? 'text-primary dark:text-blue-400' : 'text-red-700 dark:text-red-400',
                            )}
                          >
                            {row.isConfirmed ? 'Confirmed' : 'Not Confirmed'}
                          </Text>
                        </Badge>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
        </Card>
      </View>
    </MigrationLayout>
  );
};
