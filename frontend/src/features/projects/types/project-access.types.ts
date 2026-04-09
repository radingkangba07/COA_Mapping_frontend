import type { UserId } from '@/shared/types/common.types';

// ─── Permission Types ──────────────────────────────────────────────────────

export const PROJECT_PERMISSIONS = ['viewer', 'editor', 'approver', 'admin'] as const;
export type ProjectPermission = (typeof PROJECT_PERMISSIONS)[number];

// ─── Domain Types ──────────────────────────────────────────────────────────

export interface AccessResponse {
  readonly userId: UserId;
  readonly name: string;
  readonly email: string;
  readonly permission: ProjectPermission;
}

export interface AccessGrant {
  readonly userId: UserId;
  readonly permission: ProjectPermission;
}

// ─── DTO (snake_case from backend) ────────────────────────────────────────

export interface AccessResponseDTO {
  user_id: string;
  name: string;
  email: string;
  permission: ProjectPermission;
}

// ─── Permission Helpers ────────────────────────────────────────────────────

const RANK: Record<ProjectPermission, number> = {
  viewer: 1,
  editor: 2,
  approver: 3,
  admin: 4,
};

export const permissionRank = (p: ProjectPermission): number => RANK[p];

export const canManageMembers = (p: ProjectPermission | null): boolean =>
  p !== null && RANK[p] >= RANK.approver;
