import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
import { Button } from '@/shared/components/ui/Button';
import { colors } from '@/config/theme';
import { useCreateProject } from '../hooks/useCreateProject';
import { ProjectForm } from '../components/ProjectForm';
import type { ProjectCreate } from '../types/projects.types';
import type { ProjectsStackParamList } from '@/navigation/types';

type NewProjectNav = NativeStackNavigationProp<ProjectsStackParamList, 'NewProject'>;

export const NewProjectScreen = (): React.JSX.Element => {
  const navigation = useNavigation<NewProjectNav>();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const mutation = useCreateProject(handleBack);

  const handleSubmit = useCallback(
    (data: ProjectCreate) => {
      mutation.mutate(data);
    },
    [mutation],
  );

  return (
    <Screen scroll testID="new-project-screen">
      <View className="px-4 py-4">
        <Button variant="ghost" onPress={handleBack} className="mb-4 self-start">
          <View className="flex-row items-center gap-1">
            <ArrowLeft size={16} color={colors.foreground} />
            <Text className="text-sm font-medium text-foreground">Back</Text>
          </View>
        </Button>

        <Text className="font-heading text-2xl font-bold text-foreground mb-6">
          Create New Project
        </Text>

        <ProjectForm
          onSubmit={handleSubmit}
          isPending={mutation.isPending}
          onCancel={handleBack}
          testID="new-project-form"
        />
      </View>
    </Screen>
  );
};
