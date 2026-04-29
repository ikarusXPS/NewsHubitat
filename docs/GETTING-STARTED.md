<!-- generated-by: gsd-doc-writer -->
# Getting Started

Get NewsHub running locally in under 10 minutes. Copy each block in order — every step assumes the previous one succeeded.

## Prerequisites

Install these once on your machine:

- **Node.js** >= 18 (LTS recommended)
- **pnpm** — install globally with the one allowed `npm` invocation:
  ```bash
  npm i -g pnpm
  ```
- **Docker** + Docker Compose (Docker Desktop on Windows/macOS includes both)
- **Git**

NewsHub is a pnpm monorepo. Use `pnpm` for every command after the bootstrap above.

## 1. Clone the repository

```bash
git clone https://github.com/ikarusXPS/NewsHub.git
cd NewsHub
```

## 2. Install dependencies

```bash
pnpm install
```

This installs all workspace packages (`apps/web`, `packages/types`).

## 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and set the three required values:

```bash
# Database (matches the docker-compose Postgres mapping in step 4)
DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public"

# Redis (matches the docker-compose Redis service in step 4)
REDIS_URL=redis://localhost:6379

# JWT secret — must be at least 32 characters
JWT_SECRET=replace-me-with-a-32-plus-character-random-string
```

Generate a strong `JWT_SECRET` with:

```bash
openssl rand -base64 32
```

**AI provider (recommended):** add at least one key so AI features work. The free OpenRouter tier is recommended:

```bash
OPENROUTER_API_KEY=your-openrouter-api-key   # https://openrouter.ai/keys
```

The app degrades gracefully without an AI key — news, translation, and visualizations still work; AI Q&A and clustering summaries fall back to keyword analysis.

## 4. Start PostgreSQL and Redis

```bash
docker compose up -d postgres redis
```

This starts only the two services dev needs (Postgres on `localhost:5433`, Redis on `localhost:6379`). The full `docker compose up -d` starts the production stack — don't run that for local dev.

## 5. Initialize the database

```bash
cd apps/web
npx prisma generate
npx prisma db push
cd ../..
```

`prisma generate` builds the typed client into `apps/web/src/generated/prisma/`. `prisma db push` syncs the schema to your Postgres instance.

## 6. Seed initial data

```bash
pnpm seed
```

This loads gamification badges and the 8 built-in AI personas.

## 7. Start the development server

```bash
pnpm dev
```

`pnpm dev` runs frontend and backend concurrently:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

## 8. Open the app

Browse to **http://localhost:5173**. The dashboard should load with the 3D globe and live news feed.

Verify the backend is healthy:

```bash
curl http://localhost:3001/api/health
```

## 9. (Optional) Pre-create test users for load testing

```bash
pnpm seed:load-test
```

Creates 100 verified test accounts (`loadtest1@example.com` through `loadtest100@example.com`) for k6 scenarios.

## 10. (Optional) Inspect the database

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

# Windows
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

Redis is optional. The app falls back to in-memory caches and rate limits. To silence the warnings, ensure Redis is running:

```bash
docker compose up -d redis
```

### TypeScript errors about `@prisma/client` after schema changes

Regenerate the Prisma client:

```bash
cd apps/web && npx prisma generate && cd ../..
```

## What's next?

You're set up. Next stops:

- **[docs/DEVELOPMENT.md](DEVELOPMENT.md)** — daily commands, code style, build/test/lint
- **[docs/ARCHITECTURE.md](ARCHITECTURE.md)** — system design, services, data flow
- **[docs/API.md](API.md)** — internal HTTP API reference
- **http://localhost:3001/api-docs** — Scalar UI for the public API (live, served by your dev backend)
- **[.planning/PROJECT.md](../.planning/PROJECT.md)** — product vision and core value
- **[.planning/ROADMAP.md](../.planning/ROADMAP.md)** — phase breakdown and the GSD planning workflow
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — read this before opening a PR
