# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NewsHub is a multi-perspective global news analysis platform. It aggregates news from 130 sources across 13 regions, with real-time translation, sentiment analysis, perspective comparison visualization, and AI-powered insights.

## Planning Workflow (.planning/)

This repo is driven by the GSD planning system. Read these before resuming work:

- `.planning/STATE.md` — Current milestone, phase, in-flight plan, and decisions log (read first)
- `.planning/ROADMAP.md` — Phase breakdown, dependencies, and goals
- `.planning/PROJECT.md` — Product vision and core value
- `.planning/phases/<NN-name>/` — Per-phase artifacts: `PLAN.md`, `RESEARCH.md`, `CONTEXT.md`, `SUMMARY.md`, `UAT.md`, `VERIFICATION.md`
- `.planning/debug/` — Active debug sessions (anything not `*-resolved*` is unresolved)
- `.planning/todos/pending/` — Pending operational todos

When picking up a phase, read its `PLAN.md` plus the relevant Decisions rows in `STATE.md`. Don't duplicate decisions into new docs — append to STATE.md.

### Doc workflow

Docs in `docs/` and root (`README.md`, `CONTRIBUTING.md`) carry a `<!-- generated-by: gsd-doc-writer -->` marker and are managed by the `gsd-doc-writer` agent. To refresh, spawn one agent per doc with `mode: update` — don't hand-edit unless you also update CLAUDE.md (the source of truth the agent reads from).

## Monorepo Structure

This is a pnpm monorepo with workspace packages:

```
NewsHub/
├── apps/
│   └── web/                    # Main web application (frontend + backend)
│       ├── src/                # React frontend
│       ├── server/             # Express backend
│       ├── prisma/             # Database schema
│       └── e2e/                # Playwright tests
├── packages/
│   └── types/                  # Shared TypeScript types (@newshub/types)
├── pnpm-workspace.yaml
└── package.json                # Root scripts (proxy to apps/web)
```

## Commands

```bash
# Development
pnpm dev                  # Both frontend (5173) + backend (3001)
pnpm dev:frontend         # Frontend only
pnpm dev:backend          # Backend only

# Build & Verify (run before committing)
pnpm typecheck && pnpm test:run && pnpm build

# Quality
pnpm typecheck            # TypeScript validation (all packages)
pnpm lint                 # ESLint validation (all packages)

# Unit Testing (Vitest) - 80% coverage (branches at 75% per waiver in vitest.config.ts)
pnpm test                 # Run unit tests (watch mode)
pnpm test:run             # Run tests once (CI mode)
pnpm test:coverage        # Coverage report (fails below threshold)

# E2E Testing (Playwright)
pnpm test:e2e             # Playwright headless
pnpm test:e2e:headed      # Playwright with browser visible
pnpm test:e2e:ui          # Interactive UI mode

# Database (Prisma + PostgreSQL)
docker compose up -d postgres redis   # Start services
cd apps/web && npx prisma generate    # Generate client (after schema changes)
cd apps/web && npx prisma db push     # Sync schema to database
cd apps/web && npx prisma studio      # Database GUI (localhost:5555)

# Seed Data
pnpm seed                 # All seed scripts (badges + personas)
pnpm seed:badges          # Gamification badges only
pnpm seed:personas        # AI personas only
pnpm seed:load-test       # Pre-create 100 verified test users (loadtest1-100@example.com)

# Load Testing (k6)
pnpm load:smoke           # Quick smoke scenario
pnpm load:full            # Full load scenario
# Manual via GitHub Actions: workflow_dispatch on load-test.yml (STAGING_URL only)

# OpenAPI Spec
cd apps/web && pnpm openapi:generate   # Regenerate public/openapi.json from Zod schemas

# CI Validation
pnpm validate:ci          # Validate .github/workflows/ci.yml syntax

# Run Single Tests
pnpm test -- apps/web/src/lib/utils.test.ts      # Single unit test file
pnpm test -- -t "mapCentering"                   # Tests matching pattern
cd apps/web && npx playwright test e2e/auth.spec.ts  # Single E2E test

# Docker (Production)
docker compose up -d      # All services (app, postgres, redis, prometheus, grafana)
docker compose logs -f app

# Monitoring (included in docker compose)
# Prometheus: localhost:9090 | Grafana: localhost:3000 (admin/admin)
```

