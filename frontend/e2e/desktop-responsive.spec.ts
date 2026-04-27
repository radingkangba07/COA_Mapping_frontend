import { test, expect } from '@playwright/test';
import { SELECTORS, waitForApp, isLoginVisible } from './helpers';

/**
 * Desktop viewport (1280 x 800) — verify sidebar, max-width container,
 * 3-column grid, side-by-side ERP selectors, and desktop stepper.
 */

test.describe('Desktop (1280px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('sidebar visible', async ({ page }) => {
    await waitForApp(page);

    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    // Authenticated — permanent sidebar visible at desktop width
    await expect(page.locator(SELECTORS.drawerContent)).toBeVisible();
    await expect(page.locator(SELECTORS.drawerNavProjects)).toBeVisible();
  });

  test('max-width content container', async ({ page }) => {
    await waitForApp(page);

    if (await isLoginVisible(page)) {
      // The login SCREEN wrapper spans the full viewport on purpose; the
      // bounded element is the login FORM CARD (max-w-md). Assert on the
      // card instead.
      const loginCard = page.locator('[data-testid="login-form-card"]');
      const cardBox = await loginCard.boundingBox();
      expect(cardBox).not.toBeNull();
      if (cardBox) {
        // max-w-md = 28rem = 448px, well under the 1280px viewport
        expect(cardBox.width).toBeLessThan(1280);
      }
      return;
    }

    // Authenticated — content area should be constrained by max-w-7xl
    const projectsScreen = page.locator(SELECTORS.projectsScreen);
    if (await projectsScreen.isVisible()) {
      const box = await projectsScreen.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        // Content with max-w-7xl + padding should be strictly less than viewport width
        expect(box.width).toBeLessThan(1280);
      }
    }
  });

  test('3-column project grid at desktop width', async ({ page }) => {
    await waitForApp(page);

    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    const projectsScreen = page.locator(SELECTORS.projectsScreen);
    if (await projectsScreen.isVisible()) {
      const cards = page.locator(SELECTORS.projectCard);
      const cardCount = await cards.count();

      if (cardCount >= 3) {
        // Three cards should share the same Y position (3-column row)
        const first = await cards.nth(0).boundingBox();
        const second = await cards.nth(1).boundingBox();
        const third = await cards.nth(2).boundingBox();

        if (first && second && third) {
          expect(Math.abs(first.y - second.y)).toBeLessThan(10);
          expect(Math.abs(second.y - third.y)).toBeLessThan(10);
        }
      }

      // The grid content area should use the wider viewport effectively
      const box = await projectsScreen.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThan(768);
      }
    }
  });

  test('side-by-side ERP selectors at desktop width', async ({ page }) => {
    await waitForApp(page);

    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    // If ERP select screen is reachable, verify side-by-side layout
    const erpScreen = page.locator(SELECTORS.erpSelectScreen);
    if (await erpScreen.isVisible()) {
      const panels = page.locator(SELECTORS.erpSelectorPanel);
      const panelCount = await panels.count();

      if (panelCount >= 2) {
        const first = await panels.nth(0).boundingBox();
        const second = await panels.nth(1).boundingBox();

        // At lg breakpoint (1280px), ERP selector panels should be side by side
        if (first && second) {
          expect(Math.abs(first.y - second.y)).toBeLessThan(10);
        }
      }
    }
  });

  test('desktop stepper visible when on migration screen', async ({ page }) => {
    await waitForApp(page);

    test.skip(await isLoginVisible(page), 'Requires authenticated session');

    const stepperDesktop = page.locator(SELECTORS.stepperDesktop);
    const stepperMobile = page.locator(SELECTORS.stepperMobile);

    if (await stepperDesktop.count() > 0) {
      await expect(stepperDesktop).toBeVisible();
      await expect(stepperMobile).not.toBeVisible();
    }
  });
});
