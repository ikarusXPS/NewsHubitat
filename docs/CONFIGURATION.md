<!-- generated-by: gsd-doc-writer -->
# Configuration

This document describes all configuration options for NewsHub, including environment variables, config files, and per-environment overrides.

## Environment Variables

All environment variables are configured in `.env` file. Copy `.env.example` to `.env` to get started.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Optional | `3001` | Server port for the Express backend |
| `NODE_ENV` | Optional | `development` | Environment mode (`development`, `production`, `test`) |
| `APP_URL` | Optional | `http://localhost:5173` | Frontend URL for email verification links |
| `JWT_SECRET` | **Required** | None | Secret key for JWT signing (minimum 32 characters). Generate with `openssl rand -base64 32` |
| `DATABASE_URL` | **Required** | `postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public` | PostgreSQL connection URL |
| `REDIS_URL` | Optional | None | Redis connection URL (e.g., `redis://localhost:6379`) |
| `REDIS_HOST` | Optional | `localhost` | Redis host (used if `REDIS_URL` not set) |
| `REDIS_PORT` | Optional | `6379` | Redis port (used if `REDIS_URL` not set) |
| `REDIS_PASSWORD` | Optional | None | Redis password (used if `REDIS_URL` not set) |
| `REDIS_DB` | Optional | `0` | Redis database number (used if `REDIS_URL` not set) |
| `ALLOWED_ORIGINS` | Optional | `http://localhost:5173,http://localhost:5174,http://localhost:5175` | Comma-separated list of allowed CORS origins |
| `OPENROUTER_API_KEY` | Optional | None | OpenRouter API key (PRIMARY AI provider, free tier) |
| `GEMINI_API_KEY` | Optional | None | Google Gemini API key (free tier, 1500 req/day) |
| `ANTHROPIC_API_KEY` | Optional | None | Anthropic Claude API key (paid fallback) |
| `DEEPL_API_KEY` | Optional | None | DeepL Translation API key (free tier: 500k chars/month) |
| `GOOGLE_TRANSLATE_API_KEY` | Optional | None | Google Translate API key (paid) |
| `LIBRETRANSLATE_URL` | Optional | `https://libretranslate.com` | LibreTranslate instance URL |
| `SENDGRID_API_KEY` | Optional | None | SendGrid API key for email delivery |
| `SENDGRID_WEBHOOK_PUBLIC_KEY` | Optional | None | SendGrid webhook verification public key |
| `SMTP_FROM` | Optional | None | Email sender address (e.g., `NewsHub <noreply@newshub.app>`) |
| `ALERT_EMAIL` | Optional | None | Recipient email for Prometheus/Alertmanager notifications |
| `GNEWS_API_KEY` | Optional | None | GNews API key (100 req/day free) |
| `NEWSAPI_KEY` | Optional | None | NewsAPI key (100 req/day free) |
| `MEDIASTACK_API_KEY` | Optional | None | MediaStack API key (500 req/month free) |
| `VITE_SENTRY_DSN` | Optional | None | Sentry DSN for frontend error tracking |
| `VITE_SENTRY_ENVIRONMENT` | Optional | `development` | Sentry environment tag (frontend) |
| `VITE_SENTRY_RELEASE` | Optional | None | Sentry release version (frontend) |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Optional | `0.2` | Sentry traces sample rate (frontend, 0-1) |
| `SENTRY_DSN` | Optional | None | Sentry DSN for backend error tracking |
| `SENTRY_ENVIRONMENT` | Optional | `development` | Sentry environment tag (backend) |
| `SENTRY_RELEASE` | Optional | None | Sentry release version (backend) |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional | `0.2` | Sentry traces sample rate (backend, 0-1) |
| `SENTRY_ORG` | Optional | None | Sentry organization slug (for CI source map upload) |
| `SENTRY_PROJECT` | Optional | None | Sentry project slug (for CI source map upload) |
| `SENTRY_AUTH_TOKEN` | Optional | None | Sentry auth token (for CI source map upload) |
| `BUILD_VERSION` | Optional | None | Build version (set by CI pipeline) |
| `BUILD_COMMIT` | Optional | None | Git commit SHA (set by CI pipeline) |

### Required Settings

The application will **fail to start** if the following required variables are missing:

- **`JWT_SECRET`**: Must be set and at least 32 characters long. The server exits with error code 1 if not provided.
  ```
  if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
  }
  ```
  Location: `server/services/authService.ts:33-38`

