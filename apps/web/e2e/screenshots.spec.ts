import { test, expect } from '@playwright/test';

/**
 * Screenshot capture for README documentation.
 *
 * Uses the bare `test` from @playwright/test (NOT fixtures.ts) because fixtures
 * mocks /api/analysis/clusters, /api/events/geo, and /api/events/timeline to
 * empty arrays — which is correct for deterministic E2E tests but produces
 * empty UI for screenshots. This file deliberately hits the real backend so
 * captured pages show real content from `pnpm seed:news` data.
 *
 * Run: pnpm --filter @newshub/web screenshots
 * (or with custom port: PLAYWRIGHT_TEST_BASE_URL=http://localhost:5174 pnpm --filter @newshub/web screenshots)
 *
 * Output: docs/screenshots/ (relative to apps/web — copy to repo-level docs/screenshots/ when done)
 */

// Path is relative to playwright's CWD (apps/web/), so go up two levels to repo root.
const SCREENSHOT_DIR = '../../docs/screenshots';

test.describe.configure({ mode: 'serial' }); // Avoid parallel hammering of the dev backend
test.setTimeout(90 * 1000); // Each capture may need long waits for AI clustering, globe init, etc.

test.describe('README Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Bypass FocusOnboarding (z-90) and ConsentBanner (z-100) — they cover real UI.
    // Set German locale for the canonical screenshot language.
    await page.addInitScript(() => {
      const existing = localStorage.getItem('newshub-storage');
      const parsed = existing ? JSON.parse(existing) : { state: {}, version: 0 };
      parsed.state = {
        ...parsed.state,
        hasCompletedOnboarding: true,
        theme: 'dark',
        language: 'de',
      };
      localStorage.setItem('newshub-storage', JSON.stringify(parsed));
      localStorage.setItem('newshub-consent', JSON.stringify({
        essential: true,
        preferences: true,
        analytics: false,
      }));
    });

    // Hide toast notifications and dev-only diagnostic banners that can clutter shots
    await page.addStyleTag({
      content: `
        .fixed.bottom-4.right-4.z-50 { display: none !important; }
        [data-sonner-toaster] { display: none !important; }
      `,
    });
  });

  test('capture dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for at least one article/signal card to render — articles arrive via TanStack Query
    await expect(page.locator('article, [class*="ArticleCard"], [class*="signal-card"]').first()).toBeVisible({ timeout: 30000 });
    // Settle animations + region distribution bar
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard.png`, fullPage: false });
  });

  test('capture monitor globe', async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('domcontentloaded');
    // Default view is 2D Map — click the "3D Globe" button before capturing
    const globeBtn = page.locator('button', { hasText: /^\s*3D\s*Globe\s*$/i }).first();
    await globeBtn.click({ timeout: 15000 });
    // WebGL canvas needs time to initialize + globe markers to drop in
    await page.waitForTimeout(10000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/monitor-globe.png`, fullPage: false });
  });

  test('capture analysis', async ({ page }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('domcontentloaded');
    // Analysis page does AI clustering — give it generous time
    await page.waitForTimeout(15000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/analysis.png`, fullPage: false });
  });

  test('capture timeline', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForLoadState('domcontentloaded');
    // Timeline aggregates events from /api/news?limit=500 + extracts events server-side;
    // the loader stays up until the first event card is rendered
    await expect(page.locator('article, [class*="EventCard"], [class*="timeline-event"]').first())
      .toBeVisible({ timeout: 30000 })
      .catch(() => {});
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/timeline.png`, fullPage: false });
  });

  test('capture community', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/community.png`, fullPage: false });
  });

  test('capture podcasts', async ({ page }) => {
    // /podcasts shows the curated podcast feed list (from config) + selected feed's episodes
    await page.goto('/podcasts');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/podcasts.png`, fullPage: false });
  });

  test('capture keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('article, [class*="ArticleCard"]').first()).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(1500);
    // Click body to ensure focus, then dispatch a synthetic Shift+? keydown.
    // Playwright's keyboard.press('Shift+/') doesn't always set event.key='?', which the
    // app's handler requires (case '?' && event.shiftKey).
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true }));
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/shortcuts.png`, fullPage: false });
  });
});
