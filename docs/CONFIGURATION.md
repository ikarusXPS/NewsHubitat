<!-- generated-by: gsd-doc-writer -->
# Configuration

This document describes all configuration options for NewsHub, including environment variables, runtime tuning, secrets, subscription tier limits, rate limits, performance budgets, and per-environment overrides. The authoritative source for environment variables is `CLAUDE.md` (the `Environment Variables` section).

## Environment Variables

All environment variables are configured in a `.env` file at the repo root. Copy `.env.example` to `.env` to get started. Frontend variables prefixed with `VITE_` are embedded at build time and exposed via `import.meta.env`.

### Required (application fails to start without these)

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | None | Secret key for JWT signing — **minimum 32 characters**. Generate with `openssl rand -base64 32`. The server exits with error code 1 if not set (see `apps/web/server/services/authService.ts`). |
| `DATABASE_URL` | `postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public` | PostgreSQL connection URL. In production (Phase 37) this routes through PgBouncer (`pgbouncer:6432?pgbouncer=true`). |
| `REDIS_URL` | None | Redis connection URL (e.g. `redis://localhost:6379`). Cache, JWT blacklist, rate limiters, and AI response cache rely on Redis; the app degrades gracefully to in-memory if it cannot connect, but Redis is required for any multi-instance deployment. |
| `PORT` | `3001` | Server port for the Express backend. |

`PORT` has a default and the server still starts without it, but it is treated as required configuration in production deployments. `REDIS_URL` is technically optional in dev (graceful in-memory fallback) but required for staging/production.

### AI Providers (at least ONE required)

The AI service uses a fallback chain (priority order). Configure as many as possible for resilience.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | One of these is required | None | OpenRouter (PRIMARY) — multiple FREE models with auto-fallback. Get key at <https://openrouter.ai/keys>. |
| `GEMINI_API_KEY` | " | None | Google Gemini (SECONDARY) — FREE tier, 1500 requests/day. Get key at <https://aistudio.google.com/app/apikey>. |
| `ANTHROPIC_API_KEY` | " | None | Anthropic Claude (FALLBACK) — paid. Uses model `claude-3-haiku-20240307`. |

If all three providers fail, the system falls back to keyword-based analysis. See `apps/web/server/config/aiProviders.ts` and `services/aiService.ts`.

### Translation Providers (at least one recommended)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPL_API_KEY` | Optional | None | DeepL (best quality) — free tier 500k chars/month. |
| `GOOGLE_TRANSLATE_API_KEY` | Optional | None | Google Translate (paid). |
| `LIBRETRANSLATE_URL` | Optional | `https://libretranslate.com` | LibreTranslate fallback — always available, no key required. |

Chain order: DeepL → Google → LibreTranslate → Claude (`ANTHROPIC_API_KEY`). See `services/translationService.ts`.

### Email / SMTP

