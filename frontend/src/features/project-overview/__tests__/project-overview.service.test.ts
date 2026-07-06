import { getProjectOverview } from '../services/project-overview.service';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { ProjectOverviewDTO } from '../types/project-overview.types';

const FIXTURE_DTO: ProjectOverviewDTO = {
  id: 'prj-1',
  name: 'SAP to Odoo Migration — FY2026',
  project_code: 'PRJ-2026',
  status: 'in_progress',
  source_erp: 'SAP ECC',
  target_erp: 'Odoo 17',
  source_deployment: null,
  target_deployment: null,
  last_edited_at: '2026-06-30T10:00:00.000Z',
  groups: [
    {
      key: 'master-data',
      title: 'Master Data',
      workstreams: [
        { id: 'ws-1', code: 'MD-001', name: 'Chart of Accounts', status: 'in_progress',  progress: 65,  current_stage: 'Mapping',    included: true  },
        { id: 'ws-2', code: 'MD-002', name: 'Customers',          status: 'completed',    progress: 100, current_stage: 'Done',       included: true  },
        { id: 'ws-3', code: 'MD-003', name: 'Contacts',           status: 'not_included', progress: 0,   current_stage: 'Not Started', included: false },
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

function makeClient(dto: ProjectOverviewDTO): HttpClient {
  return { get: jest.fn().mockResolvedValue({ data: dto }) } as unknown as HttpClient;
}

describe('getProjectOverview', () => {
  it('calls the correct endpoint', async () => {
    const client = makeClient(FIXTURE_DTO);
    await getProjectOverview(client, 'prj-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/projects/prj-1/overview');
  });

  it('returns the DTO from the response', async () => {
    const client = makeClient(FIXTURE_DTO);
    const result = await getProjectOverview(client, 'prj-1');
    expect(result).toEqual(FIXTURE_DTO);
  });

  it('passes the correct projectId in the URL', async () => {
    const client = makeClient(FIXTURE_DTO);
    await getProjectOverview(client, 'prj-abc-99');
    expect(client.get).toHaveBeenCalledWith('/api/v1/projects/prj-abc-99/overview');
  });
});
