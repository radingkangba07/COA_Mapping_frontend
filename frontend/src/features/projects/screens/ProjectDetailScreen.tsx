import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { ArrowLeft, Play } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/shared/components/layout/Screen';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { Spinner } from '@/shared/components/ui/Spinner';
import { colors } from '@/config/theme';
import { formatDate } from '@/shared/utils/date.utils';
import { getERPById } from '@/shared/constants/erp-systems';
import { useProjectDetailRoute } from '@/navigation/types';
import type { ProjectsStackParamList } from '@/navigation/types';
import { useProjectDetail } from '../hooks/useProjectDetail';
import { StatusBadge } from '../components/StatusBadge';
import { MemberBadge } from '../components/MemberBadge';
import { createProjectId } from '@/shared/types/common.types';

type DetailNav = NativeStackNavigationProp<ProjectsStackParamList, 'ProjectDetail'>;

export const ProjectDetailScreen = (): React.JSX.Element => {
  const route = useProjectDetailRoute();
  const navigation = useNavigation<DetailNav>();
  const { project, isLoading, error } = useProjectDetail(
    createProjectId(route.params.projectId),
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleStartMigration = useCallback(() => {
    if (project === null) return;
    // Navigate to MigrationTab → ERPSelect with projectId
    const parent = navigation.getParent();
    if (parent !== undefined) {
      parent.navigate('MigrationTab', {
        screen: 'ERPSelect',
        params: { projectId: project.projectId },
      });
    }
  }, [navigation, project]);

  if (isLoading) {
    return (
      <Screen testID="project-detail-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
        </View>
      </Screen>
    );
  }

  if (error !== null || project === null) {
    return (
      <Screen testID="project-detail-screen">
        <View className="flex-1 items-center justify-center px-4">
          <Text className="font-body text-base text-destructive">
            {error?.message ?? 'Project not found'}
          </Text>
          <Button variant="ghost" onPress={handleBack} className="mt-4">
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  const sourceErpName = getERPById(project.sourceErp)?.name ?? project.sourceErp;
  const targetErpName = getERPById(project.targetErp)?.name ?? project.targetErp;

  return (
    <Screen scroll testID="project-detail-screen">
      <View className="px-4 py-4">
        <Button variant="ghost" onPress={handleBack} className="mb-4 self-start">
          <View className="flex-row items-center gap-1">
            <ArrowLeft size={16} color={colors.foreground} />
            <Text className="text-sm font-medium text-foreground">Back</Text>
          </View>
        </Button>

        <View className="flex-row items-center gap-3 mb-6">
          <Text className="font-heading text-2xl font-bold text-foreground flex-1">
            {project.name}
          </Text>
          <StatusBadge status={project.status} />
        </View>

        <View className="lg:flex-row lg:gap-8">
          <View className="lg:flex-1">
            <Card className="mb-4">
              <Card.Content>
                <View className="gap-3">
                  <DetailRow label="Source ERP" value={sourceErpName} />
                  <DetailRow label="Target ERP" value={targetErpName} />
                  {project.description !== undefined && (
                    <DetailRow label="Description" value={project.description} />
                  )}
                  <DetailRow label="Created" value={formatDate(project.createdAt)} />
                  <DetailRow label="Last Updated" value={formatDate(project.updatedAt)} />
                  {project.createdBy !== undefined && (
                    <View className="flex-row items-center justify-between">
                      <Text className="font-body text-sm text-muted-foreground">Created By</Text>
                      <MemberBadge name={project.createdBy} size="sm" />
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>
          </View>

          <View className="lg:w-64 lg:self-start">
            <Button
              onPress={handleStartMigration}
              className="mt-2"
              testID="start-migration-btn"
            >
              <View className="flex-row items-center gap-2">
                <Play size={16} color={colors.primaryForeground} />
                <Text className="text-sm font-medium text-primary-foreground">
                  Start Migration
                </Text>
              </View>
            </Button>
          </View>
        </View>
      </View>
    </Screen>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
}

const DetailRow = ({ label, value }: DetailRowProps): React.JSX.Element => (
  <View className="flex-row items-center justify-between">
    <Text className="font-body text-sm text-muted-foreground">{label}</Text>
    <Text className="font-body text-sm font-medium text-foreground">{value}</Text>
  </View>
);
