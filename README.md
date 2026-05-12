<!-- generated-by: gsd-doc-writer -->
# NewsHub

> **Multi-perspective global news analysis.** Aggregates 130+ sources across 17 regions, translates and sentiment-tags every article, clusters topics, surfaces how different regions frame the same story, and lets developers consume it all through a versioned public API.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6)
![Vite](https://img.shields.io/badge/Vite-8-646cff)
![Express](https://img.shields.io/badge/Express-5-000000)
![Prisma](https://img.shields.io/badge/Prisma-7-2d3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791)
![Tests](https://img.shields.io/badge/coverage-80%25_lines-success)

![NewsHub Dashboard](docs/screenshots/dashboard.png)

> **Screenshot freshness:** captures in `docs/screenshots/` were taken 2026-04-29. The UI has continued to evolve through milestone v1.6 (mobile bottom nav, FactCheck drawer, team UI wiring, transcripts drawer for podcasts/videos) — re-capture using the Playwright recipe in [`docs/screenshots/CAPTURE-GUIDE.md`](docs/screenshots/CAPTURE-GUIDE.md) if you want pixel-current shots.

---

## Table of Contents

- [What is NewsHub?](#what-is-newshub)
- [Screenshot Tour](#screenshot-tour)
- [Quick Start](#quick-start)
  - [Path A — Local Development (5 minutes)](#path-a--local-development-5-minutes)
  - [Path B — Full Docker Compose Stack](#path-b--full-docker-compose-stack)
  - [Path C — Mobile App (iOS + Android)](#path-c--mobile-app-ios--android-via-capacitor)
- [Monorepo Layout](#monorepo-layout)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Tutorials](#tutorials)
- [Common Commands](#common-commands)
- [API](#api)
- [Deployment](#deployment)
- [Documentation Index](#documentation-index)
- [Contributing](#contributing)
- [License](#license)

---

## What is NewsHub?

Three problems newsrooms, analysts, and curious readers all hit:

1. **No single feed shows you the same story from multiple regional perspectives.** A US wire and a Turkish wire and a Russian wire cover the same event with different framing — but you'd have to open a dozen tabs to compare.
2. **Bias is mostly invisible.** Most aggregators don't surface political lean or reliability ratings, so readers can't weight what they're reading.
3. **Developers can't easily consume curated multi-region news.** APIs like NewsAPI are flat — no perspective metadata, no clustering, no sentiment.

NewsHub is a single platform that:

- **Crawls 130+ curated RSS sources** across 17 regions (USA, Europe, Germany, Middle East, Turkey, Russia, China, Asia, Africa, Latin America, Oceania, Canada, Alternative, plus the Phase 40 sub-regions Southeast Asia, Northern Europe, Sub-Saharan Africa, India). Each source carries a `bias` profile (`political`, `reliability`, `ownership`).
- **Translates and sentiment-tags every article** through a multi-provider fallback chain (DeepL → Google → LibreTranslate → Claude).
- **Clusters articles by topic** and visualizes regional framing differences in a single comparison view.
- **Exposes everything via a public REST API** with versioned endpoints, OpenAPI spec, and tiered rate limits — `nh_{env}_{random}_{checksum}` API keys, IETF `RateLimit-*` headers.
- **Runs as a PWA, mobile app, and desktop web** from the same `apps/web/dist` bundle (Capacitor 8 wraps web for iOS + Android — 95%+ code reuse).

The codebase ships with subscription tiers (Stripe), team collaboration, threaded comments, gamification badges, real-time updates over Socket.IO with cross-replica fanout via Redis, transcript drawers for embedded podcasts/videos, and a complete observability stack (Prometheus + Grafana + Alertmanager + Sentry).

---

## Screenshot Tour

<table>
<tr>
<td width="50%" align="center">
<img src="docs/screenshots/dashboard.png" alt="Dashboard with Signal Cards" />
<br/><sub><b>Dashboard</b> — Signal Cards across regions, sentiment-tagged, real-time updates over Socket.IO</sub>
</td>
<td width="50%" align="center">
<img src="docs/screenshots/monitor-globe.png" alt="3D event globe" />
<br/><sub><b>Globe Monitor</b> — 3D globe (globe.gl 2) with event markers, severity-colored. Cross-replica fanout via Redis adapter.</sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="docs/screenshots/analysis.png" alt="Perspective analysis" />
<br/><sub><b>Analysis</b> — topic clusters with regional perspective distribution; AI-summarized when <code>?summaries=true</code></sub>
</td>
<td width="50%" align="center">
<img src="docs/screenshots/timeline.png" alt="Historical timeline" />
<br/><sub><b>Timeline</b> — chronological event list, severity (critical / high / medium / low) and category (conflict / humanitarian / political / economic / military / protest / diplomacy / other)</sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="docs/screenshots/community.png" alt="Community / Teams" />
<br/><sub><b>Community</b> — gamification (badges bronze → platinum), leaderboard snapshots, team workspaces</sub>
</td>
<td width="50%" align="center">
<img src="docs/screenshots/podcasts.png" alt="Podcasts directory" />
<br/><sub><b>Podcasts</b> — curated feed list + episode browser with transcript drawer (Phase 40); two-tier search (titles for FREE, transcript-excerpts for PREMIUM)</sub>
</td>
</tr>
<tr>
<td colspan="2" align="center">
<img src="docs/screenshots/shortcuts.png" alt="Keyboard shortcuts" width="50%" />
<br/><sub><b>Keyboard Shortcuts</b> — press <kbd>Shift</kbd>+<kbd>?</kbd> anywhere to bring up the cheat sheet</sub>
</td>
</tr>
</table>

---

## Quick Start

Three paths depending on what you're trying to accomplish.

### Path A — Local Development (5 minutes)

The fastest way to see NewsHub running with hot reload.

**Prerequisites:** Node.js >= 18, [pnpm](https://pnpm.io/installation), Docker (for PostgreSQL 17 + Redis 7).

```bash
# 1. Clone + install
git clone https://github.com/ikarusXPS/NewsHubitat.git
cd NewsHub
pnpm install

# 2. Boot PostgreSQL + Redis (containerized so you don't pollute your machine)
docker compose up -d postgres redis

# 3. Configure secrets
cp .env.example .env
# Edit .env:
#   - Set JWT_SECRET to a >=32 char random string (e.g. `openssl rand -base64 48`)
#   - Set ONE of OPENROUTER_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY
#     (OpenRouter has a free tier — recommended for local dev)

# 4. Initialize the database + seed gamification data
cd apps/web && npx prisma generate && npx prisma db push && cd ../..
pnpm seed                    # badges + AI personas
pnpm seed:load-test          # OPTIONAL: 100 verified test users for k6

# 5. Run dev (frontend :5173, backend :3001)
pnpm dev
```

Open http://localhost:5173. OpenAPI spec at http://localhost:3001/api/openapi.json; interactive Scalar UI at http://localhost:5173/developers.

> **First-run gotcha (Windows + WSL):** if `pnpm seed` errors on `bcrypt`, rebuild native modules: `pnpm rebuild`.

> **Want to skip seeding and pull live news?** The aggregator polls every 5 minutes once started — `cd apps/web && pnpm dev:backend` and watch `[NewsAggregator]` logs. First poll fetches ~130 sources × 20 articles each.

### Path B — Full Docker Compose Stack

For demos, integration testing, and "production-shaped" local runs.

```bash
# Boots: app, postgres, redis, prometheus (:9090), grafana (:3000), alertmanager (:9093)
docker compose up -d
docker compose logs -f app
```

| Service | URL | Default credentials |
|---|---|---|
| App | http://localhost:3001 | — |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3000 | `admin` / `admin` (change in production!) |
| Alertmanager | http://localhost:9093 | — |
| Postgres | `localhost:5433` | `newshub` / `newshub_dev` |
| Redis | `localhost:6379` | — |

Stop everything: `docker compose down`. Stop + wipe data: `docker compose down -v`.

### Path C — Mobile App (iOS + Android via Capacitor)

NewsHub ships as a true native app (not just a webview shortcut) using Capacitor 8 wrapping the same `apps/web/dist` bundle. Bundle ID: `com.newshub.app`.

```bash
# 1. Build the web bundle and sync into native projects
pnpm --filter @newshub/mobile build
# This runs: pnpm --filter @newshub/web build  →  pnpm cap:sync

# 2a. iOS (requires macOS + Xcode)
pnpm --filter @newshub/mobile cap:open:ios
# Opens apps/mobile/ios/App/App.xcworkspace
# Set signing team in Xcode → Run on simulator or device

# 2b. Android (requires Android Studio + JDK 17)
pnpm --filter @newshub/mobile cap:open:android
# Opens apps/mobile/android/ in Android Studio
# Click "Run" → select emulator or device
```

**Reader-app exemption — read this before adding gated features.** Native iOS/Android builds **must hide all pricing surfaces** (Apple Rule 3.1.3 / Google Play equivalent). Detection: `isNativeApp()` from `apps/web/src/lib/platform.ts`. Subscriptions happen on web; the app only reads `user.subscriptionTier` from `/api/auth/me`. See `CLAUDE.md` § Mobile for full guidance.

---

## Monorepo Layout

NewsHub is a **pnpm workspace** monorepo. Every command at the root proxies to `apps/web/` via pnpm filters.

```
NewsHub/
├── apps/
│   ├── web/                       # Frontend + backend + Prisma — the main app
│   │   ├── src/                   # React 19 + Vite 8 + Tailwind v4
│   │   ├── server/                # Express 5 (ES modules) + Socket.IO
│   │   ├── prisma/                # PostgreSQL schema (Prisma 7) + raw FTS migrations
│   │   ├── prisma.config.ts       # Prisma 7 datasource (workspace-local — see CLAUDE.md anti-patterns)
│   │   ├── e2e/                   # Playwright tests (chromium + chromium-auth projects)
│   │   ├── public/                # Static assets + i18n locales (de/en/fr)
│   │   └── dist/                  # Build output (also consumed by Capacitor)
│   └── mobile/                    # @newshub/mobile — Capacitor 8 wrapper
│       ├── android/               # `cap add android` output
│       ├── ios/                   # `cap add ios` output
│       └── capacitor.config.ts    # Bundle ID com.newshub.app, webDir → ../web/dist
├── packages/
│   └── types/                     # Shared @newshub/types (PerspectiveRegion, NewsArticle, ApiResponse...)
├── e2e-stack/                     # Cross-replica WebSocket fanout verification (Phase 37)
├── pgbouncer/                     # PgBouncer config template (production scaling)
├── docs/                          # Architecture, API, deployment, screenshots
├── .planning/                     # GSD planning system (phases, decisions, state)
├── prometheus/                    # Prometheus + alert rules
├── grafana/                       # Grafana provisioning
├── alertmanager/                  # Alertmanager routes
├── docker-compose.yml             # Single-replica development stack
├── stack.yml                      # Docker Swarm topology (production)
└── CLAUDE.md                      # Canonical project guide (source of truth for agents)
```

> **Critical anti-patterns** (locked at the milestone level — cost v1.6 four sub-phases of rework):
> - **Never write to root `server/`, `prisma/`, or `src/`.** Those paths were physically deleted in `651ce93`. Valid roots are `apps/`, `packages/`, `.github/`, `.planning/`.
> - **`prisma.config.ts` lives at `apps/web/prisma.config.ts`, never root.** Prisma 7's `schema:` field resolves relative to the config file's directory; a root-level config silently loads a stale duplicate schema.

Architecture deep-dive: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Tech Stack

| Layer | Stack | Rationale |
|---|---|---|
| **Frontend** | React 19, Vite 8, TypeScript 6, Tailwind CSS v4 | Modern React features (Suspense for routing), fast HMR, utility-first styling |
| **State** | Zustand v5 (`newshub-storage` localStorage), TanStack Query v5 | Flat global UI state + server cache with synchronized query keys |
| **Visualization** | Recharts 3, globe.gl 2, Leaflet 1.9 | Charts + 3D globe + clustered maps |
| **Backend** | Express 5 (ESM), Socket.IO + `@socket.io/redis-adapter` | HTTP + real-time with cross-replica fanout |
| **Database** | PostgreSQL 17 via Prisma 7 (`@prisma/adapter-pg`), PgBouncer transaction-mode | Type-safe ORM + production connection pooling |
| **Cache** | Redis 7 | JWT blacklist, rate limits, AI response cache, Stripe webhook idempotency |
| **AI** | OpenRouter → Gemini → Anthropic fallback chain | Free-tier first, premium fallback |
| **Translation** | DeepL → Google → LibreTranslate → Claude | Provider redundancy |
| **Payments** | Stripe `22.1.0`, API `2024-12-18.acacia` | Subscriptions with raw-body HMAC webhooks + idempotency |
| **Mobile** | Capacitor 8 (iOS + Android) | 95%+ code reuse — wraps the same `apps/web/dist` bundle |
| **i18n** | `react-i18next` + `i18next-icu` (DE / EN / FR) | ICU plural rules + bidirectional Zustand sync |
| **PWA** | `vite-plugin-pwa` | Offline shell + install banner |
| **Testing** | Vitest 80% lines / 73% branches (waiver), Playwright | Unit + integration + E2E |
| **Observability** | Prometheus + Grafana + Alertmanager + Sentry | Metrics, dashboards, alerting, error tracking |
| **Deployment** | Docker Swarm + Traefik (sticky `nh_sticky` cookie) | Horizontal scaling with sticky-session WebSockets |

Production scaling sizing: **4 web replicas × Prisma `max:20` → PgBouncer pool 25 → PostgreSQL `max_connections` 200**. Singleton jobs (cleanup, aggregation) run on a dedicated `app-worker` Swarm service (`replicas=1`, `RUN_JOBS=true`), emitting Socket.IO events through the Redis-backed Emitter so clients on any web replica receive them.

---

## Features

### News Aggregation & Translation

- 130+ curated RSS sources (`apps/web/server/config/sources.ts`) across 17 regions, each tagged with `political` lean (-1..1), `reliability` (1..10), and `ownership` (`private` / `state` / `public` / `mixed`)
- Multi-provider translation with graceful fallback (DeepL primary, Claude as last resort)
- Translations stored as JSONB on `NewsArticle.titleTranslated` / `contentTranslated` so the same article can serve any UI language without re-hitting the translation provider
- Sentiment per article: `positive` / `negative` / `neutral`
- Per-region bias-balance gate (`pnpm check:source-bias`) — flags state-dominated press regions as `biasDiversityNote: 'limited'` (e.g. `russland`, `china`); surfaced as a framing-analysis footnote

### Multi-Perspective Analysis

- `StoryCluster` model groups articles by topic
- Compare modal (`/analysis`) renders the same cluster from each region's framing side-by-side
- AI-generated cluster summaries (`?summaries=true`) — uses the same provider fallback chain
- Region colors (`apps/web/src/lib/utils.ts:getRegionColor`) keep visualizations consistent

### AI Insights

- **RAG Q&A** — `POST /api/ai/ask` with `{question, context[]}`; 24h sliding-window quota for FREE tier (10/day)
- **Source credibility scoring** — `/api/source-credibility/:sourceId` (Phase 38)
- **FactCheck drawer** — Premium-gated; LLM-evaluated claim verdict with citations (Phase 38)
- **8 customizable AI personas** — `AIPersona` model + `UserPersona` overrides (free-tier capable)
- **Framing analysis prompt** at `apps/web/server/prompts/framingPrompt.ts` — controls how the LLM compares regional perspectives

### Public Developer API

- All public endpoints under `/api/v1/public/*`, gated by `X-API-Key` header
- Key format: `nh_{env}_{random}_{checksum}` (Stripe-inspired); `bcrypt` factor 10 hashing
- Max **3 keys per user** to prevent rate-limit bypass via key multiplication
- IETF `RateLimit-*` response headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`)
- Rate limits keyed by API key ID (NAT/VPN-friendly, not by IP)
- 5-minute Redis cache on validated keys; only first 15 chars stored as identifier
- **Code-first OpenAPI spec** via `@asteasolutions/zod-to-openapi` — Zod schemas in `server/openapi/schemas.ts` are the single source of truth for runtime validation AND API docs
- Live spec at `/api/openapi.json` (backend), interactive Scalar UI at `/developers` (frontend SPA route)

### Subscriptions & Tiering

- Three tiers: `FREE` / `PREMIUM` / `ENTERPRISE`
- **FREE limits:** 10 AI queries/day, 7-day reading history visibility, 100 history entries
- **PREMIUM:** Unlimited AI, 1000 history entries, fact-check drawer, transcript downloads (Phase 40)
- Middleware: `requireTier(tier)` (hard gate, returns 403 with `upgradeUrl`), `attachUserTier` (soft attach for tier-aware UI), `aiTierLimiter` (24h sliding window)
- **Grace period:** `PAST_DUE` allows access for 7 days; `CANCELED` / `PAUSED` blocks immediately
- **Stripe webhook critical:** raw body must be preserved BEFORE `express.json()` for HMAC verification. Idempotency: 24h dual-storage (Redis + DB).
- Price ID whitelist on checkout to prevent arbitrary-price injection

### Teams & Comments

- `Team` / `TeamMember` / `TeamBookmark` / `TeamInvite` — role-based access (owner / admin / member)
- TeamSettingsModal + TeamDashboard wired up in Phase 40.1 (gear icon → rename / re-describe)
- Threaded comments on articles via `Comment` model with parent/child relationships

### Gamification

- `Badge` (bronze / silver / gold / platinum) with progress tracking via `UserBadge`
- `LeaderboardSnapshot` for periodic XP rankings

### Embedded Media & Transcripts (Phase 40)

- **Podcasts and videos** are first-class — dedicated `/api/podcasts` and `/api/videos` route groups with embedded players
- **Transcript drawer** opens per-episode on the dashboard (`RelatedPodcasts`) and on the standalone `EmbeddedVideo` component
- Transcripts pulled via `youtube-caption-extractor` for YouTube; `ffmpeg-static` + Whisper-style providers for podcasts
- i18n keys for transcript UI live in `apps/web/public/locales/{de,en,fr}/{podcasts,videos}.json`

### Mobile (Capacitor 8)

- Same `apps/web/dist` bundle wrapped via WKWebView (iOS) / Android WebView
- Plugins: `@capacitor/{app,haptics,keyboard,push-notifications,splash-screen,status-bar,preferences}` + `@capgo/capacitor-native-biometric`
- The same `vite-plugin-pwa` service worker means **offline reading "just works"** — no separate offline codebase
- Bundle ID `com.newshub.app` for both platforms

### Real-Time & Offline

- **WebSocket fanout:** `@socket.io/redis-adapter` propagates events across all web replicas
- **Sticky sessions:** Traefik `nh_sticky` cookie pins clients to a replica per session (Socket.IO upgrade requires it)
- **Offline queue:** `services/syncService.ts` queues actions in IndexedDB when offline, flushes on reconnect
- **PWA install banner:** `InstallPromptBanner` component

### Observability

- **Prometheus metrics** at `/api/metrics` — route-normalized labels (UUID/numeric/ObjectId → `:id` to prevent cardinality explosion); 15s scrape interval
- **Grafana dashboards** — provisioned via `grafana/`
- **Alertmanager rules** — `HighErrorRate` (5xx > 1% for 5m), `HighLatency` (p95 > 2s for 5m)
- **Sentry** — `@sentry/react` (frontend) + `@sentry/node` (backend) with hidden source maps and per-deploy environment tags (`SENTRY_ENVIRONMENT: staging` / `production`)
- **Dev-only diagnostics:** `queryCounter` middleware warns on > 100ms queries; N+1 detector warns when a request issues > 5 queries (gated by `NODE_ENV !== 'production'`)

### GDPR Compliance

- `ConsentContext` manages 3 categories: essential (required), preferences, analytics
- **Data Export (Art. 20):** `GET /api/account/export?format=json|csv`
- **Account Deletion (Art. 17):** `POST /api/account/delete-request` (7-day grace)
- **History Pause (Art. 18):** `isHistoryPaused` Zustand toggle
- **Retention:** unverified accounts 30d, ShareClick analytics 90d, JWT blacklist 7d (Redis)

---

## Tutorials

Six step-by-step walkthroughs for the most common scenarios. Each is collapsed by default — click to expand.

<details>
<summary><b>Tutorial 1 — From <code>git clone</code> to seeing news in your browser (10 min)</b></summary>

This is the canonical first-run. By the end you'll have:
- A running dev server with hot reload
- A seeded local database with badges and AI personas
- Live news from at least one region

#### 1. Clone and install

```bash
git clone https://github.com/ikarusXPS/NewsHubitat.git
cd NewsHub
pnpm install
```

This will install ~120 root packages plus everything inside `apps/web` and `apps/mobile`. Expect a 200-400 MB `node_modules`. If you see `EBADENGINE` warnings, your Node version is < 18 — install Node 20 LTS.

#### 2. Start PostgreSQL and Redis

```bash
docker compose up -d postgres redis
```

Verify both are healthy:

```bash
docker compose ps
# postgres   Up   0.0.0.0:5433->5432/tcp
# redis      Up   0.0.0.0:6379->6379/tcp
```

If port 5433 is taken, edit `docker-compose.yml`'s `postgres.ports` to remap.

#### 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```bash
DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public"
REDIS_URL=redis://localhost:6379
JWT_SECRET=<paste-output-of-`openssl rand -base64 48`>

# Pick ONE — OpenRouter has a free tier with multiple models
OPENROUTER_API_KEY=sk-or-v1-...

# OPTIONAL but recommended for translation quality
DEEPL_API_KEY=...
```

Skipping AI keys is fine — the aggregator falls back to keyword-based sentiment when no provider is configured.

#### 4. Initialize the database

```bash
cd apps/web
npx prisma generate          # Generates the typed client at src/generated/prisma/
npx prisma db push           # Creates all tables in the local Postgres
cd ../..
```

#### 5. Seed gamification + AI personas

```bash
pnpm seed
```

You'll see:

```
[seed] Seeding badges...
[seed] Created 24 badges across 4 tiers
[seed] Seeding AI personas...
[seed] Created 8 personas (Skeptic, Optimist, Historian, ...)
[seed] Done.
```

#### 6. Run the dev server

```bash
pnpm dev
```

Two processes start:
- `[backend] Server listening on :3001`
- `[frontend] vite dev server on :5173`

Open **http://localhost:5173**.

The first article load may be slow — the aggregator's first 5-minute poll cycle fetches ~130 sources before any data is in the DB. Watch backend logs:

```
[NewsAggregator] Polling cycle started
[NewsAggregator] Fetched bbc → 24 articles
[NewsAggregator] Fetched dw → 18 articles
...
[NewsAggregator] Cycle complete in 47.3s — 2,184 articles upserted
```

Once you see articles in the UI, you're done.

#### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5433` | Postgres not running | `docker compose up -d postgres` |
| `JWT_SECRET must be at least 32 characters` | Default value still in `.env` | Generate a real one: `openssl rand -base64 48` |
| Frontend shows "Network error" | Backend not running or port 3001 in use | Check `pnpm dev:backend` output |
| `Cannot find module '@newshub/types'` | Workspace packages not built | `pnpm install` from root again |

</details>

<details>
<summary><b>Tutorial 2 — Adding a custom news source (RSS feed)</b></summary>

You want to track a regional news source NewsHub doesn't ship with. Here's the full path from RSS URL to seeing articles in the dashboard.

#### 1. Find the RSS feed URL

Most newspapers expose `/rss.xml`, `/feed`, or `/atom.xml`. For example, Politico Europe: `https://www.politico.eu/feed/`. Verify with `curl`:

```bash
curl -sI https://www.politico.eu/feed/
# 200 OK + Content-Type: application/rss+xml
```

#### 2. Edit the source registry

Open `apps/web/server/config/sources.ts`. Add an entry to the exported `NEWS_SOURCES` array:

```typescript
{
  id: 'politico-eu',                    // unique slug, lowercase + hyphen
  name: 'Politico Europe',
  country: 'EU',
  region: 'europa',                      // must be a PerspectiveRegion enum value
  language: 'en',
  bias: {
    political: 0.1,                      // -1 (left) to 1 (right); ~0 = center
    reliability: 8,                      // 1 (low) to 10 (high)
    ownership: 'private',                // 'private' | 'state' | 'public' | 'mixed'
  },
  apiEndpoint: 'https://www.politico.eu/feed/',
  rateLimit: 100,                        // requests per minute (informational)
}
```

Allowed `region` values are listed in `packages/types/index.ts` under `PerspectiveRegion`. As of v1.6 (post Phase 40): `usa | europa | deutschland | nahost | tuerkei | russland | china | asien | afrika | lateinamerika | ozeanien | kanada | alternative | sudostasien | nordeuropa | sub-saharan-africa | indien` — 17 regions total.

#### 3. (Optional) Verify it passes the bias-balance gate

If you're adding a source to a region with strict diversity rules (Phase 40):

```bash
cd apps/web
pnpm check:source-bias
# ✓ usa: 5 sources, bias spread [-0.6, 0.7] — balanced
# ✓ europa: 5 sources — balanced
# ℹ russland: limited diversity (exception per D-A3) — skipping
```

#### 4. Restart the backend

```bash
pnpm dev:backend
```

The aggregator reads `NEWS_SOURCES` at boot and polls each source every 5 minutes. Watch for:

```
[NewsAggregator] Fetched politico-eu → 14 articles
```

#### 5. Verify in the database

```bash
cd apps/web && npx prisma studio
# Opens http://localhost:5555
```

Open the `NewsArticle` table → filter `sourceId = "politico-eu"` → you should see articles streaming in.

#### 6. Verify in the UI

Open http://localhost:5173, open Feed Manager (gear icon), enable the `europa` region if it isn't already. Politico Europe articles will appear in the dashboard.

</details>

<details>
<summary><b>Tutorial 3 — Calling the public API (developer integration)</b></summary>

The public API is rate-limited, key-gated, and OpenAPI-documented. Here's how to register a key and make your first call.

#### 1. Register an account + get a key

Use the dev UI:

1. Go to http://localhost:5173 → Sign Up
2. Verify the email (check `apps/web/logs/email-dev.log` for the verification link in dev mode — SMTP is mocked locally)
3. Settings → Developer → "Create API Key"
4. Save the key — it's shown **only once** in the format `nh_dev_<random>_<checksum>`

You can have at most 3 keys per user (the cap prevents rate-limit bypass via key multiplication). Revoke an unused key first if you hit the cap.

#### 2. Make a request

```bash
export NH_KEY="nh_dev_xxxxxxxxxxxxxxxx_xxxxxxxx"

curl -s http://localhost:3001/api/v1/public/news \
  -H "X-API-Key: $NH_KEY" \
  -H "Accept: application/json" | jq '.data[0]'
```

Response shape:

```json
{
  "id": "clxyz...",
  "title": "...",
  "titleTranslated": { "en": "...", "de": "..." },
  "content": "...",
  "url": "https://...",
  "publishedAt": "2026-05-04T12:34:56.000Z",
  "sentiment": "neutral",
  "sourceId": "bbc",
  "source": {
    "id": "bbc",
    "name": "BBC News",
    "region": "europa",
    "bias": { "political": 0.0, "reliability": 9, "ownership": "public" }
  }
}
```

> **Schema gotcha:** `/api/v1/public/news` hand-maps top-level `sourceId` from `source.id` in the route handler. If you write a new public endpoint that returns articles, replicate this mapping or fail the OpenAPI schema contract.

#### 3. Read the rate-limit headers

```bash
curl -sI http://localhost:3001/api/v1/public/news -H "X-API-Key: $NH_KEY"
# RateLimit-Limit: 100
# RateLimit-Remaining: 99
# RateLimit-Reset: 60
```

These follow the IETF `RateLimit` standard and are keyed by **API key ID**, not IP — safe behind NATs/VPNs.

#### 4. Use the OpenAPI spec

```bash
curl -s http://localhost:3001/api/openapi.json | jq '.paths | keys'
```

Or import into Postman / Insomnia / Bruno via the live spec URL. Interactive docs: http://localhost:5173/developers (Scalar UI).

#### 5. (Optional) Generate a TypeScript client

The spec is OpenAPI 3.1, so any codegen works. Example with `openapi-typescript`:

```bash
npx openapi-typescript http://localhost:3001/api/openapi.json -o ./newshub-api.d.ts
```

</details>

<details>
<summary><b>Tutorial 4 — Stripe subscription setup (local end-to-end test)</b></summary>

Test the full FREE → PREMIUM upgrade flow without a real Stripe account spending real money.

#### 1. Get test-mode Stripe keys

1. Sign up at https://stripe.com (free)
2. Dashboard → Developers → API keys → copy the **secret key** (starts with `sk_test_...`)
3. Edit `.env`:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # We'll fill this in step 3
```

#### 2. Create a Premium price

Stripe Dashboard → Products → Add Product → "NewsHub Premium" → Price `$10/month` recurring → Save → copy the price ID (`price_1...`).

Add it to your environment as `STRIPE_PRICE_PREMIUM=price_1...` and update the price-ID whitelist in `apps/web/server/services/subscriptionService.ts` if needed.

#### 3. Set up the webhook listener

Install the Stripe CLI: https://stripe.com/docs/stripe-cli. Then:

```bash
stripe login                    # one-time browser auth
stripe listen --forward-to localhost:3001/api/webhooks/stripe
# Output:
# > Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

Copy that `whsec_...` value into your `.env` as `STRIPE_WEBHOOK_SECRET`. Restart the backend.

> **Critical:** the webhook route is registered **before** `express.json()` so the raw body is preserved for HMAC signature verification. Don't move it.

#### 4. Trigger a checkout

In the app: Settings → Subscription → Upgrade to Premium → click through Stripe Checkout (use test card `4242 4242 4242 4242`, any future expiry, any CVC).

Watch the backend logs:

```
[Webhook] Received checkout.session.completed (evt_xxx)
[Webhook] User abc123 upgraded to PREMIUM
[Webhook] Idempotency key stored in Redis (24h TTL) + ProcessedWebhookEvent table
```

The user's `subscriptionTier` flips to `PREMIUM` immediately. The PREMIUM badge appears in the sidebar; AI quotas lift; Premium-gated features unlock.

#### 5. Test the failure modes

```bash
# Replay the same event — should hit Redis cache and skip processing
stripe events resend evt_xxx
# [Webhook] Event evt_xxx already processed (Redis) — idempotency PASS

# Trigger payment failure
stripe trigger invoice.payment_failed
# Backend marks subscription PAST_DUE; user retains access for 7-day grace period

# Cancel
stripe trigger customer.subscription.deleted
# Backend flips to CANCELED; Premium routes return 403 with upgradeUrl
```

</details>

<details>
<summary><b>Tutorial 5 — Building & running the mobile app (Capacitor 8)</b></summary>

NewsHub's mobile app is the same `apps/web/dist` bundle wrapped via Capacitor 8 — **95%+ code reuse**. Same React components, same Zustand store, same service worker.

#### Prerequisites

- **For iOS:** macOS + Xcode 15+ + an Apple Developer account (for device deployment)
- **For Android:** Android Studio Hedgehog+ + JDK 17 (`brew install --cask zulu17` on macOS, `winget install Microsoft.OpenJDK.17` on Windows)
- A real device or simulator/emulator

#### 1. Build the web bundle and sync into native

```bash
pnpm --filter @newshub/mobile build
```

This runs:
1. `pnpm --filter @newshub/web build` — produces `apps/web/dist/`
2. `pnpm cap:sync` — copies `dist/` into `apps/mobile/ios/App/App/public/` and `apps/mobile/android/app/src/main/assets/public/`, syncs Capacitor plugin metadata

If you only changed native config (e.g. plugin versions), use the faster:

```bash
pnpm --filter @newshub/mobile cap:sync
```

#### 2a. Run on iOS

```bash
pnpm --filter @newshub/mobile cap:open:ios
```

Opens `apps/mobile/ios/App/App.xcworkspace` in Xcode. First time:

1. Select the **App** target in the sidebar
2. Signing & Capabilities → set your **Team** (Apple Developer ID)
3. Bundle Identifier is pre-set to `com.newshub.app`
4. Pick a simulator (e.g. "iPhone 15 Pro") or a connected device
5. Press **Run** (⌘R)

The app loads the bundled web assets and points API calls at the backend configured at build time via the `VITE_API_URL` env var (relative `/api/...` paths in dev are proxied by Vite per `apps/web/vite.config.ts`).

#### 2b. Run on Android

```bash
pnpm --filter @newshub/mobile cap:open:android
```

Opens `apps/mobile/android/` in Android Studio.

1. Wait for Gradle sync (~1 min first time)
2. Tools → Device Manager → create an emulator (Pixel 7, API 34) or plug in a device
3. Press **Run** (Shift+F10)

#### 3. Native plugin gotchas

- **Push notifications** (`@capacitor/push-notifications`) — requires Firebase + APNs setup. See `CLAUDE.md` § Mobile for the FCM/APNs config flow.
- **Biometric** (`@capgo/capacitor-native-biometric`) — JWT lives in iOS Keychain / Android Keystore via secure-storage; biometric unlock on subsequent launches; 3-fail fallback to password.
- **Reader-app exemption (CRITICAL — Apple Rule 3.1.3 / Google Play equivalent):**
  - When `isNativeApp()` returns true (from `apps/web/src/lib/platform.ts`), **hide every pricing surface** — `TierCard`, `UpgradePrompt`, `AIUsageCounter` upgrade link, any `/pricing` route reference
  - FREE-tier feature gates show a generic "feature not available" message + plain-text `newshub.example` URL (NOT clickable — App Review risk per Rule 3.1.1(a))
  - Subscriptions happen on web; the app reads `user.subscriptionTier` from `/api/auth/me`
- **No in-app purchases** in this milestone — Apple IAP / Google Play Billing deferred to v1.7+

#### 4. Production builds

For TestFlight or Play Store internal testing:

- **iOS:** Xcode → Product → Archive → Distribute App → App Store Connect
- **Android:** Build → Generate Signed Bundle → AAB → upload to Play Console

CI/CD for mobile builds is intentionally minimal in v1.6 — one signed build per platform per release, no GitHub Actions matrix yet (deferred per Phase 39 D-14).

</details>

<details>
<summary><b>Tutorial 6 — Production deployment via Docker Swarm (with Traefik + PgBouncer)</b></summary>

Local dev uses a single-replica `docker-compose.yml`. Production uses Docker Swarm via `stack.yml` with horizontal scaling, sticky sessions, and connection pooling.

#### Topology

```
                    ┌──────────────┐
                    │   Traefik    │  (TLS, sticky session via nh_sticky cookie)
                    └──────┬───────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐   ┌────────┐   ┌────────┐
         │ web-1  │   │ web-2  │   │ web-N  │   (replicas — horizontal scale)
         └───┬────┘   └───┬────┘   └───┬────┘
             └────────────┼────────────┘
                          ▼
                  ┌──────────────┐
                  │   Redis      │  (Socket.IO adapter + cache + rate limits)
                  └──────────────┘
                          ▲
                          │ (pub/sub)
                  ┌──────────────┐
                  │ app-worker   │  (replicas=1, RUN_JOBS=true — singleton jobs)
                  └──────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │  PgBouncer   │  (transaction-mode pool 25)
                  └──────┬───────┘
                         ▼
                  ┌──────────────┐
                  │ PostgreSQL 17│  (max_connections 200)
                  └──────────────┘
```

#### 1. Initialize Swarm + secrets

On the manager node:

```bash
docker swarm init --advertise-addr <manager-ip>

# Store secrets — Swarm rotates these without restart
echo "$JWT_SECRET" | docker secret create newshub_jwt_secret -
echo "$DATABASE_URL" | docker secret create newshub_database_url -
echo "$REDIS_URL" | docker secret create newshub_redis_url -
echo "$STRIPE_WEBHOOK_SECRET" | docker secret create newshub_stripe_webhook -
# ... etc
```

#### 2. Configure PgBouncer

The template is in `pgbouncer/`. Sizing for 4 web replicas:

```ini
# pgbouncer.ini
[databases]
newshub = host=postgres port=5432 dbname=newshub auth_user=newshub

[pgbouncer]
pool_mode = transaction              # not session — Prisma supports transaction mode
max_client_conn = 200
default_pool_size = 25
reserve_pool_size = 5
server_idle_timeout = 600
```

> Prisma must use `?pgbouncer=true` on the runtime `DATABASE_URL` to disable prepared statements. Migrations need a separate `DIRECT_URL` bypassing PgBouncer.

#### 3. Deploy the stack

```bash
docker stack deploy -c stack.yml newshub
```

Verify replicas are healthy:

```bash
docker service ls
# NAME                REPLICAS   IMAGE
# newshub_web         4/4        newshub:v1.6.0
# newshub_app-worker  1/1        newshub:v1.6.0
# newshub_traefik     1/1        traefik:v3
# newshub_pgbouncer   1/1        edoburu/pgbouncer:latest
# newshub_postgres    1/1        postgres:17
# newshub_redis       1/1        redis:7
```

#### 4. Verify cross-replica WebSocket fanout

This is the Phase 37 acceptance gate. Run from a separate machine:

```bash
pnpm test:fanout
```

This boots the e2e-stack (`e2e-stack/docker-compose.test.yml`), emits a Socket.IO event on replica A, and asserts the client connected to replica B receives it. Mocked-adapter tests do **not** satisfy this gate — only the full stack does.

#### 5. Graceful shutdown

`/api/ready` is a separate readiness probe split from `/api/health`. SIGTERM:

1. Drains Socket.IO connections (30s grace window)
2. Closes the Prisma pool
3. Process exits

Configure Traefik's health check to hit `/api/health` and the orchestrator's readiness check to hit `/api/ready` — they intentionally drift during shutdown so traffic stops before connections drain.

#### 6. Monitoring

| Service | URL | Purpose |
|---|---|---|
| Prometheus | https://prom.your-domain | Metrics scrape (15s) |
| Grafana | https://grafana.your-domain | Dashboards (provisioned) |
| Alertmanager | https://alerts.your-domain | Routes alerts to Slack/email/PagerDuty |
| Sentry | https://sentry.your-domain | Frontend + backend error tracking with source maps |

Critical alerts (already configured in `prometheus/alert.rules.yml`):

- `HighErrorRate` — 5xx > 1% for 5m
- `HighLatency` — p95 > 2s for 5m

For the full deploy/rollback runbook including blue-green and canary patterns, see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

</details>

---

## Common Commands

```bash
# Development
pnpm dev                       # Frontend (5173) + backend (3001)
pnpm dev:frontend              # Frontend only
pnpm dev:backend               # Backend only

# Quality (run before committing)
pnpm typecheck                 # TypeScript across all packages
pnpm lint                      # ESLint
pnpm test:run                  # Vitest unit tests (CI mode)
pnpm test:coverage             # Coverage report (80% lines / 73% branches gate)
pnpm build                     # Production build (frontend + backend)

# E2E
pnpm test:e2e                  # Playwright headless
pnpm test:e2e:headed           # Visible browser
pnpm test:e2e:ui               # Interactive UI mode

# Database
cd apps/web && npx prisma generate    # Regenerate client after schema edits
cd apps/web && npx prisma db push     # Sync schema (dev only — production uses migrations)
cd apps/web && npx prisma studio      # GUI on :5555

# Seed
pnpm seed                      # Badges + AI personas
pnpm seed:badges               # Badges only
pnpm seed:personas             # Personas only
pnpm seed:load-test            # 100 verified test users for k6

# Load testing (k6)
pnpm load:smoke                # Quick smoke
pnpm load:full                 # Full scenario

# OpenAPI spec regeneration (after Zod schema edits)
cd apps/web && pnpm openapi:generate

# Source bias balance gate (Phase 40)
cd apps/web && pnpm check:source-bias

# Cross-replica WebSocket verification (Phase 37 gate — production-shaped check)
pnpm test:fanout               # Boots 2× app behind Traefik, asserts cross-replica fanout

# Mobile (Capacitor 8)
pnpm --filter @newshub/mobile build           # Web build + cap sync
pnpm --filter @newshub/mobile cap:sync        # Sync only
pnpm --filter @newshub/mobile cap:open:ios    # Open Xcode
pnpm --filter @newshub/mobile cap:open:android # Open Android Studio

# Single-test invocation
pnpm test -- apps/web/src/lib/utils.test.ts        # Specific file
pnpm test -- -t "mapCentering"                     # By name pattern
cd apps/web && npx playwright test e2e/auth.spec.ts # Specific E2E
```

Full command reference and dev workflow: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md). Testing strategy and coverage gates: [`docs/TESTING.md`](docs/TESTING.md).

---

## API

REST endpoints summary and request/response shapes: [`docs/API.md`](docs/API.md).

| Surface | Path prefix | Auth | Purpose |
|---|---|---|---|
| **Internal API** | `/api/*` | JWT (`Authorization: Bearer ...`) | App's own frontend |
| **Public API** | `/api/v1/public/*` | `X-API-Key` header | External developers |
| **Stripe webhook** | `/api/webhooks/stripe` | HMAC signature | Stripe → us (raw-body, before `express.json()`) |
| **Live OpenAPI spec** | `/api/openapi.json` | — | Code-first via `@asteasolutions/zod-to-openapi` |
| **Interactive docs** | `/developers` (frontend SPA) | — | Scalar UI |
| **Health probe** | `/api/health` | — | App is up |
| **Readiness probe** | `/api/ready` | — | App is accepting traffic (drains during shutdown) |
| **Prometheus metrics** | `/metrics` | — | Route-normalized labels |

Public API endpoints (verified against `apps/web/server/routes/publicApi.ts`):

| Endpoint | Method | What it does |
|---|---|---|
| `/api/v1/public/news` | GET | List articles (regions, topics, sentiment, search, pagination) |
| `/api/v1/public/news/:id` | GET | Single article |
| `/api/v1/public/events` | GET | Geo-located timeline events with confidence + perspective metadata |
| `/api/v1/public/sentiment` | GET | Aggregated sentiment statistics |

Selected internal endpoints (JWT-gated):

| Endpoint | Method | What it does |
|---|---|---|
| `/api/news` | GET | Internal article list (richer filters than public) |
| `/api/analysis/clusters` | GET | Topic clusters; `?summaries=true` adds AI summaries |
| `/api/ai/ask` | POST | RAG Q&A `{question, context[]}` (`aiTierLimiter` gates FREE) |
| `/api/podcasts` / `/api/videos` | GET | Embedded media listings (Phase 40) |
| `/api/transcripts/...` | GET | Per-episode transcript (Phase 40) |
| `/api/account/export` | GET | GDPR Art. 20 data export (`?format=json\|csv`) |
| `/api/account/delete-request` | POST | GDPR Art. 17 deletion (7-day grace) |

---

## Deployment

Local dev: [Path B above](#path-b--full-docker-compose-stack).

Production: Docker Swarm via `stack.yml` — see [Tutorial 6](#tutorials).

> **Single-environment policy (2026-05-05):** NewsHub is pre-launch. The `deploy-staging` CI job exists as scaffolding only (`if: false`) — production is provisioned directly when needed. See `.planning/todos/pending/40-12-production-deploy-setup.md` for the provisioning plan.

| Topic | Doc |
|---|---|
| Full deploy + rollback runbook | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| Multi-region patterns | [`docs/multi-region-patterns.md`](docs/multi-region-patterns.md) |
| Performance budgets (k6 + Lighthouse) | [`docs/PERFORMANCE-BASELINE.md`](docs/PERFORMANCE-BASELINE.md) |
| SendGrid email setup | [`docs/SENDGRID_SETUP.md`](docs/SENDGRID_SETUP.md) |
| Monitoring + uptime | [`docs/monitoring/`](docs/monitoring/) |

**Performance budgets:**

| Metric | Threshold |
|---|---|
| News API p95 | < 500ms |
| AI API p95 | < 5s |
| Auth API p95 | < 300ms |
| LCP / CLS / INP / FCP | < 2s / < 0.05 / < 150ms / < 1.5s |
| Slow-query warning | > 100ms (dev only) |
| N+1 detection | > 5 queries per request (dev only) |

---

## Documentation Index

| Doc | Purpose |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Canonical project guide for contributors and agents (source of truth for the `gsd-doc-writer`) |
| [`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md) | First-run walkthrough |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture and data flow |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Dev environment, scripts, code style |
| [`docs/TESTING.md`](docs/TESTING.md) | Vitest + Playwright strategy and coverage gates |
| [`docs/API.md`](docs/API.md) | REST API reference (internal + public) |
| [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) | Every environment variable explained |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Docker, CI/CD, monitoring, rollback |
| [`docs/PERFORMANCE-BASELINE.md`](docs/PERFORMANCE-BASELINE.md) | Performance budgets (k6 + Lighthouse) |
| [`docs/SENDGRID_SETUP.md`](docs/SENDGRID_SETUP.md) | Email digest configuration |
| [`docs/multi-region-patterns.md`](docs/multi-region-patterns.md) | Multi-region rollout patterns |
| [`docs/legal/`](docs/legal/) | GDPR, privacy, and legal docs |
| [`docs/monitoring/`](docs/monitoring/) | Uptime + observability setup |
| [`docs/screenshots/CAPTURE-GUIDE.md`](docs/screenshots/CAPTURE-GUIDE.md) | How to re-capture the screenshots in this README |

**Planning system (`.planning/`):** GSD-driven phase tracking. See `.planning/STATE.md` for the live state, `.planning/ROADMAP.md` for the phase breakdown, and `.planning/phases/<NN-name>/` for per-phase artifacts (PLAN, SUMMARY, RESEARCH, CONTEXT).

---

## Contributing

1. Fork the repository
2. Create a feature branch (`feat/short-description` or `fix/short-description`)
3. Write tests first — TDD is the project default; coverage gate is 80% lines / 73% branches
4. Run `pnpm typecheck && pnpm test:run && pnpm build` before pushing
5. Use [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
6. Open a PR — CI runs lint, typecheck, source-bias check, unit tests (with coverage gate), Docker build, and E2E

**Repo hygiene files (`.github/`):**
- **`SECURITY.md`** — Security disclosure policy (3 business-day ack / 14-day assessment / 90-day coordinated disclosure). Report via GitHub Private Vulnerability Reporting, not issues.
- **`dependabot.yml`** — Weekly Monday 06:00 Europe/Berlin; grouped prod/dev minor+patch PRs; major bumps pinned for prisma, react, express, stripe, socket.io.
- **`ISSUE_TEMPLATE/`** — YAML forms for bug reports and feature requests; blank issues disabled.
- **`PULL_REQUEST_TEMPLATE.md`** — Pre-merge checklist: typecheck/test/build, prisma-regen, i18n-3-locales, mobile-no-CTA (Apple Rule 3.1.1(a)).

**E2E gotchas (learned the hard way — see `CLAUDE.md` for the full list):**

- Use `page.waitForLoadState('domcontentloaded')`, not `'networkidle'` — Socket.IO polling never lets the network idle
- Use `127.0.0.1`, not `localhost`, for backend API calls — Node 18+ resolves `localhost` to IPv6 `::1` first; Express on `0.0.0.0` doesn't always bind there
- `page.request.*` does NOT auto-attach the JWT from localStorage — for authenticated API tests, read the token via `page.evaluate(() => localStorage.getItem('newshub-auth-token'))` and pass `Authorization: Bearer ${token}` manually

Branch protection on `master` requires checks: **Lint, Type Check, Unit Tests, Build Docker Image, E2E Tests**. The `production` environment requires reviewer approval and restricts deploys to protected branches.

Full PR process: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

---

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2024 ikarusXPS.

Issues and feature requests: https://github.com/ikarusXPS/NewsHubitat/issues
