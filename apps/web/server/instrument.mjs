// server/instrument.mjs
// Sentry initialization - loaded via node --import flag BEFORE app
// Must be .mjs for ESM compatibility (per RESEARCH.md Pitfall 1)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  // Only enable in production (per D-09)
  enabled: process.env.NODE_ENV === 'production',
});
