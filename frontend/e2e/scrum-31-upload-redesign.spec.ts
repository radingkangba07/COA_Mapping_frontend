import { test, expect } from '@playwright/test';
import { SELECTORS, waitForApp, isLoginVisible } from './helpers';

// ---------------------------------------------------------------------------
// Helper: navigate from projects screen to upload screen
// ---------------------------------------------------------------------------
async function navigateToUploadScreen(page: import('@playwright/test').Page): Promise<void> {
  // Click first project card → ERP select
  const cards = page.locator(SELECTORS.projectCard);
  await expect(cards.first()).toBeVisible({ timeout: 10000 });
  await cards.first().click();
  await expect(page.locator(SELECTORS.erpSelectScreen)).toBeVisible({ timeout: 10000 });

  // Select source ERP
  const sourceCombobox = page.locator(SELECTORS.sourceErpCombobox);
  await sourceCombobox.click();
  const sourceOption = page.locator('[data-testid="source-erp-combobox-option-sap"]');
  await expect(sourceOption).toBeVisible({ timeout: 5000 });
  await sourceOption.click();

  // Select target ERP
  const targetCombobox = page.locator(SELECTORS.targetErpCombobox);
  await targetCombobox.click();
  const targetOption = page.locator('[data-testid="target-erp-combobox-option-oracle_netsuite"]');
  await expect(targetOption).toBeVisible({ timeout: 5000 });
  await targetOption.click();

  // Click continue → upload screen
  const continueBtn = page.locator('[data-testid="continue-button"]');
  await expect(continueBtn).toBeEnabled({ timeout: 5000 });
  await continueBtn.click();
  await expect(page.locator(SELECTORS.uploadScreen)).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Upload screen layout (desktop)
// ---------------------------------------------------------------------------
test.describe('Upload screen layout (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('title, banner, sample table, sidebar, and breadcrumb visible', async ({ page }) => {
    await waitForApp(page);
    test.skip(await isLoginVisible(page), 'Requires authenticated session');
    await navigateToUploadScreen(page);

    await expect(page.locator(SELECTORS.uploadScreenTitle)).toBeVisible();
    await expect(page.locator(SELECTORS.uploadScreenTitle)).toHaveText('Upload COA Files');
    await expect(page.locator(SELECTORS.erpSummaryBanner)).toBeVisible();
    await expect(page.locator(SELECTORS.sampleFilesTable)).toBeVisible();
    await expect(page.locator(SELECTORS.projectInfoPanel)).toBeVisible();
    await expect(page.locator(SELECTORS.breadcrumbDashboard)).toBeVisible();
  });

  test('sample files table has 3 rows', async ({ page }) => {
    await waitForApp(page);
    test.skip(await isLoginVisible(page), 'Requires authenticated session');
    await navigateToUploadScreen(page);

    const rows = page.locator(SELECTORS.sampleFileRow);
    await expect(rows).toHaveCount(3);
  });

  test('load all button visible in sample files table', async ({ page }) => {
    await waitForApp(page);
    test.skip(await isLoginVisible(page), 'Requires authenticated session');
    await navigateToUploadScreen(page);

    await expect(page.locator(SELECTORS.loadAllBtn)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Upload screen layout (mobile)
// ---------------------------------------------------------------------------
test.describe('Upload screen layout (mobile)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('project info panel NOT visible at mobile width', async ({ page }) => {
    await waitForApp(page);
    test.skip(await isLoginVisible(page), 'Requires authenticated session');
    await navigateToUploadScreen(page);

    await expect(page.locator(SELECTORS.projectInfoPanel)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Breadcrumb navigation
// ---------------------------------------------------------------------------
test.describe('Breadcrumb navigation', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('clicking dashboard breadcrumb navigates to projects screen', async ({ page }) => {
    await waitForApp(page);
    test.skip(await isLoginVisible(page), 'Requires authenticated session');
    await navigateToUploadScreen(page);

    await page.locator(SELECTORS.breadcrumbDashboard).click();
    await expect(page.locator(SELECTORS.projectsScreen)).toBeVisible({ timeout: 10000 });
  });
});
