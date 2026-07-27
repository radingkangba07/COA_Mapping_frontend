import { test, expect } from '@playwright/test';
import { openOverview, group } from './overview-fixtures';

/**
 * DA-204 — QA: Opening Balances workstream group
 * https://linkederp.atlassian.net/browse/DA-204
 */

const OB = 'opening_balances';
const MD = 'master_data';
const OB_GROUP = group(OB);
const MD_GROUP = group(MD);
const OB_HEADER = `[data-testid="project-overview-workstream-sections-${OB}-header"]`;
const MD_HEADER = `[data-testid="project-overview-workstream-sections-${MD}-header"]`;
const OB_TABLE = `[data-testid="project-overview-workstream-sections-${OB}-table"]`;
const MD_TABLE = `[data-testid="project-overview-workstream-sections-${MD}-table"]`;

const OB_ITEMS = [
  'Historical Balance Sheet Start', 'Trial Balance Movement',
  'Open Accounts Receivable', 'Open Accounts Payables', 'Stock On Hand',
];

test.describe('DA-204 Opening Balances group', () => {
  test.beforeEach(async ({ page }) => {
    await openOverview(page);
    await expect(page.locator(OB_GROUP)).toBeVisible({ timeout: 15000 });
  });

  // TC-01 — Opening Balances renders below Master Data
  test('TC-01 renders below the Master Data group', async ({ page }) => {
    const mdBox = await page.locator(MD_GROUP).first().boundingBox();
    const obBox = await page.locator(OB_GROUP).first().boundingBox();
    expect(mdBox).not.toBeNull();
    expect(obBox).not.toBeNull();
    if (mdBox && obBox) expect(obBox.y).toBeGreaterThan(mdBox.y);
  });

  // TC-02 — Header shows its own "X of N selected" badge
  test('TC-02 shows an Opening Balances selected badge', async ({ page }) => {
    const g = page.locator(OB_GROUP).first();
    await expect(g.getByText('Opening Balances').first()).toBeVisible();
    await expect(g.getByText(/\d+\s*of\s*\d+\s*selected/i).first()).toBeVisible();
  });

  // TC-03 — Table columns match the Master Data table
  test('TC-03 table shows the expected columns', async ({ page }) => {
    const t = page.locator(OB_TABLE).first();
    await expect(t).toBeVisible();
    for (const col of ['Workstream', 'Project ID', 'Status', 'Progress', 'Current Stage', 'Action']) {
      await expect(t.getByText(col, { exact: true }).first()).toBeVisible();
    }
  });

  // TC-04 — Opening Balances items render
  test('TC-04 canonical Opening Balances items render', async ({ page }) => {
    const g = page.locator(OB_GROUP);
    for (const name of OB_ITEMS) {
      await expect(g.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  // TC-05 — Collapsing Opening Balances leaves Master Data expanded
  test('TC-05 collapse is independent of Master Data', async ({ page }) => {
    await expect(page.locator(OB_TABLE).first()).toBeVisible();
    await expect(page.locator(MD_TABLE).first()).toBeVisible();

    await page.locator(OB_HEADER).first().click();
    await expect(page.locator(OB_TABLE).first()).toBeHidden();
    await expect(page.locator(MD_TABLE).first()).toBeVisible(); // MD unaffected

    await page.locator(OB_HEADER).first().click();
    await expect(page.locator(OB_TABLE).first()).toBeVisible();
  });

  // TC-06 — Collapsing Master Data leaves Opening Balances expanded
  test('TC-06 Master Data collapse does not affect Opening Balances', async ({ page }) => {
    await page.locator(MD_HEADER).first().click();
    await expect(page.locator(MD_TABLE).first()).toBeHidden();
    await expect(page.locator(OB_TABLE).first()).toBeVisible();
  });

  // TC-07 — Badge count reflects only Opening Balances items (not Master Data)
  test('TC-07 badge reflects Opening Balances count only', async ({ page }) => {
    const badge = (await page.locator(OB_GROUP).first().getByText(/\d+\s*of\s*\d+\s*selected/i).first().textContent()) ?? '';
    const total = Number(badge.match(/of\s*(\d+)/i)?.[1]);
    // Opening Balances canonical catalog has 5 items.
    expect(total).toBe(OB_ITEMS.length);
  });
});
