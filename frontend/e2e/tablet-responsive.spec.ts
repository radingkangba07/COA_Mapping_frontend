import { test, expect } from '@playwright/test';
import { SELECTORS, waitForApp, isLoginVisible } from './helpers';

/**
 * Tablet viewport (768 x 1024) — verify permanent sidebar, 2-column grid,
 * and side-by-side file upload layout at the medium breakpoint.
 */

test.describe('Tablet (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('permanent sidebar visible, no bottom tabs', async ({ page }) => {
    await waitForApp(page);

    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    // Authenticated — at 768px the app should render the permanent drawer sidebar
    await expect(page.locator(SELECTORS.drawerContent)).toBeVisible();

    // Drawer nav items should be visible
    await expect(page.locator(SELECTORS.drawerNavProjects)).toBeVisible();
    await expect(page.locator(SELECTORS.drawerNavMigration)).toBeVisible();
    await expect(page.locator(SELECTORS.drawerNavSettings)).toBeVisible();
  });

  test('login screen renders correctly at tablet width', async ({ page }) => {
    await waitForApp(page);

    if (await isLoginVisible(page)) {
      const loginBox = await page.locator(SELECTORS.loginScreen).boundingBox();
      expect(loginBox).not.toBeNull();
      if (loginBox) {
        expect(loginBox.width).toBeLessThanOrEqual(768);
      }
    }
  });

  test('2-column project grid', async ({ page }) => {
    await waitForApp(page);

    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    const projectsScreen = page.locator(SELECTORS.projectsScreen);
    if (await projectsScreen.isVisible()) {
      const cards = page.locator(SELECTORS.projectCard);
      const cardCount = await cards.count();

      if (cardCount >= 2) {
        // Two cards should share the same Y position (side by side)
        const first = await cards.nth(0).boundingBox();
        const second = await cards.nth(1).boundingBox();

        if (first && second) {
          expect(Math.abs(first.y - second.y)).toBeLessThan(10);
        }
      }

      // Content should also use available width (minus sidebar)
      const box = await projectsScreen.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThan(375);
      }
    }
  });

  test('side-by-side file upload at tablet width', async ({ page }) => {
    await waitForApp(page);

    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    // Navigate to upload screen if possible
    const uploadScreen = page.locator(SELECTORS.uploadScreen);
    if (await uploadScreen.isVisible()) {
      const uploaders = page.locator(SELECTORS.fileUploader);
      const count = await uploaders.count();

      if (count >= 2) {
        const first = await uploaders.nth(0).boundingBox();
        const second = await uploaders.nth(1).boundingBox();

        // At md breakpoint (768px), uploaders should be side by side (same Y position)
        if (first && second) {
          expect(Math.abs(first.y - second.y)).toBeLessThan(10);
        }
      }
    }
  });
});
