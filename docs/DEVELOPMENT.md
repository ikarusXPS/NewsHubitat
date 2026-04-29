<!-- generated-by: gsd-doc-writer -->
# Development Guide

This guide covers local development setup, daily commands, debugging, and contribution workflows for NewsHub. NewsHub is a **pnpm monorepo** — use `pnpm` for every command. Do not use `npm`.

## Local Setup

### Prerequisites

Before starting, ensure you have:

- **Node.js 18+** (Node 22 recommended; the repo's `package.json` pins TypeScript and devDeps that target modern Node)
- **pnpm** (install via `npm install -g pnpm` or `corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker** + **Docker Compose** (for PostgreSQL and Redis containers)
- **Git**
- **Stripe CLI** (optional — only needed for local Stripe webhook testing)
- **k6** (optional — only needed for `pnpm load:smoke` / `pnpm load:full`; install: https://k6.io/docs/getting-started/installation/)

### Repository Layout

```
NewsHub/
├── apps/
│   └── web/                    # Frontend (Vite/React) + Backend (Express)
│       ├── src/                # React app
│       ├── server/             # Express API
│       ├── prisma/             # Schema + seed scripts
│       ├── e2e/                # Playwright tests
│       └── src/generated/prisma/   # Auto-generated Prisma client (DO NOT EDIT)
├── packages/
│   └── types/                  # Shared types (@newshub/types)
├── pnpm-workspace.yaml
└── package.json                # Root scripts proxy to apps/web via pnpm --filter
```

The root `package.json` exposes thin wrapper scripts that forward to the `@newshub/web` workspace via `pnpm --filter`. Run all dev commands from the repository root.

### Initial Setup

1. **Clone the repository**

```bash
git clone https://github.com/ikarusXPS/NewsHub.git
cd NewsHub
```

2. **Install dependencies** (installs every workspace)

```bash
pnpm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `JWT_SECRET` — minimum 32 characters; generate with `openssl rand -base64 32`
- At least one AI provider key (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, or `ANTHROPIC_API_KEY`)
- `DATABASE_URL` and `REDIS_URL` (defaults work for the local Docker setup)

See [CONFIGURATION.md](CONFIGURATION.md) for the full environment variable reference.

4. **Start PostgreSQL and Redis**

```bash
docker compose up -d postgres redis
```

5. **Generate the Prisma client and sync the schema**

```bash
cd apps/web
npx prisma generate
npx prisma db push
cd ../..
```

6. **Seed initial data**

```bash
pnpm seed
```

This runs the badge and persona seed scripts. To seed individually:

```bash
pnpm seed:badges        # Gamification badges only
pnpm seed:personas      # AI personas only
pnpm seed:load-test     # Pre-create 100 verified test users (loadtest1-100@example.com)
```

7. **Start the development servers**

```bash
pnpm dev
```

This launches both servers concurrently:

- Frontend: Vite dev server on **http://localhost:5173**
- Backend: Express via `tsx watch` on **http://localhost:3001**

Vite proxies `/api/*` from 5173 to 3001 (see `apps/web/vite.config.ts`), so you can hit the frontend URL and use real API calls in the browser without CORS workarounds.

## Daily Development Commands

All commands run from the repository root.

### Dev Servers

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start frontend (5173) + backend (3001) concurrently |
| `pnpm dev:frontend` | Frontend only (Vite, port 5173) |
| `pnpm dev:backend` | Backend only (`tsx watch`, port 3001) |

### Build & Verify

Run before committing:

```bash
pnpm typecheck && pnpm test:run && pnpm build
```

| Command | Description |
|---------|-------------|
| `pnpm build` | Build every workspace (frontend → `vite build`, backend → `tsup`) |
| `pnpm typecheck` | TypeScript validation across all workspaces (`tsc --noEmit`) |
| `pnpm lint` | ESLint across all workspaces |

### Testing

| Command | Description |
|---------|-------------|
| `pnpm test` | Vitest in watch mode |
| `pnpm test:run` | Vitest single-run (CI mode) |
| `pnpm test:coverage` | Coverage report — fails if below thresholds |
| `pnpm test:e2e` | Playwright headless |
| `pnpm test:e2e:headed` | Playwright with browser visible |
| `pnpm test:e2e:ui` | Playwright interactive UI |

**Coverage thresholds** (`apps/web/vitest.config.ts`): statements 80%, functions 80%, lines 80%, **branches 75%** (temporarily lowered from 80% — backfill TODO is tracked in the config file).

**Run a single test file:**

```bash
pnpm test -- apps/web/src/lib/utils.test.ts        # Unit test by path
pnpm test -- -t "mapCentering"                     # Tests matching a pattern
cd apps/web && npx playwright test e2e/auth.spec.ts   # Single E2E spec
```

### Database

Run from `apps/web/`:

```bash
cd apps/web
npx prisma generate     # Regenerate the typed client (run after schema changes)
npx prisma db push      # Sync schema to the database (no migration files)
npx prisma studio       # Database GUI on localhost:5555
```

### OpenAPI Spec

The OpenAPI document is code-first — Zod schemas in `apps/web/server/openapi/schemas.ts` are the single source of truth.

```bash
cd apps/web && pnpm openapi:generate
```

Output: `apps/web/public/openapi.json`. The Scalar docs UI is served at `/api-docs`.

### Seed Data

| Command | Description |
|---------|-------------|
| `pnpm seed` | All seed scripts (badges + personas) |
| `pnpm seed:badges` | Gamification badges |
| `pnpm seed:personas` | AI personas |
| `pnpm seed:load-test` | 100 verified test users for load tests |

### Load Testing

```bash
pnpm load:smoke        # k6 smoke scenario
pnpm load:full         # k6 full load scenario
```

For staging runs, use the manual `workflow_dispatch` on `.github/workflows/load-test.yml` (requires `STAGING_URL`; never runs against production).

### CI Validation

```bash
pnpm validate:ci       # Validate .github/workflows/ci.yml syntax via action-validator
```

## Project Structure

| Path | Purpose |
|------|---------|
| `apps/web/src/` | React frontend (pages, components, hooks, store) |
| `apps/web/server/` | Express backend (routes, services, middleware) |
| `apps/web/prisma/` | Prisma schema and seed scripts |
| `apps/web/e2e/` | Playwright E2E tests |
| `apps/web/src/generated/prisma/` | **Auto-generated Prisma client — do not edit** |
| `packages/types/` | Shared TypeScript types published as `@newshub/types` |

Import shared types from the workspace package:

```typescript
import type { PerspectiveRegion, NewsArticle, ApiResponse } from '@newshub/types';
```

## Tooling Notes

- **Frontend:** Vite 8 on port 5173. The dev server proxies `/api/*` to the backend on 3001.
- **Backend:** Express 5 (ES modules, TypeScript) launched via `tsx watch` for hot reload.
- **Playwright projects** (`apps/web/playwright.config.ts`):
  - `setup` — runs `*.setup.ts`, creates the auth state file
  - `chromium` — unauthenticated tests
  - `chromium-auth` — authenticated tests using `playwright/.auth/user.json` as `storageState`; depends on `setup`
- **Vitest coverage:** 80% statements/functions/lines, 75% branches (see `apps/web/vitest.config.ts`).
- **Bundle budget:** 250KB warning threshold (CI annotation, non-blocking).
- **Sentry source maps:** uploaded during CI builds via `@sentry/vite-plugin`; release tag is `newshub@${{ github.sha }}`.

## Code Style

### ESLint

**Configuration:** `apps/web/eslint.config.js` (flat config).

**Plugins in use:**
- `@eslint/js` — JavaScript recommended rules
- `typescript-eslint` — TypeScript support
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`

**Conventions:**
- Unused identifiers prefixed with `_` are allowed
- Test files (`*.test.ts`, `*.spec.ts`) may use `any` for mocks

**Run:**

```bash
pnpm lint
```

ESLint is enforced in CI via the `lint` job in `.github/workflows/ci.yml`.

### TypeScript

**Configuration:** `apps/web/tsconfig.json` (strict mode enabled).

```bash
pnpm typecheck
```

Type checking is enforced in CI via the `typecheck` job.

### Formatter

There is no Prettier or `.editorconfig` configuration. Style is enforced through ESLint rules only.

## Code Conventions

### Query-Key Synchronization (CRITICAL)

Components that share the same data **must** use identical TanStack Query `queryKey` values. For example, `Monitor.tsx` and `EventMap.tsx` both use:

```typescript
queryKey: ['geo-events']
staleTime: 60_000
refetchInterval: 2 * 60_000
```

Mismatched keys cause duplicate fetches and stale UI.

### Multi-Provider AI Fallback

The AI service uses a fallback chain (configured in `apps/web/server/services/aiService.ts`):

1. **OpenRouter** (free tier) — primary
2. **Gemini** (free tier, 1500 req/day) — secondary
3. **Anthropic** — premium fallback
4. Keyword-based analysis — final fallback

Translation uses an analogous chain: DeepL → Google → LibreTranslate → Claude.

### Graceful Degradation in `useQuery`

Always handle errors so a single failing endpoint cannot break the page:

```typescript
const { data, error } = useQuery({ queryKey: ['data'], queryFn: fetchData, retry: 1 });
if (error) return null;
```

### Class Composition

Use the `cn()` helper from `apps/web/src/lib/utils.ts` instead of string concatenation:

```typescript
import { cn } from '../lib/utils';
className={cn('base-class', isActive && 'active-class', variant)}
```

### Singleton Services

Backend services use the `getInstance()` singleton pattern. Do not instantiate them directly — call `MyService.getInstance()`.

### Generated Code

Files under `apps/web/src/generated/prisma/` are produced by `npx prisma generate`. Treat them as build artifacts: never edit them by hand and never commit edits.

## Branch Conventions

- **Default branch:** `master` (deployment target for staging and production)
- **Branch naming:** No formal convention is documented. Use descriptive prefixes such as `feat/...`, `fix/...`, `refactor/...`, `docs/...`.

## PR Process

### Before Submitting

1. Run the full local pipeline:

```bash
pnpm typecheck && pnpm test:run && pnpm build
```

2. Ensure coverage still passes:

```bash
pnpm test:coverage
```

3. Add or update tests for new features and bug fixes (TDD is a project principle — see the global `golden-principles.md`).

### Submitting

1. Push your branch to the remote
2. Open a pull request against `master`
3. CI runs automatically on every push and PR

### CI Workflow (`.github/workflows/ci.yml`)

1. **Lint** — ESLint
2. **Type Check** — `tsc --noEmit`
3. **Unit Tests** — Vitest with the configured coverage thresholds (Postgres + Redis services)
4. **Build** — Docker image (pushed to `ghcr.io` on `master` only)
5. **E2E Tests** — Playwright (depends on build)
6. **Deploy Staging** — `master` only
7. **Lighthouse CI** — runs after deploy-staging on `master` only; 90+ required for Performance / Accessibility / Best Practices / SEO; Core Web Vitals tracked warn-only
8. **Deploy Production** — after staging succeeds

All required jobs must pass before merge.

### PR Review Checklist

- [ ] ESLint passes (`pnpm lint`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Coverage thresholds met (`pnpm test:coverage`)
- [ ] E2E tests cover any new critical user flow
- [ ] No hardcoded secrets — all configuration through environment variables
- [ ] Build succeeds (`pnpm build`)
- [ ] Generated Prisma client is **not** edited by hand

## Database Development

### Prisma Workflow

1. Edit `apps/web/prisma/schema.prisma`
2. `cd apps/web && npx prisma generate`
3. `npx prisma db push` (no migration files; schema is pushed directly)
4. `npx prisma studio` to inspect data on localhost:5555

### Reset the Local Database

```bash
docker compose down -v
docker compose up -d postgres redis
cd apps/web && npx prisma db push && cd ../..
pnpm seed
```

This destroys all data and rebuilds the schema from scratch.

## Docker Development

### Local Stack

```bash
docker compose up -d
```

Services:

- **app** — NewsHub application container
- **postgres** — PostgreSQL
- **redis** — Redis
- **prometheus** — Metrics scraping (localhost:9090)
- **grafana** — Dashboards (localhost:3000, admin/admin)
- **alertmanager** — Alert routing

### Rebuild and Logs

```bash
docker compose build app
docker compose up -d
docker compose logs -f app
docker compose ps          # Health status
```

## Common Development Tasks

### Add a New API Endpoint

1. Add a route handler in `apps/web/server/routes/`
2. Register it in `apps/web/server/index.ts`
3. Add Zod schemas to `apps/web/server/openapi/schemas.ts` (powers both runtime validation and the OpenAPI spec)
4. Write unit tests in `apps/web/server/routes/*.test.ts`
5. Regenerate the OpenAPI spec: `cd apps/web && pnpm openapi:generate`
6. Update the API table in `CLAUDE.md`
7. `pnpm typecheck && pnpm test:run`

### Add a React Component

1. Create the component in `apps/web/src/components/`
2. Write tests in `apps/web/src/components/*.test.tsx`
3. Import and use in the relevant page
4. `pnpm typecheck && pnpm test:coverage`

### Add a News Source

Edit `apps/web/server/config/sources.ts`:

```typescript
{
  id: 'source-id',
  name: 'Source Name',
  country: 'XX',
  region: 'usa',  // One of 13 PerspectiveRegion values
  language: 'en',
  bias: { political: 0, reliability: 8, ownership: 'private' },
  apiEndpoint: 'https://example.com/rss.xml',
  rateLimit: 100,
}
```

Restart the backend to load the new source.

### Update the Database Schema

1. Edit `apps/web/prisma/schema.prisma`
2. `cd apps/web && npx prisma generate`
3. `npx prisma db push`
4. Update seed scripts (`apps/web/prisma/seed*.ts`) if needed
5. `pnpm seed`

## Debugging

### Backend

```bash
pnpm dev:backend
```

Logs print to the terminal. Dev-only diagnostics are gated by `NODE_ENV !== 'production'`:

- **Slow query warning:** any DB query > 100ms is logged
- **N+1 detection:** warnings emitted when a single request issues > 5 queries (uses `AsyncLocalStorage` request scope via the `queryCounter` middleware)

### Frontend

```bash
pnpm dev:frontend
```

Open browser DevTools. React Query DevTools are available in development mode.

### E2E Tests

```bash
cd apps/web

npx playwright test --debug              # Step-through inspector
npx playwright test --ui                 # Interactive UI
npx playwright show-report               # Open the last HTML report
npx playwright test e2e/auth.spec.ts     # Single spec
```

The `setup` project creates `playwright/.auth/user.json`, which `chromium-auth` consumes via `storageState`. If authenticated tests fail unexpectedly, delete that file and let the setup project recreate it.

### Stripe Webhooks (optional)

The Stripe webhook route must be registered **before** `express.json()` to preserve the raw body for HMAC verification. To test webhooks locally:

```bash
stripe listen --forward-to http://localhost:3001/api/webhooks/stripe
```

Set `STRIPE_WEBHOOK_SECRET` in `.env` to the value the CLI prints.

## Performance Testing

```bash
pnpm load:smoke    # Smoke scenario
pnpm load:full     # Full load scenario
```

Requires k6 (https://k6.io/docs/getting-started/installation/). For staging runs use the `load-test.yml` GitHub Actions workflow.

## Security Best Practices

1. **Never commit secrets.** Use `.env` for all keys. The repo's `.env.example` lists every variable.
2. **Validate all input** with Zod schemas at API boundaries.
3. **Parameterized queries only** — Prisma handles this automatically.
4. **Run the full pipeline before pushing:** `pnpm typecheck && pnpm test:run && pnpm build`.

## Next Steps

- [TESTING.md](TESTING.md) — testing strategy and conventions
- [CONFIGURATION.md](CONFIGURATION.md) — environment variable reference
- [ARCHITECTURE.md](ARCHITECTURE.md) — system design
- `CLAUDE.md` (project root) — comprehensive project context for agents
