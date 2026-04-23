import { test as base } from '@playwright/test';

/**
 * Custom test fixture that bypasses the onboarding modal
 * by setting localStorage before each test.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
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

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from '@playwright/test';