NewsHub uses SendGrid SMTP (Phase 22) for verification emails and digests. The `SMTP_*` variable names referenced in early CLAUDE.md notes are aliases for the SendGrid configuration below.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENDGRID_API_KEY` | Optional | None | SendGrid API key (`SG.xxxxx...`). Without it, email verification and digests are disabled. |
| `SENDGRID_WEBHOOK_PUBLIC_KEY` | Optional | None | Public key for verifying SendGrid Event Webhook signatures. |
| `SMTP_FROM` | Optional | None | Sender address (must be verified in SendGrid). Example: `NewsHub <noreply@newshub.app>`. |
| `ALERT_EMAIL` | Optional | None | Recipient email for Prometheus / Alertmanager notifications. |

### OAuth (optional — enables social login)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Optional | None | Google OAuth Client ID (Web application). |
| `GOOGLE_CLIENT_SECRET` | Optional | None | Google OAuth Client Secret. Callback URL: `/api/auth/google/callback`. |
| `GITHUB_CLIENT_ID` | Optional | None | GitHub OAuth App Client ID. |
| `GITHUB_CLIENT_SECRET` | Optional | None | GitHub OAuth App Client Secret. Callback URL: `/api/auth/github/callback`. |
| `OAUTH_SESSION_SECRET` | Required if OAuth is used | None | Secret for OAuth state parameter and session cookies. Generate with `openssl rand -base64 32`. |

Users who sign up via OAuth have their email automatically verified.

### Payments / Stripe (optional — Phase 36)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Optional | None | Stripe secret key (`sk_test_...` / `sk_live_...`). Subscription features gracefully degrade when not set. |
| `STRIPE_WEBHOOK_SECRET` | Optional | None | Stripe webhook signing secret (`whsec_...`). **CRITICAL:** webhook route must be registered before `express.json()` to preserve raw body for HMAC verification. |
| `STRIPE_PRICE_ID_MONTHLY` | Optional | None | Stripe Price ID for monthly Premium plan (whitelisted at checkout). |
| `STRIPE_PRICE_ID_ANNUAL` | Optional | None | Stripe Price ID for annual Premium plan (whitelisted at checkout). |

Stripe SDK is pinned to `stripe@22.1.0` with API version `2024-12-18.acacia` (`apps/web/server/config/stripe.ts`).

### Database (Phase 37 — PgBouncer aware)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Required | localhost dev URL | Primary connection. In production: routes through PgBouncer transaction-pool with `?pgbouncer=true` to disable Prisma prepared-statement caching. |
| `DIRECT_URL` | Required in production (Phase 37 / DB-02) | None | Bypasses PgBouncer for `prisma migrate deploy` / `prisma db push` (Schema Engine requires session-scoped connections). |

### News API Fallbacks (optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GNEWS_API_KEY` | Optional | None | GNews API — 100 req/day free. |
| `NEWSAPI_KEY` | Optional | None | NewsAPI — 100 req/day free. |
| `MEDIASTACK_API_KEY` | Optional | None | MediaStack — 500 req/month free. |

### Sentry Error Tracking (optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SENTRY_DSN` | Optional | None | Frontend Sentry DSN. |
| `VITE_SENTRY_ENVIRONMENT` | Optional | `development` | Frontend Sentry environment tag. |
| `VITE_SENTRY_RELEASE` | Optional | None | Frontend release version (set by CI). |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Optional | `0.2` | Frontend traces sample rate (0–1). |
| `SENTRY_DSN` | Optional | None | Backend Sentry DSN (may share with frontend). |
| `SENTRY_ENVIRONMENT` | Optional | `development` | Backend Sentry environment tag. |
| `SENTRY_RELEASE` | Optional | None | Backend release version (set by CI). |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional | `0.2` | Backend traces sample rate (0–1). |
| `SENTRY_ORG` | CI only | None | Sentry org slug (CI source-map upload). |
| `SENTRY_PROJECT` | CI only | None | Sentry project slug (CI source-map upload). |
| `SENTRY_AUTH_TOKEN` | CI only | None | Sentry auth token (CI source-map upload). |

### Other Optional Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Optional | `development` | `development` / `production` / `test`. Gates dev-only diagnostics (slow-query warnings, N+1 detection). |
| `APP_URL` | Optional | `http://localhost:5173` | Frontend URL used in email verification links. |
| `ALLOWED_ORIGINS` | Optional (Required in prod) | localhost dev origins | Comma-separated CORS whitelist (`https://yourdomain.com,https://www.yourdomain.com`). |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | Optional | `localhost` / `6379` / none / `0` | Used only if `REDIS_URL` is not set. |
| `VITE_CLOUDINARY_CLOUD_NAME` | Optional | None | Cloudinary cloud name for responsive image transformations (AVIF/WebP, srcSet). |
| `BUILD_VERSION` | CI only | None | Build version (set by CI pipeline). |
| `BUILD_COMMIT` | CI only | None | Git commit SHA (set by CI pipeline). |

## Example `.env` Blocks

### Minimal local development

