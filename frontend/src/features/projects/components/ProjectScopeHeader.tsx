import React from 'react';
import { View, Text } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { colors } from '@/config/theme';

interface ProjectScopeHeaderProps {
  onBack: () => void;
  showBack?: boolean;
  onSaveDraft: () => void;
  onCreate: () => void;
  isSavingDraft?: boolean;
  isCreating?: boolean;
  createDisabled?: boolean;
  testID?: string;
}

export const ProjectScopeHeader = ({
  onBack,
  showBack = true,
  onSaveDraft,
  onCreate,
  isSavingDraft = false,
  isCreating = false,
  createDisabled = false,
  testID,
}: ProjectScopeHeaderProps): React.JSX.Element => {
  return (
    <View className="gap-3" testID={testID}>
      {showBack && (
        <Button
          variant="ghost"
          onPress={onBack}
          className="self-start"
          accessibilityLabel="Back"
          testID="project-scope-back"
        >
          <View className="flex-row items-center gap-2">
            <ArrowLeft size={16} color={colors.foreground} />
            <Text className="font-body text-sm font-medium text-foreground">
              Back
            </Text>
          </View>
        </Button>
      )}

      <View className="flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <View>
        <Text className="font-heading text-2xl font-bold text-foreground">
          Create Data Migration Project
        </Text>
        <Text className="font-body text-sm text-muted-foreground">
          Configure master data, opening balances, and define project scope
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
    </View>
  );
};
