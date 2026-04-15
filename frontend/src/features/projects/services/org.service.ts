import { AxiosError } from 'axios';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { OrgId, UserId } from '@/shared/types/common.types';
import type { Org, OrgMember, OrgInvitation, OrgRole } from '../types/org.types';
import {
  orgListResponseSchema,
  orgMemberListResponseSchema,
  orgInvitationResponseSchema,
  orgInvitationListResponseSchema,
  toOrg,
  toOrgMember,
  toOrgInvitation,
} from '../types/org.types';

// ─── Service Functions ──────────────────────────────────────────────────────

// T007: getUserOrgs

export async function getUserOrgs(
  client: HttpClient,
): Promise<Result<Org[], AppError>> {
  try {
    const { data } = await client.get<unknown>('/api/v1/users/me/orgs');

    const parsed = orgListResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Orgs response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(parsed.data.map(toOrg));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

// T008: getOrgMembers

export async function getOrgMembers(
  client: HttpClient,
  orgId: OrgId,
): Promise<Result<OrgMember[], AppError>> {
  try {
    const { data } = await client.get<unknown>(`/api/v1/orgs/${orgId}/members`);

    const parsed = orgMemberListResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Org members response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(parsed.data.map(toOrgMember));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

// T009: inviteMember

export async function inviteMember(
  client: HttpClient,
  orgId: OrgId,
  email: string,
  role: OrgRole,
): Promise<Result<OrgInvitation, AppError>> {
  try {
    const { data } = await client.post<unknown>(
      `/api/v1/orgs/${orgId}/invitations`,
      { email, role },
    );

    const parsed = orgInvitationResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Invitation response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toOrgInvitation(parsed.data));
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status === 409) {
      return err({
        code: 'INVITATION_ALREADY_PENDING',
        message: 'An invitation is already pending for this email',
      });
    }
    return err(toAppError(error));
  }
}

// T010: removeMember

export async function removeMember(
  client: HttpClient,
  orgId: OrgId,
  userId: UserId,
): Promise<Result<undefined, AppError>> {
  try {
    await client.delete(`/api/v1/orgs/${orgId}/members/${userId}`);

    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

// T011: getOrgInvitations

export async function getOrgInvitations(
  client: HttpClient,
  orgId: OrgId,
): Promise<Result<OrgInvitation[], AppError>> {
  try {
    const { data } = await client.get<unknown>(`/api/v1/orgs/${orgId}/invitations`);

    const parsed = orgInvitationListResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Org invitations response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(parsed.data.map(toOrgInvitation));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

// T012: cancelInvitation

export async function cancelInvitation(
  client: HttpClient,
  orgId: OrgId,
  invitationId: string,
): Promise<Result<undefined, AppError>> {
  try {
    await client.delete(`/api/v1/orgs/${orgId}/invitations/${invitationId}`);

    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
