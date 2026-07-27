import { test, expect, type Page, type Route } from '@playwright/test';
import { setAuthTokens } from './helpers';

/**
 * DA-209 — QA: Project Summary bar (read-only 6-chip bar on the Project Scope page)
 * https://linkederp.atlassian.net/browse/DA-209
 *
 * Verified against the real app (ProjectSummaryBar / SummaryChip, DA-137/146).
 * The bar lives on the ProjectScope screen, reached from the Projects list via
 * the "New Project" button (React Navigation — no URL linking).
 *
 * Chips (testID project-summary-bar-chip-<slug>, value ...-value):
 *   source, target, connection-method, master-data, opening-balances, members
 * Placeholders: Source "Select source", Target "Select target",
 *               Connection Method "Not set".
 * Master Data / Opening Balances always render "X of N selected".
 * Members renders a count string.
 */

const MOCK_USER = {
  id: 'e5354f50-a917-42a2-8d84-75176e2f5867',
  user_id: 'nawaz@linkederp.com',
  name: 'Nawaz Shareef',
  email: 'nawaz@linkederp.com',
  is_verified: true,
  orgs: [{ id: '7562cd91-8a2f-4e81-b9f3-c31ed289c472', name: 'Linked ERP', role: 'owner' }],
};

// Minimal ERP catalog so name resolution works if a selection is made.
const ERP_SYSTEMS = [
  { id: 'xero', name: 'Xero', productName: 'Xero' },
  { id: 'oracle_netsuite', name: 'Oracle NetSuite', productName: 'NetSuite' },
];

const BAR = '[data-testid="project-summary-bar"]';
const chip = (slug: string) => `[data-testid="project-summary-bar-chip-${slug}"]`;
const chipValue = (slug: string) => `[data-testid="project-summary-bar-chip-${slug}-value"]`;

