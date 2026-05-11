// GDPR PII scrubbing — TOM-FIX-04 + TOM-FIX-05 (Plan 41-07)
//
// Canonical source of truth for redacting sensitive fields out of telemetry
// (Sentry events, Winston logs, frontend console). Pure TypeScript — no
// Node-only imports — so it is safe to bundle into the Vite frontend too.
//
// instrument.mjs (boot-time Sentry in production) cannot import this file at
// runtime because it executes before tsup bundles app code. Keep
// instrument.mjs's inline scrubbing in sync with this list whenever rules change.

const REDACTED = '[redacted]';
const REDACTED_EMAIL = '[redacted-email]';
const REDACTED_BEARER = 'Bearer [redacted]';

// Object keys whose values must always be redacted (case-insensitive match).
const SENSITIVE_KEYS = new Set<string>([
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

// URL query parameter names whose values must be redacted.
const SENSITIVE_QUERY_PARAMS = new Set<string>([
  'token',
  'verification_token',
  'reset_token',
  'code',
  'state',
]);

// Email pattern (loose; we are scrubbing, not validating).
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Recursively redact sensitive keys + Authorization headers anywhere in `value`.
// Returns a new object — never mutates the input.
export function scrubObject<T>(value: T, depth = 0): T {
  if (depth > 8) return value; // bounded recursion — defensive
  if (Array.isArray(value)) {
    return value.map((item) => scrubObject(item, depth + 1)) as unknown as T;
  }
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const lower = key.toLowerCase();

    if (lower === 'authorization' && typeof raw === 'string') {
      out[key] = REDACTED_BEARER;
      continue;
    }

    if (SENSITIVE_KEYS.has(lower)) {
      out[key] = REDACTED;
      continue;
    }

    if (typeof raw === 'string' && looksLikeUrl(raw)) {
      out[key] = scrubUrl(raw);
      continue;
    }

    out[key] = scrubObject(raw, depth + 1);
  }
  return out as T;
}

// Redact sensitive query parameters. Returns the URL unchanged if it cannot be
// parsed (e.g. relative path without origin) — then strips query params manually.
export function scrubUrl(url: string): string {
  if (!url) return url;
  // Fast path: no query string → nothing to scrub.
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return url;

  const base = url.slice(0, queryStart);
  const query = url.slice(queryStart + 1);
  const fragmentStart = query.indexOf('#');
  const queryOnly = fragmentStart === -1 ? query : query.slice(0, fragmentStart);
  const fragment = fragmentStart === -1 ? '' : query.slice(fragmentStart);

  const scrubbedPairs = queryOnly
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf('=');
      if (eq === -1) return pair;
      const name = pair.slice(0, eq);
      const lowerName = name.toLowerCase();
      if (SENSITIVE_QUERY_PARAMS.has(lowerName)) {
        return `${name}=${REDACTED}`;
      }
      return pair;
    });

  const rebuiltQuery = scrubbedPairs.length > 0 ? `?${scrubbedPairs.join('&')}` : '';
  return `${base}${rebuiltQuery}${fragment}`;
}

// Replace email addresses inside arbitrary strings (stack traces, log messages).
export function scrubString(input: string): string {
  if (!input) return input;
  let out = input.replace(EMAIL_PATTERN, REDACTED_EMAIL);
  // Strings that look like URLs with query params get their params redacted too.
  if (looksLikeUrl(out)) {
    out = scrubUrl(out);
  }
  return out;
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

// Sentry-specific helper: scrub the parts of an event we care about. Kept
// shape-agnostic so it works for both @sentry/node and @sentry/react events.
export interface ScrubbableSentryEvent {
  user?: { email?: string | null | undefined } & Record<string, unknown>;
  request?: {
    url?: string;
    headers?: Record<string, unknown>;
    data?: unknown;
    query_string?: string;
  };
  message?: string;
  exception?: {
    values?: Array<{ value?: string; stacktrace?: unknown }>;
  };
  [key: string]: unknown;
}

export function scrubSentryEvent<T extends ScrubbableSentryEvent>(event: T): T {
  if (!event) return event;

  if (event.user?.email) {
    event.user = { ...event.user, email: REDACTED_EMAIL };
  }

  if (event.request) {
    const req = event.request;
    const next: typeof req = { ...req };
    if (typeof req.url === 'string') next.url = scrubUrl(req.url);
    if (typeof req.query_string === 'string') {
      next.query_string = scrubUrl(`?${req.query_string}`).replace(/^\?/, '');
    }
    if (req.headers) next.headers = scrubObject(req.headers);
    if (req.data !== undefined) next.data = scrubObject(req.data);
    event.request = next;
  }

  if (typeof event.message === 'string') {
    event.message = scrubString(event.message);
  }

  const exceptionValues = event.exception?.values;
  if (Array.isArray(exceptionValues)) {
    for (const v of exceptionValues) {
      if (typeof v?.value === 'string') {
        v.value = scrubString(v.value);
      }
    }
  }

  return event;
}
