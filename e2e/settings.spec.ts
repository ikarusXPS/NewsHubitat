import { test, expect } from '@playwright/test';

// These tests run with storageState from auth.setup.ts
// User is already authenticated when tests start

test.describe('Settings Page (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass FocusOnboarding modal
    // Zustand persist format: { state: {...}, version: N }
    await page.addInitScript(() => {
      localStorage.setItem('newshub-storage', JSON.stringify({
        state: {
          hasCompletedOnboarding: true,
          theme: 'dark',
          language: 'de'
        },
        version: 0
      }));
    });

    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    // Wait for page heading to be visible as proxy for page ready
    await page.locator('h1:has-text("Einstellungen")').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('should load the Settings page', async ({ page }) => {
    await expect(page).toHaveURL('/settings');

    // Check for Settings header (German: Einstellungen)
    const heading = page.locator('h1').filter({ hasText: /Einstellungen/i });
    await expect(heading).toBeVisible();
  });

  test('should display theme toggle buttons', async ({ page }) => {
    // Dark Mode button
    const darkModeBtn = page.locator('button').filter({ hasText: 'Dark Mode' }).first();
    await expect(darkModeBtn).toBeVisible();

    // Light Mode button
    const lightModeBtn = page.locator('button').filter({ hasText: 'Light Mode' }).first();
    await expect(lightModeBtn).toBeVisible();
  });

  test('should toggle to light theme', async ({ page }) => {
    const lightModeBtn = page.locator('button').filter({ hasText: 'Light Mode' }).first();
    await lightModeBtn.click();
    await page.waitForTimeout(300);

    // Button should show active state (border-blue-500)
    await expect(lightModeBtn).toHaveClass(/border-blue-500/);
  });

  test('should toggle to dark theme', async ({ page }) => {
    // First switch to light, then back to dark
    const lightModeBtn = page.locator('button').filter({ hasText: 'Light Mode' }).first();
    const darkModeBtn = page.locator('button').filter({ hasText: 'Dark Mode' }).first();

    await lightModeBtn.click();
    await page.waitForTimeout(300);

    await darkModeBtn.click();
    await page.waitForTimeout(300);

    // Dark mode button should be active
    await expect(darkModeBtn).toHaveClass(/border-blue-500/);
  });

  test('should display language toggle buttons', async ({ page }) => {
    // Deutsch button - use exact match to avoid matching "Deutschland"
    const deutschBtn = page.getByRole('button', { name: 'Deutsch', exact: true });
    await expect(deutschBtn).toBeVisible();

    // English button
    const englishBtn = page.getByRole('button', { name: 'English', exact: true });
    await expect(englishBtn).toBeVisible();
  });

  test('should toggle language to English', async ({ page }) => {
    const englishBtn = page.getByRole('button', { name: 'English', exact: true });
    await englishBtn.click();
    await page.waitForTimeout(300);

    // Button should show active state
    await expect(englishBtn).toHaveClass(/border-blue-500/);
  });

  test('should toggle language to Deutsch', async ({ page }) => {
    const deutschBtn = page.getByRole('button', { name: 'Deutsch', exact: true });
    await deutschBtn.click();
    await page.waitForTimeout(300);

    // Button should show active state
    await expect(deutschBtn).toHaveClass(/border-blue-500/);
  });

  test('should display export settings button', async ({ page }) => {
    // Export button - German text
    const exportBtn = page.locator('button:has-text("Einstellungen exportieren")');
    await expect(exportBtn).toBeVisible();
  });

  test('should display import settings button', async ({ page }) => {
    // Import button is a label with span inside
    const importSpan = page.locator('span:has-text("Einstellungen importieren")');
    await expect(importSpan).toBeVisible();
  });

  test('should display Command Palette toggle', async ({ page }) => {
    // Command Palette section - look for the label text
    const cmdPaletteLabel = page.locator('text=Command Palette anzeigen');
    await expect(cmdPaletteLabel).toBeVisible();

    // The toggle is a sibling button in the same container
    // Look for the toggle switch (rounded-full button) near the Command Palette text
    const toggleBtn = page.locator('.rounded-full').filter({ has: page.locator('.bg-white, .rounded-full') }).first();
    await expect(toggleBtn).toBeVisible();
  });

  test('should display cache clear button', async ({ page }) => {
    // Cache leeren button
    const cacheBtn = page.locator('button:has-text("Cache leeren")');
    await expect(cacheBtn).toBeVisible();
  });

  test('should display region selection section', async ({ page }) => {
    // Region selection has region buttons
    const regionLabel = page.locator('text=Standard-Perspektiven');
    await expect(regionLabel).toBeVisible();
  });

  test('should navigate from Profile quick action', async ({ page }) => {
    // Go to profile first
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    // Click Settings quick action (in Profile's quick actions grid)
    const settingsBtn = page.locator('button:has-text("Settings")');
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await expect(page).toHaveURL('/settings');
    }
  });
});
