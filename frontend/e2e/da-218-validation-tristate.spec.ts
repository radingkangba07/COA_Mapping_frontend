import { test, expect, type Page, type Route } from '@playwright/test';
import { setAuthTokens } from './helpers';

/**
 * DA-218 — QA: Individual child checkbox selection updates the parent group
 * checkbox state (tri-state) — driven end-to-end on the Validation screen.
 *
 * The Validation screen lives at the end of the migration wizard with no URL
 * deep-link. Shortcut: hydrate a project at the Validation step (current_step:3)
 * so hydration marks steps 0–2 complete, which makes the "Account Mapping"
 * stepper step (→ Validation screen) clickable — bypassing the file/mapping
 * gates. Grouped rows come from a mocked mapping-suggestions response.
 *
 * The group checkbox exposes its tri-state via aria-checked:
 *   none selected → "false"; some → "mixed"; all → "true".
 *
 * NOTE: this is a heavy full-wizard E2E; the reliable coverage of the same AC
 * is the Jest test (da-218-child-parent-tristate.qa.test.ts).
 */

test.describe.configure({ retries: 2 });

const PROJECT_ID = '7112eb50-0030-4bf1-9117-89fcb4c1fc41';

const MOCK_USER = {
  id: 'e5354f50-a917-42a2-8d84-75176e2f5867',
  user_id: 'nawaz@linkederp.com',
  name: 'Nawaz Shareef',
  email: 'nawaz@linkederp.com',
  is_verified: true,
  orgs: [{ id: '7562cd91-8a2f-4e81-b9f3-c31ed289c472', name: 'Linked ERP', role: 'owner' }],
};

// Project hydrated at the Validation step (current_step 3).
const PROJECT = {
  id: PROJECT_ID,
  name: 'Testing QA',
  source_system: 'xero',
  target_system: 'oracle_netsuite',
  // Must be an "active migration" status so it appears in the Migration list.
  status: 'in_progress',
  created_at: '2026-07-10T09:00:00Z',
  updated_at: '2026-07-15T12:49:07Z',
  // Step 4 (Preview & Export) → hydration completes steps 0–3, so the
  // "Account Mapping" stepper step (store step 3 → Validation screen) is
  // completed and therefore clickable.
  current_step: 4,
};

const ERP_SYSTEMS = [
  { id: 'xero', code: 'xero', vendor: 'Xero', vendor_id: 'xero', product_name: 'Xero', name: 'Xero' },
  { id: 'oracle_netsuite', code: 'oracle_netsuite', vendor: 'Oracle', vendor_id: 'oracle', product_name: 'NetSuite ERP', name: 'Oracle NetSuite' },
];

// One group with three child accounts → 3 row checkboxes + 1 group checkbox.
const SUGGESTIONS = {
  groups: [
    {
      sourceType: 'Asset',
      targetType: 'Assets',
      confidence: 95,
      accounts: [
        { suggestionId: 's1', sourceNumber: '1000', sourceName: 'Cash', targetName: 'Cash and Bank', score: 92, remark: 'Auto' },
        { suggestionId: 's2', sourceNumber: '1100', sourceName: 'AR', targetName: 'Accounts Receivable', score: 88, remark: 'Auto' },
        { suggestionId: 's3', sourceNumber: '1200', sourceName: 'Inventory', targetName: 'Stock', score: 85, remark: 'Auto' },
      ],
    },
  ],
  total: 3,
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function setupRoutes(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', (r) => json(r, MOCK_USER));
  await page.route('**/api/v1/users/me/orgs', (r) => json(r, MOCK_USER.orgs));
  await page.route('**/api/v1/erp-systems', (r) => json(r, ERP_SYSTEMS));
  // Projects list (also feeds the active-migrations list)
  await page.route('**/api/v1/projects?*', (r) => json(r, { projects: [PROJECT], total: 1 }));
  await page.route('**/api/v1/projects', (r) => json(r, { projects: [PROJECT], total: 1 }));
  // Hydration
  await page.route(`**/api/v1/projects/${PROJECT_ID}`, (r) => json(r, PROJECT));
  await page.route(`**/api/v1/files/project/${PROJECT_ID}`, (r) => json(r, { files: [] }));
  await page.route('**/api/v1/files/*/data', (r) => json(r, { columns: [], rows: [] }));
  await page.route(`**/api/v1/jobs/project/${PROJECT_ID}`, (r) => json(r, []));
  // Type mappings (may be requested during hydration/validation)
  await page.route('**/account-type-mappings', (r) => json(r, []));
  // Grouped mapping suggestions → the Validation rows
  await page.route('**/suggestions*', (r) => json(r, SUGGESTIONS));
}

/** Authenticate → Migration tab → open the project → jump to Validation. */
async function openValidation(page: Page): Promise<void> {
  await page.goto('/');
  await setAuthTokens(page);
  await setupRoutes(page);
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Go to the Migration tab via the app drawer.
  const migNav = page.locator('[data-testid="drawer-nav-migration"]');
  await expect(migNav.first(), 'Migration drawer nav not found').toBeVisible({ timeout: 15000 });
  await migNav.first().click();

  // Open the project's migration → lands on ERPSelect and hydrates it.
  const card = page.locator(`[data-testid="migration-card-${PROJECT_ID}"]`);
  await expect(card.first(), 'migration card not found').toBeVisible({ timeout: 15000 });
  await card.first().click();

  // The stepper's "Account Mapping" step maps to the Validation screen and is
  // clickable because hydration completed steps 0–2.
  const stepper = page.locator('[data-testid="stepper-desktop"]');
  await expect(stepper, 'wizard stepper not visible').toBeVisible({ timeout: 15000 });
  await stepper.getByText('Account Mapping', { exact: false }).first().click();

  await expect(page.locator('[data-testid="validation-screen"]'), 'Validation screen did not open').toBeVisible({ timeout: 15000 });
}

const GROUP_CHECKBOX = '[data-testid$="-group-checkbox"]';
const ROW_CHECKBOX = '[data-testid*="-row-"][data-testid$="-checkbox"]';

test.describe('DA-218 Validation group checkbox tri-state (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await openValidation(page);
    await expect(page.locator(GROUP_CHECKBOX).first()).toBeVisible({ timeout: 15000 });
  });

  test('child checkboxes drive the parent group checkbox tri-state', async ({ page }) => {
    const group = page.locator(GROUP_CHECKBOX).first();
    const rows = page.locator(ROW_CHECKBOX);
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Baseline — nothing selected → parent UNCHECKED
    await expect(group).toHaveAttribute('aria-checked', 'false');

    // Check each child; parent is INDETERMINATE until the last one → CHECKED
    for (let i = 0; i < count; i++) {
      await rows.nth(i).click();
      if (i < count - 1) {
        await expect(group).toHaveAttribute('aria-checked', 'mixed');
      }
    }
    await expect(group).toHaveAttribute('aria-checked', 'true');

    // Uncheck one → back to INDETERMINATE
    await rows.nth(0).click();
    await expect(group).toHaveAttribute('aria-checked', 'mixed');

    // Uncheck the rest → UNCHECKED
    for (let i = 1; i < count; i++) {
      await rows.nth(i).click();
    }
    await expect(group).toHaveAttribute('aria-checked', 'false');
  });
});