- **`DATABASE_URL`**: Must be a valid PostgreSQL connection string. Defaults to local Docker Compose setup if not provided.

### AI Provider Configuration

At least **one AI provider** must be configured for AI features (clustering, Q&A, framing analysis). The service uses a fallback chain:

1. **OpenRouter** (free tier, multiple models with auto-fallback)
2. **Gemini** (free tier, 1500 requests/day)
3. **Anthropic** (paid)
4. **Keyword-based analysis** (final fallback if all providers fail)

Priority order is defined in `server/config/aiProviders.ts`:
- OpenRouter models: `google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free`, `openai/gpt-oss-120b:free`, `z-ai/glm-4.5-air:free`, `minimax/minimax-m2.5:free`
- Gemini models: `gemma-3-27b-it` (primary), `gemma-2-27b-it` (fallback)
- Anthropic model: `claude-3-haiku-20240307`

### Translation Provider Configuration

Translation providers follow a fallback chain (configured in `server/services/translationService.ts`):
1. **DeepL** (best quality, free tier: 500k chars/month)
2. **Google Translate** (paid)
3. **LibreTranslate** (always available as fallback)
4. **Claude** (Anthropic, if `ANTHROPIC_API_KEY` is set)

## Config File Formats

### AI Provider Configuration

**Location**: `server/config/aiProviders.ts`

Defines AI models, cache TTLs, and fallback behavior:

```typescript
export const AI_CONFIG = {
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    models: [...],
    maxTokens: 1500,
  },
  gemini: {
    models: {
      primary: 'gemma-3-27b-it',
      fallback: 'gemma-2-27b-it',
    },
    maxTokens: 1500,
  },
  anthropic: {
    model: 'claude-3-haiku-20240307',
    maxTokens: 1500,
  },
  cache: {
    summaryTTLSeconds: 1800,  // 30 minutes
    topicTTLSeconds: 300,      // 5 minutes
  },
  fallbackErrorCodes: [402, 429, 503],
};
```

### Rate Limit Configuration

**Location**: `server/config/rateLimits.ts`

Defines tiered rate limits by endpoint category:

```typescript
export const RATE_LIMITS = {
  auth: {
    windowMs: 60_000,  // 1 minute
    max: 5,            // 5 requests per minute
    keyBy: 'ip',
    paths: ['/api/auth/login', '/api/auth/register', ...],
  },
  ai: {
    windowMs: 60_000,
    max: 10,           // 10 requests per minute
    keyBy: 'user',
    paths: ['/api/ai/ask', '/api/analysis/clusters', ...],
  },
  news: {
    windowMs: 60_000,
    max: 100,          // 100 requests per minute
    keyBy: 'ip',
    paths: ['/api/news', '/api/events', '/api/markets'],
  },
};
```

### Redis Cache Configuration

**Location**: `server/services/cacheService.ts`

Cache TTL presets:

```typescript
export const CACHE_TTL = {
  SHORT: 60,         // 1 minute
  MEDIUM: 300,       // 5 minutes (default API cache)
  LONG: 1800,        // 30 minutes
  HOUR: 3600,        // 1 hour
  DAY: 86400,        // 24 hours
  WEEK: 604800,      // 7 days
};
```

