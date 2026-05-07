import { AxiosError } from 'axios';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { OrgId, UserId } from '@/shared/types/common.types';
import type { Org, OrgMember, OrgInvitation, OrgRole, ClientOrg, ClientOrgCreate, ClientOrgUpdate } from '../types/org.types';
import {
  orgListResponseSchema,
  orgMemberListResponseSchema,
  orgInvitationResponseSchema,
  orgInvitationListResponseSchema,
  createInvitationResponseSchema,
  clientOrgResponseSchema,
  clientOrgListResponseSchema,
  toOrg,
  toOrgMember,
  toOrgInvitation,
  toClientOrg,
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
): Promise<Result<{ invitationId: string }, AppError>> {
  try {
    const { data } = await client.post<unknown>(
      `/api/v1/orgs/${orgId}/invitations`,
      { email, role },
    );

    const parsed = createInvitationResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Invitation response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok({ invitationId: parsed.data.invitation_id });
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

// ─── Client Org CRUD ────────────────────────────────────────────────────────

export async function createClientOrg(
  client: HttpClient,
  parentOrgId: OrgId,
  data: ClientOrgCreate,
): Promise<Result<ClientOrg, AppError>> {
  try {
    const { data: responseData } = await client.post<unknown>(
      `/api/v1/orgs/${parentOrgId}/clients`,
      data,
    );

    const parsed = clientOrgResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Create client org response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toClientOrg(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getClientOrgs(
  client: HttpClient,
  parentOrgId: OrgId,
): Promise<Result<ClientOrg[], AppError>> {
  try {
    const { data } = await client.get<unknown>(`/api/v1/orgs/${parentOrgId}/clients`);

    const parsed = clientOrgListResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Client orgs list response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(parsed.data.map(toClientOrg));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getClientOrg(
  client: HttpClient,
  parentOrgId: OrgId,
  clientId: OrgId,
): Promise<Result<ClientOrg, AppError>> {
  try {
    const { data } = await client.get<unknown>(
      `/api/v1/orgs/${parentOrgId}/clients/${clientId}`,
    );

    const parsed = clientOrgResponseSchema.safeParse(data);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Client org response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toClientOrg(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function updateClientOrg(
  client: HttpClient,
  parentOrgId: OrgId,
  clientId: OrgId,
  data: ClientOrgUpdate,
): Promise<Result<ClientOrg, AppError>> {
  try {
    const { data: responseData } = await client.patch<unknown>(
      `/api/v1/orgs/${parentOrgId}/clients/${clientId}`,
      data,
    );

    const parsed = clientOrgResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Update client org response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toClientOrg(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function deleteClientOrg(
  client: HttpClient,
  parentOrgId: OrgId,
  clientId: OrgId,
): Promise<Result<undefined, AppError>> {
  try {
    await client.delete(`/api/v1/orgs/${parentOrgId}/clients/${clientId}`);

    return ok(undefined);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
