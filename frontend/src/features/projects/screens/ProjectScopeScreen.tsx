import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/shared/components/layout/Screen';
import type { ProjectsStackParamList } from '@/navigation/types';
import { ProjectScopeHeader } from '../components/ProjectScopeHeader';
import { CompatibilityBanner } from '../components/CompatibilityBanner';
import { ScopeSectionCard } from '../components/ScopeSectionCard';
import { ErpSourceTargetSelect } from '../components/ErpSourceTargetSelect';
import { MigrationScopeSection } from '../components/MigrationScopeSection';
import { ProjectSummaryBar } from '../components/ProjectSummaryBar';
import { ProjectSideConnection } from '../components/ProjectSideConnection';
import { AddMembersSection } from '../components/AddMembersSection';
import { useProjectScopeViewModel } from '../hooks/useProjectScopeViewModel';
import { useMigrationScopeViewModel } from '../hooks/useMigrationScopeViewModel';
import { useProjectSummaryViewModel } from '../hooks/useProjectSummaryViewModel';
import { useAddMembersViewModel } from '../hooks/useAddMembersViewModel';

type ProjectScopeNavigation = NativeStackNavigationProp<
  ProjectsStackParamList,
  'ProjectScope'
>;

export const ProjectScopeScreen = (): React.JSX.Element => {
  const route = useRoute<RouteProp<ProjectsStackParamList, 'ProjectScope'>>();
  const navigation = useNavigation<ProjectScopeNavigation>();
  const params = route.params;

  const seed = {
    companyId: params.companyId ?? null,
    name: params.name,
    description: params.description,
  };
  const vm = useProjectScopeViewModel(seed);
  const scopeVm = useMigrationScopeViewModel();
  const summaryVm = useProjectSummaryViewModel();
  const membersVm = useAddMembersViewModel();

  const handleCreate = useCallback(async (): Promise<void> => {
    const ok = await vm.create();
    if (ok) {
      navigation.navigate('ProjectsList');
    }
  }, [vm, navigation]);

  return (
    <Screen scroll testID="project-scope-screen">
      <View className="py-4 gap-6">
        <ProjectScopeHeader
          onSaveDraft={vm.saveDraft}
          onCreate={handleCreate}
          isSavingDraft={vm.isSavingDraft}
          isCreating={vm.isCreating}
          createDisabled={vm.createDisabled}
          testID="project-scope-header"
        />

        {/* Manual project name carried from the entry modal — read-only, no name field (DA-3). */}
        <Text
          className="font-heading text-lg font-semibold text-foreground"
          testID="project-scope-name"
        >
          {vm.name}
        </Text>

        <View className="flex-col gap-6 lg:flex-row lg:gap-6">
          <View className="lg:flex-1 gap-6">
            {/* ProjectSummaryBar mounts here (DA-137) */}
            <ProjectSummaryBar
              summary={summaryVm.summary}
              testID="project-summary-bar"
            />

            <ScopeSectionCard
              title="Select Source & Target ERP"
              testID="section-select-erp"
            >
              <ErpSourceTargetSelect
                erpSystems={vm.erpSystems}
                source={vm.source}
                target={vm.target}
                sourceMethod={vm.sourceMethod}
                targetMethod={vm.targetMethod}
                isLoading={vm.isLoadingErps}
                onSelectSource={vm.setSource}
                onSelectTarget={vm.setTarget}
                onSelectSourceMethod={vm.setSourceMethod}
                onSelectTargetMethod={vm.setTargetMethod}
                testID="erp-source-target-select"
              />
            </ScopeSectionCard>

            {/* MigrationScope mounts here (DA-51) */}
            <ScopeSectionCard
              title="Migration Scope"
              testID="section-migration-scope"
            >
              <MigrationScopeSection
                masterData={scopeVm.masterData}
                masterDataCount={scopeVm.masterDataCount}
                masterDataTotal={scopeVm.masterDataTotal}
                onToggleMasterDataColumn={scopeVm.toggleMasterDataColumn}
                openingBalances={scopeVm.openingBalances}
                openingBalancesCount={scopeVm.openingBalancesCount}
                openingBalancesTotal={scopeVm.openingBalancesTotal}
                onToggleOpeningBalance={scopeVm.toggleOpeningBalance}
                testID="migration-scope"
              />
            </ScopeSectionCard>

            {/* AddMembersSection mounts here (DA-138) */}
            <ScopeSectionCard
              title="Add Members"
              testID="section-add-members"
            >
              <AddMembersSection
                onAddMember={membersVm.addMember}
                members={membersVm.members}
                onUpdateMemberRole={membersVm.updateMemberRole}
                onRemoveMember={membersVm.removeMember}
                testID="add-members"
              />
            </ScopeSectionCard>
          </View>

          <View className="lg:basis-[360px] gap-6">
            {/* Per-side connection config (DA-56): MCP panel + Test Connection
                for 'mcp', reused file-upload control for 'csv'. */}
            <ScopeSectionCard
              title="Source Connection"
              testID="section-source-connection"
            >
              <ProjectSideConnection
                scope="source"
                method={vm.sourceMethod}
                uploadLabel="Source COA File"
                onConnectionChange={vm.updateSourceConnection}
                testID="source-connection"
              />
            </ScopeSectionCard>

            <ScopeSectionCard
              title="Target Connection"
              testID="section-target-connection"
            >
              <ProjectSideConnection
                scope="target"
                method={vm.targetMethod}
                uploadLabel="Target COA File"
                onConnectionChange={vm.updateTargetConnection}
                testID="target-connection"
              />
            </ScopeSectionCard>
          </View>
        </View>

        <CompatibilityBanner
          source={vm.sourceName}
          target={vm.targetName}
          isCompatible={vm.isCompatible}
          testID="project-scope-compatibility"
        />
      </View>
    </Screen>
  );
};
