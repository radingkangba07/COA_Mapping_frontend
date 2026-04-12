import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { formatRelative } from '@/shared/utils/date.utils';
import { getERPById } from '@/shared/constants/erp-systems';
import { colors } from '@/config/theme';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { StatusBadge } from './StatusBadge';
import type { Project } from '../types/projects.types';

interface ProjectCardProps {
  project: Project;
  onPress: (project: Project) => void;
  testID?: string;
}

function useResolveUserName(
  displayName: string | undefined,
  fallbackId: string | undefined,
): string {
  const currentUser = useAuthStore((s) => s.user);
  if (displayName !== undefined) return displayName;
  if (fallbackId !== undefined) return fallbackId;
  return currentUser?.name ?? '—';
}

export const ProjectCard = ({
  project,
  onPress,
  testID,
}: ProjectCardProps): React.JSX.Element => {
  const sourceErpName = getERPById(project.sourceErp)?.name ?? project.sourceErp;
  const targetErpName = getERPById(project.targetErp)?.name ?? project.targetErp;
  const createdByName = useResolveUserName(project.createdByName, project.createdBy);

  return (
    <Pressable
      onPress={() => onPress(project)}
      testID={testID}
      // @ts-expect-error -- web-only style for hover cursor
      style={({ hovered }: { hovered?: boolean }) => ({
        backgroundColor: hovered === true ? 'rgba(0,0,0,0.02)' : 'transparent',
        cursor: 'pointer',
      })}
    >
      <View className="flex-row items-center border-b border-border py-3 pl-8 pr-4">
        {/* Name + description */}
        <View style={{ flex: 3 }}>
          <Text
            className="font-body text-sm text-foreground"
            numberOfLines={1}
          >
            {project.name}
          </Text>
          {project.description !== undefined && project.description !== '' && (
            <Text
              className="font-body text-xs text-muted-foreground mt-0.5"
              numberOfLines={1}
            >
              {project.description}
            </Text>
          )}
        </View>

        {/* Status */}
        <View style={{ flex: 1.2 }}>
          <StatusBadge status={project.status} />
        </View>

        {/* ERP Path */}
        <View style={{ flex: 2.5 }}>
          <View className="flex-row items-center gap-1">
            <Text className="font-body text-sm text-muted-foreground" numberOfLines={1}>
              {sourceErpName}
            </Text>
            <ArrowRight size={10} color={colors.mutedForeground} />
            <Text className="font-body text-sm text-muted-foreground" numberOfLines={1}>
              {targetErpName}
            </Text>
          </View>
        </View>

        {/* Created By */}
        <View style={{ flex: 1.5 }}>
          <Text className="font-body text-xs text-muted-foreground" numberOfLines={1}>
            {createdByName}
          </Text>
        </View>

        {/* Updated */}
        <View style={{ flex: 1.5 }}>
          <Text className="font-body text-xs text-muted-foreground">
            {formatRelative(project.updatedAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

