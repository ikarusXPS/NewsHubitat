<!-- generated-by: gsd-doc-writer -->
# @newshub/web

The full-stack web application that powers NewsHub: a Vite-served React frontend (port `5173`) plus an Express backend (port `3001`) sharing a single TypeScript codebase, a single `node_modules`, and a single `dist/` bundle.

> Part of the [NewsHub monorepo](../../README.md). For project-wide context, planning history, deployment topology, and the public API contract, start at the root README and the [`docs/`](../../docs/) tree.

---

## What this package contains

| Surface | Where it lives | Entry point |
|---|---|---|
| React 19 frontend (Vite 8 + Tailwind v4 + React Router v7) | `src/` | `src/main.tsx` → `src/App.tsx` |
| Express 5 backend (ESM + Socket.IO + Prisma) | `server/` | `server/index.ts` |
| Prisma 7 schema, seed scripts, migrations | `prisma/` | `prisma/schema.prisma` |
| Prisma datasource config (workspace-local) | `prisma.config.ts` | — |
| Playwright E2E suite (`chromium` + `chromium-auth` projects) | `e2e/` | `e2e/auth.setup.ts` |
| OpenAPI generator (Zod-first) | `server/openapi/` | `server/openapi/generator.ts` |
| k6 load tests | `k6/` | `k6/load-test.js` |
| Static assets, i18n locales (`de` / `en` / `fr`), PWA manifest | `public/` | `public/openapi.json` (generated) |

This is the only place new application code should land. **The repo root has no `src/`, `server/`, or `prisma/` directory** — those were physically deleted in commit `651ce93` (Phase 36.3-03) to prevent orphan duplicates.

---

## How it fits in the monorepo

```
NewsHub/
├── apps/
│   ├── web/        ← you are here (this package)
│   └── mobile/     ← @newshub/mobile — Capacitor 8 wrapper that consumes apps/web/dist
├── packages/
│   └── types/      ← @newshub/types — shared TS types imported by this package
└── pnpm-workspace.yaml
```

- **Consumed by `@newshub/mobile`:** `pnpm --filter @newshub/mobile build` runs `pnpm --filter @newshub/web build` first, then `cap sync` copies `dist/` into `apps/mobile/ios/App/App/public/` and `apps/mobile/android/app/src/main/assets/public/`. The native shells run the same React bundle via WKWebView / Android WebView (95%+ code reuse).
- **Depends on `@newshub/types`:** imported as `workspace:*`. Add new shared types there, not here.

The root `package.json` exposes proxy scripts (`pnpm dev`, `pnpm build`, `pnpm test:run`, etc.) that filter into this package — running them from the repo root is equivalent to running them inside `apps/web/`.

---

## Package scripts

All scripts run from `apps/web/` (or via `pnpm --filter @newshub/web <script>` from the repo root). Sourced from `package.json`.

### Development

| Script | What it does |
|---|---|
| `dev` | `concurrently` runs `dev:frontend` + `dev:backend` |
| `dev:frontend` | `vite` — Vite dev server on `:5173`, proxies `/api/*` to `:3001` |
| `dev:backend` | `tsx watch server/index.ts` — Express + Socket.IO on `:3001` |

### Build

| Script | What it does |
|---|---|
| `build` | Runs `build:frontend` then `build:server` |
| `build:frontend` | `vite build` — produces `dist/` (also consumed by Capacitor) |
| `build:server` | `tsup` — bundles `server/index.ts` to `dist/server/index.js` |
| `start` | `node --import ./server/instrument.mjs dist/server/index.js` (production) |
| `preview` | `vite preview` — serve the built frontend locally |

### Quality

| Script | What it does |
|---|---|
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |

### Testing — Vitest (unit + integration)

| Script | What it does |
|---|---|
| `test` | `vitest` (watch mode) |
| `test:run` | `vitest run` (single CI pass) |
| `test:watch` | `vitest --watch` |
| `test:coverage` | `vitest run --coverage` — gate at **80% statements / functions / lines, 74% branches** (see `vitest.config.ts`) |
| `test:ui` | `vitest --ui` — interactive UI |

The branches threshold is a tracked waiver — `vitest.config.ts` notes the actual is 74.73% with a TODO list of files that need backfill before raising it back to 80.

### Testing — Playwright (E2E)

