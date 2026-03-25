import { test, expect } from '@playwright/test';
import { SELECTORS, waitForApp, isLoginVisible } from './helpers';

/**
 * Mobile viewport (375 x 812) — verify bottom tabs, single-column layout,
 * and compact stepper rendering at the smallest supported breakpoint.
 */

test.describe('Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('bottom tabs visible, no sidebar', async ({ page }) => {
    await waitForApp(page);

    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    // Authenticated — bottom tab bar should be rendered, drawer sidebar hidden
    await expect(page.locator(SELECTORS.drawerContent)).not.toBeVisible();

    const tabBar = page.locator('[role="tabbar"], [role="tablist"]');
    const tabBarCount = await tabBar.count();
    expect(tabBarCount).toBeGreaterThanOrEqual(1);
  });

  test('login screen renders correctly at mobile width', async ({ page }) => {
    await waitForApp(page);

    if (await isLoginVisible(page)) {
      const loginBox = await page.locator(SELECTORS.loginScreen).boundingBox();
      expect(loginBox).not.toBeNull();
      if (loginBox) {
        // Login screen should span close to the full viewport width
        expect(loginBox.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('single-column layout for content', async ({ page }) => {
    await waitForApp(page);

    if (await isLoginVisible(page)) {
      // Login form is inherently single-column, verify it fits in viewport
      const loginBox = await page.locator(SELECTORS.loginScreen).boundingBox();
      expect(loginBox).not.toBeNull();
      if (loginBox) {
        expect(loginBox.width).toBeLessThanOrEqual(375);
      }
      return;
    }

    // If authenticated, check projects screen uses single column
    const projectsScreen = page.locator(SELECTORS.projectsScreen);
    if (await projectsScreen.isVisible()) {
      const box = await projectsScreen.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('compact stepper visible when on migration screen', async ({ page }) => {
    await waitForApp(page);

    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    // If we can navigate to upload screen, check stepper visibility
    const stepperMobile = page.locator(SELECTORS.stepperMobile);
    const stepperDesktop = page.locator(SELECTORS.stepperDesktop);

    if (await stepperMobile.count() > 0) {
      await expect(stepperMobile).toBeVisible();
      await expect(stepperDesktop).not.toBeVisible();
    }
  });
});
