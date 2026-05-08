import { AxiosError, AxiosHeaders } from 'axios';
import type { HttpClient } from '@/shared/services/http/http.types';
import { createProjectId, createOrgId } from '@/shared/types/common.types';
import type { ProjectCreate, ProjectUpdate } from '@/features/projects/types/projects.types';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '@/features/projects/services/projects.service';

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

const VALID_PROJECT_DTO = {
  id: 'proj-001',
  name: 'SAP to NetSuite Migration',
  source_system: 'sap',
  target_system: 'netsuite',
  status: 'draft' as const,
  company_id: 'comp-001',
  description: 'Annual migration',
  created_by: 'user-001',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-16T12:00:00Z',
};

const VALID_PROJECT_DTO_MINIMAL = {
  id: 'proj-002',
  name: 'QuickBooks Export',
  source_system: 'quickbooks',
  target_system: 'xero',
  status: 'in_progress' as const,
  company_id: null,
  description: null,
  created_by: null,
  created_at: '2026-02-01T08:00:00Z',
  updated_at: '2026-02-02T09:00:00Z',
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
  error.config = { url: '/api/v1/projects', headers: new AxiosHeaders() };
  return error;
}

// ─── getProjects ───────────────────────────────────────────────────────────

describe('getProjects', () => {
  let client: jest.Mocked<HttpClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls GET /api/v1/projects with default skip and limit', async () => {
    client.get.mockResolvedValue({
      data: { projects: [VALID_PROJECT_DTO], total: 1 },
    });

    await getProjects(client);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/projects?skip=0&limit=100',
    );
  });

  it('calls GET with custom skip and limit params', async () => {
    client.get.mockResolvedValue({
      data: { projects: [], total: 0 },
    });

    await getProjects(client, 20, 50);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/projects?skip=20&limit=50',
    );
  });

  it('appends org_id query param when orgId is provided', async () => {
    client.get.mockResolvedValue({
      data: { projects: [], total: 0 },
    });

    const orgId = createOrgId('org-abc');
    await getProjects(client, 0, 100, orgId);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/projects?skip=0&limit=100&org_id=org-abc',
    );
  });

  it('does not append org_id when orgId is undefined', async () => {
    client.get.mockResolvedValue({
      data: { projects: [], total: 0 },
    });

    await getProjects(client, 0, 100, undefined);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/projects?skip=0&limit=100',
    );
  });

  it('returns mapped projects on success', async () => {
    client.get.mockResolvedValue({
      data: {
        projects: [VALID_PROJECT_DTO, VALID_PROJECT_DTO_MINIMAL],
        total: 2,
      },
    });

    const result = await getProjects(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.total).toBe(2);
    expect(result.data.projects).toHaveLength(2);

    const first = result.data.projects[0];
    expect(first?.projectId).toBe(createProjectId('proj-001'));
    expect(first?.name).toBe('SAP to NetSuite Migration');
    expect(first?.sourceErp).toBe('sap');
    expect(first?.targetErp).toBe('netsuite');
    expect(first?.status).toBe('draft');
    expect(first?.createdAt).toEqual(new Date('2026-01-15T10:00:00Z'));
    expect(first?.updatedAt).toEqual(new Date('2026-01-16T12:00:00Z'));
  });

  it('maps nullable fields to undefined', async () => {
    client.get.mockResolvedValue({
      data: { projects: [VALID_PROJECT_DTO_MINIMAL], total: 1 },
    });

    const result = await getProjects(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const project = result.data.projects[0];
    expect(project?.companyId).toBeUndefined();
    expect(project?.description).toBeUndefined();
    expect(project?.createdBy).toBeUndefined();
  });

  it('returns Result.err with AppError on HTTP failure', async () => {
    client.get.mockRejectedValue(createAxiosError(500, 'Internal Server Error'));

    const result = await getProjects(client);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_500');
    expect(result.error.message).toBe('Internal Server Error');
  });

  it('returns INVALID_RESPONSE error when response fails validation', async () => {
    client.get.mockResolvedValue({
      data: { projects: [{ id: 123, bad_field: true }], total: 1 },
    });

    const result = await getProjects(client);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe(
      'Projects list response failed validation',
    );
    expect(result.error.details).toHaveProperty('issues');
  });

  it('returns INVALID_RESPONSE when top-level shape is wrong', async () => {
    client.get.mockResolvedValue({
      data: { items: [], count: 0 },
    });

    const result = await getProjects(client);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
  });

  it('returns ok with empty projects array', async () => {
    client.get.mockResolvedValue({
      data: { projects: [], total: 0 },
    });

    const result = await getProjects(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.projects).toEqual([]);
    expect(result.data.total).toBe(0);
  });
});