```bash
# Required
PORT=3001
NODE_ENV=development
JWT_SECRET=replace-with-openssl-rand-base64-32-output-min-32-chars
DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public"
REDIS_URL=redis://localhost:6379
APP_URL=http://localhost:5173

# At least ONE AI provider (OpenRouter is free + recommended)
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### Staging / production additions

```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://staging.newshub.app,https://newshub.app

# PgBouncer-fronted DB (Phase 37)
DATABASE_URL="postgres://newshub:${POSTGRES_PASSWORD}@pgbouncer:6432/newshub?pgbouncer=true"
DIRECT_URL="postgres://newshub:${POSTGRES_PASSWORD}@postgres:5432/newshub"

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_WEBHOOK_PUBLIC_KEY=xxxxx
SMTP_FROM="NewsHub <noreply@newshub.app>"
ALERT_EMAIL=ops@example.com

# Payments
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID_MONTHLY=price_xxxxx
STRIPE_PRICE_ID_ANNUAL=price_xxxxx

# Sentry
SENTRY_DSN=https://xxxxx@o0.ingest.sentry.io/0
SENTRY_ENVIRONMENT=production
VITE_SENTRY_DSN=https://xxxxx@o0.ingest.sentry.io/0
VITE_SENTRY_ENVIRONMENT=production
```

## Subscription Tier Limits

Defined in `apps/web/server/config/stripe.ts` (`TIER_LIMITS`). Tier values are sourced from `CLAUDE.md`.

| Capability | FREE | PREMIUM | ENTERPRISE |
|------------|------|---------|------------|
| AI queries / day | 10 | Unlimited (1000 per `CLAUDE.md`) | Unlimited |
| Reading history visibility | 7 days | Unlimited | Unlimited |
| Reading history entries | 100 | 1000 | Unlimited |
| Data export | — | JSON, CSV | JSON, CSV, PDF |
| Article comments | — | yes | yes |
| AI personas | — | yes | yes |
| Email digest frequency | weekly | daily, realtime | daily, realtime |
| Team creation | — | yes | yes |
| Share analytics | — | yes | yes |
| Force translation | — | yes | yes |
| Cluster AI summaries | — | yes | yes |
| Real-time updates | polling 30s | WebSocket | WebSocket |
| Advanced filters / custom presets / custom feeds | — | yes | yes |
| Team billing / enterprise analytics | — | — | yes |

Pricing (display only, EUR): Premium €9 / month, €90 / year (2 months free). See `PRICING` in `stripe.ts`.

Middleware enforcement (`apps/web/server/middleware/`):
- `requireTier(tier)` — hard 403 gate; returns `upgradeUrl` for `CANCELED` / `PAUSED` subscriptions.
- `attachUserTier` — soft attach (no blocking) for tier-aware UI.
- `aiTierLimiter` — 24 h sliding window for FREE tier AI usage.
- Grace period: `PAST_DUE` keeps access for 7 days; `CANCELED` / `PAUSED` block Premium routes immediately.

## Rate Limits

### Internal API tiers

Defined in `apps/web/server/config/rateLimits.ts` (`RATE_LIMITS`).

| Tier | Window | Max | Keyed by | Paths |
|------|--------|-----|----------|-------|
| `auth` | 1 min | 5 | IP | `/api/auth/login`, `/api/auth/register`, `/api/auth/request-reset`, `/api/auth/reset-password` |
| `ai` | 1 min | 10 | user | `/api/ai/ask`, `/api/analysis/clusters`, `/api/analysis/framing` |
| `news` | 1 min | 100 | IP | `/api/news`, `/api/events`, `/api/markets` |
| `comment` | 1 min | 5 | user | `/api/comments`, `/api/comments/:id/edit`, `/api/comments/:id/flag` |

### Public API key tiers

Defined in the same file (`API_TIER_LIMITS`). Applied via `apiKeyRateLimiter` middleware. Limits emit IETF `RateLimit-*` response headers. Validated keys are cached 5 min in Redis (only the first 15 chars stored as identifier).

| Tier | Window | Max | Description |
|------|--------|-----|-------------|
| `free` | 1 min | 10 | Evaluation / low-volume |
| `pro` | 1 min | 100 | Production applications |

API key format: `nh_{env}_{random}_{checksum}` (Stripe-inspired). Hashed with bcrypt factor 10. Maximum **3 keys per user** to prevent rate-limit bypass via key multiplication. Header: `X-API-Key`.

## Performance Budgets

Codified targets validated via k6 + Lighthouse.

| Metric | Threshold | Notes |
|--------|-----------|-------|
| News API p95 | < 500 ms | k6 thresholds |
| AI API p95 | < 5 s | k6 thresholds |
| Auth API p95 | < 300 ms | k6 thresholds |
| LCP | < 2 s | Lighthouse, warn-only |
| CLS | < 0.05 | Lighthouse, warn-only |
| INP | < 150 ms | Lighthouse, warn-only |
| FCP | < 1.5 s | Lighthouse, warn-only |
| Lighthouse categories (perf / a11y / best practices / SEO) | ≥ 90 | Required after `deploy-staging` on master |
| Bundle size | 250 KB warning | CI annotation, non-blocking |

### Dev-only diagnostics (gated on `NODE_ENV !== 'production'`)

| Diagnostic | Threshold | Implementation |
|------------|-----------|----------------|
| Slow query warning | > 100 ms | `queryCounter` middleware |
| N+1 detection | > 5 queries / request | `AsyncLocalStorage` request scope |

## Coverage Gates

Enforced by Vitest (`apps/web/vitest.config.ts`):

| Type | Threshold | Notes |
|------|-----------|-------|
| Statements | 80 % | |
| Branches | **75 %** | Temporary waiver — actual is 75.61 % (CI run 25107573823). TODO: backfill `routes/ai.ts`, `routes/leaderboard.ts`, `services/webhookService.ts`, `jobs/workerEmitter.ts`, `hooks/useComments.ts` and raise back to 80 %. |
| Functions | 80 % | |
| Lines | 80 % | |

`pnpm test:coverage` fails the build if any threshold is missed.

## Branch Protection (master)

The `master` branch enforces these required status checks (configured in the GitHub repo settings; mirrors the jobs in `.github/workflows/ci.yml`):

- Lint
- Type Check
- Unit Tests (Postgres 17 + Redis 7.4 service containers)
- Build Docker Image
- E2E Tests

Lighthouse CI runs after `deploy-staging` on master only. Load tests (`load-test.yml`) run only via `workflow_dispatch` against `STAGING_URL` — never on production.

<!-- VERIFY: exact list of "Required status checks" enforced in the GitHub branch-protection rule for master -->

## CI/CD Secrets

Configured under **Settings → Secrets and variables → Actions** in the GitHub repository. Referenced from `.github/workflows/ci.yml` and `load-test.yml`.

| Secret | Used by | Purpose |
|--------|---------|---------|
| `STAGING_HOST` | `deploy-staging` | SSH host for staging deployments |
| `STAGING_USER` | `deploy-staging` | SSH user for staging deployments |
| `STAGING_SSH_KEY` | `deploy-staging` | SSH private key for staging deployments |
| `STAGING_URL` | `lighthouse`, `load-test.yml` | Public URL for post-deploy Lighthouse audit and k6 load tests |
| `LHCI_GITHUB_APP_TOKEN` | `lighthouse` | Lighthouse CI GitHub App token (status reporting) |
| `SENTRY_AUTH_TOKEN` | `build` | Source map upload to Sentry |
| `SENTRY_ORG` | `build` | Sentry organisation slug |
| `SENTRY_PROJECT` | `build` | Sentry project slug |
| `PRODUCTION_HOST` | `deploy-production` | SSH host for production deployments |
| `PRODUCTION_USER` | `deploy-production` | SSH user for production deployments |
| `PRODUCTION_SSH_KEY` | `deploy-production` | SSH private key for production deployments |
| `GITHUB_TOKEN` | various | Built-in GitHub token (PR comments, GHCR push) |

<!-- VERIFY: actual values of STAGING_URL / PRODUCTION_HOST / SSH key fingerprints in the GitHub repo secrets -->

## Config File Formats

### AI Provider Configuration

**Location:** `apps/web/server/config/aiProviders.ts`

Defines AI models, cache TTLs, and fallback behaviour:

```typescript
export const AI_CONFIG = {
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    models: [
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
      'openai/gpt-oss-120b:free',
      'z-ai/glm-4.5-air:free',
      'minimax/minimax-m2.5:free',
    ],
    maxTokens: 1500,
  },
  gemini: {
    models: { primary: 'gemma-3-27b-it', fallback: 'gemma-2-27b-it' },
    maxTokens: 1500,
  },
  anthropic: {
    model: 'claude-3-haiku-20240307',
    maxTokens: 1500,
  },
  cache: {
    summaryTTLSeconds: 1800, // 30 minutes
    topicTTLSeconds: 300,    // 5 minutes
  },
  fallbackErrorCodes: [402, 429, 503],
};
```

### Rate Limit Configuration

**Location:** `apps/web/server/config/rateLimits.ts` (see [Rate Limits](#rate-limits) above for the full tier table).

### Subscription / Tier Limits

**Location:** `apps/web/server/config/stripe.ts` — `TIER_LIMITS`, `PRICE_TO_TIER`, `PRICING`. See [Subscription Tier Limits](#subscription-tier-limits) above.

### Redis Cache Configuration

**Location:** `apps/web/server/services/cacheService.ts`

```typescript
export const CACHE_TTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes (default API cache)
  LONG: 1800,       // 30 minutes
  HOUR: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
  WEEK: 604800,     // 7 days
};
```

Redis connection uses `REDIS_URL` if set, otherwise falls back to individual config options (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`). Connection retry limit is 3 attempts; if exceeded, the application runs without cache (graceful degradation).

