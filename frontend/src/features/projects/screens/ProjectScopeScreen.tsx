import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '@/shared/components/layout/Screen';
import type { ProjectsStackParamList } from '@/navigation/types';
import { ProjectScopeHeader } from '../components/ProjectScopeHeader';
import { CompatibilityBanner } from '../components/CompatibilityBanner';

interface SectionPlaceholderProps {
  title: string;
  body?: string;
  testID?: string;
}

const SectionPlaceholder = ({
  title,
  body = 'Coming soon',
  testID,
}: SectionPlaceholderProps): React.JSX.Element => {
  return (
    <View
      className="rounded-lg border border-border bg-card p-4"
      testID={testID}
    >
      <Text className="font-heading text-base font-semibold text-card-foreground">
        {title}
      </Text>
      <Text className="font-body text-sm text-muted-foreground mt-1">
        {body}
      </Text>
    </View>
  );
};

export const ProjectScopeScreen = (): React.JSX.Element => {
  const route = useRoute<RouteProp<ProjectsStackParamList, 'ProjectScope'>>();
  const { name } = route.params;

  const noop = useCallback(() => {}, []);

  return (
    <Screen scroll testID="project-scope-screen">
      <View className="py-4 gap-6">
        <ProjectScopeHeader
          onSaveDraft={noop}
          onCreate={noop}
          isSavingDraft={false}
          isCreating={false}
          createDisabled
          testID="project-scope-header"
        />

        <View className="flex-col gap-6 lg:flex-row lg:gap-6">
          <View className="lg:flex-1 gap-6">
            <SectionPlaceholder
              title="Project Summary"
              body={name}
              testID="section-project-summary"
            />
            <SectionPlaceholder
              title="Select Source & Target ERP"
              testID="section-select-erp"
            />
            <SectionPlaceholder
              title="Migration Scope"
              testID="section-migration-scope"
            />
            <SectionPlaceholder
              title="Add Members"
              testID="section-add-members"
            />
          </View>

          <View className="lg:basis-[360px] gap-6">
            <SectionPlaceholder
              title="MCP Connection Details"
              testID="section-mcp-connection"
            />
          </View>
        </View>

        <CompatibilityBanner
          source={null}
          target={null}
          isCompatible={false}
          testID="project-scope-compatibility"
        />
      </View>
    </Screen>
  );
};