// ─── getProject ────────────────────────────────────────────────────────────

describe('getProject', () => {
  let client: jest.Mocked<HttpClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls GET /api/v1/projects/{id}', async () => {
    client.get.mockResolvedValue({ data: VALID_PROJECT_DTO });

    const projectId = createProjectId('proj-001');
    await getProject(client, projectId);

    expect(client.get).toHaveBeenCalledWith('/api/v1/projects/proj-001');
  });

  it('returns mapped project on success', async () => {
    client.get.mockResolvedValue({ data: VALID_PROJECT_DTO });

    const result = await getProject(client, createProjectId('proj-001'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.projectId).toBe(createProjectId('proj-001'));
    expect(result.data.name).toBe('SAP to NetSuite Migration');
    expect(result.data.sourceErp).toBe('sap');
    expect(result.data.targetErp).toBe('netsuite');
    expect(result.data.status).toBe('draft');
    expect(result.data.description).toBe('Annual migration');
    expect(result.data.createdAt).toBeInstanceOf(Date);
  });

  it('returns Result.err on 404', async () => {
    client.get.mockRejectedValue(createAxiosError(404, 'Project not found'));

    const result = await getProject(client, createProjectId('nonexistent'));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_404');
    expect(result.error.message).toBe('Project not found');
  });

  it('returns INVALID_RESPONSE when response lacks required fields', async () => {
    client.get.mockResolvedValue({
      data: { id: 'proj-001', name: 'Test' },
    });

    const result = await getProject(client, createProjectId('proj-001'));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Project response failed validation');
  });

  it('returns INVALID_RESPONSE when status is invalid', async () => {
    client.get.mockResolvedValue({
      data: { ...VALID_PROJECT_DTO, status: 'archived' },
    });

    const result = await getProject(client, createProjectId('proj-001'));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
  });
});

// ─── createProject ─────────────────────────────────────────────────────────

