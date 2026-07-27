import { test, expect } from '@playwright/test';
import { openScope, json, SCREEN } from './scope-fixtures';

/**
 * DA-201 — UI Differences (remaining)
 * https://linkederp.atlassian.net/browse/DA-201
 *
 * Verifies the four points left open after the DA-189 QA pass on Jul 14:
 *   1. Section-1 heading wording (+ description ending)
 *   2. "Need more ERP options?" link next to the ERP search input
 *   3. Compatibility banner empty-state copy
 *   4. App chrome — compact sidebar with an "Overview" nav item, no top text bar
 *
 * Unlike the older DA-2xx specs, this one mocks /auth/refresh so it behaves the
 * same whether or not a real backend is running (see DA-210/214/218 notes).
 */

test.describe('DA-201 remaining UI differences', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/refresh', (r) =>
      json(r, { access_token: 'test-access', refresh_token: 'test-refresh' }));
    await openScope(page);
    await expect(page.locator(SCREEN)).toBeVisible();
  });

  // TC-01 — Section 1 heading wording
  test('TC-01 section 1 heading reads "Select Source and Target ERP Systems"', async ({ page }) => {
    const section = page.locator('[data-testid="section-select-erp"]');
    await expect(section).toBeVisible();
    await expect(section.getByText('1. Select Source and Target ERP Systems')).toBeVisible();
  });

  // TC-02 — Section 1 description ends with "for your migration."
  test('TC-02 section 1 description ends with "for your migration."', async ({ page }) => {
    const section = page.locator('[data-testid="section-select-erp"]');
    const text = (await section.textContent()) ?? '';
    expect(text).toMatch(/for your migration\./);
  });

  // TC-03 — "Need more ERP options?" link present next to the search input
  test('TC-03 "Need more ERP options?" link renders beside the ERP search input', async ({ page }) => {
    const section = page.locator('[data-testid="section-select-erp"]');
    await expect(section.getByText('Need more ERP options?')).toBeVisible();
    await expect(section.getByPlaceholder('Search ERP systems...')).toBeVisible();
  });

  // TC-04 — Compatibility banner empty state (no source/target chosen)
  test('TC-04 compatibility banner shows the empty-state prompt before selection', async ({ page }) => {
    const banner = page.locator('[data-testid="project-scope-compatibility"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/Select source and target ERP to check compatibility\./);
  });

  // TC-05 — Compatibility banner must NOT claim compatibility before selection
  test('TC-05 banner does not claim compatibility before any selection', async ({ page }) => {
    const banner = page.locator('[data-testid="project-scope-compatibility"]');
    await expect(banner).not.toContainText(/are compatible for migration\./);
  });

  // TC-06 — App chrome: compact sidebar exposes an "Overview" nav item
  test('TC-06 sidebar exposes an Overview nav item', async ({ page }) => {
    await expect(page.locator('[data-testid="drawer-nav-overview"]')).toBeVisible();
  });

  // TC-07 — App chrome: legacy Projects/Migration/Settings rail is gone
  test('TC-07 legacy Projects/Migration/Settings nav items are gone', async ({ page }) => {
    await expect(page.locator('[data-testid="drawer-nav-projects"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="drawer-nav-migration"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="drawer-nav-settings"]')).toHaveCount(0);
  });

  // TC-08 — App chrome: no "DataPortation" top text bar
  test('TC-08 no DataPortation top text bar is rendered', async ({ page }) => {
    await expect(page.getByText('DataPortation', { exact: true })).toHaveCount(0);
  });
});
