<!-- generated-by: gsd-doc-writer -->
# NewsHub

A multi-perspective global news analysis platform that aggregates news from 130 sources across 13 regions with real-time translation, sentiment analysis, perspective comparison visualization, and AI-powered insights.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Quick Start

Prerequisites: **Node.js >= 18**, **pnpm**, **Docker** (for PostgreSQL 17 + Redis 7).

```bash
git clone https://github.com/ikarusXPS/NewsHubitat.git
cd NewsHub
pnpm install

# Start PostgreSQL + Redis
docker compose up -d postgres redis

# Configure secrets
cp .env.example .env
# Edit .env: set JWT_SECRET (>= 32 chars) and at least one AI key
# (OPENROUTER_API_KEY recommended — free tier)

# Initialize database + seed
cd apps/web && npx prisma generate && npx prisma db push && cd ../..
pnpm seed

# Run dev (frontend :5173, backend :3001)
pnpm dev
```

See [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) for the full walkthrough and [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for every environment variable.

## Monorepo Layout

This is a **pnpm workspace** monorepo:

```
NewsHub/
├── apps/web/          # Frontend (React) + backend (Express) + Prisma
│   ├── src/           # React 19 + Vite 8 + Tailwind v4
│   ├── server/        # Express 5 (ES modules)
│   ├── prisma/        # PostgreSQL schema (Prisma 7)
│   └── e2e/           # Playwright tests
├── packages/types/    # Shared @newshub/types
└── docs/              # Project documentation
```

All commands at the repo root proxy to `apps/web` via pnpm filters. Architecture deep-dive: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech Stack

- **Frontend**: React 19, Vite 8, TypeScript 6, Tailwind CSS v4, Zustand v5, TanStack Query v5
- **Backend**: Express 5 (ES modules), Socket.io, Prisma 7 + PostgreSQL 17, Redis 7
- **AI**: Multi-provider fallback chain (OpenRouter → Gemini → Anthropic)
- **Translation**: DeepL → Google → LibreTranslate → Claude
- **Payments**: Stripe (`stripe@22.1.0`, API `2024-12-18.acacia`)
- **i18n**: `react-i18next` + `i18next-icu` (DE / EN / FR)
- **PWA**: `vite-plugin-pwa` (offline shell, install banner)
- **Testing**: Vitest (80% lines / 75% branches) + Playwright
- **Observability**: Prometheus + Grafana + Alertmanager + Sentry
- **Visualization**: Recharts 3, globe.gl 2, Leaflet 1.9

## Features

- **Multi-region news** from 130 sources across 13 regions, with bias metadata
- **Real-time translation + sentiment** via multi-provider fallback chains
- **Perspective comparison** — visualize how regions frame the same story
- **AI insights** — RAG Q&A, topic clustering, 8 customizable personas (all free-tier capable)
- **Public Developer API** — `/api/v1/public/*` gated by `X-API-Key`, tiered rate limits, OpenAPI spec at `/openapi.json`, Scalar docs UI at `/api-docs`
- **Stripe subscriptions** — `FREE` / `PREMIUM` / `ENTERPRISE` tiers; webhook with raw-body HMAC verification; tier-aware rate limits and AI quotas
- **Teams collaboration** — shared bookmarks, invites, role-based access
- **Threaded comments** on articles
- **Gamification** — badges (bronze → platinum), leaderboard snapshots
- **Email digests** — scheduled daily/weekly summaries
- **Sharing analytics** — track shared content + click-through (90-day retention)
- **GDPR compliance** — data export (Art. 20), account deletion (Art. 17), reading-history pause (Art. 18)
- **Real-time updates** via Socket.io; **offline support** via PWA + IndexedDB sync queue
- **3D globe, clustered maps, timeline** visualizations

## Common Commands

```bash
pnpm dev                 # Frontend (5173) + backend (3001)
pnpm typecheck           # TypeScript validation across all packages
pnpm lint                # ESLint
pnpm test:run            # Vitest unit tests (CI mode)
pnpm test:coverage       # Coverage report (80% lines / 75% branches gate)
pnpm test:e2e            # Playwright E2E
pnpm build               # Production build (frontend + backend)

# Database
cd apps/web && npx prisma studio       # GUI on :5555
cd apps/web && npx prisma db push      # Sync schema

# OpenAPI spec regen (after Zod schema edits)
cd apps/web && pnpm openapi:generate

# Load testing (k6)
pnpm load:smoke
pnpm load:full
```

Full command reference and dev workflow: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Testing strategy and coverage gates: [docs/TESTING.md](docs/TESTING.md).

## API

REST endpoints summary and request/response shapes: [docs/API.md](docs/API.md).

- **Internal API** under `/api/*` (JWT-authenticated where required)
- **Public API** under `/api/v1/public/*` — gated by `X-API-Key` header, key format `nh_{env}_{random}_{checksum}`, max 3 keys per user, IETF `RateLimit-*` headers
- **Live spec**: [`/openapi.json`](http://localhost:3001/openapi.json) (code-first via `@asteasolutions/zod-to-openapi`)
- **Interactive docs**: [`/api-docs`](http://localhost:3001/api-docs) (Scalar UI)

## Deployment

Docker Compose ships the full stack (app, PostgreSQL, Redis, Prometheus, Grafana, Alertmanager):

```bash
docker compose up -d
docker compose logs -f app
```

Monitoring: Prometheus (`:9090`), Grafana (`:3000`, `admin/admin`), Alertmanager (`:9093`).

CI/CD, deploy targets, rollback, and Sentry release wiring: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](CLAUDE.md) | Canonical project guide for contributors and agents |
| [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) | First-run walkthrough |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and data flow |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Dev environment, scripts, code style |
| [docs/TESTING.md](docs/TESTING.md) | Vitest + Playwright strategy and coverage gates |
| [docs/API.md](docs/API.md) | REST API reference (internal + public) |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Environment variables and config files |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, CI/CD, monitoring, rollback |
| [docs/PERFORMANCE-BASELINE.md](docs/PERFORMANCE-BASELINE.md) | Performance budgets (k6 + Lighthouse) |
| [docs/SENDGRID_SETUP.md](docs/SENDGRID_SETUP.md) | Email digest configuration |
| [docs/legal/](docs/legal/) | GDPR, privacy, and legal docs |
| [docs/monitoring/](docs/monitoring/) | Uptime + observability setup |

## Contributing

Fork → branch (`feat/...`) → write tests → `pnpm typecheck && pnpm test:run && pnpm build` → conventional-commit → PR. Coverage gate: 80% lines, 75% branches. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full PR process.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2024 ikarusXPS.

Issues and feature requests: https://github.com/ikarusXPS/NewsHubitat/issues
