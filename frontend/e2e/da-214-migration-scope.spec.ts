import { test, expect } from '@playwright/test';
import { openScope } from './scope-fixtures';

/**
 * DA-214 — QA: Migration scope UI (Master Data + Opening Balances)
 * https://linkederp.atlassian.net/browse/DA-214  (AC: DA-174)
 *
 * Master Data table (per-row Data Conversion / MDM checkboxes) with an
 * "X of 9 selected" counter, and an Opening Balances checklist with an
 * "X of 5 selected" counter. Counters recompute on toggle; a row counts once
 * even if both its checkboxes are checked. The Project Summary bar mirrors the
 * Master Data count.
 */

const SECTION = '[data-testid="migration-scope"]';
const MD_COUNTER = '[data-testid="migration-scope-md-counter"]';
const OB_COUNTER = '[data-testid="migration-scope-ob-counter"]';
const md = (row: string, col: 'dataConversion' | 'mdm') =>
  `[data-testid="migration-scope-master-data-${row}-${col}"]`;
const ob = (id: string) => `[data-testid="migration-scope-opening-balances-${id}"]`;
const summaryMd = '[data-testid="project-summary-bar-chip-master-data-value"]';

const OB_IDS = ['historical-balance-sheet-start', 'trial-balance-movement', 'open-ar', 'open-ap', 'stock-on-hand'];

function firstInt(t: string): number {
  return Number((t.match(/\d+/) ?? ['NaN'])[0]);
}

test.describe('DA-214 Migration scope', () => {
  test.beforeEach(async ({ page }) => {
    await openScope(page);
    await expect(page.locator(SECTION)).toBeVisible({ timeout: 15000 });
  });

  // TC-01 — Section + both counters render with their totals
  test('TC-01 renders Master Data (of 9) and Opening Balances (of 5) counters', async ({ page }) => {
    await expect(page.locator(MD_COUNTER)).toHaveText(/\d+\s*of\s*9\s*selected/i);
    await expect(page.locator(OB_COUNTER)).toHaveText(/\d+\s*of\s*5\s*selected/i);
  });

  // TC-02 — Fresh draft starts at 0 selected
  test('TC-02 fresh draft counters start at 0', async ({ page }) => {
    await expect(page.locator(MD_COUNTER)).toHaveText(/\b0\s*of\s*9/i);
    await expect(page.locator(OB_COUNTER)).toHaveText(/\b0\s*of\s*5/i);
  });

  // TC-03 — Table exposes the Data Conversion + Master Data Management columns
  test('TC-03 shows Data Conversion and Master Data Management columns', async ({ page }) => {
    const sec = page.locator(SECTION);
    await expect(sec.getByText('Data Conversion').first()).toBeVisible();
    await expect(sec.getByText('Master Data Management').first()).toBeVisible();
  });

  // TC-04 — Chart of Accounts (Data Conversion) toggles the Master Data counter.
  // Note (current build): CoA → Data Conversion is the only interactive scope
  // checkbox; every other Master Data box, all MDM boxes, and all Opening
  // Balances items are disabled (full multi-select not yet wired).
  test('TC-04 Chart of Accounts toggle updates the counter', async ({ page }) => {
    const coa = page.locator(md('chart-of-accounts', 'dataConversion'));
    await coa.click();
    await expect(page.locator(MD_COUNTER)).toHaveText(/\b1\s*of\s*9/i);
    await coa.click();
    await expect(page.locator(MD_COUNTER)).toHaveText(/\b0\s*of\s*9/i);
  });

  // TC-05 — The Project Summary bar mirrors the Master Data count
  test('TC-05 summary bar mirrors the Master Data count', async ({ page }) => {
    await page.locator(md('chart-of-accounts', 'dataConversion')).click();
    await expect(page.locator(MD_COUNTER)).toHaveText(/\b1\s*of\s*9/i);
    const summary = firstInt((await page.locator(summaryMd).textContent()) ?? '');
    const counter = firstInt((await page.locator(MD_COUNTER).textContent()) ?? '');
    expect(summary).toBe(counter);
  });

  // TC-06 — [current build] non-CoA Master Data and Opening Balances are disabled
  test('TC-06 [current build] non-CoA + Opening Balances checkboxes are disabled', async ({ page }) => {
    await expect(page.locator(md('customers', 'dataConversion'))).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator(md('chart-of-accounts', 'mdm'))).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator(ob(OB_IDS[0]!))).toHaveAttribute('aria-disabled', 'true');
  });
});

// TC-07 — Responsive: section renders without clipping on a narrow viewport
test.describe('DA-214 responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('TC-07 section renders without horizontal clipping', async ({ page }) => {
    await openScope(page);
    const box = await page.locator(SECTION).boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(375 + 2);
  });
});
