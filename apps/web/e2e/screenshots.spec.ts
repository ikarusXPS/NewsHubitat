import { test } from './fixtures';

/**
 * Screenshot capture for README documentation.
 * Run: npx playwright test e2e/screenshots.spec.ts --project=chromium
 *
 * Screenshots are saved to docs/screenshots/
 */

const SCREENSHOT_DIR = 'docs/screenshots';

test.describe('README Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('capture dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000); // Allow page and animations to settle
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard.png`, fullPage: false });
  });

  test('capture monitor globe', async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('domcontentloaded');
    // Wait for globe canvas to render
    await page.waitForTimeout(5000); // Globe needs time to initialize
    await page.screenshot({ path: `${SCREENSHOT_DIR}/monitor-globe.png`, fullPage: false });
  });

  test('capture monitor events', async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/monitor-events.png`, fullPage: false });
  });

  test('capture analysis', async ({ page }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/analysis.png`, fullPage: false });
  });

  test('capture timeline', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/timeline.png`, fullPage: false });
  });

  test('capture community', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/community.png`, fullPage: false });
  });

  test('capture feed manager', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Open feed manager modal (gear icon button)
    const feedManagerButton = page.locator('button[aria-label*="Feed"], button:has([class*="Settings"]), button:has([class*="Sliders"])').first();
    if (await feedManagerButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await feedManagerButton.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/feed-manager.png`, fullPage: false });
  });

  test('capture keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Press ? to open shortcuts modal
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/shortcuts.png`, fullPage: false });
  });
});