## Tech Stack

- **Frontend**: React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4
- **State**: Zustand v5 (localStorage `newshub-storage`) + TanStack Query v5
- **Visualization**: Recharts 3, globe.gl 2, Leaflet 1.9
- **Backend**: Express 5 (TypeScript, ES modules)
- **Database**: PostgreSQL via Prisma 7 (adapter: @prisma/adapter-pg)
- **Real-time**: Socket.io
- **AI**: Multi-provider fallback (OpenRouter → Gemini → Anthropic)
- **Translation**: Multi-provider chain (DeepL → Google → LibreTranslate → Claude)
- **Testing**: Vitest (unit, 80% coverage; **branches at 75% — TODO waiver in `vitest.config.ts`**) + Playwright (E2E)
- **Monitoring**: Prometheus + Grafana + Alertmanager; Sentry for errors

## Architecture

### Frontend (`apps/web/src/`)
- **Routing**: React Router v7 with lazy-loaded pages via Suspense
- **State**: Zustand store for UI (theme, language, filters, bookmarks, feed settings, reading history)
- **Data Fetching**: TanStack Query with error/loading states
- **Auth**: Context API with JWT in localStorage
- **Offline Sync**: `services/syncService.ts` queues actions in IndexedDB when offline

### Backend (`apps/web/server/`)
- **Singleton Services**: All services use `getInstance()` pattern
- **Data Flow**: RSS/HTML crawl → Dedup → Sentiment → Translation → Database/Cache
- **Generated Client**: `src/generated/prisma/` (do not edit)
- **Caching**: Redis for JWT blacklist, rate limits, AI responses; in-memory fallback
- **Rate Limiting**: Tiered (auth 5/min, AI 10/min, news 100/min)

### Key Services (`apps/web/server/services/`)
| Service | Purpose |
|---------|---------|
| `newsAggregator.ts` | Orchestrates RSS fetching, dedup, and storage |
| `aiService.ts` | Multi-provider AI with fallback chain |
| `translationService.ts` | Multi-provider translation chain |
| `websocketService.ts` | Real-time updates via Socket.io |
| `cleanupService.ts` | Daily cleanup: unverified accounts (30d), analytics (90d) |
| `cacheService.ts` | Redis wrapper with graceful degradation |
| `teamService.ts` | Team collaboration features |
| `commentService.ts` | Article comments with threading |
| `subscriptionService.ts` | Stripe subscription management |

### Shared Types (`packages/types/`)
Import shared types from `@newshub/types`:
```typescript
import type { PerspectiveRegion, NewsArticle, ApiResponse } from '@newshub/types';
```

## Database Schema (`apps/web/prisma/schema.prisma`)

### Core Models
- `NewsArticle` - Articles with JSONB translations (`titleTranslated`, `contentTranslated`)
- `NewsSource` - 130 news sources with bias metadata
- `User` - Auth with email verification, OAuth (Google/GitHub), token versioning
- `Bookmark` / `ReadingHistory` - User article interactions

### Feature Models
- `StoryCluster` - Topic clustering with perspective analysis
- `EmailSubscription` / `EmailDigest` - Email digest feature
- `AIPersona` / `UserPersona` - Customizable AI personalities (8 built-in)
- `SharedContent` / `ShareClick` - Social sharing analytics
- `Comment` - Threaded article comments
- `Team` / `TeamMember` / `TeamBookmark` / `TeamInvite` - Team collaboration
- `ApiKey` - Developer API keys with tier-based rate limits

### Gamification Models
- `Badge` - Achievement badges with tiers (bronze, silver, gold, platinum)
- `UserBadge` - User earned badges with progress tracking
- `LeaderboardSnapshot` - Periodic leaderboard snapshots

## Key Patterns

### Query Key Synchronization (CRITICAL)
Components sharing data MUST use identical `queryKey` values:

```typescript
// Monitor.tsx AND EventMap.tsx both use:
queryKey: ['geo-events']
staleTime: 60_000
refetchInterval: 2 * 60_000
```

