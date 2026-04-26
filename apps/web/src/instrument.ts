// src/instrument.ts
// Sentry initialization - MUST be imported first in main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  release: import.meta.env.VITE_SENTRY_RELEASE,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: parseFloat(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.2'
  ),
  // Only propagate traces to our own API
  tracePropagationTargets: [/^\/api\//],
  // Only send errors in production (per D-09 sample rate config)
  enabled: import.meta.env.PROD,
});

export { Sentry };
