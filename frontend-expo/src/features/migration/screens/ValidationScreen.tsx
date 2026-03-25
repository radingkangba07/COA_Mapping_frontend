import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { Collapsible } from '@/shared/components/ui/Collapsible';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { MappingStatsBar } from '../components/MappingStatsBar/MappingStatsBar';
import { AccountTypeGroup } from '../components/AccountTypeGroup/AccountTypeGroup';
import { useValidationScreenViewModel } from '../hooks/useValidationScreenViewModel';
import { useMigrationScreenRoute } from '@/navigation/types';
import { cn } from '@/shared/utils/string.utils';
import type { MigrationStackParamList } from '@/navigation/types';
import type { ConfidenceLevel } from '../types/mapping.types';
import { colors } from '@/config/theme';

type MigrationNavProp = NativeStackNavigationProp<MigrationStackParamList>;
const ICON_SIZE = 16;

const CONFIRMATION_LABELS: Record<ConfidenceLevel, string> = {
  high: 'I confirm all High confidence mappings are correct',
  medium: 'I confirm all Medium confidence mappings are correct',
  low: 'I confirm all Low confidence mappings are correct',
};

const CONFIRMATION_CLASSES: Record<ConfidenceLevel, string> = {
  high: 'border-green-200 bg-green-50',
  medium: 'border-yellow-200 bg-yellow-50',
  low: 'border-red-200 bg-red-50',
};

export const ValidationScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MigrationNavProp>();
  const route = useMigrationScreenRoute<'Validation'>();
  const { projectId } = route.params;

  const navigateBack = useCallback(
    (id: string) => navigation.navigate('Mapping', { projectId: id }),
    [navigation],
  );
  const navigateForward = useCallback(
    (id: string) => navigation.navigate('Preview', { projectId: id }),
    [navigation],
  );

  const vm = useValidationScreenViewModel(projectId, navigateBack, navigateForward);

  return (
    <Screen scroll testID="validation-screen">
      <View className="max-w-4xl mx-auto w-full px-4 md:px-6 py-6">
        <MigrationStepper
          currentStep={vm.currentStep}
          completedSteps={vm.completedSteps}
          onStepPress={vm.handleStepPress}
        />

        <View className="mt-8 mb-4">
          <Text className="font-heading text-2xl font-bold text-foreground">Account Mapping</Text>
          {vm.sourceFile !== null && (
            <Text className="mt-1 font-body text-sm text-muted-foreground">
              {vm.sourceFile.name} — {vm.stats.totalAccounts} accounts in {vm.stats.totalTypes} groups
            </Text>
          )}
        </View>

        <View className="flex-col md:flex-row md:items-start gap-4">
          <View className="md:flex-1">
            <MappingStatsBar
              totalAccounts={vm.stats.totalAccounts}
              highConfidence={vm.stats.highConfidence}
              mediumConfidence={vm.stats.mediumConfidence}
              lowConfidence={vm.stats.lowConfidence}
              confirmedHigh={vm.confirmedHigh}
              confirmedMedium={vm.confirmedMedium}
              confirmedLow={vm.confirmedLow}
              activeFilter={vm.confidenceFilter}
              onFilterPress={vm.handleFilterPress}
              testID="mapping-stats-bar"
            />
          </View>

          {vm.confidenceFilter !== null && (
            <View className="md:flex-1">
              <Card className={cn(CONFIRMATION_CLASSES[vm.confidenceFilter])} testID="confirmation-card">
                <Card.Content className="py-3">
                  <Checkbox
                    checked={
                      vm.confidenceFilter === 'high' ? vm.confirmedHigh :
                      vm.confidenceFilter === 'medium' ? vm.confirmedMedium :
                      vm.confirmedLow
                    }
                    onCheckedChange={() => vm.handleConfirm(vm.confidenceFilter as ConfidenceLevel)}
                    label={CONFIRMATION_LABELS[vm.confidenceFilter]}
                    testID={`confirm-${vm.confidenceFilter}`}
                  />
                </Card.Content>
              </Card>
            </View>
          )}
        </View>

        {(vm.errors.length > 0 || vm.warnings.length > 0) && (
          <Card className="mt-4 border-yellow-200 bg-yellow-50" testID="validation-issues-card">
            <Card.Content className="py-3 gap-1">
              {vm.errors.length > 0 && (
                <Text className="text-sm font-medium text-red-700">
                  {vm.errors.length} {vm.errors.length === 1 ? 'error' : 'errors'}
                </Text>
              )}
              {vm.warnings.length > 0 && (
                <Text className="text-sm font-medium text-yellow-700">
                  {vm.warnings.length} {vm.warnings.length === 1 ? 'warning' : 'warnings'}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {vm.deletedAccounts.length > 0 && (
          <View className="mt-4">
            <Collapsible
              isOpen={vm.isDeletedOpen}
              onToggle={vm.handleToggleDeleted}
              title={`Deleted Accounts (${vm.deletedAccounts.length})`}
              className="border-red-200 bg-red-50"
              testID="deleted-accounts"
            >
              {vm.deletedAccounts.map((account, index) => (
                <View
                  key={`${account.sourceNumber}-${account.sourceName}`}
                  className="flex-row items-center justify-between border-b border-red-100 py-2 last:border-b-0"
                >
                  <View className="flex-1">
                    <Text className="font-mono text-xs text-muted-foreground">{account.sourceNumber}</Text>
                    <Text className="text-sm text-foreground">{account.sourceName}</Text>
                    <Text className="text-xs text-muted-foreground">{account.sourceType}</Text>
                  </View>
                  <Button variant="outline" size="sm" onPress={() => vm.handleRestoreAccount(index)} testID={`restore-${index}`}>
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

        <View className="mt-4 gap-3">
          {vm.filteredMappings.map((group) => (
            <AccountTypeGroup
              key={group.source_type}
              sourceType={group.source_type}
              targetType={group.target_type}
              confidence={group.confidence}
              accounts={group.accounts}
              targetTypes={vm.targetTypes}
              onTypeChange={vm.handleTypeChange}
              onAccountNameChange={vm.handleAccountNameChange}
              onDeleteAccount={vm.handleDeleteAccount}
              testID={`group-${group.source_type}`}
            />
          ))}
        </View>

        <View className="mt-6 flex-row gap-3">
          <Button variant="outline" size="lg" onPress={vm.handleBack} className="flex-1" testID="back-button">
            <View className="flex-row items-center gap-2">
              <ArrowLeft size={ICON_SIZE} color={colors.foreground} />
              <Text className="text-sm font-medium text-foreground">Back</Text>
            </View>
          </Button>
          <Button size="lg" onPress={vm.handleContinue} disabled={!vm.allConfirmed} className="flex-1" testID="continue-button">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-medium text-primary-foreground">Continue to Export</Text>
              <ArrowRight size={ICON_SIZE} color={colors.primaryForeground} />
            </View>
          </Button>
        </View>
      </View>
    </Screen>
  );
};
