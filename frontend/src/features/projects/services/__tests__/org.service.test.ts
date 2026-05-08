import { AxiosError, AxiosHeaders } from 'axios';
import type { HttpClient } from '@/shared/services/http/http.types';
import { createOrgId, createUserId } from '@/shared/types/common.types';
import {
  getUserOrgs,
  getOrgMembers,
  inviteMember,
  removeMember,
  getOrgInvitations,
  cancelInvitation,
  createClientOrg,
  getClientOrgs,
  getClientOrg,
  updateClientOrg,
  deleteClientOrg,
} from '@/features/projects/services/org.service';

// ─── Mock HTTP Client ──────────────────────────────────────────────────────

function createMockClient(): jest.Mocked<HttpClient> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    request: jest.fn(),
    getUri: jest.fn(),
    postForm: jest.fn(),
    putForm: jest.fn(),
    patchForm: jest.fn(),
    defaults: { headers: new AxiosHeaders() },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    },
  } as unknown as jest.Mocked<HttpClient>;
}

// ─── Fixtures ──────────────────────────────────────────────────────────────

const VALID_ORG_DTO = {
  id: 'org-001',
  name: 'Acme Corp',
  role: 'owner' as const,
  org_type: 'employer' as const,
  created_at: '2026-01-10T08:00:00Z',
};

const VALID_ORG_DTO_2 = {
  id: 'org-002',
  name: 'Beta Inc',
  role: 'member' as const,
  org_type: 'employer' as const,
  created_at: '2026-02-15T12:00:00Z',
};

const VALID_CLIENT_ORG_DTO = {
  id: 'client-001',
  name: 'Retail Corp',
  slug: 'retail-corp',
  description: 'A retail client',
  org_type: 'client' as const,
  parent_org_id: 'org-001',
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-02T11:00:00Z',
};

const VALID_CLIENT_ORG_DTO_MINIMAL = {
  id: 'client-002',
  name: 'Finance Ltd',
  slug: 'finance-ltd',
  description: null,
  org_type: 'client' as const,
  parent_org_id: 'org-001',
  created_at: '2026-04-01T08:00:00Z',
  updated_at: '2026-04-01T08:00:00Z',
};

const VALID_MEMBER_DTO = {
  user_id: 'user-001',
  email: 'alice@acme.com',
  name: 'Alice Smith',
  role: 'owner' as const,
  joined_at: '2026-01-10T08:00:00Z',
};

const VALID_MEMBER_DTO_2 = {
  user_id: 'user-002',
  email: 'bob@acme.com',
  name: 'Bob Jones',
  role: 'member' as const,
  joined_at: '2026-01-12T09:00:00Z',
};

const VALID_INVITATION_DTO = {
  id: 'inv-001',
  email: 'carol@acme.com',
  role: 'member' as const,
  status: 'pending',
  invited_at: '2026-03-01T10:00:00Z',
  expires_at: '2026-03-08T10:00:00Z',
};

// POST /api/v1/orgs/:orgId/invitations returns a slim confirmation.
const VALID_CREATE_INVITATION_RESPONSE = {
  invitation_id: 'inv-001',
  message: 'Invitation sent',
};

