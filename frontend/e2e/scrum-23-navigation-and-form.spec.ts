import { test, expect } from '@playwright/test';
import { SELECTORS, waitForApp, isLoginVisible } from './helpers';

// ---------------------------------------------------------------------------
// SCRUM-23: Project card → ERPSelect navigation + simplified Create Project form
// ---------------------------------------------------------------------------

test.describe('Project card navigation', () => {
  test('clicking a project card navigates to ERPSelect screen', async ({ page }) => {
    await waitForApp(page);
    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    const cards = page.locator(SELECTORS.projectCard);
    const cardCount = await cards.count();
    test.skip(cardCount === 0, 'No project cards available');

    await cards.first().click();

    // ERPSelect screen should be visible after navigation
    await expect(page.locator(SELECTORS.erpSelectScreen)).toBeVisible({ timeout: 10000 });

    // Migration stepper should be visible
    await expect(page.locator(SELECTORS.migrationStepper)).toBeVisible();

    // Source and target ERP comboboxes should be visible
    await expect(page.locator(SELECTORS.sourceErpCombobox)).toBeVisible();
    await expect(page.locator(SELECTORS.targetErpCombobox)).toBeVisible();
  });

  test('no infinite re-render errors after navigation', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await waitForApp(page);
    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    const cards = page.locator(SELECTORS.projectCard);
    const cardCount = await cards.count();
    test.skip(cardCount === 0, 'No project cards available');

    await cards.first().click();

    // Wait for potential re-render loop to manifest
    await page.waitForTimeout(2000);

    const reRenderErrors = pageErrors.filter((msg) =>
      msg.includes('Maximum update depth'),
    );
    expect(reRenderErrors).toHaveLength(0);
  });
});

test.describe('Create Project form', () => {
  test('dialog shows correct fields and hides ERP fields', async ({ page }) => {
    await waitForApp(page);
    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    const createBtn = page.locator(SELECTORS.createProjectBtn);
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Expected fields should be visible
    await expect(page.locator(SELECTORS.newProjectCompanyId)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(SELECTORS.newProjectCompanyName)).toBeVisible();
    await expect(page.locator(SELECTORS.newProjectNameInput)).toBeVisible();
    await expect(page.locator(SELECTORS.newProjectDescription)).toBeVisible();

    // ERP fields should NOT be visible
    await expect(page.locator(SELECTORS.newProjectSourceErp)).not.toBeVisible();
    await expect(page.locator(SELECTORS.newProjectTargetErp)).not.toBeVisible();
  });

  test('form fields are in correct order', async ({ page }) => {
    await waitForApp(page);
    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    const createBtn = page.locator(SELECTORS.createProjectBtn);
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Wait for dialog fields to render
    await expect(page.locator(SELECTORS.newProjectCompanyId)).toBeVisible({ timeout: 5000 });

    const companyIdBox = await page.locator(SELECTORS.newProjectCompanyId).boundingBox();
    const companyNameBox = await page.locator(SELECTORS.newProjectCompanyName).boundingBox();
    const projectNameBox = await page.locator(SELECTORS.newProjectNameInput).boundingBox();

    expect(companyIdBox).not.toBeNull();
    expect(companyNameBox).not.toBeNull();
    expect(projectNameBox).not.toBeNull();

    if (companyIdBox && companyNameBox && projectNameBox) {
      // Company ID should be above Company Name
      expect(companyIdBox.y).toBeLessThan(companyNameBox.y);
      // Company Name should be above Project Name
      expect(companyNameBox.y).toBeLessThan(projectNameBox.y);
    }
  });
});
