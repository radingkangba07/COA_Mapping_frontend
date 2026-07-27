import { test, expect, type Page, type Route } from '@playwright/test';
import { setAuthTokens } from './helpers';

/**
 * DA-208 — QA: Add Members section on the Project Scope page
 * https://linkederp.atlassian.net/browse/DA-208
 *
 * Reached from Projects list → "New Project" → Project Scope screen.
 * The Add Members section gates its Add button until a valid member email and a
 * role are provided.
 *
 * Testids: section-add-members (root), add-members-control-input (email),
 * add-members-control-role (role select), add-members-control-add (button),
 * add-members-table (list).
 */

const MOCK_USER = {
  id: 'e5354f50-a917-42a2-8d84-75176e2f5867',
  user_id: 'nawaz@linkederp.com',
  name: 'Nawaz Shareef',
  email: 'nawaz@linkederp.com',
  is_verified: true,
  orgs: [{ id: '7562cd91-8a2f-4e81-b9f3-c31ed289c472', name: 'Linked ERP', role: 'owner' }],
};

const ERP_SYSTEMS = [
  { id: 'xero', name: 'Xero', productName: 'Xero' },
  { id: 'oracle_netsuite', name: 'Oracle NetSuite', productName: 'NetSuite' },
];

const LIST_PROJECT = {
  id: '7112eb50-0030-4bf1-9117-89fcb4c1fc41', name: 'Testing QA',
  source_system: 'xero', target_system: 'oracle_netsuite', status: 'active',
  created_at: '2026-07-10T09:00:00Z', updated_at: '2026-07-15T12:49:07Z', current_step: 2,
};

const SECTION = '[data-testid="section-add-members"]';
const EMAIL = '[data-testid="add-members-control-input"]';
const ROLE = '[data-testid="add-members-control-role"]';
const ADD = '[data-testid="add-members-control-add"]';
const TABLE = '[data-testid="add-members-table"]';

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

async function openScope(page: Page): Promise<void> {
  await page.goto('/');
  await setAuthTokens(page);
  await setupScopeRoutes(page);
  await page.reload();
  await page.waitForLoadState('networkidle');

  const login = page.locator('[data-testid="login-screen"]');
  expect(await login.isVisible().catch(() => false), 'auth did not hold — login shown').toBeFalsy();

  const btn = page.locator('[data-testid="new-project-btn"]');
  await expect(btn.first(), 'new-project-btn not found').toBeVisible({ timeout: 15000 });
  await btn.first().click();
  await expect(page.locator('[data-testid="project-scope-screen"]'),
    'ProjectScope screen did not open').toBeVisible({ timeout: 15000 });
  await expect(page.locator(SECTION)).toBeVisible({ timeout: 15000 });
}

test.describe('DA-208 Add Members', () => {
  test.beforeEach(async ({ page }) => {
    await openScope(page);
  });

  // TC-01 — Section renders with its heading
  test('TC-01 section renders with heading', async ({ page }) => {
    await expect(page.locator(SECTION)).toBeVisible();
    await expect(page.locator(SECTION).getByText(/Add Members/i)).toBeVisible();
  });

  // TC-02 — Email input, role select and Add button render
  test('TC-02 shows email input, role select and Add button', async ({ page }) => {
    await expect(page.locator(EMAIL)).toBeVisible();
    await expect(page.locator(ROLE)).toBeVisible();
    await expect(page.locator(ADD)).toBeVisible();
  });

  // TC-03 — Gating: Add is disabled on an empty form
  test('TC-03 Add is disabled initially', async ({ page }) => {
    const add = page.locator(ADD);
    const aria = await add.getAttribute('aria-disabled');
    const disabled = await add.isDisabled().catch(() => false);
    expect(aria === 'true' || disabled).toBeTruthy();
  });

  // TC-04 — Gating: entering an email but no role keeps Add disabled
  test('TC-04 email without a role keeps Add disabled', async ({ page }) => {
    await page.locator(EMAIL).fill('teammate@acme.com');
    const add = page.locator(ADD);
    const aria = await add.getAttribute('aria-disabled');
    const disabled = await add.isDisabled().catch(() => false);
    expect(aria === 'true' || disabled).toBeTruthy();
  });

  // TC-05 — Members table renders (empty on a fresh draft)
  test('TC-05 members table renders', async ({ page }) => {
    await expect(page.locator(TABLE)).toBeVisible();
  });

  // TC-06 — Email field accepts input
  test('TC-06 email field accepts input', async ({ page }) => {
    const input = page.locator(`${EMAIL} input, ${EMAIL}`).first();
    await page.locator(EMAIL).fill('member@acme.com');
    // Value round-trips (RN-Web TextInput renders an <input>).
    const val = await page.locator(EMAIL).inputValue().catch(async () => {
      return (await input.inputValue().catch(() => '')) || '';
    });
    expect(val).toContain('member@acme.com');
  });
});

// TC-07 — Responsive: section renders without clipping on a narrow viewport
test.describe('DA-208 responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('TC-07 section renders without horizontal clipping', async ({ page }) => {
    await openScope(page);
    const box = await page.locator(SECTION).boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(375 + 2);
  });
});
