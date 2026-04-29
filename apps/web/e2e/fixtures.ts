import { test as base } from '@playwright/test';

/**
 * Custom test fixture that bypasses the onboarding modal,
 * mocks APIs that cause overlay issues, and hides toast notifications.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Mock focus-suggestions API to prevent overlays covering header buttons
    await page.route('**/api/focus/suggestions', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          meta: { count: 0, generatedAt: new Date().toISOString() },
        }),
      });
    });

    // Mock AI / analysis endpoints so the suite doesn't depend on a paid or
    // rate-limited upstream provider. NewsHub's free-tier AI quota is ~10 calls
    // before the provider returns errors, which then breaks any test that hits
    // the dashboard, bookmarks list, or analysis page.
    const aiOk = (data: unknown) => ({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });

    await page.route('**/api/ai/ask', (route) =>
      route.fulfill(aiOk({ answer: 'Mock AI answer for E2E', sources: [] })),
    );
    await page.route('**/api/ai/propaganda', (route) =>
      route.fulfill(aiOk({ score: 0, indicators: [], summary: 'Mock propaganda analysis' })),
    );
    await page.route('**/api/analysis/clusters**', (route) =>
      route.fulfill(aiOk([])),
    );
    await page.route('**/api/analysis/summarize', (route) =>
      route.fulfill(aiOk({ summary: 'Mock summary for E2E' })),
    );
    await page.route('**/api/analysis/framing**', (route) =>
      route.fulfill(aiOk({ framings: [] })),
    );
    await page.route('**/api/analysis/coverage-gaps**', (route) =>
      route.fulfill(aiOk({ gaps: [] })),
    );

    // Bypass blocking modals before each test:
    //   - FocusOnboarding (z-90)  — gated by hasCompletedOnboarding (zustand persist)
    //   - ConsentBanner   (z-100) — gated by newshub-consent localStorage key
    // Without consent set, the GDPR banner sits at the bottom and can intercept
    // pointer events on bottom-aligned UI in some viewports.
    await page.addInitScript(() => {
      const existingStorage = localStorage.getItem('newshub-storage');
      const parsed = existingStorage ? JSON.parse(existingStorage) : { state: {}, version: 0 };

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

    // Hide toast notifications that can intercept pointer events during tests
    // Toasts appear in bottom-right corner and block clicks on buttons
    await page.addStyleTag({
      content: `
        /* Hide toast notifications during E2E tests to prevent click interception */
        .fixed.bottom-4.right-4.z-50 { display: none !important; }
        /* Also hide any Toaster/Sonner toast containers */
        [data-sonner-toaster] { display: none !important; }
      `,
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from '@playwright/test';