function createAxiosError(status: number, message: string): AxiosError {
  const error = new AxiosError(
    message,
    AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    {
      status,
      data: { message },
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
  error.config = { url: '/api/v1/orgs', headers: new AxiosHeaders() };
  return error;
}

// ─── getUserOrgs ──────────────────────────────────────────────────────────

describe('getUserOrgs', () => {
  let client: jest.Mocked<HttpClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls GET /api/v1/users/me/orgs', async () => {
    client.get.mockResolvedValue({
      data: [VALID_ORG_DTO],
    });

    await getUserOrgs(client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/users/me/orgs');
  });

  it('returns mapped Org[] on success', async () => {
    client.get.mockResolvedValue({
      data: [VALID_ORG_DTO, VALID_ORG_DTO_2],
    });

    const result = await getUserOrgs(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveLength(2);

    const first = result.data[0];
    expect(first?.id).toBe(createOrgId('org-001'));
    expect(first?.name).toBe('Acme Corp');
    expect(first?.role).toBe('owner');
    expect(first?.orgType).toBe('employer');
    expect(first?.createdAt).toBe('2026-01-10T08:00:00Z');

    const second = result.data[1];
    expect(second?.id).toBe(createOrgId('org-002'));
    expect(second?.name).toBe('Beta Inc');
    expect(second?.role).toBe('member');
    expect(second?.orgType).toBe('employer');
  });

  it('handles orgs without created_at (matches live backend shape)', async () => {
    client.get.mockResolvedValue({
      data: [{ id: 'org-003', name: 'No Date Corp', role: 'owner' }],
    });

    const result = await getUserOrgs(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe(createOrgId('org-003'));
    expect(result.data[0]?.name).toBe('No Date Corp');
    expect(result.data[0]?.createdAt).toBeNull();
  });

  it('returns INVALID_RESPONSE when response fails validation', async () => {
    client.get.mockResolvedValue({
      data: [{ id: 123, bad_field: true }],
    });

    const result = await getUserOrgs(client);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Orgs response failed validation');
    expect(result.error.details).toHaveProperty('issues');
  });

  it('returns INVALID_RESPONSE when top-level shape is wrong', async () => {
    client.get.mockResolvedValue({
      data: { not_an_array: true },
    });

    const result = await getUserOrgs(client);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
  });

  it('returns Result.err with AppError on HTTP failure', async () => {
    client.get.mockRejectedValue(createAxiosError(500, 'Internal Server Error'));

    const result = await getUserOrgs(client);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_500');
    expect(result.error.message).toBe('Internal Server Error');
  });

  it('returns ok with empty orgs array', async () => {
    client.get.mockResolvedValue({
      data: [],
    });

    const result = await getUserOrgs(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toEqual([]);
  });
});

// ─── getOrgMembers ────────────────────────────────────────────────────────

describe('getOrgMembers', () => {
  let client: jest.Mocked<HttpClient>;
  const orgId = createOrgId('org-001');

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls GET /api/v1/orgs/{orgId}/members', async () => {
    client.get.mockResolvedValue({
      data: [VALID_MEMBER_DTO],
    });

    await getOrgMembers(client, orgId);

    expect(client.get).toHaveBeenCalledWith('/api/v1/orgs/org-001/members');
  });

  it('returns mapped OrgMember[] on success', async () => {
    client.get.mockResolvedValue({
      data: [VALID_MEMBER_DTO, VALID_MEMBER_DTO_2],
    });

    const result = await getOrgMembers(client, orgId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveLength(2);

    const first = result.data[0];
    expect(first?.userId).toBe(createUserId('user-001'));
    expect(first?.email).toBe('alice@acme.com');
    expect(first?.name).toBe('Alice Smith');
    expect(first?.role).toBe('owner');
    expect(first?.joinedAt).toBe('2026-01-10T08:00:00Z');
  });

  it('returns INVALID_RESPONSE when response fails validation', async () => {
    client.get.mockResolvedValue({
      data: [{ bad: true }],
    });

    const result = await getOrgMembers(client, orgId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Org members response failed validation');
    expect(result.error.details).toHaveProperty('issues');
  });

  it('returns Result.err on HTTP failure', async () => {
    client.get.mockRejectedValue(createAxiosError(403, 'Forbidden'));

    const result = await getOrgMembers(client, orgId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_403');
  });
});

// ─── inviteMember ─────────────────────────────────────────────────────────

describe('inviteMember', () => {
  let client: jest.Mocked<HttpClient>;
  const orgId = createOrgId('org-001');

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls POST /api/v1/orgs/{orgId}/invitations with email and role', async () => {
    client.post.mockResolvedValue({ data: VALID_CREATE_INVITATION_RESPONSE });

    await inviteMember(client, orgId, 'carol@acme.com', 'member');

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/orgs/org-001/invitations',
      { email: 'carol@acme.com', role: 'member' },
    );
  });

  it('returns invitationId on success', async () => {
    client.post.mockResolvedValue({ data: VALID_CREATE_INVITATION_RESPONSE });

    const result = await inviteMember(client, orgId, 'carol@acme.com', 'member');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.invitationId).toBe('inv-001');
  });

  it('returns INVITATION_ALREADY_PENDING on 409 conflict', async () => {
    const error409 = createAxiosError(409, 'Conflict');
    client.post.mockRejectedValue(error409);

    const result = await inviteMember(client, orgId, 'carol@acme.com', 'member');

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVITATION_ALREADY_PENDING');
    expect(result.error.message).toBe(
      'An invitation is already pending for this email',
    );
  });

  it('returns generic AppError on non-409 HTTP failure', async () => {
    client.post.mockRejectedValue(createAxiosError(500, 'Internal Server Error'));

    const result = await inviteMember(client, orgId, 'carol@acme.com', 'member');

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_500');
    expect(result.error.message).toBe('Internal Server Error');
  });

  it('returns INVALID_RESPONSE on malformed response', async () => {
    client.post.mockResolvedValue({ data: { unexpected: true } });

    const result = await inviteMember(client, orgId, 'carol@acme.com', 'member');

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Invitation response failed validation');
  });
});

// ─── removeMember ─────────────────────────────────────────────────────────

describe('removeMember', () => {
  let client: jest.Mocked<HttpClient>;
  const orgId = createOrgId('org-001');
  const userId = createUserId('user-002');

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls DELETE /api/v1/orgs/{orgId}/members/{userId}', async () => {
    client.delete.mockResolvedValue({ data: null });

    await removeMember(client, orgId, userId);

    expect(client.delete).toHaveBeenCalledWith(
      '/api/v1/orgs/org-001/members/user-002',
    );
  });

  it('returns ok(undefined) on success', async () => {
    client.delete.mockResolvedValue({ data: null });

    const result = await removeMember(client, orgId, userId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toBeUndefined();
  });

  it('returns Result.err on HTTP failure', async () => {
    client.delete.mockRejectedValue(createAxiosError(404, 'Member not found'));

    const result = await removeMember(client, orgId, userId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_404');
    expect(result.error.message).toBe('Member not found');
  });
});

// ─── getOrgInvitations ────────────────────────────────────────────────────

describe('getOrgInvitations', () => {
  let client: jest.Mocked<HttpClient>;
  const orgId = createOrgId('org-001');

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls GET /api/v1/orgs/{orgId}/invitations', async () => {
    client.get.mockResolvedValue({
      data: [VALID_INVITATION_DTO],
    });

    await getOrgInvitations(client, orgId);

    expect(client.get).toHaveBeenCalledWith('/api/v1/orgs/org-001/invitations');
  });

  it('returns mapped OrgInvitation[] on success', async () => {
    client.get.mockResolvedValue({
      data: [VALID_INVITATION_DTO],
    });

    const result = await getOrgInvitations(client, orgId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveLength(1);

    const inv = result.data[0];
    expect(inv?.id).toBe('inv-001');
    expect(inv?.email).toBe('carol@acme.com');
    expect(inv?.role).toBe('member');
    expect(inv?.status).toBe('pending');
    expect(inv?.invitedAt).toBe('2026-03-01T10:00:00Z');
    expect(inv?.expiresAt).toBe('2026-03-08T10:00:00Z');
  });

  it('returns INVALID_RESPONSE when response fails validation', async () => {
    client.get.mockResolvedValue({
      data: [{ bad: true }],
    });

    const result = await getOrgInvitations(client, orgId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe(
      'Org invitations response failed validation',
    );
    expect(result.error.details).toHaveProperty('issues');
  });

  it('returns Result.err on HTTP failure', async () => {
    client.get.mockRejectedValue(createAxiosError(500, 'Internal Server Error'));

    const result = await getOrgInvitations(client, orgId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_500');
  });
});

// ─── cancelInvitation ─────────────────────────────────────────────────────

describe('cancelInvitation', () => {
  let client: jest.Mocked<HttpClient>;
  const orgId = createOrgId('org-001');

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls DELETE /api/v1/orgs/{orgId}/invitations/{invitationId}', async () => {
    client.delete.mockResolvedValue({ data: null });

    await cancelInvitation(client, orgId, 'inv-001');

    expect(client.delete).toHaveBeenCalledWith(
      '/api/v1/orgs/org-001/invitations/inv-001',
    );
  });

  it('returns ok(undefined) on success', async () => {
    client.delete.mockResolvedValue({ data: null });

    const result = await cancelInvitation(client, orgId, 'inv-001');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toBeUndefined();
  });

  it('returns Result.err on HTTP failure', async () => {
    client.delete.mockRejectedValue(
      createAxiosError(404, 'Invitation not found'),
    );

    const result = await cancelInvitation(client, orgId, 'inv-001');

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_404');
    expect(result.error.message).toBe('Invitation not found');
  });
});

