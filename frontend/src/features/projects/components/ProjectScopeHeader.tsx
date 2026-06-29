import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/shared/components/ui/Button';

interface ProjectScopeHeaderProps {
  onSaveDraft: () => void;
  onCreate: () => void;
  isSavingDraft?: boolean;
  isCreating?: boolean;
  createDisabled?: boolean;
  testID?: string;
}

export const ProjectScopeHeader = ({
  onSaveDraft,
  onCreate,
  isSavingDraft = false,
  isCreating = false,
  createDisabled = false,
  testID,
}: ProjectScopeHeaderProps): React.JSX.Element => {
  return (
    <View
      className="flex-col gap-3 md:flex-row md:items-center md:justify-between"
      testID={testID}
    >
      <View>
        <Text className="font-heading text-2xl font-bold text-foreground">
          Create Data Migration Project
        </Text>
        <Text className="font-body text-sm text-muted-foreground">
          Configure scope, connection, and members
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Button
          variant="outline"
          onPress={onSaveDraft}
          isLoading={isSavingDraft}
          accessibilityLabel="Save as Draft"
          testID="project-scope-save-draft"
        >
          Save as Draft
        </Button>
        <Button
          onPress={onCreate}
          isLoading={isCreating}
          disabled={createDisabled}
          accessibilityLabel="Create Project"
          accessibilityState={{ disabled: createDisabled }}
          testID="project-scope-create"
        >
          Create Project
        </Button>
      </View>
    </View>
  );
};