## Defaults Reference

| Setting | Default | Location |
|---------|---------|----------|
| Server port | `3001` | `apps/web/server/index.ts` |
| CORS origins (dev) | `http://localhost:5173`, `:5174`, `:5175` | `apps/web/server/index.ts` |
| Compression threshold | `1024` bytes | `apps/web/server/index.ts` |
| JWT expiry | `7d` | `apps/web/server/services/authService.ts` |
| Email verification expiry | `24h` | `apps/web/server/services/authService.ts` |
| Password reset expiry | `1h` | `apps/web/server/services/authService.ts` |
| Max email sends / hour | `3` | `apps/web/server/services/authService.ts` |
| Redis key prefix | `newshub:` | `apps/web/server/services/cacheService.ts` |
| Redis retry limit | 3 attempts | `apps/web/server/services/cacheService.ts` |
| LibreTranslate URL | `https://libretranslate.com` | `apps/web/server/services/translationService.ts` |
| Log level (dev / prod) | `debug` / `info` | `apps/web/server/utils/logger.ts` |
| Sentry traces sample rate | `0.2` | `vite.config.ts` (frontend), `.env.example` (backend) |
| PWA max cache size | `3 MB` | `vite.config.ts` |
| Vite dev port | `5173` | `vite.config.ts` |
| Vite proxy `/api` → | `http://localhost:3001` | `vite.config.ts` |
| Vite source maps | `hidden` (generated, not exposed) | `vite.config.ts` |
| Vite chunk size warning | `500` KB | `vite.config.ts` |

