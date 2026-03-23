import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowRight, Clock } from 'lucide-react-native';
import { Card } from '@/shared/components/ui/Card';
import { colors } from '@/config/theme';
import { formatRelative } from '@/shared/utils/date.utils';
import { getERPById } from '@/shared/constants/erp-systems';
import { StatusBadge } from './StatusBadge';
import { MemberBadge } from './MemberBadge';
import type { Project } from '../types/projects.types';

interface ProjectCardProps {
  project: Project;
  onPress: (project: Project) => void;
  testID?: string;
}

export const ProjectCard = React.memo(({
  project,
  onPress,
  testID,
}: ProjectCardProps): React.JSX.Element => {
  const sourceErpName = getERPById(project.sourceErp)?.name ?? project.sourceErp;
  const targetErpName = getERPById(project.targetErp)?.name ?? project.targetErp;

  return (
    <Pressable onPress={() => onPress(project)} testID={testID}>
      <Card className="mb-3">
        <Card.Content>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-2 mb-1">
                <Text
                  className="font-heading text-base font-semibold text-card-foreground"
                  numberOfLines={1}
                >
                  {project.name}
                </Text>
                <StatusBadge status={project.status} />
              </View>

              <Text className="font-body text-sm text-muted-foreground mb-2">
                {sourceErpName} → {targetErpName}
              </Text>

              <View className="flex-row items-center gap-3">
                {project.createdBy !== undefined && (
                  <MemberBadge name={project.createdBy} size="sm" />
                )}
                <View className="flex-row items-center gap-1">
                  <Clock size={12} color={colors.mutedForeground} />
                  <Text className="font-body text-xs text-muted-foreground">
                    {formatRelative(project.updatedAt)}
                  </Text>
                </View>
              </View>
            </View>

            <ArrowRight size={18} color={colors.mutedForeground} />
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
});

ProjectCard.displayName = 'ProjectCard';
