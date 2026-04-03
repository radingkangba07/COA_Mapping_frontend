import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { Card } from '@/shared/components/ui/Card';
import { formatDate } from '@/shared/utils/date.utils';
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
      <Card className="w-full mb-2">
        <Card.Content>
          {/* Row 1: Project name + status badge */}
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="font-heading text-base font-semibold text-card-foreground flex-1 mr-2"
              numberOfLines={1}
            >
              {project.name}
            </Text>
            <View className="flex-row gap-1.5">
              <StatusBadge status={project.status} />
            </View>
          </View>

          {/* Row 2: ERP path + created date */}
          <View className="flex-row items-center gap-1 mb-1 flex-wrap">
            <Text className="font-body text-xs text-muted-foreground">
              {sourceErpName} {'\u2192'} {targetErpName}
            </Text>
            <Text className="font-body text-xs text-muted-foreground">{'\u00B7'}</Text>
            <Calendar size={12} className="text-muted-foreground" />
            <Text className="font-body text-xs text-muted-foreground">
              {formatDate(project.createdAt)}
            </Text>
          </View>

          {/* Row 3: Creator */}
          {project.createdBy !== undefined && (
            <View className="flex-row items-center gap-2 mb-1">
              <MemberBadge name={project.createdBy} size="sm" />
              <Text className="font-body text-xs text-muted-foreground">
                {project.createdBy}
              </Text>
            </View>
          )}

          {/* Row 4: Last edited by */}
          <View className="flex-row items-center gap-1 mt-0.5">
            <Clock size={12} className="text-muted-foreground" />
            <Text className="font-body text-xs text-muted-foreground">
              Last edited by:{project.updatedBy ? ` ${project.updatedBy}` : ` ${project.createdBy ?? 'unknown'}`}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
});

ProjectCard.displayName = 'ProjectCard';
