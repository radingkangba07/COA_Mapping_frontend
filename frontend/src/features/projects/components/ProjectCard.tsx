import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowRight, Clock } from 'lucide-react-native';
import { formatDate, formatRelative } from '@/shared/utils/date.utils';
import { getERPById } from '@/shared/constants/erp-systems';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
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

const DOT = '\u00A0\u00B7\u00A0';

export const ProjectCard = ({
  project,
  onPress,
  testID,
}: ProjectCardProps): React.JSX.Element => {
  useAppStore((s) => s.theme);
  const sourceErpName = getERPById(project.sourceErp)?.name ?? project.sourceErp;
  const targetErpName = getERPById(project.targetErp)?.name ?? project.targetErp;
  const updatedByName = useResolveUserName(project.updatedByName, project.updatedBy);

  return (
    <Pressable
      onPress={() => onPress(project)}
      testID={testID}
      // @ts-expect-error -- web-only style for hover cursor
      style={({ hovered }: { hovered?: boolean }) => ({
        backgroundColor: hovered === true ? colors.surfaceHighlight : 'transparent',
        cursor: 'pointer',
      })}
    >
      <View
        className="border-b border-border px-5 py-3.5"
      >
        {/* Row 1: Name + Status */}
        <View className="flex-row items-center gap-2.5 mb-1.5">
          <Text
            className="font-heading text-sm font-semibold"
            style={{ color: colors.foreground }}
            numberOfLines={1}
          >
            {project.name}
          </Text>
          <StatusBadge status={project.status} />
        </View>

        {/* Row 2: ERP path + date */}
        <View className="flex-row items-center mb-1">
          <Text className="font-body text-xs" style={{ color: colors.mutedForeground }}>
            {sourceErpName}
          </Text>
          <ArrowRight size={10} color={colors.mutedForeground} style={{ marginHorizontal: 4 }} />
          <Text className="font-body text-xs" style={{ color: colors.mutedForeground }}>
            {targetErpName}
          </Text>
          <Text className="font-body text-xs" style={{ color: colors.mutedForeground }}>
            {DOT}
          </Text>
          <Clock size={11} color={colors.mutedForeground} />
          <Text className="font-body text-xs" style={{ color: colors.mutedForeground, marginLeft: 2 }}>
            {formatDate(project.createdAt)}
          </Text>
        </View>

        {/* Row 3: Last edited */}
        <View className="flex-row items-center mt-0.5">
          <Text className="font-body text-xs" style={{ color: colors.mutedForeground }}>
            Last edited by {updatedByName}{DOT}{formatRelative(project.updatedAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};
