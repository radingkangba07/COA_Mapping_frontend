import React, { useCallback } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen } from '@/shared/components/layout/Screen';
import { Spinner } from '@/shared/components/ui/Spinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { MigrationCard, type MigrationCardData } from '../components/MigrationCard';
import { useMigrationListViewModel } from '../hooks/useMigrationListViewModel';
import type { MigrationStackParamList, AppTabsParamList } from '@/navigation/types';

type MigrationListNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<MigrationStackParamList, 'MigrationList'>,
  BottomTabNavigationProp<AppTabsParamList>
>;

const keyExtractor = (item: MigrationCardData): string => item.projectId;

export const MigrationListScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MigrationListNavProp>();
  const { migrations, isLoading, error, refetch } = useMigrationListViewModel();

  const handleCardPress = useCallback(
    (projectId: string): void => {
      navigation.navigate('ERPSelect', { projectId });
    },
    [navigation],
  );

  const handleGoToProjects = useCallback((): void => {
    navigation.navigate('ProjectsTab');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: MigrationCardData }): React.JSX.Element => (
      <MigrationCard item={item} onPress={handleCardPress} />
    ),
    [handleCardPress],
  );

  if (isLoading) {
    return (
      <Screen testID="migration-list-screen">
        <Spinner size="lg" className="flex-1" testID="migration-list-spinner" />
      </Screen>
    );
  }

  if (error !== null) {
    return (
      <Screen testID="migration-list-screen">
        <EmptyState
          title="Failed to Load Migrations"
          description={error.message}
          action={{ label: 'Retry', onPress: refetch }}
          testID="migration-list-error"
        />
      </Screen>
    );
  }

  if (migrations.length === 0) {
    return (
      <Screen testID="migration-list-screen">
        <EmptyState
          title="No Active Migrations"
          description="Start a migration from the Projects tab by selecting a project."
          action={{ label: 'Go to Projects', onPress: handleGoToProjects }}
          testID="migration-list-empty"
        />
      </Screen>
    );
  }

  return (
    <Screen testID="migration-list-screen">
      <View className="py-4">
        <Text className="font-heading text-2xl font-bold text-foreground mb-4">
          Active Migrations
        </Text>
        <FlatList
          data={migrations as MigrationCardData[]}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onRefresh={refetch}
          refreshing={isLoading}
          testID="migration-list"
        />
      </View>
    </Screen>
  );
};
