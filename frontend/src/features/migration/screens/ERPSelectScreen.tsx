import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, Info } from 'lucide-react-native';
import { MigrationLayout } from '../components/MigrationLayout';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { ERPCombobox } from '../components/ERPCombobox/ERPCombobox';
import { useMigrationViewModel } from '../hooks/useMigrationViewModel';
import { useHydrateProject } from '../hooks/useHydrateProject';
import { useMigrationStore } from '../store/migration.store';
import { useERPConfig } from '@/features/erp-config/hooks/useERPConfig';
import { useMigrationScreenRoute } from '@/navigation/types';
import type { MigrationStackParamList } from '@/navigation/types';
import { createProjectId } from '@/shared/types/common.types';
import { colors } from '@/config/theme';
import { updateProject } from '@/features/projects/services/projects.service';
import { httpClient } from '@/shared/services/http/http.instance';
import { STEP_TO_SCREEN } from '@/shared/constants/migration-steps';
import type { MigrationStepValue } from '@/shared/constants/migration-steps';

type MigrationNavProp = NativeStackNavigationProp<MigrationStackParamList>;

export const ERPSelectScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MigrationNavProp>();
  const route = useMigrationScreenRoute<'ERPSelect'>();
  const projectId = route.params.projectId;

  const { isHydrating, error, retry } = useHydrateProject(createProjectId(projectId));

  const {
    currentStep,
    completedSteps,
    sourceERP,
    targetERP,
    canProceedFromStep0,
    handleSourceSelect,
    handleTargetSelect,
    goToStep,
  } = useMigrationViewModel();

  const { erpSystems } = useERPConfig();

  const handleSourceChange = useCallback(
    (erpId: string): void => {
      handleSourceSelect(erpId, erpSystems);
    },
    [handleSourceSelect, erpSystems],
  );

  const handleTargetChange = useCallback(
    (erpId: string): void => {
      handleTargetSelect(erpId, erpSystems);
    },
    [handleTargetSelect, erpSystems],
  );

  const completeStep = useMigrationStore((s) => s.completeStep);
  const setStep = useMigrationStore((s) => s.setStep);

  const handleContinue = useCallback(async (): Promise<void> => {
    completeStep(0);
    setStep(1);
    if (sourceERP && targetERP) {
      await updateProject(httpClient, createProjectId(projectId), {
        currentStep: 1,
        sourceErp: sourceERP.id,
        targetErp: targetERP.id,
      });
    }
    navigation.navigate('Upload', { projectId });
  }, [completeStep, setStep, navigation, projectId, sourceERP, targetERP]);

  const handleStepPress = useCallback(
    (step: number): void => {
      setStep(step);
      const screen = STEP_TO_SCREEN[step as MigrationStepValue];
      navigation.navigate(screen as 'ERPSelect', { projectId });
    },
    [setStep, navigation, projectId],
  );

  const hasBothSelected = sourceERP !== null && targetERP !== null;

  if (isHydrating) {
    return (
      <MigrationLayout title="COA Migration" projectId={projectId} onBack={() => navigation.goBack()} testID="erp-select-screen">
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
      <MigrationLayout title="COA Migration" projectId={projectId} onBack={() => navigation.goBack()} testID="erp-select-screen">
        <NetworkErrorFallback
          error={new Error(error.message)}
          onRetry={retry}
          testID="erp-select-error"
        />
      </MigrationLayout>
    );
  }

  return (
    <MigrationLayout
      title="COA Migration"
      subtitle="Select source and target ERP systems"
      projectId={projectId}
      onBack={() => navigation.goBack()}
      scroll
      testID="erp-select-screen"
    >
      <View className="max-w-4xl lg:max-w-6xl flex-1 self-center w-full py-6 gap-6">
        <MigrationStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepPress={handleStepPress}
        />

        <View className="mt-4 mb-4">
          <Text className="font-heading text-lg font-bold text-foreground">
            Select ERP Systems
          </Text>
          <Text className="mt-1 font-body text-sm text-muted-foreground">
            Choose the source and target ERP systems for your chart of accounts migration.
          </Text>
        </View>

        <Card className="overflow-visible z-10" testID="erp-selection-card">
          <Card.Content className="gap-4 overflow-visible">
            <View className="flex-col lg:flex-row lg:gap-6 gap-4 overflow-visible" style={{ zIndex: 10 }}>
              <View className="flex-1">
                <Text className="mb-2 font-body text-sm font-medium text-foreground">
                  Source ERP
                </Text>
                <ERPCombobox
                  value={sourceERP?.id ?? null}
                  onSelect={handleSourceChange}
                  erpSystems={erpSystems}
                  placeholder="Select Source ERP"
                  testID="source-erp-combobox"
                />
              </View>

              <View className="items-center py-2 lg:justify-center">
                <ArrowRight size={24} color={colors.mutedForeground} />
              </View>

              <View className="flex-1">
                <Text className="mb-2 font-body text-sm font-medium text-foreground">
                  Target ERP
                </Text>
                <ERPCombobox
                  value={targetERP?.id ?? null}
                  onSelect={handleTargetChange}
                  erpSystems={erpSystems}
                  excludeId={sourceERP?.id}
                  placeholder="Select Target ERP"
                  testID="target-erp-combobox"
                />
              </View>
            </View>
            {hasBothSelected && (
              <View className="flex-row items-center gap-1.5 rounded-md px-3 py-2" style={{ backgroundColor: 'rgba(0,51,153,0.05)' }} testID="erp-summary-card">
                <Info size={14} color="#003399" />
                <Text className="font-body text-sm text-muted-foreground">
                  Migrating from <Text className="font-medium" style={{ color: '#003399' }}>{sourceERP.name}</Text>
                  {' → '}
                  <Text className="font-medium" style={{ color: '#003399' }}>{targetERP.name}</Text>
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <View className="mt-4 items-end">
          <Button
            onPress={() => void handleContinue()}
            disabled={!canProceedFromStep0}
            testID="continue-button"
          >
            Continue to Upload
          </Button>
        </View>
      </View>
    </MigrationLayout>
  );
};
