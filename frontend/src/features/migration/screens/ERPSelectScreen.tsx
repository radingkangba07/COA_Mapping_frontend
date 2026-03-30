import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
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

  const handleContinue = useCallback((): void => {
    completeStep(0);
    goToStep(1);
    navigation.navigate('Upload', { projectId });
  }, [completeStep, goToStep, navigation, projectId]);

  const handleStepPress = useCallback(
    (step: number): void => {
      goToStep(step);
    },
    [goToStep],
  );

  const hasBothSelected = sourceERP !== null && targetERP !== null;

  if (isHydrating) {
    return (
      <Screen testID="erp-select-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
          <Text className="mt-4 font-body text-sm text-muted-foreground">
            Loading project data...
          </Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen testID="erp-select-screen">
        <NetworkErrorFallback
          error={new Error(error.message)}
          onRetry={retry}
          testID="erp-select-error"
        />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="erp-select-screen">
      <View className="max-w-2xl lg:max-w-4xl mx-auto w-full px-4 py-6">
        <MigrationStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepPress={handleStepPress}
        />

        <View className="mt-8 mb-6">
          <Text className="font-heading text-2xl font-bold text-foreground">
            Select ERP Systems
          </Text>
          <Text className="mt-2 font-body text-sm text-muted-foreground">
            Choose the source and target ERP systems for your chart of accounts
            migration.
          </Text>
        </View>

        <Card className="overflow-visible z-10" testID="erp-selection-card">
          <Card.Content className="flex-col lg:flex-row lg:gap-6 gap-4 overflow-visible">
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
          </Card.Content>
        </Card>

        {hasBothSelected && (
          <Card className="mt-4 border-green-200 bg-green-50" testID="erp-summary-card">
            <Card.Content>
              <Text className="font-body text-sm font-medium text-green-800">
                Migrating from {sourceERP.name} → {targetERP.name}
              </Text>
            </Card.Content>
          </Card>
        )}

        <View className="mt-6">
          <Button
            onPress={handleContinue}
            disabled={!canProceedFromStep0}
            size="lg"
            className="bg-accent"
            textClassName="text-accent-foreground"
            testID="continue-button"
          >
            Continue to Upload
          </Button>
        </View>
      </View>
    </Screen>
  );
};