## Per-Environment Overrides

### Development (Local)

```bash
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public"
REDIS_URL=redis://localhost:6379
APP_URL=http://localhost:5173
```

- CORS allows requests with no Origin header (Postman, mobile apps).
- Logs to console with colours (`debug` level).
- Vite dev server proxies `/api` → `http://localhost:3001`.
- Slow-query and N+1 diagnostics active.

### Production (Docker Compose)

When running via `docker compose up`, container service names replace localhost. The `docker-compose.yml` already sets these in the environment section:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://newshub:newshub_dev@postgres:5432/newshub
REDIS_URL=redis://redis:6379
```

Phase 37 production additionally routes through PgBouncer:

```bash
DATABASE_URL="postgres://newshub:${POSTGRES_PASSWORD}@pgbouncer:6432/newshub?pgbouncer=true"
DIRECT_URL="postgres://newshub:${POSTGRES_PASSWORD}@postgres:5432/newshub"
```

Production-only behaviour:
- CORS requires `Origin` to be in the `ALLOWED_ORIGINS` whitelist.
- Logs only to `logs/error.log` and `logs/combined.log` (`info` level).
- Sentry error tracking enabled when `SENTRY_DSN` is set.
- Compression enabled for responses ≥ 1 KB.
- Source maps generated but not exposed (`sourcemap: 'hidden'`).
- Slow-query and N+1 diagnostics disabled.

### Test (CI / E2E)

Test environment uses `.env.test` if present, otherwise `.env`. CI provides minimal values:

```bash
DATABASE_URL=postgresql://newshub:test@localhost:5432/newshub
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-jwt-secret-for-ci
```

- E2E tests expect backend on `:3001` and frontend on `:5173`.
- Vitest uses `jsdom` environment for unit tests.
- Playwright `baseURL: 'http://localhost:5173'`.

## Docker Service Configuration

`docker-compose.yml` defines the following services:

### PostgreSQL (`postgres`)
- Image: `postgres:17`
- Port mapping: `5433:5432` (host:container)
- Environment: `POSTGRES_USER=newshub`, `POSTGRES_PASSWORD=newshub_dev`, `POSTGRES_DB=newshub`
- Healthcheck: `pg_isready -U newshub -d newshub` every 10 s

### Redis (`redis`)
- Image: `redis:7.4-alpine`
- Port mapping: `6379:6379`
- Persistence: AOF enabled with fsync every second
- Healthcheck: `redis-cli ping` every 10 s

### Application (`app`)
- Container overrides: `DATABASE_URL=postgresql://newshub:newshub_dev@postgres:5432/newshub`, `REDIS_URL=redis://redis:6379`
- Port mapping: `3001:3001`
- Healthcheck: `wget http://localhost:3001/health` every 30 s