Redis connection uses `REDIS_URL` if set, otherwise falls back to individual config options (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`). Connection retry limit is 3 attempts; if exceeded, the application runs without cache (graceful degradation).

## Defaults

| Setting | Default Value | Location |
|---------|--------------|----------|
| Server port | `3001` | `server/index.ts:44` |
| CORS origins (dev) | `['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']` | `server/index.ts:54-56` |
| Compression threshold | `1024` bytes | `server/index.ts:77` |
| JWT expiry | `7d` (7 days) | `server/services/authService.ts:40` |
| Email verification expiry | `24h` | `server/services/authService.ts:42` |
| Password reset expiry | `1h` | `server/services/authService.ts:43` |
| Max email sends per hour | `3` | `server/services/authService.ts:44` |
| Redis key prefix | `newshub:` | `server/services/cacheService.ts:22` |
| Redis retry limit | `3` attempts | `server/services/cacheService.ts:62` |
| LibreTranslate URL | `https://libretranslate.com` | `server/services/translationService.ts:46` |
| Log level (dev) | `debug` | `server/utils/logger.ts:7` |
| Log level (prod) | `info` | `server/utils/logger.ts:7` |
| Sentry traces sample rate | `0.2` | `vite.config.ts:129` (frontend), `.env.example:139` (backend) |
| PWA max cache size | `3MB` | `vite.config.ts:56` |

## Per-Environment Overrides

### Development (Local)

Default configuration for `NODE_ENV=development`:

```bash
# .env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public"
REDIS_URL=redis://localhost:6379
APP_URL=http://localhost:5173
```

- CORS allows requests with no origin (for Postman, mobile apps)
- Logs to console with colors
- Vite dev server proxies `/api` to `http://localhost:3001`

### Production (Docker Compose)

When running via `docker compose up`, container service names replace localhost:

```bash
# docker-compose.yml environment section
NODE_ENV=production
DATABASE_URL=postgresql://newshub:newshub_dev@postgres:5432/newshub
REDIS_URL=redis://redis:6379
```

Additional production-only behavior:
- CORS requires origin to be in `ALLOWED_ORIGINS` whitelist
- Logs to `logs/error.log` and `logs/combined.log` only
- Sentry error tracking enabled (if `SENTRY_DSN` is set)
- Compression enabled for responses over 1KB
- Source maps generated but not exposed (`sourcemap: 'hidden'` in `vite.config.ts:135`)

### Test (CI/E2E)

Test environment uses `.env.test` (if present) or falls back to `.env`:

```bash
# playwright.config.ts uses localhost URLs
baseURL: 'http://localhost:5173'
```

- E2E tests expect backend on port 3001 and frontend on port 5173
- Vitest uses `jsdom` environment for unit tests

## Docker Service Configuration

The `docker-compose.yml` file defines the following services with their environment configurations:

### PostgreSQL (`postgres`)
- Image: `postgres:17`
- Port mapping: `5433:5432` (host:container)
- Environment: `POSTGRES_USER=newshub`, `POSTGRES_PASSWORD=newshub_dev`, `POSTGRES_DB=newshub`
- Healthcheck: `pg_isready -U newshub -d newshub` every 10s

### Redis (`redis`)
- Image: `redis:7.4-alpine`
- Port mapping: `6379:6379`
- Persistence: AOF enabled with fsync every second
- Healthcheck: `redis-cli ping` every 10s

### Application (`app`)
- Container overrides: `DATABASE_URL=postgresql://newshub:newshub_dev@postgres:5432/newshub`, `REDIS_URL=redis://redis:6379`
- Port mapping: `3001:3001`
- Healthcheck: `wget http://localhost:3001/health` every 30s

### Prometheus (`prometheus`)
- Image: `prom/prometheus:v3.4.0`
- Port mapping: `9090:9090`
<!-- VERIFY: Prometheus dashboard URL in production deployment -->
- Retention: 15 days

### Alertmanager (`alertmanager`)
- Image: `prom/alertmanager:v0.28.1`
- Port mapping: `9093:9093`
<!-- VERIFY: Alertmanager webhook URLs and notification targets -->

### Grafana (`grafana`)
- Image: `grafana/grafana-oss:13.0.1`
- Port mapping: `3000:3000`
- Default credentials: `admin` / `admin` (should be changed in production)
<!-- VERIFY: Grafana admin password in production deployment -->

## Frontend Environment Variables (Vite)

Frontend environment variables are prefixed with `VITE_` and embedded at build time:

| Variable | Purpose | Access |
|----------|---------|--------|
| `VITE_SENTRY_DSN` | Sentry error tracking | `import.meta.env.VITE_SENTRY_DSN` |
| `VITE_SENTRY_ENVIRONMENT` | Sentry environment tag | `import.meta.env.VITE_SENTRY_ENVIRONMENT` |
| `VITE_SENTRY_RELEASE` | Sentry release version | `import.meta.env.VITE_SENTRY_RELEASE` |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Sentry traces sample rate | `import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE` |

Additional Vite-specific configuration is in `vite.config.ts`:
- Dev server port: `5173`
- Proxy `/api` requests to `http://localhost:3001`
- Build source maps: `hidden` (generated but not exposed)
- Chunk size warning limit: `500` KB

## Puppeteer Configuration (Docker Only)

The Dockerfile sets Puppeteer environment variables automatically (do not set in `.env`):

```dockerfile
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

This ensures Puppeteer uses the system-installed Chromium in the Docker container rather than downloading its own copy.
