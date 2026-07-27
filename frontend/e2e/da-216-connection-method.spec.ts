import { test } from '@playwright/test';

/**
 * DA-216 — QA: Connection-method selection in Project Setup.
 *
 * Superseded by a Jest component test:
 *   src/features/projects/components/__tests__/da-216-connection-method.qa.test.tsx
 *
 * The connection-method dropdown is a custom Select whose menu opens via an
 * async measureInWindow callback that cannot be driven reliably in Playwright.
 * Both cards' dropdowns, the MCP/CSV options, per-card independence, selection
 * reflection, and product-gated enablement are verified at the component level.
 */
test.describe.skip('DA-216 Connection-method selection (see Jest component test)', () => {
  test('covered by da-216-connection-method.qa.test.tsx', () => {});
});
