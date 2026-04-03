import { useProjectDetail } from '@/features/projects/hooks/useProjectDetail';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useMigrationStore } from '../store/migration.store';
import { createProjectId } from '@/shared/types/common.types';
import type { SidebarContentProps } from '../components/ProjectSidebar/sidebar.types';

export function useSidebarData(projectId: string): SidebarContentProps {
  const { project } = useProjectDetail(createProjectId(projectId));
  const user = useAuthStore((s) => s.user);
  const sourceERP = useMigrationStore((s) => s.sourceERP);
  const targetERP = useMigrationStore((s) => s.targetERP);

  return {
    projectId: project?.projectId ?? null,
    projectName: project?.name,
    createdAt: project?.createdAt ?? undefined,
    createdByName: project?.createdBy ?? undefined,
    updatedAt: project?.updatedAt ?? undefined,
    lastEditedBy: undefined,
    sourceERP: sourceERP
      ? { id: sourceERP.id, name: sourceERP.name, fieldCount: sourceERP.fields?.length ?? 0 }
      : null,
    targetERP: targetERP
      ? { id: targetERP.id, name: targetERP.name, fieldCount: targetERP.fields?.length ?? 0 }
      : null,
    currentUser: user
      ? { name: user.name, userId: user.userId }
      : null,
  };
}
