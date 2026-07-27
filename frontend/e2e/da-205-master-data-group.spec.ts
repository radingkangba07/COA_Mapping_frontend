import { test, expect } from '@playwright/test';
import { openOverview, group } from './overview-fixtures';

/**
 * DA-205 — QA: Master Data workstream group (collapsible table)
 * https://linkederp.atlassian.net/browse/DA-205
 */

const MD = 'master_data';
const GROUP = group(MD);
const HEADER = `[data-testid="project-overview-workstream-sections-${MD}-header"]`;
const TABLE = `[data-testid="project-overview-workstream-sections-${MD}-table"]`;

// Full canonical Master Data catalog (augmentNotIncluded renders the rest as
// "not included" rows).
const MD_ITEMS = [
  'Chart of Accounts', 'Customers', 'Vendors', 'Items', 'Locations',
  'Contacts', 'Vehicles', 'Fixed Assets', 'Equipment',
];

test.describe('DA-205 Master Data group', () => {
  test.beforeEach(async ({ page }) => {
    await openOverview(page);
    await expect(page.locator(GROUP)).toBeVisible({ timeout: 15000 });
  });

  // TC-01 — Header shows title + "X of N selected" badge
  test('TC-01 header shows title and selected badge', async ({ page }) => {
    const g = page.locator(GROUP);
    await expect(g.getByText('Master Data')).toBeVisible();
    await expect(g.getByText(/\d+\s*of\s*\d+\s*selected/i)).toBeVisible();
  });

  // TC-02 — Table columns render
  test('TC-02 table shows the expected columns', async ({ page }) => {
    const t = page.locator(TABLE);
    await expect(t).toBeVisible();
    for (const col of ['Workstream', 'Project ID', 'Status', 'Progress', 'Current Stage', 'Action']) {
      await expect(t.getByText(col, { exact: true }).first()).toBeVisible();
    }
  });

  // TC-03 — Full canonical item list renders
  test('TC-03 all canonical Master Data items render', async ({ page }) => {
    const g = page.locator(GROUP);
    for (const name of MD_ITEMS) {
      await expect(g.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  // TC-04 — Included "Chart of Accounts" row exposes an Open action
  test('TC-04 Chart of Accounts row has an Open action', async ({ page }) => {
    const row = page.locator('[data-testid="project-overview-workstream-sections-master_data-row-md-1"]');
    await expect(row).toBeVisible();
    await expect(row.getByText('Open', { exact: true })).toBeVisible();
  });

  // TC-05 — Included rows show status badges + progress
  test('TC-05 included rows show status + progress', async ({ page }) => {
    const g = page.locator(GROUP);
    await expect(g.getByText('Completed').first()).toBeVisible();
    await expect(g.getByText('In Progress').first()).toBeVisible();
    await expect(g.getByText(/\d+%/).first()).toBeVisible();
  });

  // TC-06 — Not-included rows render as "Not Included"
  test('TC-06 not-included rows show "Not Included"', async ({ page }) => {
    await expect(page.locator(GROUP).getByText('Not Included').first()).toBeVisible();
  });

  // TC-07 — Collapse / expand via the header
  test('TC-07 header toggles the table collapsed/expanded', async ({ page }) => {
    await expect(page.locator(TABLE)).toBeVisible();
    await page.locator(HEADER).click();
    await expect(page.locator(TABLE)).toBeHidden();
    await page.locator(HEADER).click();
    await expect(page.locator(TABLE)).toBeVisible();
  });

  // TC-08 — Opening the Chart of Accounts row navigates away from the overview
  test('TC-08 clicking Open navigates to the workstream', async ({ page }) => {
    const openLink = page
      .locator('[data-testid="project-overview-workstream-sections-master_data-row-md-1"]')
      .getByText('Open', { exact: true });
    await openLink.click();
    // Navigation should leave the overview (top app bar no longer shown).
    await expect(page.locator('[data-testid="project-overview-topbar"]')).toBeHidden({ timeout: 10000 });
  });
});
