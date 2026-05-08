import { createProjectId, createOrgId, createUserId, createCompanyId } from '@/shared/types/common.types';
import {
  toProject,
  toCreatePayload,
  toUpdatePayload,
} from '@/features/projects/services/projects.mapper';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const BASE_DTO = {
  id: 'proj-001',
  name: 'SAP Migration',
  source_system: 'sap',
  target_system: 'netsuite',
  status: 'draft' as const,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-16T12:00:00Z',
  current_step: 0,
};

// ─── toProject ────────────────────────────────────────────────────────────

describe('toProject', () => {
  it('maps required fields correctly', () => {
    const project = toProject(BASE_DTO);

    expect(project.projectId).toBe(createProjectId('proj-001'));
    expect(project.name).toBe('SAP Migration');
    expect(project.sourceErp).toBe('sap');
    expect(project.targetErp).toBe('netsuite');
    expect(project.status).toBe('draft');
    expect(project.currentStep).toBe(0);
    expect(project.createdAt).toEqual(new Date('2026-01-15T10:00:00Z'));
    expect(project.updatedAt).toEqual(new Date('2026-01-16T12:00:00Z'));
  });

  it('maps org_id to orgId', () => {
    const project = toProject({ ...BASE_DTO, org_id: 'org-abc' });

    expect(project.orgId).toBe(createOrgId('org-abc'));
  });

  it('maps company_id to companyId when present', () => {
    const project = toProject({ ...BASE_DTO, company_id: 'comp-xyz' });

    expect(project.companyId).toBe(createCompanyId('comp-xyz'));
  });

  it('maps effective_permission to effectivePermission', () => {
    const project = toProject({ ...BASE_DTO, effective_permission: 'editor' });

    expect(project.effectivePermission).toBe('editor');
  });

  it('maps created_by_name and updated_by_name', () => {
    const project = toProject({
      ...BASE_DTO,
      created_by: 'user-001',
      created_by_name: 'Alice',
      updated_by: 'user-002',
      updated_by_name: 'Bob',
    });

    expect(project.createdBy).toBe(createUserId('user-001'));
    expect(project.createdByName).toBe('Alice');
    expect(project.updatedBy).toBe(createUserId('user-002'));
    expect(project.updatedByName).toBe('Bob');
  });

  it('sets orgId to undefined when org_id is absent', () => {
    const project = toProject(BASE_DTO);

    expect(project.orgId).toBeUndefined();
  });

  it('sets effectivePermission to undefined when effective_permission is absent', () => {
    const project = toProject(BASE_DTO);

    expect(project.effectivePermission).toBeUndefined();
  });

  it('sets companyId to undefined when company_id is null', () => {
    const project = toProject({ ...BASE_DTO, company_id: null });

    expect(project.companyId).toBeUndefined();
  });

  it('sets description to undefined when null', () => {
    const project = toProject({ ...BASE_DTO, description: null });

    expect(project.description).toBeUndefined();
  });
});

// ─── toCreatePayload ──────────────────────────────────────────────────────

describe('toCreatePayload', () => {
  it('always includes name', () => {
    const payload = toCreatePayload({ name: 'My Project' });

    expect(payload).toEqual({ name: 'My Project' });
  });

  it('includes org_id when orgId is provided', () => {
    const payload = toCreatePayload({ name: 'X', orgId: 'org-abc' });

    expect(payload.org_id).toBe('org-abc');
  });

  it('includes company_id when companyId is provided', () => {
    const payload = toCreatePayload({ name: 'X', companyId: 'comp-xyz' });

    expect(payload.company_id).toBe('comp-xyz');
  });

  it('includes source_system and target_system when provided', () => {
    const payload = toCreatePayload({ name: 'X', sourceErp: 'sap', targetErp: 'netsuite' });

    expect(payload.source_system).toBe('sap');
    expect(payload.target_system).toBe('netsuite');
  });

  it('includes description when provided', () => {
    const payload = toCreatePayload({ name: 'X', description: 'Desc' });

    expect(payload.description).toBe('Desc');
  });

  it('omits optional fields when not provided', () => {
    const payload = toCreatePayload({ name: 'X' });

    expect(payload).not.toHaveProperty('org_id');
    expect(payload).not.toHaveProperty('company_id');
    expect(payload).not.toHaveProperty('source_system');
    expect(payload).not.toHaveProperty('target_system');
    expect(payload).not.toHaveProperty('description');
  });

  it('includes both org_id and company_id when both are provided', () => {
    const payload = toCreatePayload({ name: 'X', orgId: 'org-1', companyId: 'comp-1' });

    expect(payload.org_id).toBe('org-1');
    expect(payload.company_id).toBe('comp-1');
  });
});

// ─── toUpdatePayload ──────────────────────────────────────────────────────

describe('toUpdatePayload', () => {
  it('returns empty object when no fields provided', () => {
    expect(toUpdatePayload({})).toEqual({});
  });

  it('includes only provided fields', () => {
    const payload = toUpdatePayload({ name: 'Renamed', status: 'completed' });

    expect(payload).toEqual({ name: 'Renamed', status: 'completed' });
    expect(payload).not.toHaveProperty('source_system');
  });

  it('maps currentStep to current_step', () => {
    const payload = toUpdatePayload({ currentStep: 3 });

    expect(payload.current_step).toBe(3);
  });

  it('maps sourceErp to source_system and targetErp to target_system', () => {
    const payload = toUpdatePayload({ sourceErp: 'sap', targetErp: 'netsuite' });

    expect(payload.source_system).toBe('sap');
    expect(payload.target_system).toBe('netsuite');
  });
});
