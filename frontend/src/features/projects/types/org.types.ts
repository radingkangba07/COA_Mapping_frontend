import { z } from 'zod';
import type { OrgId, UserId } from '@/shared/types/common.types';
import { createOrgId, createUserId } from '@/shared/types/common.types';

// ─── Value Objects ──────────────────────────────────────────────────────────

export type OrgRole = 'owner' | 'admin' | 'member';

// ─── Domain Entities ────────────────────────────────────────────────────────

export interface Org {
  readonly id: OrgId;
  readonly name: string;
  readonly role: OrgRole;
  readonly createdAt: string | null;
}

export interface OrgMember {
  readonly userId: UserId;
  readonly email: string;
  readonly name: string;
  readonly role: OrgRole;
  readonly joinedAt: string;
}

export interface OrgInvitation {
  readonly id: string;
  readonly email: string;
  readonly role: OrgRole;
  readonly status: string;
  readonly invitedAt: string;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const orgRoleSchema = z.enum(['owner', 'admin', 'member']);

export const orgResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: orgRoleSchema,
  created_at: z.string().optional(),
});

export type OrgDTO = z.infer<typeof orgResponseSchema>;

// Backend GET /api/v1/users/me/orgs returns a flat array, not wrapped.
export const orgListResponseSchema = z.array(orgResponseSchema);

export const orgMemberResponseSchema = z.object({
  user_id: z.string().min(1),
  email: z.string(),
  name: z.string(),
  role: orgRoleSchema,
  joined_at: z.string(),
});

export type OrgMemberDTO = z.infer<typeof orgMemberResponseSchema>;

// Backend returns a flat array, not wrapped.
export const orgMemberListResponseSchema = z.array(orgMemberResponseSchema);

export const orgInvitationResponseSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  role: orgRoleSchema,
  status: z.string(),
  invited_at: z.string(),
});

export type OrgInvitationDTO = z.infer<typeof orgInvitationResponseSchema>;

// POST /api/v1/orgs/:orgId/invitations returns a slim confirmation, not a full invitation.
export const createInvitationResponseSchema = z.object({
  invitation_id: z.string().min(1),
  message: z.string(),
});

// Backend returns a flat array, not wrapped.
export const orgInvitationListResponseSchema = z.array(orgInvitationResponseSchema);

// ─── Mappers ────────────────────────────────────────────────────────────────

export function toOrg(dto: OrgDTO): Org {
  return {
    id: createOrgId(dto.id),
    name: dto.name,
    role: dto.role,
    createdAt: dto.created_at ?? null,
  };
}

export function toOrgMember(dto: OrgMemberDTO): OrgMember {
  return {
    userId: createUserId(dto.user_id),
    email: dto.email,
    name: dto.name,
    role: dto.role,
    joinedAt: dto.joined_at,
  };
}

export function toOrgInvitation(dto: OrgInvitationDTO): OrgInvitation {
  return {
    id: dto.id,
    email: dto.email,
    role: dto.role,
    status: dto.status,
    invitedAt: dto.invited_at,
  };
}
