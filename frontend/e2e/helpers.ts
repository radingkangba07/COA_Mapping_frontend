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
  createProjectBtn: '[data-testid="create-project-btn"]',
  newProjectCompanyId: '[data-testid="new-project-company-id"]',
  newProjectCompanyName: '[data-testid="new-project-company-name"]',
  newProjectNameInput: '[data-testid="new-project-name-input"]',
  newProjectDescription: '[data-testid="new-project-description"]',
  newProjectSourceErp: '[data-testid="new-project-source-erp"]',
  newProjectTargetErp: '[data-testid="new-project-target-erp"]',
  migrationStepper: '[data-testid="migration-stepper"]',
  sourceErpCombobox: '[data-testid="source-erp-combobox"]',
  targetErpCombobox: '[data-testid="target-erp-combobox"]',
  uploadScreenTitle: '[data-testid="upload-screen-title"]',
  erpSummaryBanner: '[data-testid="upload-erp-summary"]',
  sampleFilesTable: '[data-testid="sample-files-table"]',
  projectInfoPanel: '[data-testid="project-info-panel"]',
  breadcrumbDashboard: '[data-testid="breadcrumb-dashboard"]',
  loadAllBtn: '[data-testid="sample-load-all"]',
  sampleFileRow: '[data-testid^="sample-file-row-"]',
  loginRegisterLink: '[data-testid="login-register-link"]',
  registerScreen: '[data-testid="register-screen"]',
  registerNameInput: '[data-testid="register-name-input"]',
  registerEmailInput: '[data-testid="register-email-input"]',
  registerOrgInput: '[data-testid="register-org-input"]',
  registerSubmitBtn: '[data-testid="register-submit-btn"]',
  registerLoginLink: '[data-testid="register-login-link"]',
  checkEmailScreen: '[data-testid="check-email-screen"]',
  resendVerificationBtn: '[data-testid="resend-verification-btn"]',
  backToLoginLink: '[data-testid="back-to-login-link"]',
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