### Multi-Provider AI Fallback
The AI service uses a fallback chain:
1. **OpenRouter** (free models) - Primary
2. **Gemini** (free tier, 1500 req/day) - Secondary
3. **Anthropic** (premium) - Fallback
4. Keyword-based analysis - Final fallback

### Graceful Degradation
```typescript
const { data, error } = useQuery({ queryKey: ['data'], queryFn: fetchData, retry: 1 });
if (error) return null;  // Don't break the page
```

### Class Utility
```typescript
import { cn } from '../lib/utils';
className={cn('base-class', isActive && 'active-class', variant)}
```

## Core Types

```typescript
type PerspectiveRegion = 'usa' | 'europa' | 'deutschland' | 'nahost' | 'tuerkei' | 'russland' | 'china' | 'asien' | 'afrika' | 'lateinamerika' | 'ozeanien' | 'kanada' | 'alternative';
type Sentiment = 'positive' | 'negative' | 'neutral';
type EventSeverity = 'critical' | 'high' | 'medium' | 'low';
type EventCategory = 'conflict' | 'humanitarian' | 'political' | 'economic' | 'military' | 'protest';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total: number; page: number; limit: number };
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/news` | GET | List articles (regions, search, sentiment, pagination) |
| `/api/news/:id` | GET | Single article |
| `/api/news/sources` | GET | All 130 sources |
| `/api/translate` | POST | Translate text `{text, targetLang}` |
| `/api/auth/register` | POST | Create account (triggers email verification) |
| `/api/auth/login` | POST | Login (returns JWT) |
| `/api/auth/me` | GET | Current user (Bearer token) |
| `/api/analysis/clusters` | GET | Topic clustering (`?summaries=true` for AI) |
| `/api/ai/ask` | POST | RAG Q&A `{question, context[]}` |
| `/api/events/geo` | GET | Geo-located events |
| `/api/events/timeline` | GET | Historical event timeline |
| `/api/comments/:articleId` | GET/POST | Article comments |
| `/api/teams` | GET/POST | Team management |
| `/api/health` | GET | Server status |
| `/api/metrics` | GET | Prometheus metrics |

## Public API & OpenAPI

External developers consume `apps/web/server/routes/publicApi.ts`, gated by API keys.

- **Key format:** `nh_{env}_{random}_{checksum}` (Stripe-inspired); `bcrypt` factor 10 hashing
- **Header:** `X-API-Key` (per OpenAPI security scheme)
- **Limits:** Max 3 keys per user (prevents rate-limit bypass via key multiplication); checksum pre-validation prevents wasteful DB lookups
- **Rate limiting:** Keyed by API key ID (NAT/VPN friendly); IETF `RateLimit-*` headers
- **Spec source:** Code-first via `@asteasolutions/zod-to-openapi` — Zod schemas in `server/openapi/schemas.ts` are the single source of truth for runtime validation AND API docs
- **Docs UI:** Scalar at `/api-docs`; spec served from `/openapi.json`
- **Cache:** Validated keys cached 5 min in Redis (only first 15 chars stored as identifier for security)
- **Schema/contract gotcha:** `/api/v1/public/news` hand-maps top-level `sourceId` from `source.id` in the route handler. The read service returns only the nested `source` object; OpenAPI requires both. New public-API endpoints surfacing articles must replicate this mapping or fail the schema contract.

## Subscription Tiers (Stripe)

Tiered access enforced via middleware. Tiers: `FREE` / `PREMIUM` / `ENTERPRISE`.

- **SDK:** `stripe@22.1.0`, API version pinned to `2024-12-18.acacia`
- **FREE limits:** 10 AI queries/day, 7-day reading history visibility, 100 history entries (PREMIUM: 1000)
- **Middleware:**
  - `requireTier(tier)` — hard gate; returns 403 with `upgradeUrl` for `CANCELED`/`PAUSED`
  - `attachUserTier` — soft attach without blocking (for tier-aware UI)
  - `aiTierLimiter` — 24h sliding window for FREE tier AI usage
