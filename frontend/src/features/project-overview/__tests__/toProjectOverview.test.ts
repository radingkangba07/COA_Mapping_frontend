import { toProjectOverview } from '../mappers/toProjectOverview';
import type { ProjectOverviewDTO } from '../types/project-overview.types';

const BASE_DTO: ProjectOverviewDTO = {
  id: 'prj-1',
  name: 'SAP to Odoo',
  project_code: 'PRJ-001',
  status: 'in_progress',
  source_erp: 'SAP ECC',
  target_erp: 'Odoo 17',
  source_deployment: null,
  target_deployment: null,
  last_edited_at: '2026-06-30T10:42:00.000Z',
  groups: [
    {
      key: 'master-data',
      title: 'Master Data',
      workstreams: [
        { id: 'ws-1', code: 'MD-001', name: 'Chart of Accounts', status: 'in_progress', progress: 65, current_stage: 'Mapping', included: true },
        { id: 'ws-2', code: 'MD-002', name: 'Customers',          status: 'completed',   progress: 100, current_stage: 'Done',    included: true },
        { id: 'ws-3', code: 'MD-003', name: 'Contacts',           status: 'not_included', progress: 0, current_stage: 'Not Started', included: false },
      ],
    },
    {
      key: 'opening-balances',
      title: 'Opening Balances',
      workstreams: [
        { id: 'ob-1', code: 'OB-001', name: 'Trial Balance', status: 'completed', progress: 100, current_stage: 'Done', included: true },
      ],
    },
  ],
};

describe('toProjectOverview', () => {
  it('maps top-level project fields', () => {
    const result = toProjectOverview(BASE_DTO);
    expect(result.id).toBe('prj-1');
    expect(result.name).toBe('SAP to Odoo');
    expect(result.projectCode).toBe('PRJ-001');
    expect(result.status).toBe('in_progress');
    expect(result.sourceErp).toBe('SAP ECC');
    expect(result.targetErp).toBe('Odoo 17');
    expect(result.sourceDeployment).toBeNull();
    expect(result.lastEditedAt).toEqual(new Date('2026-06-30T10:42:00.000Z'));
  });

  it('counts totalWorkstreams across all groups (included only)', () => {
    const result = toProjectOverview(BASE_DTO);
    // ws-3 is not_included so totalWorkstreams counts only included: ws-1 + ws-2 + ob-1 = 3
    expect(result.totalWorkstreams).toBe(3);
  });

  it('maps workstream code to projectId field', () => {
    const result = toProjectOverview(BASE_DTO);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ws = result.groups[0]!.items[0]!;
    expect(ws.projectId).toBe('MD-001');
    expect(ws.name).toBe('Chart of Accounts');
  });

  it('clamps progress to 0-100', () => {
    const dto: ProjectOverviewDTO = {
      ...BASE_DTO,
      groups: [
        {
          key: 'g',
          title: 'G',
          workstreams: [
            { id: 'x', code: 'X-001', name: 'X', status: 'in_progress', progress: 150, current_stage: 'Mapping', included: true },
          ],
        },
      ],
    };
    const result = toProjectOverview(dto);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.groups[0]!.items[0]!.progress).toBe(100);
  });

  it('sets included=false for not_included workstreams', () => {
    const result = toProjectOverview(BASE_DTO);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const notIncluded = result.groups[0]!.items[2]!;
    expect(notIncluded.status).toBe('not_included');
    expect(notIncluded.included).toBe(false);
  });

  it('computes overallProgress from included completed workstreams', () => {
    // included: ws-1 (in_progress), ws-2 (completed), ob-1 (completed) — 3 included, 2 completed
    const result = toProjectOverview(BASE_DTO);
    expect(result.overallProgress).toBe(67); // Math.round(2/3 * 100)
  });

  it('falls back unknown status to not_started', () => {
    const dto: ProjectOverviewDTO = {
      ...BASE_DTO,
      groups: [
        {
          key: 'g',
          title: 'G',
          workstreams: [
            { id: 'x', code: 'X-001', name: 'X', status: 'unknown_status', progress: 0, current_stage: 'N/A', included: true },
          ],
        },
      ],
    };
    const result = toProjectOverview(dto);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.groups[0]!.items[0]!.status).toBe('not_started');
  });

  it('returns overallProgress=0 when no included workstreams', () => {
    const dto: ProjectOverviewDTO = {
      ...BASE_DTO,
      groups: [
        {
          key: 'g',
          title: 'G',
          workstreams: [
            { id: 'x', code: 'X-001', name: 'X', status: 'not_included', progress: 0, current_stage: 'N/A', included: false },
          ],
        },
      ],
    };
    const result = toProjectOverview(dto);
    expect(result.overallProgress).toBe(0);
  });
});
