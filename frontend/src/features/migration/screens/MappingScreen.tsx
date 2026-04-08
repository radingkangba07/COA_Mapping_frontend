import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useShallow } from 'zustand/react/shallow';
import {
  CheckCircle2,
  X,
  ArrowLeft,
  ArrowRight,
  Edit3,
  Plus,
  Download,
  Save,
  Trash2,
} from 'lucide-react-native';
import { MigrationLayout } from '../components/MigrationLayout';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { Spinner } from '@/shared/components/ui/Spinner';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { MappingTableSkeleton } from '../components/MappingTableSkeleton';
import { useHydrateProject } from '../hooks/useHydrateProject';
import { useFuzzyMapper } from '../hooks/useFuzzyMapper';
import { useMigrationStore } from '../store/migration.store';
import { selectTypeMappingSummary } from '../store/migration.selectors';
import { useMigrationScreenRoute } from '@/navigation/types';
import { createProjectId } from '@/shared/types/common.types';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import type { MigrationStackParamList } from '@/navigation/types';
import type { TypeMappingRow } from '../types/migration.types';
import { STEP_TO_SCREEN } from '@/shared/constants/migration-steps';
import type { MigrationStepValue } from '@/shared/constants/migration-steps';

type MigrationNavProp = NativeStackNavigationProp<MigrationStackParamList>;