// ─── createClientOrg ─────────────────────────────────────────────────────

describe('createClientOrg', () => {
  let client: jest.Mocked<HttpClient>;
  const parentOrgId = createOrgId('org-001');

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls POST /api/v1/orgs/{parentOrgId}/clients with name and description', async () => {
    client.post.mockResolvedValue({ data: VALID_CLIENT_ORG_DTO });

    await createClientOrg(client, parentOrgId, { name: 'Retail Corp', description: 'A retail client' });

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/orgs/org-001/clients',
      { name: 'Retail Corp', description: 'A retail client' },
    );
  });

  it('returns mapped ClientOrg on success', async () => {
    client.post.mockResolvedValue({ data: VALID_CLIENT_ORG_DTO });

    const result = await createClientOrg(client, parentOrgId, { name: 'Retail Corp' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.id).toBe(createOrgId('client-001'));
    expect(result.data.name).toBe('Retail Corp');
    expect(result.data.slug).toBe('retail-corp');
    expect(result.data.description).toBe('A retail client');
    expect(result.data.orgType).toBe('client');
    expect(result.data.parentOrgId).toBe(createOrgId('org-001'));
    expect(result.data.createdAt).toBe('2026-03-01T10:00:00Z');
  });

  it('maps null description correctly', async () => {
    client.post.mockResolvedValue({ data: VALID_CLIENT_ORG_DTO_MINIMAL });

    const result = await createClientOrg(client, parentOrgId, { name: 'Finance Ltd' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.description).toBeNull();
  });

  it('returns INVALID_RESPONSE on malformed response', async () => {
    client.post.mockResolvedValue({ data: { unexpected: true } });

    const result = await createClientOrg(client, parentOrgId, { name: 'X' });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Create client org response failed validation');
  });

  it('returns Result.err on HTTP failure', async () => {
    client.post.mockRejectedValue(createAxiosError(403, 'Forbidden'));

    const result = await createClientOrg(client, parentOrgId, { name: 'X' });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_403');
  });
});

