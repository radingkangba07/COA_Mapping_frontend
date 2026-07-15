import type { ProjectPermission } from '../types/project-access.types';

export interface MemberRoleOption {
  readonly value: ProjectPermission;
  readonly label: string;
}

export const SCOPE_MEMBER_ROLES: readonly MemberRoleOption[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Modifier' },
  { value: 'viewer', label: 'Viewer' },
];

export function memberRoleLabel(role: ProjectPermission): string {
  const match = SCOPE_MEMBER_ROLES.find((option) => option.value === role);
  if (match !== undefined) {
    return match.label;
  }
  return role.charAt(0).toUpperCase() + role.slice(1);
}
