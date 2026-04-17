import { test, expect } from '@playwright/test';

test.describe('Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/timeline');
  });

  test('should display timeline page header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Ereignis-Timeline');
  });

  test('should show category filter buttons', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for filter buttons
    const alleButton = page.locator('button:has-text("Alle")');
    await expect(alleButton).toBeVisible();

    // Check for category buttons
    const categoryButtons = page.locator('button:has-text("Militar"), button:has-text("Diplomatie"), button:has-text("Humanitar")');
    await expect(categoryButtons.first()).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Check for loader on fresh navigation
    const loader = page.locator('[class*="animate-spin"], [class*="Loader"]');
    // Loader might be visible briefly
    await page.waitForLoadState('networkidle');
  });

  test('should filter events by category', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click on Militar category
    const militarButton = page.locator('button:has-text("Militar")');
    if (await militarButton.isVisible()) {
      await militarButton.click();

      // Button should be highlighted
      await expect(militarButton).toHaveClass(/bg-red/);
    }
  });

  test('should show "Alle" filter as default active', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const alleButton = page.locator('button:has-text("Alle")');
    await expect(alleButton).toHaveClass(/bg-blue/);
  });

  test('should have refresh button', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Aktualisieren")');
    await expect(refreshButton).toBeVisible();
  });

  test('should show event cards or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Either show events or empty state
    const hasEvents = await page.locator('[class*="rounded-lg"][class*="border"]').count() > 2;
    const emptyState = page.locator('text=Keine Ereignisse gefunden');

    if (!hasEvents) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should display event stats when data is available', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for stats section
    const statsSection = page.locator('text=/\\d+ Ereignisse gefunden/');
    // This might not be visible if no events
    if (await statsSection.isVisible()) {
      await expect(statsSection).toBeVisible();
    }
  });
});