- **Grace period:** `PAST_DUE` allows access for 7 days; `CANCELED`/`PAUSED` blocks Premium routes immediately
- **Webhook (CRITICAL):** Webhook route MUST be registered **before** `express.json()` so the raw body is preserved for HMAC signature verification. Idempotency: 24h dual-storage (Redis + DB).
- **Security:** Price ID whitelist on checkout (prevents arbitrary price injection); return 200 on processing errors so Stripe doesn't retry duplicates
- **Cache:** 5-min subscription status TTL; gracefully degrades when `STRIPE_SECRET_KEY` not set

## i18n & PWA

- **i18n:** `react-i18next` + `i18next-icu` for ICU plural rules; languages **DE / EN / FR**
- **Translation files:** `apps/web/src/i18n/locales/{de,en,fr}/`
- **Language sync:** Bidirectional between Zustand store and i18next — `useAppStore.subscribe` watches language, syncs to i18next on load (so language persists across sessions)
- **Date format:** Hybrid — relative ("5 min ago") for < 7 days, absolute ("Apr 23, 2026") for >= 7 days
- **PWA:** `vite-plugin-pwa` ships service worker + offline shell; install banner via `InstallPromptBanner`
- **Mobile:** `md:` (768px) is the primary breakpoint, not `lg:`; safe-area insets via CSS `env(safe-area-inset-*)` for notched devices

## CI/CD

- **`.github/workflows/ci.yml`** — Lint, typecheck, test (80% coverage gate), build; Lighthouse CI runs **after deploy-staging on master only** (90+ required for performance / accessibility / best-practices / SEO; Core Web Vitals tracked warn-only)
- **`.github/workflows/load-test.yml`** — k6 load tests via `workflow_dispatch` against `STAGING_URL` (manual trigger; never runs on production)
- **Validate locally:** `pnpm validate:ci` (uses `action-validator`)
- **Sentry:** `@sentry/vite-plugin` uploads source maps during CI build; release tag `newshub@${{ github.sha }}`; environment set per deploy job (staging vs production)
- **Bundle budget:** 250KB warning threshold (CI annotation, non-blocking). The PR-vs-base size compare uses `continue-on-error: true` because the action fails on stale-lockfile master — TODO to tighten once stabilized.
- **Artifacts:** Lighthouse reports retained 30 days; load-test JSON+HTML retained 30 days
- **Branch protection on `master`:** requires checks `Lint`, `Type Check`, `Unit Tests`, `Build Docker Image`, `E2E Tests` (display names, not job IDs); `strict: true`, admin-enforced. The `production` environment requires reviewer approval (`ikarusXPS`) and restricts deploys to protected branches.

## Performance Budgets

Codified targets (validated via k6 + Lighthouse):

| Metric | Threshold |
|--------|-----------|
| News API p95 | < 500ms |
| AI API p95 | < 5s |
| Auth API p95 | < 300ms |
| LCP / CLS / INP / FCP | < 2s / < 0.05 / < 150ms / < 1.5s (warn-only) |
| Slow query warning | > 100ms (dev only, via `queryCounter` middleware) |
| N+1 detection | Warn if request issues > 5 queries (dev only, `AsyncLocalStorage` request scope) |

Dev-only diagnostics are gated by `NODE_ENV !== 'production'`.

## E2E Testing Structure

Playwright tests split into authenticated and unauthenticated projects:

```typescript
// apps/web/playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },  // Creates auth state
  { name: 'chromium', ... },                       // Unauthenticated
  { name: 'chromium-auth', storageState: 'playwright/.auth/user.json', dependencies: ['setup'] },
]
```

Debug E2E:
```bash
cd apps/web && npx playwright test --debug     # Step-through debugger
cd apps/web && npx playwright test --ui        # Interactive UI
cd apps/web && npx playwright show-report      # View last report
```

### E2E Conventions (learned the hard way)

