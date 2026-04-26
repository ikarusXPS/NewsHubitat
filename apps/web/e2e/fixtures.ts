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

    // Bypass FocusOnboarding modal by setting hasCompletedOnboarding
    // This runs before each test navigates to the page
    await page.addInitScript(() => {
      const existingStorage = localStorage.getItem('newshub-storage');
      const parsed = existingStorage ? JSON.parse(existingStorage) : { state: {}, version: 0 };

      // Merge with existing state to preserve other settings
      parsed.state = {
        ...parsed.state,
        hasCompletedOnboarding: true,
        theme: 'dark',
        language: 'de',
      };

      localStorage.setItem('newshub-storage', JSON.stringify(parsed));
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
