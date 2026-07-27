import { test } from '@playwright/test';

/**
 * DA-215 — QA: Test Connection flow.
 *
 * Superseded by a Jest component test:
 *   src/features/projects/components/__tests__/da-215-test-connection.qa.test.tsx
 *
 * The Test Connection flow depends on the custom Select, whose menu opens via an
 * async measureInWindow callback that cannot be driven reliably in Playwright.
 * The states (gating, testing, success, actionable failure, log redaction, and
 * the Create gate) are verified deterministically at the component level.
 */
test.describe.skip('DA-215 Test Connection (see Jest component test)', () => {
  test('covered by da-215-test-connection.qa.test.tsx', () => {});
});