// ─── getClientOrgs ────────────────────────────────────────────────────────

describe('getClientOrgs', () => {
  let client: jest.Mocked<HttpClient>;
  const parentOrgId = createOrgId('org-001');

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls GET /api/v1/orgs/{parentOrgId}/clients', async () => {
    client.get.mockResolvedValue({ data: [VALID_CLIENT_ORG_DTO] });

    await getClientOrgs(client, parentOrgId);

    expect(client.get).toHaveBeenCalledWith('/api/v1/orgs/org-001/clients');
  });

  it('returns mapped ClientOrg[] on success', async () => {
    client.get.mockResolvedValue({
      data: [VALID_CLIENT_ORG_DTO, VALID_CLIENT_ORG_DTO_MINIMAL],
    });

    const result = await getClientOrgs(client, parentOrgId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveLength(2);
    expect(result.data[0]?.name).toBe('Retail Corp');
    expect(result.data[0]?.orgType).toBe('client');
    expect(result.data[1]?.name).toBe('Finance Ltd');
    expect(result.data[1]?.description).toBeNull();
  });

  it('returns ok with empty array when no clients', async () => {
    client.get.mockResolvedValue({ data: [] });

    const result = await getClientOrgs(client, parentOrgId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toEqual([]);
  });

  it('returns INVALID_RESPONSE on malformed response', async () => {
    client.get.mockResolvedValue({ data: { not_an_array: true } });

    const result = await getClientOrgs(client, parentOrgId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Client orgs list response failed validation');
  });

  it('returns Result.err on HTTP failure', async () => {
    client.get.mockRejectedValue(createAxiosError(500, 'Server error'));

    const result = await getClientOrgs(client, parentOrgId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_500');
  });
});

// ─── getClientOrg ─────────────────────────────────────────────────────────

describe('getClientOrg', () => {
  let client: jest.Mocked<HttpClient>;
  const parentOrgId = createOrgId('org-001');
  const clientId = createOrgId('client-001');

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls GET /api/v1/orgs/{parentOrgId}/clients/{clientId}', async () => {
    client.get.mockResolvedValue({ data: VALID_CLIENT_ORG_DTO });

    await getClientOrg(client, parentOrgId, clientId);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/orgs/org-001/clients/client-001',
    );
  });

  it('returns mapped ClientOrg on success', async () => {
    client.get.mockResolvedValue({ data: VALID_CLIENT_ORG_DTO });

    const result = await getClientOrg(client, parentOrgId, clientId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.id).toBe(createOrgId('client-001'));
    expect(result.data.orgType).toBe('client');
    expect(result.data.parentOrgId).toBe(createOrgId('org-001'));
  });

  it('returns INVALID_RESPONSE on malformed response', async () => {
    client.get.mockResolvedValue({ data: { bad: true } });

    const result = await getClientOrg(client, parentOrgId, clientId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Client org response failed validation');
  });

  it('returns Result.err on 404', async () => {
    client.get.mockRejectedValue(createAxiosError(404, 'Not found'));

    const result = await getClientOrg(client, parentOrgId, clientId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_404');
  });
});

// ─── updateClientOrg ──────────────────────────────────────────────────────

describe('updateClientOrg', () => {
  let client: jest.Mocked<HttpClient>;
  const parentOrgId = createOrgId('org-001');
  const clientId = createOrgId('client-001');

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls PATCH /api/v1/orgs/{parentOrgId}/clients/{clientId} with update payload', async () => {
    client.patch.mockResolvedValue({ data: VALID_CLIENT_ORG_DTO });

    await updateClientOrg(client, parentOrgId, clientId, { name: 'Renamed Corp' });

    expect(client.patch).toHaveBeenCalledWith(
      '/api/v1/orgs/org-001/clients/client-001',
      { name: 'Renamed Corp' },
    );
  });

  it('returns updated ClientOrg on success', async () => {
    const updatedDto = { ...VALID_CLIENT_ORG_DTO, name: 'Renamed Corp', slug: 'renamed-corp' };
    client.patch.mockResolvedValue({ data: updatedDto });

    const result = await updateClientOrg(client, parentOrgId, clientId, { name: 'Renamed Corp' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.name).toBe('Renamed Corp');
    expect(result.data.slug).toBe('renamed-corp');
    expect(result.data.orgType).toBe('client');
  });

  it('returns INVALID_RESPONSE on malformed response', async () => {
    client.patch.mockResolvedValue({ data: { bad: true } });

    const result = await updateClientOrg(client, parentOrgId, clientId, { name: 'X' });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Update client org response failed validation');
  });

  it('returns Result.err on HTTP failure', async () => {
    client.patch.mockRejectedValue(createAxiosError(403, 'Forbidden'));

    const result = await updateClientOrg(client, parentOrgId, clientId, { name: 'X' });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_403');
  });
});

// ─── deleteClientOrg ──────────────────────────────────────────────────────

describe('deleteClientOrg', () => {
  let client: jest.Mocked<HttpClient>;
  const parentOrgId = createOrgId('org-001');
  const clientId = createOrgId('client-001');

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls DELETE /api/v1/orgs/{parentOrgId}/clients/{clientId}', async () => {
    client.delete.mockResolvedValue({ data: null });

    await deleteClientOrg(client, parentOrgId, clientId);

    expect(client.delete).toHaveBeenCalledWith(
      '/api/v1/orgs/org-001/clients/client-001',
    );
  });

  it('returns ok(undefined) on success', async () => {
    client.delete.mockResolvedValue({ data: null });

    const result = await deleteClientOrg(client, parentOrgId, clientId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toBeUndefined();
  });

  it('returns Result.err on HTTP failure', async () => {
    client.delete.mockRejectedValue(createAxiosError(404, 'Client org not found'));

    const result = await deleteClientOrg(client, parentOrgId, clientId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_404');
    expect(result.error.message).toBe('Client org not found');
  });
});
