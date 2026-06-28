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
import { useProjectScopeViewModel } from '../hooks/useProjectScopeViewModel';
import { useMigrationScopeViewModel } from '../hooks/useMigrationScopeViewModel';

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

        <View className="flex-col gap-6 lg:flex-row lg:gap-6">
          <View className="lg:flex-1 gap-6">
            {/* ProjectSummaryBar mounts here (DA-137) */}
            <ScopeSectionCard
              title="Project Summary"
              testID="section-project-summary"
            >
              <Text className="font-body text-sm text-foreground">
                {vm.name}
              </Text>
            </ScopeSectionCard>

            <ScopeSectionCard
              title="Select Source & Target ERP"
              testID="section-select-erp"
            >
              <ErpSourceTargetSelect
                erpSystems={vm.erpSystems}
                source={vm.source}
                target={vm.target}
                isLoading={vm.isLoadingErps}
                onSelectSource={vm.setSource}
                onSelectTarget={vm.setTarget}
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
                onToggleMasterDataColumn={scopeVm.toggleMasterDataColumn}
                testID="migration-scope"
              />
            </ScopeSectionCard>

            {/* AddMembersSection mounts here (DA-138) */}
            <ScopeSectionCard
              title="Add Members"
              testID="section-add-members"
            />
          </View>

          <View className="lg:basis-[360px] gap-6">
            {/* MCPConnectionPanel + TestConnectionFlow mount here (DA-49/DA-50) */}
            <ScopeSectionCard
              title="MCP Connection Details"
              testID="section-mcp-connection"
            />
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
