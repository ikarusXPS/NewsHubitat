// Lighthouse CI configuration for PR quality gates
// D-10 through D-15: Automated Lighthouse checks with score thresholds
// Source: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md
module.exports = {
  ci: {
    collect: {
      // D-15: Run against staging deployment (not localhost)
      url: [
        process.env.STAGING_URL || 'https://staging.newshub.example.com/',
        (process.env.STAGING_URL || 'https://staging.newshub.example.com') + '/analysis',
        (process.env.STAGING_URL || 'https://staging.newshub.example.com') + '/monitor',
      ],
      numberOfRuns: 3, // Reduce flakiness with multiple runs
      settings: {
        // Chrome flags for CI environment
        chromeFlags: '--no-sandbox --headless --disable-gpu',
      },
    },
    assert: {
      assertions: {
        // D-12: 90+ thresholds required
        // D-13: Fail PR check if any category drops below 90
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // D-18: Core Web Vitals - warn only, tracked for improvement
        'largest-contentful-paint': ['warn', { maxNumericValue: 2000 }],   // < 2s
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.05 }],    // < 0.05
        'interaction-to-next-paint': ['warn', { maxNumericValue: 150 }],   // < 150ms
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],     // < 1.5s
      },
    },
    upload: {
      target: 'temporary-public-storage', // Free, 7-day retention
    },
  },
};