describe('createProject', () => {
  let client: jest.Mocked<HttpClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls POST /api/v1/projects with mapped payload', async () => {
    client.post.mockResolvedValue({ data: VALID_PROJECT_DTO });

    const input: ProjectCreate = {
      name: 'SAP to NetSuite Migration',
      sourceErp: 'sap',
      targetErp: 'netsuite',
      description: 'Annual migration',
    };

    await createProject(client, input);

    expect(client.post).toHaveBeenCalledWith('/api/v1/projects', {
      name: 'SAP to NetSuite Migration',
      source_system: 'sap',
      target_system: 'netsuite',
      description: 'Annual migration',
    });
  });

  it('maps sourceErp to source_system and targetErp to target_system', async () => {
    client.post.mockResolvedValue({ data: VALID_PROJECT_DTO });

    const input: ProjectCreate = {
      name: 'Test',
      sourceErp: 'quickbooks',
      targetErp: 'xero',
    };

    await createProject(client, input);

    const payload = client.post.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).toHaveProperty('source_system', 'quickbooks');
    expect(payload).toHaveProperty('target_system', 'xero');
    expect(payload).not.toHaveProperty('sourceErp');
    expect(payload).not.toHaveProperty('targetErp');
  });

  it('includes optional companyId as company_id', async () => {
    client.post.mockResolvedValue({ data: VALID_PROJECT_DTO });

    const input: ProjectCreate = {
      name: 'Test',
      sourceErp: 'sap',
      targetErp: 'netsuite',
      companyId: 'comp-001',
    };

    await createProject(client, input);

    const payload = client.post.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).toHaveProperty('company_id', 'comp-001');
  });

  it('omits optional fields when not provided', async () => {
    client.post.mockResolvedValue({ data: VALID_PROJECT_DTO });

    const input: ProjectCreate = {
      name: 'Test',
      sourceErp: 'sap',
      targetErp: 'netsuite',
    };

    await createProject(client, input);

    const payload = client.post.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('company_id');
    expect(payload).not.toHaveProperty('description');
  });

  it('returns mapped project on success', async () => {
    client.post.mockResolvedValue({ data: VALID_PROJECT_DTO });

    const result = await createProject(client, {
      name: 'SAP to NetSuite Migration',
      sourceErp: 'sap',
      targetErp: 'netsuite',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.projectId).toBe(createProjectId('proj-001'));
    expect(result.data.name).toBe('SAP to NetSuite Migration');
  });

  it('returns Result.err on HTTP failure', async () => {
    client.post.mockRejectedValue(createAxiosError(422, 'Validation failed'));

    const result = await createProject(client, {
      name: 'Test',
      sourceErp: 'sap',
      targetErp: 'netsuite',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_422');
  });

  it('returns INVALID_RESPONSE on malformed response', async () => {
    client.post.mockResolvedValue({ data: { unexpected: true } });

    const result = await createProject(client, {
      name: 'Test',
      sourceErp: 'sap',
      targetErp: 'netsuite',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe(
      'Create project response failed validation',
    );
  });
});

// ─── updateProject ─────────────────────────────────────────────────────────

describe('updateProject', () => {
  let client: jest.Mocked<HttpClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls PATCH /api/v1/projects/{id} with mapped payload', async () => {
    const updated = { ...VALID_PROJECT_DTO, name: 'Updated Name' };
    client.patch.mockResolvedValue({ data: updated });

    const projectId = createProjectId('proj-001');
    const input: ProjectUpdate = {
      name: 'Updated Name',
      sourceErp: 'dynamics365',
    };

    await updateProject(client, projectId, input);

    expect(client.patch).toHaveBeenCalledWith('/api/v1/projects/proj-001', {
      name: 'Updated Name',
      source_system: 'dynamics365',
    });
  });

  it('maps sourceErp to source_system in patch payload', async () => {
    client.patch.mockResolvedValue({ data: VALID_PROJECT_DTO });

    await updateProject(client, createProjectId('proj-001'), {
      sourceErp: 'sage',
    });

    const payload = client.patch.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).toHaveProperty('source_system', 'sage');
    expect(payload).not.toHaveProperty('sourceErp');
  });

  it('maps targetErp to target_system in patch payload', async () => {
    client.patch.mockResolvedValue({ data: VALID_PROJECT_DTO });

    await updateProject(client, createProjectId('proj-001'), {
      targetErp: 'odoo',
    });

    const payload = client.patch.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).toHaveProperty('target_system', 'odoo');
    expect(payload).not.toHaveProperty('targetErp');
  });

  it('only sends fields that are provided', async () => {
    client.patch.mockResolvedValue({ data: VALID_PROJECT_DTO });

    await updateProject(client, createProjectId('proj-001'), {
      description: 'New description',
    });

    const payload = client.patch.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).toEqual({ description: 'New description' });
  });

  it('includes status in patch payload', async () => {
    client.patch.mockResolvedValue({
      data: { ...VALID_PROJECT_DTO, status: 'completed' },
    });

    await updateProject(client, createProjectId('proj-001'), {
      status: 'completed',
    });

    const payload = client.patch.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).toHaveProperty('status', 'completed');
  });

  it('returns mapped project on success', async () => {
    const updated = {
      ...VALID_PROJECT_DTO,
      name: 'Updated',
      updated_at: '2026-03-01T00:00:00Z',
    };
    client.patch.mockResolvedValue({ data: updated });

    const result = await updateProject(client, createProjectId('proj-001'), {
      name: 'Updated',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.name).toBe('Updated');
    expect(result.data.updatedAt).toEqual(new Date('2026-03-01T00:00:00Z'));
  });

  it('returns Result.err on HTTP failure', async () => {
    client.patch.mockRejectedValue(createAxiosError(403, 'Forbidden'));

    const result = await updateProject(client, createProjectId('proj-001'), {
      name: 'Updated',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_403');
  });

  it('returns INVALID_RESPONSE on malformed response', async () => {
    client.patch.mockResolvedValue({ data: null });

    const result = await updateProject(client, createProjectId('proj-001'), {
      name: 'Updated',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe(
      'Update project response failed validation',
    );
  });
});

// ─── deleteProject ─────────────────────────────────────────────────────────

describe('deleteProject', () => {
  let client: jest.Mocked<HttpClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls DELETE /api/v1/projects/{id}', async () => {
    client.delete.mockResolvedValue({ data: null });

    const projectId = createProjectId('proj-001');
    await deleteProject(client, projectId);

    expect(client.delete).toHaveBeenCalledWith('/api/v1/projects/proj-001');
  });

  it('returns ok(undefined) on success', async () => {
    client.delete.mockResolvedValue({ data: null });

    const result = await deleteProject(client, createProjectId('proj-001'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toBeUndefined();
  });

  it('returns Result.err on HTTP failure', async () => {
    client.delete.mockRejectedValue(createAxiosError(404, 'Project not found'));

    const result = await deleteProject(client, createProjectId('proj-001'));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_404');
    expect(result.error.message).toBe('Project not found');
  });

  it('returns Result.err on network error', async () => {
    const networkError = new AxiosError(
      'Network Error',
      AxiosError.ERR_NETWORK,
    );
    networkError.config = { url: '/api/v1/projects/proj-001', headers: new AxiosHeaders() };
    client.delete.mockRejectedValue(networkError);

    const result = await deleteProject(client, createProjectId('proj-001'));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('HTTP_0');
    expect(result.error.message).toBe('Network Error');
  });
});
