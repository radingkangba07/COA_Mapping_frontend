import { expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared selectors used across all responsive viewport tests.
// ---------------------------------------------------------------------------

export const SELECTORS = {
  loginScreen: '[data-testid="login-screen"]',
  projectsScreen: '[data-testid="projects-screen"]',
  drawerContent: '[data-testid="app-drawer-content"]',
  drawerNavProjects: '[data-testid="drawer-nav-projects"]',
  drawerNavMigration: '[data-testid="drawer-nav-migration"]',
  drawerNavSettings: '[data-testid="drawer-nav-settings"]',
  stepperDesktop: '[data-testid="stepper-desktop"]',
  stepperMobile: '[data-testid="stepper-mobile"]',
  erpSelectScreen: '[data-testid="erp-select-screen"]',
  erpSelectorPanel: '[data-testid="erp-selector-panel"]',
  uploadScreen: '[data-testid="upload-screen"]',
  fileUploader: '[data-testid="upload-file-uploader"]',
  projectCard: '[data-testid="project-card"]',
} as const;

/**
 * Navigate to the app root and wait until either the login screen
 * or the authenticated projects screen is visible.
 */
export async function waitForApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(
    page.locator(`${SELECTORS.loginScreen}, ${SELECTORS.projectsScreen}`).first(),
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Returns true when the login screen is visible, meaning the user
 * is not authenticated and auth-gated tests should be skipped.
 */
export async function isLoginVisible(page: Page): Promise<boolean> {
  return page.locator(SELECTORS.loginScreen).isVisible();
}
