import { View, Text } from 'react-native';

import { formatDate } from '@/shared/utils/date.utils';
import { getERPById } from '@/shared/constants/erp-systems';
import { createProjectId } from '@/shared/types/common.types';
import { useProjectDetail } from '@/features/projects/hooks/useProjectDetail';
import { MemberBadge } from '@/features/projects/components/MemberBadge';
import { ERPIcon } from '@/features/migration/components/ERPIcon';
import { Spinner } from '@/shared/components/ui/Spinner';

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProjectInfoPanelProps {
  projectId: string;
  testID?: string;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const LABEL = 'font-body text-xs font-medium text-muted-foreground uppercase tracking-wide';
const VALUE = 'font-body text-sm text-foreground';

// ─── Component ──────────────────────────────────────────────────────────────

export const ProjectInfoPanel = ({ projectId, testID }: ProjectInfoPanelProps) => {
  const { project, isLoading } = useProjectDetail(createProjectId(projectId));

  if (isLoading) {
    return (
      <View
        testID={testID}
        className="w-64 border-r border-border bg-card px-4 py-6 items-center justify-center"
      >
        <Spinner size="md" testID={testID ? `${testID}-spinner` : undefined} />
      </View>
    );
  }

  if (project === null) {
    return null;
  }

  const sourceErp = getERPById(project.sourceErp);
  const targetErp = getERPById(project.targetErp);
  const createdByName = project.createdBy ?? 'Unknown';
  const sourceName = sourceErp?.name ?? project.sourceErp;
  const targetName = targetErp?.name ?? project.targetErp;

  return (
    <View testID={testID} className="w-64 border-r border-border bg-card px-4 py-6 gap-4">
      {/* Header */}
      <Text className="font-heading text-base font-semibold text-foreground">
        Project Info
      </Text>

      {/* Current User */}
      <View className="gap-1">
        <Text className={LABEL}>Current User</Text>
        <View className="flex-row items-center gap-2">
          <MemberBadge name={createdByName} size="sm" />
          <Text className={VALUE}>{createdByName}</Text>
        </View>
      </View>

      {/* Project ID */}
      <View className="gap-1">
        <Text className={LABEL}>Project ID</Text>
        <Text className="font-mono text-xs text-foreground">{project.projectId}</Text>
      </View>

      {/* Created At */}
      <View className="gap-1">
        <Text className={LABEL}>Created At</Text>
        <Text className={VALUE}>
          {formatDate(project.createdAt)} by {createdByName}
        </Text>
      </View>

      {/* Last Edited */}
      <View className="gap-1">
        <Text className={LABEL}>Last Edited</Text>
        <Text className={VALUE}>
          {formatDate(project.updatedAt)} by {createdByName}
        </Text>
      </View>

      {/* Source ERP */}
      <View className="gap-1">
        <Text className={LABEL}>Source ERP</Text>
        <View className="flex-row items-center gap-2">
          <ERPIcon erpId={project.sourceErp} size={28} />
          <Text className={VALUE}>{sourceName}</Text>
        </View>
      </View>

      {/* Target ERP */}
      <View className="gap-1">
        <Text className={LABEL}>Target ERP</Text>
        <View className="flex-row items-center gap-2">
          <ERPIcon erpId={project.targetErp} size={28} />
          <Text className={VALUE}>{targetName}</Text>
        </View>
      </View>

      {/* Migration Path */}
      <View className="gap-1">
        <Text className={LABEL}>Migration Path</Text>
        <Text className={VALUE}>
          {sourceName} → {targetName}
        </Text>
      </View>
    </View>
  );
};
