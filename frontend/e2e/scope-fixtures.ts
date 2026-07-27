import { expect, type Page, type Route } from '@playwright/test';
import { setAuthTokens } from './helpers';

/**
 * Shared fixtures + navigation for the Project Scope E2E specs
 * (DA-214, DA-215, DA-216).
 *
 * Reached by: seed auth → Projects list → "New Project" → Project Scope screen.
 * API is mocked at the HTTP layer, so the backend is not required. Vendor /
 * product options come from a bundled ERP constant, so the ERP selects are
 * populated regardless of the /erp-systems mock.
 */

export const MOCK_USER = {
  id: 'e5354f50-a917-42a2-8d84-75176e2f5867',
  user_id: 'nawaz@linkederp.com',
  name: 'Nawaz Shareef',
  email: 'nawaz@linkederp.com',
  is_verified: true,
  orgs: [{ id: '7562cd91-8a2f-4e81-b9f3-c31ed289c472', name: 'Linked ERP', role: 'owner' }],
};

export const ERP_SYSTEMS = [
  { id: 'xero', code: 'xero', vendor: 'Xero', vendor_id: 'xero', product_name: 'Xero' },
  { id: 'oracle_netsuite', code: 'oracle_netsuite', vendor: 'Oracle', vendor_id: 'oracle', product_name: 'NetSuite ERP' },
];

export const LIST_PROJECT = {
  id: '7112eb50-0030-4bf1-9117-89fcb4c1fc41', name: 'Testing QA',
  source_system: 'xero', target_system: 'oracle_netsuite', status: 'active',
  created_at: '2026-07-10T09:00:00Z', updated_at: '2026-07-15T12:49:07Z', current_step: 2,
};

export const SCREEN = '[data-testid="project-scope-screen"]';

export function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export async function setupScopeRoutes(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', (r) => json(r, MOCK_USER));
  await page.route('**/api/v1/users/me/orgs', (r) => json(r, MOCK_USER.orgs));
  await page.route('**/api/v1/erp-systems', (r) => json(r, ERP_SYSTEMS));
  await page.route('**/api/v1/projects?*', (r) => json(r, { projects: [LIST_PROJECT], total: 1 }));
  await page.route('**/api/v1/projects', (r) => {
    if (r.request().method() === 'GET') return json(r, { projects: [LIST_PROJECT], total: 1 });
    return json(r, {}, 200);
  });
}

/** Seed auth, open the Projects list, tap "New Project", land on the scope screen. */
export async function openScope(page: Page): Promise<void> {
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
  await expect(page.locator(SCREEN), 'ProjectScope screen did not open').toBeVisible({ timeout: 15000 });
}

/**
 * Drive the custom Select. The Select opens its modal via an async
 * measureInWindow callback, so a single trigger click sometimes fails to open
 * the dropdown. We poll for ANY option of this select to appear; if it doesn't,
 * we click the trigger again (safe — when the modal IS open the trigger is
 * behind the overlay and a click would just close it, which the loop detects).
 */
export async function selectOption(page: Page, selectTestId: string, optionValue: string): Promise<void> {
  const trigger = page.locator(`[data-testid="${selectTestId}-trigger"]`);
  const anyOption = page.locator(`[data-testid^="${selectTestId}-option-"]`);
  const option = page.locator(`[data-testid="${selectTestId}-option-${optionValue}"]`);

  await expect(trigger).toBeVisible({ timeout: 10000 });

  // The Select opens its menu via an async measureInWindow callback, which can
  // take a second or two. Give each open a generous wait so we don't re-click a
  // slowly-opening menu (which would close it). One corrective re-open only.
  const tryOpen = async (): Promise<boolean> => {
    await trigger.click();
    return anyOption
      .first()
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
  };
  if (!(await tryOpen())) {
    await tryOpen();
  }
  await option.waitFor({ state: 'visible', timeout: 8000 });
  await option.click();
  // The Modal unmounts asynchronously; wait for it to close so the next
  // select's trigger/option isn't intercepted by the closing overlay.
  await option.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
}

/** Pick vendor → product → connection method on a Source/Target ERP card. */
export async function configureErp(
  page: Page,
  role: 'source' | 'target',
  vendor: string,
  productId: string,
  method: 'mcp' | 'csv',
): Promise<void> {
  await selectOption(page, `erp-vendor-select-${role}`, vendor);
  await selectOption(page, `erp-product-select-${role}`, productId);
  await selectOption(page, `erp-method-select-${role}`, method);
}