| Script | What it does |
|---|---|
| `test:e2e` | `playwright test` (headless) |
| `test:e2e:ui` | `playwright test --ui` (interactive) |
| `test:e2e:headed` | `playwright test --headed` (visible browser) |
| `screenshots` | `playwright test e2e/screenshots.spec.ts --project=chromium` (captures docs/screenshots/) |

Playwright is split into two projects: `chromium` (unauthenticated) and `chromium-auth` (depends on `setup`, uses `playwright/.auth/user.json`). See `playwright.config.ts`.

### Database — Prisma 7

Prisma CLI is invoked via `npx` (not via package scripts) so it picks up the workspace-local `prisma.config.ts` automatically:

```bash
cd apps/web
npx prisma generate          # Regenerate the typed client at src/generated/prisma/
npx prisma db push           # Sync schema to the local DB (dev only)
npx prisma studio            # GUI on :5555
```

### Seed

| Script | What it does |
|---|---|
| `seed` | Runs `prisma/seed.ts` (badges + AI personas) |
| `seed:badges` | `prisma/seed-badges.ts` only |
| `seed:personas` | `prisma/seed-personas.ts` only |
| `seed:load-test` | `scripts/seed-load-test-users.js` — pre-creates 100 verified test users (`loadtest1-100@example.com`) for k6 |

### Load testing — k6

| Script | What it does |
|---|---|
| `load:smoke` | `k6 run k6/load-test.js --env K6_SCENARIO=smoke` |
| `load:full` | `k6 run k6/load-test.js --env K6_SCENARIO=load` |

### OpenAPI + diagnostics

| Script | What it does |
|---|---|
| `openapi:generate` | `tsx server/openapi/generator.ts public/openapi.json` — regenerates the OpenAPI spec from the Zod schemas in `server/openapi/schemas.ts`. Run after editing those schemas. |
| `check:source-bias` | `tsx scripts/check-source-bias-coverage.ts` — verifies regional source bias diversity (Phase 40 gate) |

---

## Anti-patterns to avoid (locked, milestone-level)