export const MappingScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MigrationNavProp>();
  const route = useMigrationScreenRoute<'Mapping'>();
  const { projectId } = route.params;

  const { isHydrating, error, retry } = useHydrateProject(createProjectId(projectId));

  const currentStep = useMigrationStore((s) => s.currentStep);
  const completedSteps = useMigrationStore((s) => s.completedSteps);
  const typeMappingRows = useMigrationStore((s) => s.typeMappingRows);
  const targetTypes = useMigrationStore((s) => s.targetTypes);
  const isLoading = useMigrationStore((s) => s.isLoading);
  const sourceERP = useMigrationStore((s) => s.sourceERP);
  const targetERP = useMigrationStore((s) => s.targetERP);

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
  const mappingSummary = useMigrationStore(useShallow(selectTypeMappingSummary));

  const targetOptions = useMemo<SelectOption[]>(
    () => [
      { label: 'Unmatched', value: '' },
      ...targetTypes.map((t) => ({ label: t, value: t })),
    ],
    [targetTypes],
  );

  const handleUpdateRow = useCallback(
    (id: string, field: 'sourceType' | 'targetType', value: string): void => {
      actions.updateTypeMappingRow(id, field, value);
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
    // runMapping sets step to 3 on success — navigate to Validation (COA Mapping) screen
    const step = useMigrationStore.getState().currentStep;
    if (step === 3) {
      navigation.navigate('Validation', { projectId });
    }
  }, [runMapping, navigation, projectId]);

  const handleSaveCSV = useCallback((): void => {
    const csvContent =
      'Source Type,Target Type\n' +
      typeMappingRows
        .filter((row) => row.sourceType && row.targetType.length > 0)
        .map((row) => `"${row.sourceType}","${row.targetType}"`)
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'account_type_mapping.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }, [typeMappingRows]);

  const handleStepPress = useCallback(
    (step: number): void => {
      actions.setStep(step);
      const screen = STEP_TO_SCREEN[step as MigrationStepValue];
      navigation.navigate(screen as 'ERPSelect', { projectId });
    },
    [actions, navigation, projectId],
  );

  const hasCompleteMappings = mappingSummary.matched > 0;
  const canProceed = hasCompleteMappings && !isMapping;

  const sourceERPName = sourceERP?.name ?? 'Source';
  const targetERPName = targetERP?.name ?? 'Target';

  if (isHydrating) {
    return (
      <MigrationLayout title="COA Migration" projectId={projectId} onBack={() => navigation.goBack()} testID="mapping-screen">
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
      <MigrationLayout title="COA Migration" projectId={projectId} onBack={() => navigation.goBack()} testID="mapping-screen">
        <NetworkErrorFallback
          error={new Error(error.message)}
          onRetry={retry}
          testID="mapping-error"
        />
      </MigrationLayout>
    );
  }

  if (isLoading && typeMappingRows.length === 0) {
    return (
      <MigrationLayout
        title="COA Migration"
        subtitle="Review and edit field mappings"
        projectId={projectId}
        onBack={() => navigation.goBack()}
        scroll
        testID="mapping-screen"
      >
        <View className="max-w-4xl lg:max-w-6xl flex-1 self-center w-full py-6 gap-6">
          <MigrationStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepPress={handleStepPress}
          />
          <View>
            <Skeleton height={28} className="w-48 rounded self-center" />
            <Skeleton height={14} className="w-full rounded mt-2" />
          </View>
          <MappingTableSkeleton testID="mapping-skeleton" />
        </View>
      </MigrationLayout>
    );
  }

  return (
    <MigrationLayout
      title="COA Migration"
      subtitle="Review and edit field mappings"
      projectId={projectId}
      onBack={() => navigation.goBack()}
      scroll
      testID="mapping-screen"
    >
      <View className="max-w-4xl lg:max-w-6xl flex-1 self-center w-full py-6 gap-6">
        <MigrationStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepPress={handleStepPress}
        />

        <View className="mt-4 mb-2">
          <Text className="font-heading text-lg font-bold text-foreground">
            Review Account Type Mapping
          </Text>
          <Text className="mt-1 font-body text-sm text-muted-foreground">
            Map {sourceERPName} account types to {targetERPName} account types
            (multi-select supported)
          </Text>
        </View>

        {/* Single combined mapping card */}
        <Card testID="account-type-mapping-card">
          <Card.Header>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Edit3 size={18} color={colors.foreground} />
                <Card.Title>Account Type Mapping</Card.Title>
              </View>
              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center gap-1.5">
                  <View className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <Text className="font-body text-xs text-muted-foreground">
                    {mappingSummary.matched} Complete
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="h-2.5 w-2.5 rounded-full bg-destructive" />
                  <Text className="font-body text-xs text-muted-foreground">
                    {mappingSummary.total - mappingSummary.matched} Incomplete
                  </Text>
                </View>
              </View>
            </View>
            <Card.Description>
              Map {sourceERPName} account types to {targetERPName} account types (multi-select supported)
            </Card.Description>
          </Card.Header>

          <Card.Content testID="mapping-preview-card">
            {/* Preview table */}
            <MappingPreviewTable
              rows={typeMappingRows}
              sourceERPName={sourceERPName}
              targetERPName={targetERPName}
            />

            {/* Divider */}
            <View className="border-t border-border my-4" />

            {/* Editable mapping table */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-heading text-sm font-semibold text-foreground">
                Edit Mappings
              </Text>
              <View className="flex-row gap-2">
                <Button variant="outline" size="sm" onPress={handleAddRow} testID="mapping-add-row">
                  <View className="flex-row items-center gap-1.5">
                    <Plus size={14} color={colors.foreground} />
                    <Text className="font-body text-xs font-medium text-foreground">Add Row</Text>
                  </View>
                </Button>
                <Button variant="outline" size="sm" onPress={handleSaveCSV} testID="mapping-download-csv">
                  <View className="flex-row items-center gap-1.5">
                    <Download size={14} color={colors.foreground} />
                    <Text className="font-body text-xs font-medium text-foreground">Download CSV</Text>
                  </View>
                </Button>
              </View>
            </View>

            {/* Editable rows header */}
            <View className="hidden border-b border-border pb-2 mb-1 md:flex-row">
              <View className="w-10" />
              <View className="flex-1 px-2">
                <Text className="text-xs font-semibold text-muted-foreground">
                  Source Type ({sourceERPName})
                </Text>
              </View>
              <View className="w-10" />
              <View className="flex-1 px-2">
                <Text className="text-xs font-semibold text-muted-foreground">
                  Target Type(s) ({targetERPName})
                </Text>
              </View>
              <View className="w-12 items-center">
                <Text className="text-xs font-semibold text-muted-foreground">Actions</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {typeMappingRows.map((row) => (
                <AccountMappingRow
                  key={row.id}
                  row={row}
                  targetOptions={targetOptions}
                  onUpdateRow={handleUpdateRow}
                  onDeleteRow={handleDeleteRow}
                />
              ))}
              {typeMappingRows.length === 0 && (
                <View className="items-center py-8">
                  <Text className="font-body text-sm text-muted-foreground">
                    No type mappings. Press &quot;Add Row&quot; to create one.
                  </Text>
                </View>
              )}
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Footer buttons */}
        <View className="flex-row items-center justify-end gap-3 pt-2">
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
            variant="outline"
            onPress={handleSaveCSV}
            disabled={!hasCompleteMappings}
            accessibilityLabel="Save mapping as CSV"
            testID="mapping-save-button"
          >
            <View className="flex-row items-center gap-1.5">
              <Save size={16} color={hasCompleteMappings ? colors.foreground : colors.mutedForeground} />
              <Text className="font-body text-sm font-medium text-foreground">
                Save Mapping
              </Text>
            </View>
          </Button>

          <Button
            onPress={() => void handleProceed()}
            disabled={!canProceed}
            isLoading={isMapping}
            accessibilityLabel="Continue to COA mapping"
            testID="mapping-proceed-button"
          >
            <View className="flex-row items-center gap-1.5">
              <Text className="font-body text-sm font-medium text-primary-foreground">
                Continue to COA Mapping
              </Text>
              <ArrowRight size={16} color={colors.primaryForeground} />
            </View>
          </Button>
        </View>
      </View>
    </MigrationLayout>
  );
};

// ─── Mapping Preview Table (no card wrapper) ───────────────────────────────

interface MappingPreviewTableProps {
  rows: readonly TypeMappingRow[];
  sourceERPName: string;
  targetERPName: string;
}

const MappingPreviewTable = React.memo(function MappingPreviewTable({
  rows,
  sourceERPName,
  targetERPName,
}: MappingPreviewTableProps) {
  const previewRows = useMemo(
    () => rows.filter((r) => r.sourceType.trim().length > 0),
    [rows],
  );

  return (
    <View>
      <Text className="font-heading text-sm font-semibold text-foreground mb-2">
        Preview
      </Text>
      <View className="flex-row border-b border-border pb-2 mb-1">
        <View className="w-10 items-center">
          <Text className="text-xs font-semibold text-muted-foreground">#</Text>
        </View>
        <View className="flex-1 px-2">
          <Text className="text-xs font-semibold text-muted-foreground">
            Source Type ({sourceERPName})
          </Text>
        </View>
        <View className="w-10 items-center" />
        <View className="flex-1 px-2">
          <Text className="text-xs font-semibold text-muted-foreground">
            Target Type(s) ({targetERPName})
          </Text>
        </View>
        <View className="w-12 items-center">
          <Text className="text-xs font-semibold text-muted-foreground">Status</Text>
        </View>
      </View>

      <ScrollView style={{ maxHeight: 200 }}>
        {previewRows.map((row, idx) => {
          const isMatched = row.targetType.length > 0;
          return (
            <View key={row.id} className="flex-row items-center py-2">
              <View className="w-10 items-center">
                <Text className="font-mono text-xs text-muted-foreground">{idx + 1}</Text>
              </View>
              <View className="flex-1 px-2">
                <Text className="font-mono text-sm text-foreground">{row.sourceType}</Text>
              </View>
              <View className="w-10 items-center">
                <ArrowRight size={14} color={colors.mutedForeground} />
              </View>
              <View className="flex-1 px-2">
                {isMatched ? (
                  <Text className="font-body text-sm text-foreground">{row.targetType}</Text>
                ) : (
                  <Text className="font-body text-sm italic text-muted-foreground">Not mapped</Text>
                )}
              </View>
              <View className="w-12 items-center">
                {isMatched ? (
                  <CheckCircle2 size={16} color={colors.primary} />
                ) : (
                  <X size={16} color={colors.mutedForeground} />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ─── Account Mapping Row ────────────────────────────────────────────────────

interface AccountMappingRowProps {
  row: TypeMappingRow;
  targetOptions: readonly SelectOption[];
  onUpdateRow: (id: string, field: 'sourceType' | 'targetType', value: string) => void;
  onDeleteRow: (id: string) => void;
}

const AccountMappingRow = React.memo(function AccountMappingRow({
  row,
  targetOptions,
  onUpdateRow,
  onDeleteRow,
}: AccountMappingRowProps) {
  const isMatched = row.targetType.length > 0;

  const handleSourceChange = useCallback(
    (text: string) => onUpdateRow(row.id, 'sourceType', text),
    [row.id, onUpdateRow],
  );

  const handleTargetChange = useCallback(
    (value: string) => onUpdateRow(row.id, 'targetType', value),
    [row.id, onUpdateRow],
  );

  const handleDelete = useCallback(
    () => onDeleteRow(row.id),
    [row.id, onDeleteRow],
  );

  return (
    <View
      className={cn(
        'flex-col gap-2 rounded-lg border border-border p-3 mb-2 md:flex-row md:items-center md:gap-0 md:rounded-none md:border-0 md:p-0 md:py-1 md:mb-0',
      )}
    >
      {/* Status icon */}
      <View className="flex-row items-center gap-2 md:w-10 md:justify-center">
        {isMatched ? (
          <CheckCircle2 size={16} color={colors.primary} />
        ) : (
          <X size={16} color={colors.destructive} />
        )}
      </View>

      {/* Source type */}
      <View className="flex-1 px-1">
        {row.isCustom ? (
          <Input
            value={row.sourceType}
            onChangeText={handleSourceChange}
            placeholder="Enter source type"
            inputClassName="h-8 text-xs"
          />
        ) : (
          <Text className="font-mono text-sm text-foreground">{row.sourceType}</Text>
        )}
      </View>

      {/* Arrow */}
      <View className="w-10 items-center">
        <ArrowRight
          size={14}
          color={isMatched ? colors.primary : colors.destructive}
        />
      </View>

      {/* Target type select */}
      <View className="flex-1 px-1">
        <Select
          options={[...targetOptions]}
          value={row.targetType.length > 0 ? row.targetType : ''}
          onValueChange={handleTargetChange}
          placeholder="Select target type"
        />
      </View>

      {/* Delete button */}
      <View className="items-end md:w-12 md:items-center">
        <Button
          variant="ghost"
          size="icon"
          onPress={handleDelete}
          accessibilityLabel={`Delete ${row.sourceType} mapping`}
        >
          <Trash2 size={16} color={colors.destructive} />
        </Button>
      </View>
    </View>
  );
});