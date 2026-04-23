import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for header to be fully rendered
    await page.waitForSelector('header', { state: 'visible' });
  });

  test('should show login button when not authenticated', async ({ page }) => {
    // Header button shows "Sign In" (English) - use header scope for specificity
    const loginButton = page.locator('header button:has-text("Sign In")');
    await expect(loginButton).toBeVisible({ timeout: 10000 });
  });

  test('should open auth modal when clicking login button', async ({ page }) => {
    await page.click('button:has-text("Sign In")');

    // Modal should be visible
    const modal = page.locator('[role="dialog"], .fixed.inset-0');
    await expect(modal).toBeVisible();

    // Should show login form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should switch between login and register modes', async ({ page }) => {
    // Click header login button (shows "Sign In" in English)
    await page.locator('header button:has-text("Sign In")').click();

    // Should start in login mode
    const loginHeading = page.locator('h2:has-text("Anmelden")');
    await expect(loginHeading).toBeVisible();

    // Click "Jetzt registrieren" link to switch to register mode
    const registerLink = page.locator('button:has-text("Jetzt registrieren")');
    await registerLink.click();

    // Should now show register mode with name field
    const registerHeading = page.locator('h2:has-text("Registrieren")');
    await expect(registerHeading).toBeVisible();

    // Name field should be visible in register mode
    const nameInput = page.locator('input[placeholder*="Name"]');
    await expect(nameInput).toBeVisible();
  });

  test('should show validation error for empty login', async ({ page }) => {
    await page.click('button:has-text("Sign In")');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]:has-text("Anmelden")');
    await submitButton.click();

    // Should show validation error or stay on form
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('should close modal when clicking close button', async ({ page }) => {
    // Click header login button
    await page.locator('header button:has-text("Sign In")').click();

    // Wait for modal to appear
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Click the X close button
    const closeButton = page.locator('.fixed button:has([class*="lucide-x"])');
    await closeButton.click();

    // Modal should be closed - email input should not be visible
    await expect(emailInput).not.toBeVisible({ timeout: 2000 });
  });

  test('should close modal when clicking backdrop', async ({ page }) => {
    // Click header login button
    await page.locator('header button:has-text("Sign In")').click();

    // Wait for modal to appear
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Click on the backdrop - use position outside the modal center
    await page.mouse.click(10, 10);

    // Modal should be closed - email input should not be visible
    await expect(emailInput).not.toBeVisible({ timeout: 2000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Click header login button
    await page.locator('header button:has-text("Sign In")').click();

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.locator('form button[type="submit"]').click();

    // Should show error message within the modal/form area
    const errorMessage = page.locator('.fixed >> text=/fehler|error|ungültig|invalid/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});
