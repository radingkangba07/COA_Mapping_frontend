import { useProjectDetail } from '@/features/projects/hooks/useProjectDetail';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useMigrationStore } from '../store/migration.store';
import { useERPConfigStore } from '@/features/erp-config/store/erp-config.store';
import { createProjectId } from '@/shared/types/common.types';
import type { SidebarContentProps, ERPInfo } from '../components/ProjectSidebar/sidebar.types';
import type { ERPSystem } from '@/features/erp-config/types/erp-config.types';

function toERPInfo(erp: { id: string; name: string; fields?: readonly unknown[] }): ERPInfo {
  return { id: erp.id, name: erp.name, fieldCount: erp.fields?.length ?? 0 };
}

function resolveERP(erpValue: string, erpSystems: readonly ERPSystem[]): ERPInfo {
  const lower = erpValue.toLowerCase();
  const match = erpSystems.find((e) => e.id.toLowerCase() === lower)
    ?? erpSystems.find((e) => e.name.toLowerCase() === lower);
  if (match) return toERPInfo(match);
  return { id: erpValue, name: erpValue, fieldCount: 0 };
}

export function useSidebarData(projectId: string): SidebarContentProps {
  const { project } = useProjectDetail(createProjectId(projectId));
  const user = useAuthStore((s) => s.user);
  const sourceERP = useMigrationStore((s) => s.sourceERP);
  const targetERP = useMigrationStore((s) => s.targetERP);
  const erpSystems = useERPConfigStore((s) => s.erpSystems);

  const resolvedSourceERP = sourceERP
    ? toERPInfo(sourceERP)
    : project?.sourceErp
      ? resolveERP(project.sourceErp, erpSystems)
      : null;

  const resolvedTargetERP = targetERP
    ? toERPInfo(targetERP)
    : project?.targetErp
      ? resolveERP(project.targetErp, erpSystems)
      : null;

  return {
    projectId: project?.projectId ?? null,
    projectName: project?.name,
    createdAt: project?.createdAt ?? undefined,
    createdByName: project?.createdBy ?? undefined,
    updatedAt: project?.updatedAt ?? undefined,
    lastEditedBy: project?.updatedBy ?? project?.createdBy ?? undefined,
    sourceERP: resolvedSourceERP,
    targetERP: resolvedTargetERP,
    currentUser: user
      ? { name: user.name, userId: user.userId }
      : null,
  };
}
