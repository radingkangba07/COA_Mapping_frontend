import { AxiosError, AxiosHeaders } from 'axios';
import type { HttpClient } from '@/shared/services/http/http.types';
import { createProjectId, createUserId } from '@/shared/types/common.types';
import type { AccessGrant } from '@/features/projects/types/project-access.types';
import {
  getProjectMembers,
  grantProjectAccess,
  revokeProjectAccess,
} from '@/features/projects/services/project-access.service';

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

const VALID_ACCESS_DTO = {
  user_id: 'user-001',
  name: 'John Doe',
  email: 'john@acme.com',
  permission: 'admin' as const,
};

const VALID_ACCESS_DTO_VIEWER = {
  user_id: 'user-002',
  name: 'Alice Smith',
  email: 'alice@acme.com',
  permission: 'viewer' as const,
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
  error.config = { url: '/api/v1/projects/proj-001/access', headers: new AxiosHeaders() };
  return error;
}

const PROJECT_ID = createProjectId('proj-001');

// ─── getProjectMembers ────────────────────────────────────────────────────

describe('getProjectMembers', () => {
  let client: jest.Mocked<HttpClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls GET /api/v1/projects/{id}/access', async () => {
    client.get.mockResolvedValue({ data: [VALID_ACCESS_DTO] });

    await getProjectMembers(client, PROJECT_ID);

    expect(client.get).toHaveBeenCalledWith('/api/v1/projects/proj-001/access');
  });

  it('returns mapped members on success', async () => {
    client.get.mockResolvedValue({
      data: [VALID_ACCESS_DTO, VALID_ACCESS_DTO_VIEWER],
    });

    const result = await getProjectMembers(client, PROJECT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveLength(2);

    const first = result.data[0];
    expect(first?.userId).toBe(createUserId('user-001'));
    expect(first?.name).toBe('John Doe');
    expect(first?.email).toBe('john@acme.com');
    expect(first?.permission).toBe('admin');

    const second = result.data[1];
    expect(second?.userId).toBe(createUserId('user-002'));
    expect(second?.permission).toBe('viewer');
  });

  it('returns ok with empty array when no members', async () => {
    client.get.mockResolvedValue({ data: [] });

    const result = await getProjectMembers(client, PROJECT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toEqual([]);
  });

  it('returns INVALID_RESPONSE when DTO validation fails', async () => {
    client.get.mockResolvedValue({
      data: [{ user_id: '', name: 123, email: 'not-an-email' }],
    });

    const result = await getProjectMembers(client, PROJECT_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Project members response failed validation');
    expect(result.error.details).toHaveProperty('issues');
  });

  it('returns INVALID_RESPONSE when response is not an array', async () => {
    client.get.mockResolvedValue({ data: { members: [] } });

    const result = await getProjectMembers(client, PROJECT_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
  });

  it('returns Result.err on HTTP failure', async () => {
    client.get.mockRejectedValue(createAxiosError(500, 'Internal Server Error'));

    const result = await getProjectMembers(client, PROJECT_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_500');
    expect(result.error.message).toBe('Internal Server Error');
  });
});

// ─── grantProjectAccess ───────────────────────────────────────────────────

describe('grantProjectAccess', () => {
  let client: jest.Mocked<HttpClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  const grant: AccessGrant = {
    userId: createUserId('user-003'),
    permission: 'editor',
  };

  it('calls POST /api/v1/projects/{id}/access with snake_case body', async () => {
    client.post.mockResolvedValue({ data: { ...VALID_ACCESS_DTO, user_id: 'user-003', permission: 'editor' } });

    await grantProjectAccess(client, PROJECT_ID, grant);

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/projects/proj-001/access',
      { user_id: 'user-003', permission: 'editor' },
    );
  });

  it('sends user_id not userId in POST body', async () => {
    client.post.mockResolvedValue({ data: { ...VALID_ACCESS_DTO, user_id: 'user-003', permission: 'editor' } });

    await grantProjectAccess(client, PROJECT_ID, grant);

    const payload = client.post.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).toHaveProperty('user_id');
    expect(payload).not.toHaveProperty('userId');
  });

  it('returns mapped AccessResponse on success', async () => {
    const responseDto = {
      user_id: 'user-003',
      name: 'Bob Jones',
      email: 'bob@acme.com',
      permission: 'editor' as const,
    };
    client.post.mockResolvedValue({ data: responseDto });

    const result = await grantProjectAccess(client, PROJECT_ID, grant);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.userId).toBe(createUserId('user-003'));
    expect(result.data.name).toBe('Bob Jones');
    expect(result.data.email).toBe('bob@acme.com');
    expect(result.data.permission).toBe('editor');
  });

  it('returns INVALID_RESPONSE when response fails validation', async () => {
    client.post.mockResolvedValue({ data: { bad: 'data' } });

    const result = await grantProjectAccess(client, PROJECT_ID, grant);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Grant access response failed validation');
    expect(result.error.details).toHaveProperty('issues');
  });

  it('returns HTTP_409 error on 409 Conflict', async () => {
    client.post.mockRejectedValue(createAxiosError(409, 'User already has access to this project'));

    const result = await grantProjectAccess(client, PROJECT_ID, grant);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_409');
    expect(result.error.message).toBe('User already has access to this project');
  });

  it('returns HTTP_403 error on 403 Forbidden', async () => {
    client.post.mockRejectedValue(createAxiosError(403, 'You do not have permission to manage members'));

    const result = await grantProjectAccess(client, PROJECT_ID, grant);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_403');
    expect(result.error.message).toBe('You do not have permission to manage members');
  });
});

// ─── revokeProjectAccess ──────────────────────────────────────────────────

describe('revokeProjectAccess', () => {
  let client: jest.Mocked<HttpClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  const userId = createUserId('user-002');

  it('calls DELETE /api/v1/projects/{id}/access/{userId}', async () => {
    client.delete.mockResolvedValue({ data: null });

    await revokeProjectAccess(client, PROJECT_ID, userId);

    expect(client.delete).toHaveBeenCalledWith(
      '/api/v1/projects/proj-001/access/user-002',
    );
  });

  it('returns ok(undefined) on success', async () => {
    client.delete.mockResolvedValue({ data: null });

    const result = await revokeProjectAccess(client, PROJECT_ID, userId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toBeUndefined();
  });

  it('returns Result.err on HTTP failure', async () => {
    client.delete.mockRejectedValue(createAxiosError(404, 'User not found'));

    const result = await revokeProjectAccess(client, PROJECT_ID, userId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_404');
    expect(result.error.message).toBe('User not found');
  });

  it('returns Result.err on network error', async () => {
    const networkError = new AxiosError(
      'Network Error',
      AxiosError.ERR_NETWORK,
    );
    networkError.config = { url: '/api/v1/projects/proj-001/access/user-002', headers: new AxiosHeaders() };
    client.delete.mockRejectedValue(networkError);

    const result = await revokeProjectAccess(client, PROJECT_ID, userId);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_0');
    expect(result.error.message).toBe('Network Error');
  });
});