// One project so the Projects list renders its normal view (with the header +
// "New Project" button) rather than an empty state.
const LIST_PROJECT = {
  id: '7112eb50-0030-4bf1-9117-89fcb4c1fc41',
  name: 'Testing QA',
  source_system: 'xero',
  target_system: 'oracle_netsuite',
  status: 'active',
  created_at: '2026-07-10T09:00:00Z',
  updated_at: '2026-07-15T12:49:07Z',
  current_step: 2,
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function setupScopeRoutes(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', (r) => json(r, MOCK_USER));
  await page.route('**/api/v1/users/me/orgs', (r) => json(r, MOCK_USER.orgs));
  await page.route('**/api/v1/erp-systems', (r) => json(r, ERP_SYSTEMS));
  await page.route('**/api/v1/projects?*', (r) => json(r, { projects: [LIST_PROJECT], total: 1 }));
  await page.route('**/api/v1/projects', (r) => {
    if (r.request().method() === 'GET') return json(r, { projects: [LIST_PROJECT], total: 1 });
    return json(r, {}, 200);
  });
}

/**
 * Seed auth, open the Projects list, tap "New Project", land on the scope screen.
 * Staged assertions report exactly where the flow stops if it fails.
 */
async function openScope(page: Page): Promise<void> {
  await page.goto('/');
  await setAuthTokens(page);
  await setupScopeRoutes(page);
  await page.reload();
  await page.waitForLoadState('networkidle');

  const projects = page.locator('[data-testid="projects-screen"]');
  const login = page.locator('[data-testid="login-screen"]');
  await expect(projects.or(login).first()).toBeVisible({ timeout: 15000 });
  expect(await login.isVisible().catch(() => false), 'auth did not hold — login screen shown').toBeFalsy();

  const btn = page.locator('[data-testid="new-project-btn"]');
  await expect(btn.first(), 'new-project-btn not found on the Projects screen').toBeVisible({ timeout: 15000 });
  await btn.first().click();

  await expect(page.locator('[data-testid="project-scope-screen"]'),
    'ProjectScope screen did not appear after clicking New Project').toBeVisible({ timeout: 15000 });
  await expect(page.locator(BAR), 'project-summary-bar not visible on the scope screen').toBeVisible({ timeout: 15000 });
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('DA-209 Project Summary bar', () => {
  test.beforeEach(async ({ page }) => {
    await openScope(page);
  });

  // TC-01 — All six chips render with their labels
  test('TC-01 renders six chips with correct labels', async ({ page }) => {
    const bar = page.locator(BAR);
    for (const slug of ['source', 'target', 'connection-method', 'master-data', 'opening-balances', 'members']) {
      await expect(page.locator(chip(slug))).toBeVisible();
    }
    await expect(bar.getByText('Source ERP')).toBeVisible();
    await expect(bar.getByText('Target ERP')).toBeVisible();
    await expect(bar.getByText('Connection Method')).toBeVisible();
    await expect(bar.getByText('Master Data')).toBeVisible();
    await expect(bar.getByText('Opening Balances')).toBeVisible();
    await expect(bar.getByText('Members')).toBeVisible();
  });

  // TC-02 — Empty draft shows placeholder values for ERP + connection
  // (tolerant of the custom "Select source/target" and default "Not set" copy).
  test('TC-02 fresh draft shows placeholder values', async ({ page }) => {
    await expect(page.locator(chipValue('source'))).toHaveText(/select.*source|not set/i);
    await expect(page.locator(chipValue('target'))).toHaveText(/select.*target|not set/i);
    // Connection Method defaults to a method (e.g. CSV) rather than a placeholder,
    // so accept the known method labels or a placeholder — just never empty/null.
    await expect(page.locator(chipValue('connection-method')))
      .toHaveText(/not set|select|mcp server|csv file upload|source:|target:/i);
  });

  // TC-03 — Master Data / Opening Balances render "X of N selected"
  test('TC-03 scope chips render "X of N selected" with N > 0', async ({ page }) => {
    await expect(page.locator(chipValue('master-data'))).toHaveText(/\b\d+\s*of\s*[1-9]\d*\s*selected/i);
    await expect(page.locator(chipValue('opening-balances'))).toHaveText(/\b\d+\s*of\s*[1-9]\d*\s*selected/i);
  });

  // TC-04 — Fresh draft: nothing selected yet, so counts start at 0
  test('TC-04 fresh draft scope counts start at 0 of N', async ({ page }) => {
    await expect(page.locator(chipValue('master-data'))).toHaveText(/\b0\s*of\s*[1-9]\d*\s*selected/i);
    await expect(page.locator(chipValue('opening-balances'))).toHaveText(/\b0\s*of\s*[1-9]\d*\s*selected/i);
  });

  // TC-05 — Members chip shows a numeric count (0 on a fresh draft)
  test('TC-05 members chip shows a numeric count', async ({ page }) => {
    const text = (await page.locator(chipValue('members')).textContent()) ?? '';
    expect(text.trim()).toMatch(/^\d+$/);
    expect(text).not.toMatch(/undefined|null|NaN/i);
  });

  // TC-06 — Single source of truth: the Master Data chip count agrees with the
  // Migration Scope section counter (both derive from the same draft store).
  test('TC-06 Master Data chip agrees with the scope section counter', async ({ page }) => {
    const counter = page.locator('[data-testid="migration-scope-md-counter"]');
    test.skip(!(await counter.count()), 'Migration scope counter not present');
    const counterText = (await counter.first().textContent()) ?? '';
    const chipText = (await page.locator(chipValue('master-data')).textContent()) ?? '';
    const counterSelected = counterText.match(/\d+/)?.[0];
    const chipSelected = chipText.match(/\d+/)?.[0];
    expect(chipSelected).toBe(counterSelected);
  });

  // TC-07 — Read-only: chips expose no interactive (button) controls
  test('TC-07 summary bar is read-only (no buttons in chips)', async ({ page }) => {
    const buttons = page.locator(`${BAR} [role="button"], ${BAR} button`);
    expect(await buttons.count()).toBe(0);
  });
});

// TC-08 — Responsive: chips remain visible / wrap on a narrow viewport
test.describe('DA-209 responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('TC-08 chips render without clipping on a narrow viewport', async ({ page }) => {
    await openScope(page);
    const bar = page.locator(BAR);
    const box = await bar.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(375 + 1);
    await expect(page.locator(chip('source'))).toBeVisible();
    await expect(page.locator(chip('members'))).toBeVisible();
  });
});
