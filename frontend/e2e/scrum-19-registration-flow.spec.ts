import { test, expect } from '@playwright/test';
import { SELECTORS, waitForApp, isLoginVisible } from './helpers';

// ---------------------------------------------------------------------------
// SCRUM-19: Registration screen + email verification flow
// ---------------------------------------------------------------------------

test.describe('LoginScreen — demo chips removed', () => {
  test('no demo account chips visible', async ({ page }) => {
    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');

    await expect(page.getByText('admin', { exact: true })).not.toBeVisible();
    await expect(page.getByText('john.doe', { exact: true })).not.toBeVisible();
    await expect(page.getByText('jane.smith', { exact: true })).not.toBeVisible();
  });

  test('register link is visible', async ({ page }) => {
    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');

    await expect(page.locator(SELECTORS.loginRegisterLink)).toBeVisible();
  });
});

test.describe('Navigation Login → Register', () => {
  test('clicking register link navigates to register screen', async ({ page }) => {
    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');

    await page.locator(SELECTORS.loginRegisterLink).click();

    await expect(page.locator(SELECTORS.registerScreen)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(SELECTORS.registerNameInput)).toBeVisible();
    await expect(page.locator(SELECTORS.registerEmailInput)).toBeVisible();
    await expect(page.locator(SELECTORS.registerOrgInput)).toBeVisible();
  });
});

test.describe('RegisterScreen — form validation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');
    await page.locator(SELECTORS.loginRegisterLink).click();
    await expect(page.locator(SELECTORS.registerScreen)).toBeVisible({ timeout: 10000 });
  });

  test('shows inline errors on empty submit', async ({ page }) => {
    await page.locator(SELECTORS.registerSubmitBtn).click();

    // Three validation errors should appear (name, email, org)
    const errors = page.locator('[role="alert"]');
    await expect(errors.first()).toBeVisible({ timeout: 5000 });
    await expect(errors).toHaveCount(3);
  });

  test('login link on RegisterScreen navigates back to LoginScreen', async ({ page }) => {
    await page.locator(SELECTORS.registerLoginLink).click();
    await expect(page.locator(SELECTORS.loginScreen)).toBeVisible({ timeout: 10000 });
  });

  test('shows email format error for invalid email', async ({ page }) => {
    const emailInput = page.locator(SELECTORS.registerEmailInput);
    await emailInput.locator('input').fill('not-an-email');
    await page.locator(SELECTORS.registerSubmitBtn).click();

    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('RegisterScreen — successful registration → CheckEmail', () => {
  test('navigates to CheckEmailScreen with email displayed', async ({ page }) => {
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ user_id: 'test-uuid', message: 'Verification email sent' }),
      }),
    );

    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');
    await page.locator(SELECTORS.loginRegisterLink).click();
    await expect(page.locator(SELECTORS.registerScreen)).toBeVisible({ timeout: 10000 });

    // Fill form with valid data
    await page.locator(SELECTORS.registerNameInput).locator('input').fill('Jane Doe');
    await page.locator(SELECTORS.registerEmailInput).locator('input').fill('jane@acme.com');
    await page.locator(SELECTORS.registerOrgInput).locator('input').fill('Acme Corp');
    await page.locator(SELECTORS.registerSubmitBtn).click();

    // Should navigate to CheckEmailScreen
    await expect(page.locator(SELECTORS.checkEmailScreen)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('jane@acme.com')).toBeVisible();
  });
});

test.describe('RegisterScreen — duplicate email error', () => {
  test('shows inline error under email field on 409', async ({ page }) => {
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email already registered' }),
      }),
    );

    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');
    await page.locator(SELECTORS.loginRegisterLink).click();
    await expect(page.locator(SELECTORS.registerScreen)).toBeVisible({ timeout: 10000 });

    await page.locator(SELECTORS.registerNameInput).locator('input').fill('Jane Doe');
    await page.locator(SELECTORS.registerEmailInput).locator('input').fill('jane@acme.com');
    await page.locator(SELECTORS.registerOrgInput).locator('input').fill('Acme Corp');
    await page.locator(SELECTORS.registerSubmitBtn).click();

    // Inline error should appear under email field
    await expect(page.getByText(/email already registered/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('CheckEmailScreen — resend verification', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept register to succeed
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ user_id: 'test-uuid', message: 'Verification email sent' }),
      }),
    );

    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');

    // Navigate to CheckEmailScreen via registration
    await page.locator(SELECTORS.loginRegisterLink).click();
    await expect(page.locator(SELECTORS.registerScreen)).toBeVisible({ timeout: 10000 });
    await page.locator(SELECTORS.registerNameInput).locator('input').fill('Jane Doe');
    await page.locator(SELECTORS.registerEmailInput).locator('input').fill('jane@acme.com');
    await page.locator(SELECTORS.registerOrgInput).locator('input').fill('Acme Corp');
    await page.locator(SELECTORS.registerSubmitBtn).click();
    await expect(page.locator(SELECTORS.checkEmailScreen)).toBeVisible({ timeout: 10000 });
  });

  test('resend button triggers API call and shows countdown', async ({ page }) => {
    await page.route('**/api/v1/auth/resend-verification', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Verification email resent' }),
      }),
    );

    const resendBtn = page.locator(SELECTORS.resendVerificationBtn);
    await expect(resendBtn).toBeVisible();
    await resendBtn.click();

    // Success toast should appear
    await expect(page.getByText(/verification email resent/i).or(page.getByText(/resent/i))).toBeVisible({ timeout: 5000 });

    // Button text should show countdown after successful resend
    await expect(resendBtn).toContainText(/resend in \d+s/i, { timeout: 5000 });
  });

  test('back to login navigates to LoginScreen', async ({ page }) => {
    await page.locator(SELECTORS.backToLoginLink).click();
    await expect(page.locator(SELECTORS.loginScreen)).toBeVisible({ timeout: 10000 });
  });
});
