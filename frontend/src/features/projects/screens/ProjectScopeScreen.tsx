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
import { ErpSourceTargetSelect } from '../components/ErpSourceTargetSelect';
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

        {/* Connection panel: ERP selection (left) + single connection details
            (right), 50/50 on desktop, stacked on mobile. */}
        <View className="flex-col gap-6 lg:flex-row lg:gap-6">
          <ScopeSectionCard
            title="Select Source & Target ERP"
            testID="section-select-erp"
            className="lg:flex-1"
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
            title="Connection Details"
            testID="section-connection-details"
            className="lg:flex-1"
          >
            <ConnectionDetails
              sourceMethod={vm.sourceMethod}
              targetMethod={vm.targetMethod}
              connection={vm.connection}
              onConnectionChange={vm.updateConnection}
              testID="connection-details"
            />
          </ScopeSectionCard>
        </View>

        {/* MigrationScope — full width. */}
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

        {/* AddMembersSection — full width. */}
        <ScopeSectionCard title="Add Members" testID="section-add-members">
          <AddMembersSection
            onAddMember={membersVm.addMember}
            members={membersVm.members}
            onUpdateMemberRole={membersVm.updateMemberRole}
            onRemoveMember={membersVm.removeMember}
            testID="add-members"
          />
        </ScopeSectionCard>

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
