import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useShallow } from 'zustand/react/shallow';
import { CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { FieldMappingTable } from '../components/FieldMappingTable/FieldMappingTable';
import { MappingTableSkeleton } from '../components/MappingTableSkeleton';
import { useFuzzyMapper } from '../hooks/useFuzzyMapper';
import { useMigrationStore } from '../store/migration.store';
import { selectTypeMappingSummary } from '../store/migration.selectors';
import { useMigrationScreenRoute } from '@/navigation/types';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import type { MigrationStackParamList } from '@/navigation/types';
import type { TypeMappingRow } from '../types/migration.types';

type MigrationNavProp = NativeStackNavigationProp<MigrationStackParamList>;

export const MappingScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MigrationNavProp>();
  const route = useMigrationScreenRoute<'Mapping'>();
  const { projectId } = route.params;

  const currentStep = useMigrationStore((s) => s.currentStep);
  const completedSteps = useMigrationStore((s) => s.completedSteps);
  const typeMappingRows = useMigrationStore((s) => s.typeMappingRows);
  const targetTypes = useMigrationStore((s) => s.targetTypes);
  const isLoading = useMigrationStore((s) => s.isLoading);

  const actions = useMigrationStore(
    useShallow((s) => ({
      updateTypeMappingRow: s.updateTypeMappingRow,
      addTypeMappingRow: s.addTypeMappingRow,
      deleteTypeMappingRow: s.deleteTypeMappingRow,
      setStep: s.setStep,
      completeStep: s.completeStep,
    })),
  );

  const { runMapping, isMapping } = useFuzzyMapper();
  const mappingSummary = useMigrationStore(selectTypeMappingSummary);

  const handleUpdateRow = useCallback(
    (id: string, update: Partial<TypeMappingRow>): void => {
      if (update.sourceType !== undefined) {
        actions.updateTypeMappingRow(id, 'sourceType', update.sourceType);
      }
      if (update.targetType !== undefined) {
        actions.updateTypeMappingRow(id, 'targetType', update.targetType);
      }
    },
    [actions],
  );

  const handleAddRow = useCallback((): void => {
    actions.addTypeMappingRow();
  }, [actions]);

  const handleDeleteRow = useCallback(
    (id: string): void => {
      actions.deleteTypeMappingRow(id);
    },
    [actions],
  );

  const handleBack = useCallback((): void => {
    actions.setStep(1);
    navigation.navigate('Upload', { projectId });
  }, [actions, navigation, projectId]);

  const handleProceed = useCallback(async (): Promise<void> => {
    await runMapping();
  }, [runMapping]);

  const handleStepPress = useCallback(
    (step: number): void => {
      actions.setStep(step);
    },
    [actions],
  );

  const canProceed = mappingSummary.allMatched && !isMapping;

  if (isLoading && typeMappingRows.length === 0) {
    return (
      <Screen scroll testID="mapping-screen">
        <View className="max-w-4xl lg:max-w-6xl flex-1 self-center w-full px-4 py-6 gap-6">
          <MigrationStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepPress={handleStepPress}
          />
          <View>
            <Skeleton height={28} className="w-48 rounded" />
            <Skeleton height={14} className="w-full rounded mt-2" />
          </View>
          <MappingTableSkeleton testID="mapping-skeleton" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll testID="mapping-screen">
      <View className="max-w-4xl lg:max-w-6xl flex-1 self-center w-full px-4 py-6 gap-6">
        <MigrationStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepPress={handleStepPress}
        />

        <View>
          <Text className="font-heading text-2xl font-bold text-foreground">
            Type Mapping
          </Text>
          <Text className="mt-2 font-body text-sm text-muted-foreground">
            Review and edit the source-to-target account type mappings. Each
            source type must be matched to a target type before proceeding.
          </Text>
        </View>

        <MappingSummaryCard
          matched={mappingSummary.matched}
          total={mappingSummary.total}
          allMatched={mappingSummary.allMatched}
        />

        <FieldMappingTable
          rows={typeMappingRows}
          targetTypes={targetTypes}
          onUpdateRow={handleUpdateRow}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          testID="mapping-field-table"
        />

        <View className="flex-row items-center justify-between pt-2">
          <Button
            variant="outline"
            onPress={handleBack}
            accessibilityLabel="Back to upload"
            testID="mapping-back-button"
          >
            <View className="flex-row items-center gap-1.5">
              <ArrowLeft size={16} color={colors.foreground} />
              <Text className="font-body text-sm font-medium text-foreground">
                Back
              </Text>
            </View>
          </Button>

          <Button
            onPress={() => void handleProceed()}
            disabled={!canProceed}
            isLoading={isMapping}
            accessibilityLabel="Proceed to account mapping"
            testID="mapping-proceed-button"
          >
            <View className="flex-row items-center gap-1.5">
              <Text className="font-body text-sm font-medium text-primary-foreground">
                Proceed to Account Mapping
              </Text>
              <ArrowRight size={16} color={colors.primaryForeground} />
            </View>
          </Button>
        </View>
      </View>
    </Screen>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface MappingSummaryCardProps {
  matched: number;
  total: number;
  allMatched: boolean;
}

const MappingSummaryCard = React.memo(function MappingSummaryCard({
  matched,
  total,
  allMatched,
}: MappingSummaryCardProps) {
  return (
    <Card
      className={allMatched ? 'border-success bg-green-50' : 'border-warning bg-yellow-50'}
      testID="mapping-summary-card"
    >
      <Card.Content>
        <View className="flex-row items-center gap-3">
          {allMatched ? (
            <CheckCircle2 size={20} color={colors.success} />
          ) : (
            <AlertTriangle size={20} color={colors.warning} />
          )}
          <Text
            className={cn('font-body text-sm font-medium', allMatched ? 'text-green-800' : 'text-yellow-800')}
          >
            {matched} of {total} types mapped
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
});
