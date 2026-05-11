<!-- generated-by: gsd-doc-writer -->
# Getting Started

Get NewsHub running locally in under 10 minutes. Copy each block in order — every step assumes the previous one succeeded.

## Prerequisites

Install these once on your machine:

- **Node.js** 22 (pinned in [`.nvmrc`](../.nvmrc); use `nvm use` to match)
- **pnpm** — install globally with the one allowed `npm` invocation:
  ```bash
  npm i -g pnpm
  ```
- **Docker** + Docker Compose (Docker Desktop on Windows/macOS includes both)
- **Git**

NewsHub is a pnpm monorepo (`apps/web`, `apps/mobile`, `packages/types`). Use `pnpm` for every command after the bootstrap above.

## 1. Clone the repository

```bash
git clone https://github.com/ikarusXPS/NewsHub.git
cd NewsHub
```

## 2. Install dependencies

```bash
pnpm install
```

This installs all workspace packages.

## 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and set the required values:

```bash
# Server
PORT=3001

# Database (matches the docker-compose Postgres mapping in step 4)
DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public"

# JWT secret — must be at least 32 characters
JWT_SECRET=replace-me-with-a-32-plus-character-random-string
```

Generate a strong `JWT_SECRET` with:

```bash
openssl rand -base64 32
```

**Redis (recommended):** add `REDIS_URL` to enable caching, real-time features, and rate limiting. The app falls back to in-memory caches if Redis is absent, but you will see warnings in the backend log:

```bash
REDIS_URL=redis://localhost:6379
```

**AI provider (recommended):** add at least one key so AI features work. The free OpenRouter tier is recommended:

```bash
OPENROUTER_API_KEY=your-openrouter-api-key   # https://openrouter.ai/keys
```

The app degrades gracefully without an AI key — news, translation, and visualizations still work; AI Q&A and clustering summaries fall back to keyword analysis. See [docs/CONFIGURATION.md](CONFIGURATION.md) for the full list of environment variables (translation, OAuth, Stripe, Sentry, etc.).

## 4. Start PostgreSQL and Redis

```bash
docker compose up -d postgres redis
```

This starts only the two services dev needs (Postgres on `localhost:5433`, Redis on `localhost:6379`). The full `docker compose up -d` starts the production stack (app, Prometheus, Alertmanager, Grafana) — don't run that for local dev.

## 5. Initialize the database

```bash
cd apps/web
npx prisma generate
npx prisma db push
cd ../..
```

`prisma generate` builds the typed client into `apps/web/src/generated/prisma/`. `prisma db push` syncs the schema to your Postgres instance.

> **Anti-pattern reminder:** `prisma.config.ts` lives at `apps/web/prisma.config.ts`, never at the repo root. Prisma 7 resolves the schema path relative to the config file's directory — a root-level config silently loads a stale duplicate schema. Always run `prisma` commands from `apps/web/`.

## 6. Seed initial data

```bash
pnpm seed
```

This runs the seed scripts for gamification badges and the 8 built-in AI personas. Subsets are also available: `pnpm seed:badges` and `pnpm seed:personas`.

## 7. Start the development server

```bash
pnpm dev
```

`pnpm dev` runs frontend and backend concurrently:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

Run them individually with `pnpm dev:frontend` or `pnpm dev:backend` if you only need one half of the stack.

## 8. Open the app

Browse to **http://localhost:5173**. The dashboard should load with the 3D globe and live news feed.

Verify the backend is healthy:

```bash
curl http://127.0.0.1:3001/api/health
```

> Use `127.0.0.1` instead of `localhost` for backend calls — Node 18+ resolves `localhost` to IPv6 `::1` first, and Express on `0.0.0.0` doesn't always bind there.

## 9. (Optional) Run the verify gate before committing

Before pushing any changes, run the full verification chain:

```bash
pnpm typecheck && pnpm test:run && pnpm build
```

This replicates the CI pipeline locally: TypeScript validation across all packages, Vitest unit tests (80% coverage / 71% branches gate), then a full build. All three must pass before a PR will merge.

## 10. (Optional) Pre-create test users for load testing

```bash
pnpm seed:load-test
```

Creates 100 verified test accounts (`loadtest1@example.com` through `loadtest100@example.com`) for k6 scenarios.

## 11. (Optional) Run the cross-replica WebSocket fanout gate

```bash
pnpm test:fanout
```

Boots Postgres + Redis + Traefik + two app replicas via `e2e-stack/docker-compose.test.yml`, emits a Socket.IO event on replica A, and asserts a client on replica B receives it. Required for Phase 37 INFRA-04 / WS-04 gate — mocked-adapter unit tests do not satisfy this gate.

## 12. (Optional) Inspect the database

```bash
cd apps/web && npx prisma studio
```

Prisma Studio opens at **http://localhost:5555** for browsing tables and editing rows.

## Common Setup Issues

### `JWT_SECRET not configured` on backend startup

The backend rejects secrets shorter than 32 characters. Regenerate:

```bash
openssl rand -base64 32
```

Paste the output into `JWT_SECRET=` in `.env` and restart `pnpm dev`.

### `EADDRINUSE` on port 3001 or 5173

Another process is using the port. Find and stop it:

```bash
# Linux/macOS
lsof -i :3001
lsof -i :5173

# Windows (PowerShell)
netstat -ano | findstr :3001
netstat -ano | findstr :5173
```

### `ECONNREFUSED` to Postgres on port 5433

Postgres isn't running or isn't healthy yet:

```bash
docker compose ps postgres
docker compose up -d postgres
docker compose logs postgres
```

Confirm `DATABASE_URL` in `.env` matches the docker-compose mapping (port `5433`, user `newshub`, password `newshub_dev`).

### Redis warnings in the backend log

Redis is optional for development. The app falls back to in-memory caches and rate limits. To silence the warnings, ensure Redis is running:

```bash
docker compose up -d redis
```

### TypeScript errors about `@prisma/client` after schema changes

Regenerate the Prisma client:

```bash
cd apps/web && npx prisma generate && cd ../..
```

### Wrong Node version

If `pnpm install` complains about engine compatibility, switch to the pinned version:

```bash
nvm use   # reads .nvmrc -> Node 22
```

## What's next?

You're set up. Next stops:

- **[docs/DEVELOPMENT.md](DEVELOPMENT.md)** — daily commands, code style, build/test/lint
- **[docs/TESTING.md](TESTING.md)** — Vitest + Playwright workflows and conventions
- **[docs/ARCHITECTURE.md](ARCHITECTURE.md)** — system design, services, data flow
- **[docs/CONFIGURATION.md](CONFIGURATION.md)** — full environment-variable reference
- **[docs/API.md](API.md)** — internal HTTP API reference
- **http://localhost:3001/api-docs** — Scalar UI for the public API (live, served by your dev backend)
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — read this before opening a PR
