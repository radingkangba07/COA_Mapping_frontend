import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/shared/components/layout/Screen';
import type { ProjectsStackParamList } from '@/navigation/types';
import { ProjectScopeHeader } from '../components/ProjectScopeHeader';
import { ProjectScopeEntry } from '../components/ProjectScopeEntry';
import { CreateClientOrgDialog } from '../components/CreateClientOrgDialog';
import { CompatibilityBanner } from '../components/CompatibilityBanner';
import { ScopeSectionCard } from '../components/ScopeSectionCard';
import { ErpSourceTargetSelect, ErpSectionSearch } from '../components/ErpSourceTargetSelect';
import { MigrationScopeSection } from '../components/MigrationScopeSection';
import { ProjectSummaryBar } from '../components/ProjectSummaryBar';
import { ConnectionDetails } from '../components/ConnectionDetails';
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
  const params = route.params ?? {};
  const [createCompanyVisible, setCreateCompanyVisible] = useState(false);

  const seed = {
    companyId: params.companyId ?? null,
    name: params.name,
    description: params.description,
  };
  const vm = useProjectScopeViewModel(seed);
  const scopeVm = useMigrationScopeViewModel();
  const summaryVm = useProjectSummaryViewModel();
  const membersVm = useAddMembersViewModel();
  const handleBack = useCallback((): void => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('ProjectsList');
    }
  }, [navigation]);

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
          onBack={handleBack}
          onSaveDraft={vm.saveDraft}
          onCreate={handleCreate}
          isSavingDraft={vm.isSavingDraft}
          isCreating={vm.isCreating}
          createDisabled={vm.createDisabled}
          testID="project-scope-header"
        />

        {/* Metadata panel: Company + Project Name + Description written live to
            the draft store. */}
        <ScopeSectionCard title="Project Details" testID="section-project-details">
          <ProjectScopeEntry
            companyId={vm.companyId}
            name={vm.name}
            description={vm.description}
            companyOptions={vm.companyOptions}
            onSelectCompany={vm.setCompanyId}
            onChangeName={vm.setName}
            onChangeDescription={vm.setDescription}
            onCreateCompany={
              vm.parentOrgId !== null
                ? () => setCreateCompanyVisible(true)
                : undefined
            }
            testID="project-scope-entry"
          />
        </ScopeSectionCard>

        {/* Summary panel — full width row. */}
        <ProjectSummaryBar
          summary={summaryVm.summary}
          testID="project-summary-bar"
        />

        {/* Two-column layout: numbered sections (left) + MCP connection (right). */}
        <View className="flex-col gap-6 lg:flex-row lg:items-start">

          {/* Left column — numbered sections 1, 2, 3. */}
          <View className="flex-col gap-6 lg:flex-[13]">
            <ScopeSectionCard
              title="1. Select Source and Target ERP Systems"
              description="Choose the source and target ERP systems for your migration."
              headerRight={<ErpSectionSearch />}
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

            <ScopeSectionCard
              title="2. Select Migration Scope"
              description="Choose the master data and opening balances you want to migrate."
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

            <AddMembersSection
              onAddMember={membersVm.addMember}
              members={membersVm.members}
              onUpdateMemberRole={membersVm.updateMemberRole}
              onRemoveMember={membersVm.removeMember}
              testID="add-members"
            />
          </View>

          {/* Right column — MCP Connection Details. */}
          <View className="lg:flex-[7]">
            <ConnectionDetails
              sourceMethod={vm.sourceMethod}
              targetMethod={vm.targetMethod}
              connection={vm.connection}
              onConnectionChange={vm.updateConnection}
              testID="connection-details"
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

      {vm.parentOrgId !== null && (
        <CreateClientOrgDialog
          visible={createCompanyVisible}
          onClose={() => setCreateCompanyVisible(false)}
          parentOrgId={vm.parentOrgId}
          testID="project-scope-create-company-dialog"
        />
      )}
    </Screen>
  );
};
