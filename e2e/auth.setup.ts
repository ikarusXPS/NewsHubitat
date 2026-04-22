import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to app
  await page.goto('/');

  // Open login modal (pattern from auth.spec.ts lines 13-14)
  await page.click('button:has-text("Anmelden")');

  // Wait for modal
  await expect(page.locator('input[type="email"]')).toBeVisible();

  // Fill credentials (test user per D-13: e2e-test@newshub.test)
  await page.fill('input[type="email"]', 'e2e-test@newshub.test');
  await page.fill('input[type="password"]', 'test-password-123');

  // Submit (pattern from auth.spec.ts line 98)
  await page.locator('form button[type="submit"]').click();

  // Wait for successful login - modal closes
  await expect(page.locator('input[type="email"]')).not.toBeVisible({ timeout: 10000 });

  // Save storage state
  await page.context().storageState({ path: authFile });
});