### Prometheus (`prometheus`)
- Image: `prom/prometheus:v3.4.0`
- Port mapping: `9090:9090`
- Retention: 15 days
<!-- VERIFY: Prometheus dashboard URL in production deployment -->

### Alertmanager (`alertmanager`)
- Image: `prom/alertmanager:v0.28.1`
- Port mapping: `9093:9093`
<!-- VERIFY: Alertmanager webhook URLs and notification targets -->

### Grafana (`grafana`)
- Image: `grafana/grafana-oss:13.0.1`
- Port mapping: `3000:3000`
- Default credentials: `admin` / `admin` (must be rotated in production)
<!-- VERIFY: Grafana admin password in production deployment -->

## Frontend Environment Variables (Vite)

Frontend variables are prefixed with `VITE_` and embedded at build time.

| Variable | Purpose | Access |
|----------|---------|--------|
| `VITE_SENTRY_DSN` | Sentry error tracking (frontend) | `import.meta.env.VITE_SENTRY_DSN` |
| `VITE_SENTRY_ENVIRONMENT` | Sentry environment tag | `import.meta.env.VITE_SENTRY_ENVIRONMENT` |
| `VITE_SENTRY_RELEASE` | Sentry release version | `import.meta.env.VITE_SENTRY_RELEASE` |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Sentry traces sample rate | `import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for image transforms | `import.meta.env.VITE_CLOUDINARY_CLOUD_NAME` |

Additional Vite config in `vite.config.ts`:
- Dev server port: `5173`
- Proxy `/api` → `http://localhost:3001`
- Build source maps: `hidden`
- Chunk size warning limit: `500` KB
- PWA service worker via `vite-plugin-pwa`; max cache size 3 MB

## Puppeteer Configuration (Docker only)

The Dockerfile sets these automatically — do not set in `.env`:

```dockerfile
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

This ensures Puppeteer uses the system-installed Chromium in the Docker container instead of downloading its own copy.