- Use `page.waitForLoadState('domcontentloaded')`, NOT `networkidle` — Socket.io polling never lets the network idle, every test times out
- Use `127.0.0.1`, NOT `localhost`, for backend API calls — Node 18+ resolves `localhost` to IPv6 `::1` first, Express on `0.0.0.0` doesn't always bind there
- `page.request.*` does NOT auto-attach the JWT from localStorage like the browser fetch interceptor does. For authenticated API tests, read the token via `page.evaluate(() => localStorage.getItem('newshub-auth-token'))` and pass `Authorization: Bearer ${token}` manually
- For test files sharing module-scope state (e.g. `publicApi.spec.ts` shares `testApiKey` across describes), add `test.describe.configure({ mode: 'serial' })` at file top — `fullyParallel: true` otherwise splits describes across workers and shared variables are undefined for worker N>0
- `apps/web/e2e/fixtures.ts` mocks AI/analysis/geo-events endpoints + bypasses FocusOnboarding (`hasCompletedOnboarding: true`) and ConsentBanner (`newshub-consent`) via init script. Free-tier AI quota is ~10 calls before errors cascade through any test that hits the dashboard, bookmarks, or analysis page.
- `auth.setup.ts` polls `/api/health` (IPv4) for up to 30s before registering — Playwright's `webServer` waits for frontend (5173) but not backend (3001), so registration would otherwise hit ECONNREFUSED on first run

### Currently-skipped E2E tests

| Test | Reason |
|---|---|
| `settings.spec.ts` × 3 (Deutsch/English buttons) | UI moved to header LanguageSwitcher (D-04); tests target dead code |
| `analysis.spec.ts` × 2 (compare modal open/close) | Button consistently misses 10s visibility budget under 4-worker parallel CI load |
| `publicApi.spec.ts` Cache Headers + Revocation | Self-skip when 3-key-per-user cap (D-10) is hit; covered by upstream auth tests |

### Z-index ladder

Stacking order matters — onboarding overlays at high z used to cover login buttons:

| Layer | z-index |
|---|---|
| scan-line CSS effect | `z-0` (was z-1000 — caused click-through bug) |
| Header | `z-20` |
| AuthModal / Compare modal | `z-50` |
| FocusOnboarding | `z-[90]` |
| ConsentBanner | `z-[100]` |

## UI Design System

- **Theme**: Dark cyber aesthetic with cyan accent (`#00f0ff`)
- **Colors**: Red (`#ff0044`), Green (`#00ff88`), Yellow (`#ffee00`), Purple (`#bf00ff`)
- **Region Colors**: Western (blue), Middle East (green), Turkish (red), Russian (purple), Chinese (yellow), Alternative (cyan)
- **Fonts**: Inter (body), JetBrains Mono (headers, code)

## Environment Variables

```bash
# Required
PORT=3001
DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public"
REDIS_URL=redis://localhost:6379
JWT_SECRET=               # Required, minimum 32 characters

# AI (ONE required, priority: OpenRouter → Gemini → Anthropic)
OPENROUTER_API_KEY=       # FREE tier - multiple free models (recommended)
GEMINI_API_KEY=           # FREE tier - 1500 req/day
ANTHROPIC_API_KEY=        # Premium fallback

# Translation (at least one recommended)
DEEPL_API_KEY=
GOOGLE_TRANSLATE_API_KEY=

# Email (for verification and digests)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Payments (optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Adding New Sources

Edit `apps/web/server/config/sources.ts`:
```typescript
{
  id: 'source-id',
  name: 'Source Name',
  country: 'XX',
  region: 'usa' | 'europa' | 'deutschland' | 'nahost' | ...,
  language: 'en',
  bias: { political: 0, reliability: 8, ownership: 'private' },
  apiEndpoint: 'https://example.com/rss.xml',
  rateLimit: 100,
}
```

## GDPR Compliance

### Consent Management
- `ConsentContext` manages 3 categories: essential (required), preferences, analytics
- `ConsentBanner` shows on first visit, stores in `newshub-consent` localStorage

### Data Retention (automated via cleanupService)
| Data | Retention |
|------|-----------|
| Unverified accounts | 30 days |
| ShareClick analytics | 90 days |
| JWT tokens | 7 days (Redis blacklist) |

### User Rights
| Right | Endpoint |
|-------|----------|
| Data Export (Art. 20) | `GET /api/account/export?format=json\|csv` |
| Account Deletion (Art. 17) | `POST /api/account/delete-request` (7-day grace) |
| History Pause (Art. 18) | `isHistoryPaused` store toggle |