These two rules cost milestone v1.6 four full sub-phases (36.1–36.4) of rework. Read [`CLAUDE.md`](../../CLAUDE.md#critical-anti-patterns-locked-milestone-level) for the full registry; the relevant rules for *this* package:

- **Never write new files to root `src/`, `server/`, or `prisma/`.** Those paths were physically deleted in `651ce93`. Anything that needs to ship in the runtime must live under `apps/web/`. A root-level write compiles fine but `pnpm dev:backend` runs `apps/web/server/index.ts` — orphan files become silent dead code.
- **`prisma.config.ts` MUST stay at `apps/web/prisma.config.ts`.** Prisma 7's `schema:` field is resolved relative to the config file's directory, **not** the CLI's cwd. If you create a duplicate at the repo root, Prisma will silently load it and resolve `schema: "prisma/schema.prisma"` against the wrong directory — this is exactly how Phase 36.2-03 dropped the `ApiKey` table. The header comment in [`prisma.config.ts`](./prisma.config.ts) restates the rule for posterity.

---

## Key directories at a glance

```
apps/web/
├── src/                           # React frontend
│   ├── main.tsx                   # entry — mounts <App /> + sets up Sentry / i18n / QueryClient
│   ├── App.tsx                    # router + lazy-loaded routes
│   ├── components/                # ~120 React components (organized by feature)
│   ├── pages/                     # Route-level components (lazy-loaded via Suspense)
│   ├── stores/                    # Zustand store(s) — persisted to `newshub-storage` localStorage
│   ├── hooks/                     # Custom hooks (useQuery wrappers, useAuth, etc.)
│   ├── i18n/locales/{de,en,fr}/   # Translation JSONs (icu plural rules)
│   ├── lib/                       # platform.ts, utils.ts, api.ts, cn() helper
│   ├── services/                  # syncService.ts (offline IndexedDB queue), etc.
│   ├── generated/prisma/          # Prisma client output — DO NOT EDIT
│   └── test/setup.ts              # Vitest setup (jsdom + testing-library)
├── server/                        # Express backend (ESM)
│   ├── index.ts                   # boot — applies middleware, mounts routes, starts Socket.IO
│   ├── routes/                    # HTTP route modules (auth, news, publicApi, webhooks/stripe, ...)
│   ├── services/                  # Singleton services (newsAggregator, aiService, translationService, ...)
│   ├── middleware/                # requireTier, apiKeyAuth, rateLimiter, queryCounter, ...
│   ├── openapi/                   # Zod schemas → OpenAPI generator
│   ├── config/                    # sources.ts (130+ RSS feeds), aiProviders.ts, stripe.ts, ...
│   ├── jobs/                      # workerEmitter.ts (singleton-job emission via Redis Emitter)
│   ├── db/prisma.ts               # PrismaClient singleton with @prisma/adapter-pg
│   └── utils/                     # logger.ts, hash.ts, tokenUtils.ts, ...
├── prisma/
│   ├── schema.prisma              # Single source of truth for the DB schema
│   ├── seed.ts                    # Aggregator that runs seed-badges + seed-personas
│   ├── seed-badges.ts             # Gamification badges (bronze/silver/gold/platinum tiers)
│   ├── seed-personas.ts           # 8 built-in AI personas
│   └── migrations/                # Raw SQL migrations (FTS, indexes)
├── prisma.config.ts               # Prisma 7 datasource (workspace-local — see anti-patterns)
├── e2e/                           # Playwright tests
│   ├── auth.setup.ts              # Setup project — creates playwright/.auth/user.json
│   ├── fixtures.ts                # Shared fixtures (mocked AI/analysis/geo-events; bypasses onboarding/consent)
│   └── *.spec.ts                  # 21 spec files
├── public/                        # Static assets — favicon, robots.txt, offline.html, openapi.json (generated), pwa icons
├── k6/                            # Load test scenarios
├── scripts/                       # One-off scripts (seed-load-test-users.js, check-source-bias-coverage.ts)
├── playwright.config.ts           # E2E projects + webServer config (boots `npm run dev` on :5173)
├── vite.config.ts                 # Frontend build (PWA, Sentry source maps, manual chunks, gzip+brotli)
├── vitest.config.ts               # Unit test runner + coverage thresholds
├── tsup.config.ts                 # Server bundle config
├── tsconfig.json                  # TS config (frontend + server share one)
└── .env.example                   # Workspace-local env template (focused on Prisma DB vars)
```

---

## Environment

This package is loaded by both `pnpm dev` (from the repo root via filters) and direct Prisma CLI invocations from `apps/web/`. `.env` lookup order:

1. `apps/web/.env` is auto-loaded by `dotenv/config` inside `prisma.config.ts` for any `npx prisma` command run from this directory.
2. The full app env surface (AI keys, OAuth, SMTP, Stripe, etc.) is documented in the **root [`.env.example`](../../.env.example)** and consumed by `pnpm dev` at the repo root.
3. The workspace-local [`apps/web/.env.example`](./.env.example) focuses on the Prisma `DATABASE_URL` / `DIRECT_URL` pair (Phase 37 introduced `DIRECT_URL` to bypass PgBouncer for migrations while runtime queries route through it with `?pgbouncer=true`).

Required at minimum for `pnpm dev` to boot: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (>= 32 chars), and one of `OPENROUTER_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`. See [`docs/CONFIGURATION.md`](../../docs/CONFIGURATION.md) for the full variable list.

---

## Where to look next

| You want to... | Read |
|---|---|
| Get the project running locally | [Root README → Quick Start](../../README.md#quick-start) and [`docs/GETTING-STARTED.md`](../../docs/GETTING-STARTED.md) |
| Understand the data flow + service architecture | [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) |
| Find an HTTP route or service contract | [`docs/API.md`](../../docs/API.md) — internal `/api/*` and public `/api/v1/public/*` |
| Configure environment variables | [`docs/CONFIGURATION.md`](../../docs/CONFIGURATION.md) |
| Deploy to production (Docker Swarm + Traefik + PgBouncer) | [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) |
| Write tests | [`docs/TESTING.md`](../../docs/TESTING.md) |
| Follow project conventions / E2E gotchas / anti-patterns | [`CLAUDE.md`](../../CLAUDE.md) (canonical guide) |
| Build the iOS/Android app from this bundle | [`apps/mobile/`](../mobile/) and [Root README → Path C](../../README.md#path-c--mobile-app-ios--android-via-capacitor) |

---

## License

MIT — inherited from the [root LICENSE](../../LICENSE). This package is `private: true` and is not published to npm; it is consumed by `@newshub/mobile` via the workspace and shipped as part of the NewsHub deployment.
