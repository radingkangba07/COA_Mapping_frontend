import { expect, type Page, type Route } from '@playwright/test';
import { setAuthTokens } from './helpers';

/**
 * Shared fixtures + navigation for the Project Overview E2E specs
 * (DA-204, DA-205, DA-206, DA-207).
 *
 * The overview screen has no URL linking (React Navigation), so it is reached
 * by: seed auth → Projects list → tap project-card-<id> → Project Overview.
 * All API is mocked at the HTTP layer, so the backend is not required.
 */

export const QA_ID = '7112eb50-0030-4bf1-9117-89fcb4c1fc41';
export const ORG_ID = '7562cd91-8a2f-4e81-b9f3-c31ed289c472';

export const MOCK_USER = {
  id: 'e5354f50-a917-42a2-8d84-75176e2f5867',
  user_id: 'nawaz@linkederp.com',
  name: 'Nawaz Shareef',
  email: 'nawaz@linkederp.com',
  is_verified: true,
  orgs: [{ id: ORG_ID, name: 'Linked ERP', role: 'owner' }],
};

// Project detail DTO (projectResponseSchema) — real "Testing QA" project.
export const QA_DETAIL = {
  id: QA_ID,
  name: 'Testing QA',
  source_system: 'xero',
  target_system: 'oracle_netsuite',
  source_connection_method: 'csv_file',
  target_connection_method: 'csv_file',
  status: 'active',
  org_id: ORG_ID,
  description: null,
  created_by: MOCK_USER.id,
  created_at: '2026-07-10T09:00:00Z',
  updated_at: '2026-07-15T12:49:07.196191Z',
  current_step: 2,
};

// Overview DTO (ProjectOverviewDTO) with a spread of workstream statuses so the
// stat cards and workstream tables have meaningful data. Names match the
// canonical Master Data / Opening Balances catalog so augmentNotIncluded pads
// only the remaining items as "not included".
export const QA_OVERVIEW = {
  id: QA_ID,
  name: 'Testing QA',
  project_code: 'TQA',
  status: 'active',
  source_erp: 'xero',
  target_erp: 'oracle_netsuite',
  source_deployment: null,
  target_deployment: null,
  last_edited_at: '2026-07-15T12:49:07.196191Z',
  groups: [
    {
      key: 'master_data',
      title: 'Master Data',
      workstreams: [
        { id: 'md-1', code: 'MD-1', name: 'Chart of Accounts', status: 'completed', progress: 100, current_stage: 'Done', included: true },
        { id: 'md-2', code: 'MD-2', name: 'Customers', status: 'in_progress', progress: 40, current_stage: 'Mapping', included: true },
        { id: 'md-3', code: 'MD-3', name: 'Vendors', status: 'review_required', progress: 60, current_stage: 'Review', included: true },
        { id: 'md-4', code: 'MD-4', name: 'Items', status: 'blocked', progress: 0, current_stage: 'Blocked', included: true },
        { id: 'md-5', code: 'MD-5', name: 'Locations', status: 'not_started', progress: 0, current_stage: 'Not Started', included: true },
      ],
    },
    {
      key: 'opening_balances',
      title: 'Opening Balances',
      workstreams: [
        { id: 'ob-1', code: 'OB-1', name: 'Trial Balance Movement', status: 'in_progress', progress: 50, current_stage: 'Mapping', included: true },
      ],
    },
  ],
};

// Derived expected stat-card counts (included workstreams only).
export const EXPECTED = {
  total: 6,
  completed: 1,
  inProgress: 2,
  reviewRequired: 1,
  blocked: 1,
  notStarted: 1,
  progressPercent: Math.round((1 / 6) * 100), // 17
};

export const TOPBAR = '[data-testid="project-overview-topbar"]';
export const MAIN = '[data-testid="project-overview-main"]';
export const PANEL = '[data-testid="project-overview-summary-panel"]';
export const STAT_CARDS = '[data-testid="project-overview-stat-cards"]';
export const SECTIONS = '[data-testid="project-overview-workstream-sections"]';
export const group = (key: string) => `[data-testid="project-overview-workstream-sections-${key}"]`;

export function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export async function setupOverviewRoutes(
  page: Page,
  detail: Record<string, unknown> = QA_DETAIL,
  overview: Record<string, unknown> = QA_OVERVIEW,
): Promise<void> {
  await page.route('**/api/v1/auth/me', (r) => json(r, MOCK_USER));
  await page.route('**/api/v1/users/me/orgs', (r) => json(r, MOCK_USER.orgs));
  await page.route('**/api/v1/projects?*', (r) => json(r, { projects: [detail], total: 1 }));
  await page.route('**/api/v1/projects', (r) => json(r, { projects: [detail], total: 1 }));
  await page.route(`**/api/v1/projects/${detail.id}/overview`, (r) => json(r, overview));
  await page.route(`**/api/v1/projects/${detail.id}`, (r) => json(r, detail));
}

/** Seed auth, open the Projects list, tap the project card, land on the overview. */
export async function openOverview(page: Page): Promise<void> {
  await page.goto('/');
  await setAuthTokens(page);
  await setupOverviewRoutes(page);
  await page.reload();
  await page.waitForLoadState('networkidle');

  const projects = page.locator('[data-testid="projects-screen"]');
  const login = page.locator('[data-testid="login-screen"]');
  await expect(projects.or(login).first()).toBeVisible({ timeout: 15000 });
  expect(await login.isVisible().catch(() => false), 'auth did not hold — login screen shown').toBeFalsy();

  const card = page.locator(`[data-testid="project-card-${QA_ID}"]`);
  await expect(card.first(), 'project card not found on Projects screen').toBeVisible({ timeout: 15000 });
  await card.first().click();

  await expect(page.locator(TOPBAR), 'Project Overview did not open').toBeVisible({ timeout: 15000 });
}
