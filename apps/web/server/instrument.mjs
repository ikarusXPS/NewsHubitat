// server/instrument.mjs
// Sentry initialization - loaded via node --import flag BEFORE app
// Must be .mjs for ESM compatibility (per RESEARCH.md Pitfall 1)
import * as Sentry from '@sentry/node';

// PII scrubbing (TOM-FIX-04 — Plan 41-07).
// This file runs before tsup bundles the app, so it CANNOT import
// `server/utils/scrub.ts` at runtime. The redaction rules below are a
// minimal inline copy — keep them in sync with `server/utils/scrub.ts`
// (single source of truth for the app's runtime code paths).
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'verificationtoken',
  'verificationtokenhash',
  'resettoken',
  'resettokenhash',
  'googleidhash',
  'githubidhash',
  'stripecustomerid',
  'stripesubscriptionid',
  'apikey',
  'keyhash',
  'cookie',
  'set-cookie',
]);
const SENSITIVE_QUERY_PARAMS = new Set([
  'token',
  'verification_token',
  'reset_token',
  'code',
  'state',
]);
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

function scrubUrlInline(url) {
  if (typeof url !== 'string' || url.indexOf('?') === -1) return url;
  const q = url.indexOf('?');
  const base = url.slice(0, q);
  const after = url.slice(q + 1);
  const hashAt = after.indexOf('#');
  const query = hashAt === -1 ? after : after.slice(0, hashAt);
  const frag = hashAt === -1 ? '' : after.slice(hashAt);
  const parts = query
    .split('&')
    .filter(Boolean)
    .map((p) => {
      const eq = p.indexOf('=');
      if (eq === -1) return p;
      const name = p.slice(0, eq);
      if (SENSITIVE_QUERY_PARAMS.has(name.toLowerCase())) {
        return `${name}=[redacted]`;
      }
      return p;
    });
  return `${base}${parts.length ? '?' + parts.join('&') : ''}${frag}`;
}

function scrubObjectInline(value, depth = 0) {
  if (depth > 8) return value;
  if (Array.isArray(value)) return value.map((v) => scrubObjectInline(v, depth + 1));
  if (typeof value !== 'object' || value === null) return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const lk = k.toLowerCase();
    if (lk === 'authorization' && typeof v === 'string') {
      out[k] = 'Bearer [redacted]';
    } else if (SENSITIVE_KEYS.has(lk)) {
      out[k] = '[redacted]';
    } else if (typeof v === 'string' && (v.startsWith('http') || v.startsWith('/'))) {
      out[k] = scrubUrlInline(v);
    } else {
      out[k] = scrubObjectInline(v, depth + 1);
    }
  }
  return out;
}

function scrubStringInline(s) {
  if (typeof s !== 'string' || !s) return s;
  let out = s.replace(EMAIL_PATTERN, '[redacted-email]');
  if (out.startsWith('http') || out.startsWith('/')) out = scrubUrlInline(out);
  return out;
}

function beforeSend(event) {
  try {
    if (event?.user?.email) event.user = { ...event.user, email: '[redacted-email]' };
    if (event?.request) {
      const r = event.request;
      const next = { ...r };
      if (typeof r.url === 'string') next.url = scrubUrlInline(r.url);
      if (typeof r.query_string === 'string') {
        next.query_string = scrubUrlInline(`?${r.query_string}`).replace(/^\?/, '');
      }
      if (r.headers) next.headers = scrubObjectInline(r.headers);
      if (r.data !== undefined) next.data = scrubObjectInline(r.data);
      event.request = next;
    }
    if (typeof event?.message === 'string') event.message = scrubStringInline(event.message);
    const ev = event?.exception?.values;
    if (Array.isArray(ev)) {
      for (const v of ev) {
        if (typeof v?.value === 'string') v.value = scrubStringInline(v.value);
      }
    }
  } catch {
    // Never let scrubbing throw inside Sentry's hook — drop silently.
  }
  return event;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  // Only enable in production (per D-09)
  enabled: process.env.NODE_ENV === 'production',
  beforeSend,
});
