import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Setup project - runs first, creates auth state
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // Unauthenticated tests (no dependencies)
    // Note: bookmarks.spec.ts moved here - page uses client-side localStorage, not server auth
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/profile.spec.ts', '**/settings.spec.ts', '**/history.spec.ts'],
    },

    // Authenticated tests (depend on setup)
    {
      name: 'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      testMatch: ['**/profile.spec.ts', '**/settings.spec.ts', '**/history.spec.ts'],
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
