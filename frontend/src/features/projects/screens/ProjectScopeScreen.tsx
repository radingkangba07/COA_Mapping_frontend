import React from 'react';
import { View, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '@/shared/components/layout/Screen';
import type { ProjectsStackParamList } from '@/navigation/types';

export const ProjectScopeScreen = (): React.JSX.Element => {
  const route = useRoute<RouteProp<ProjectsStackParamList, 'ProjectScope'>>();
  const { name } = route.params;

  return (
    <Screen scroll testID="project-scope-screen">
      <View className="px-4 py-4 lg:max-w-xl lg:mx-auto lg:mt-8">
        <Text className="font-heading text-2xl font-bold text-foreground mb-2">
          Create Data Migration Project
        </Text>
        <Text className="font-body text-base text-muted-foreground">
          {name}
        </Text>
      </View>
    </Screen>
  );
};
