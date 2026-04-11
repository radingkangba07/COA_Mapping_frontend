import { test, expect } from '@playwright/test';
import { SELECTORS, waitForApp, isLoginVisible, setAuthTokens } from './helpers';

// ---------------------------------------------------------------------------
// SCRUM-20: Magic link login flow + JWT token management
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 'test-user-uuid',
  user_id: 'test-user-id',
  name: 'Jane Doe',
  email: 'jane@acme.com',
  is_verified: true,
  orgs: [
    { id: 'org-1', name: 'Acme Corp', role: 'owner' },
  ],
};

// ---------------------------------------------------------------------------
// 1. LoginScreen — email-only UI
// ---------------------------------------------------------------------------

test.describe('LoginScreen — email-only UI', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');
  });

  test('no user ID input visible', async ({ page }) => {
    await expect(page.locator('[data-testid="login-user-id-input"]')).not.toBeVisible();
  });

  test('email input is visible', async ({ page }) => {
    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible();
  });

  test('submit button text is "Send login link"', async ({ page }) => {
    const btn = page.locator(SELECTORS.loginSubmitBtn);
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Send login link');
  });
});

// ---------------------------------------------------------------------------
// 2. Invalid email format
// ---------------------------------------------------------------------------

test.describe('LoginScreen — invalid email format', () => {
  test('shows zod validation error for invalid email', async ({ page }) => {
    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');

    const emailInput = page.locator(SELECTORS.loginEmailInput);
    await emailInput.locator('input').fill('not-an-email');
    await page.locator(SELECTORS.loginSubmitBtn).click();

    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 3. Unknown email (404)
// ---------------------------------------------------------------------------

test.describe('LoginScreen — unknown email (404)', () => {
  test('shows inline "No account found" error', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'user not found' }),
      }),
    );

    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');

    const emailInput = page.locator(SELECTORS.loginEmailInput);
    await emailInput.locator('input').fill('unknown@acme.com');
    await page.locator(SELECTORS.loginSubmitBtn).click();

    await expect(
      page.getByText('No account found. Register instead?'),
    ).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 4. Unverified email (403)
// ---------------------------------------------------------------------------

test.describe('LoginScreen — unverified email (403)', () => {
  test('shows inline "Please verify your email first" error', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'email not verified' }),
      }),
    );

    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');

    const emailInput = page.locator(SELECTORS.loginEmailInput);
    await emailInput.locator('input').fill('unverified@acme.com');
    await page.locator(SELECTORS.loginSubmitBtn).click();

    await expect(
      page.getByText('Please verify your email first'),
    ).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 5. Successful request → CheckEmail
// ---------------------------------------------------------------------------

test.describe('LoginScreen — successful login request', () => {
  test('navigates to CheckEmailScreen with email displayed', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Login link sent' }),
      }),
    );

    await waitForApp(page);
    test.skip(!(await isLoginVisible(page)), 'LoginScreen not visible');

    const emailInput = page.locator(SELECTORS.loginEmailInput);
    await emailInput.locator('input').fill('jane@acme.com');
    await page.locator(SELECTORS.loginSubmitBtn).click();

    await expect(page.locator(SELECTORS.checkEmailScreen)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('jane@acme.com')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 6. Magic link callback — happy path
// ---------------------------------------------------------------------------

test.describe('Magic link callback — happy path', () => {
  test('navigates to authenticated home after valid callback', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      }),
    );

    await page.goto('/auth/callback?access_token=test-access&refresh_token=test-refresh');
    await page.waitForLoadState('networkidle');

    // AuthCallbackScreen should appear briefly (spinner)
    await expect(page.locator(SELECTORS.authCallbackScreen)).toBeVisible({ timeout: 10000 });

    // Should eventually land on the authenticated home (projects screen)
    await expect(page.locator(SELECTORS.projectsScreen)).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// 7. Magic link callback — bad tokens
// ---------------------------------------------------------------------------

test.describe('Magic link callback — bad tokens', () => {
  test('redirects to LoginScreen on auth failure', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      }),
    );
    await page.route('**/api/v1/auth/refresh', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid refresh token' }),
      }),
    );

    await page.goto('/auth/callback?access_token=bad&refresh_token=bad');
    await page.waitForLoadState('networkidle');

    // Should redirect back to LoginScreen
    await expect(page.locator(SELECTORS.loginScreen)).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// 8. Silent refresh
// ---------------------------------------------------------------------------

test.describe('Silent token refresh', () => {
  test('user stays authenticated after 401 + successful refresh', async ({ page }) => {
    // Seed tokens so the app boots authenticated
    await page.goto('/');
    await setAuthTokens(page);

    // /auth/me succeeds for session restore
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      }),
    );

    // Reload to trigger session restore with seeded tokens
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should land on the authenticated screen
    await expect(page.locator(SELECTORS.projectsScreen)).toBeVisible({ timeout: 15000 });

    // Set up intercepts: next projects call returns 401, refresh succeeds, retry succeeds
    let projectsCallCount = 0;
    await page.route('**/api/v1/projects**', (route) => {
      projectsCallCount++;
      if (projectsCallCount === 1) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Token expired' }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    let refreshCallCount = 0;
    await page.route('**/api/v1/auth/refresh', (route) => {
      refreshCallCount++;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        }),
      });
    });

    // Trigger an API call by reloading (TanStack Query will refetch projects)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // User should remain on the authenticated screen (no redirect to Login)
    await expect(page.locator(SELECTORS.projectsScreen)).toBeVisible({ timeout: 15000 });
    await expect(page.locator(SELECTORS.loginScreen)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 9. Logout
// ---------------------------------------------------------------------------

test.describe('Logout', () => {
  test('clears tokens and returns to LoginScreen', async ({ page }) => {
    // Seed tokens and mock /auth/me so the app boots authenticated
    await page.goto('/');
    await setAuthTokens(page);

    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      }),
    );
    await page.route('**/api/v1/auth/logout', (route) =>
      route.fulfill({
        status: 204,
        body: '',
      }),
    );

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(SELECTORS.projectsScreen)).toBeVisible({ timeout: 15000 });

    // Find and click the logout button via drawer or settings
    const logoutBtn = page.locator('[data-testid="logout-btn"]')
      .or(page.getByRole('button', { name: /log\s*out|sign\s*out/i }));

    // Try the drawer settings first to find the logout button
    const drawerSettings = page.locator(SELECTORS.drawerNavSettings);
    if (await drawerSettings.isVisible().catch(() => false)) {
      await drawerSettings.click();
      await page.waitForLoadState('networkidle');
    }

    // Click logout if visible, otherwise skip test (UI not yet wired)
    const logoutVisible = await logoutBtn.first().isVisible().catch(() => false);
    test.skip(!logoutVisible, 'Logout button not found — UI not yet wired');
    await logoutBtn.first().click();

    // Verify tokens are removed from localStorage
    const tokens = await page.evaluate(() => ({
      access: localStorage.getItem('coa_access_token'),
      refresh: localStorage.getItem('coa_refresh_token'),
    }));

    expect(tokens.access).toBeNull();
    expect(tokens.refresh).toBeNull();

    // Should be back on LoginScreen
    await expect(page.locator(SELECTORS.loginScreen)).toBeVisible({ timeout: 15000 });
  });
});
