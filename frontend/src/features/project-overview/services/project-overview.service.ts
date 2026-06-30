import type { HttpClient } from '@/shared/services/http/http.types';
import type { ProjectOverviewDTO } from '../types/project-overview.types';

// ─── Mock ─────────────────────────────────────────────────────────────────────
// Set to false once GET /api/v1/projects/{id}/overview is live.
const USE_MOCK = true;

const MOCK_OVERVIEW: ProjectOverviewDTO = {
  id: 'prj-mock',
  name: 'SAP to Odoo Migration — FY2026',
  project_code: 'PRJ-2026',
  status: 'in_progress',
  source_erp: 'SAP ECC',
  target_erp: 'Odoo 17',
  source_deployment: null,
  target_deployment: null,
  last_edited_at: new Date().toISOString(),
  groups: [
    {
      key: 'master-data',
      title: 'Master Data',
      workstreams: [
        { id: 'ws-1', code: 'MD-001', name: 'Chart of Accounts', status: 'in_progress',     progress: 65,  current_stage: 'Mapping',      included: true  },
        { id: 'ws-2', code: 'MD-002', name: 'Customers',          status: 'completed',       progress: 100, current_stage: 'Done',         included: true  },
        { id: 'ws-3', code: 'MD-003', name: 'Vendors',            status: 'review_required', progress: 80,  current_stage: 'Validation',   included: true  },
        { id: 'ws-4', code: 'MD-004', name: 'Items',              status: 'not_started',     progress: 0,   current_stage: 'Not Started',  included: true  },
        { id: 'ws-5', code: 'MD-005', name: 'Locations',          status: 'blocked',         progress: 30,  current_stage: 'Upload',       included: true  },
        { id: 'ws-6', code: 'MD-006', name: 'Contacts',           status: 'not_included',    progress: 0,   current_stage: 'Not Started',  included: false },
        { id: 'ws-7', code: 'MD-007', name: 'Vehicles',           status: 'not_included',    progress: 0,   current_stage: 'Not Started',  included: false },
        { id: 'ws-8', code: 'MD-008', name: 'Fixed Assets',       status: 'in_progress',     progress: 45,  current_stage: 'ERP Select',   included: true  },
        { id: 'ws-9', code: 'MD-009', name: 'Equipment',          status: 'not_included',    progress: 0,   current_stage: 'Not Started',  included: false },
      ],
    },
    {
      key: 'opening-balances',
      title: 'Opening Balances',
      workstreams: [
        { id: 'ob-1', code: 'OB-001', name: 'Trial Balance',       status: 'completed',       progress: 100, current_stage: 'Done',        included: true },
        { id: 'ob-2', code: 'OB-002', name: 'Retained Earnings',   status: 'in_progress',     progress: 55,  current_stage: 'Mapping',     included: true },
        { id: 'ob-3', code: 'OB-003', name: 'Accounts Receivable', status: 'review_required', progress: 75,  current_stage: 'Validation',  included: true },
        { id: 'ob-4', code: 'OB-004', name: 'Accounts Payable',    status: 'not_started',     progress: 0,   current_stage: 'Not Started', included: true },
        { id: 'ob-5', code: 'OB-005', name: 'Inventory',           status: 'not_started',     progress: 0,   current_stage: 'Not Started', included: true },
      ],
    },
  ],
};

// ─── Service ──────────────────────────────────────────────────────────────────

export async function getProjectOverview(
  client: HttpClient,
  projectId: string,
): Promise<ProjectOverviewDTO> {
  if (USE_MOCK) {
    return Promise.resolve({ ...MOCK_OVERVIEW, id: projectId });
  }
  const response = await client.get<ProjectOverviewDTO>(
    `/api/v1/projects/${projectId}/overview`,
  );
  return response.data;
}
