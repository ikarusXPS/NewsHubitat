# Phase 13: PostgreSQL Migration - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace SQLite (dev.db) with PostgreSQL for production-ready database. This phase handles the database layer migration only — Redis caching and query optimization are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Connection Pooling
- **D-01:** Use Prisma built-in connection pooling via `connection_limit` in DATABASE_URL
- **D-02:** Pool size = 10 connections (standard starting point)
- **D-03:** Queue and retry on pool exhaustion — better UX, prevents cascade failures
- **D-04:** Connection timeout = 5 seconds
- **D-05:** Add `/api/health/db` endpoint for dedicated DB health check (container orchestration)
- **D-06:** Idle connection timeout = 5 minutes — free resources, standard practice
- **D-07:** Structured JSON logging for connection events (pool exhaustion, timeouts, reconnects)

### Migration Path
- **D-08:** Fresh start in production — PostgreSQL starts empty, SQLite dev data not migrated
- **D-09:** Seed badges and AI personas using existing `seed-badges.ts` pattern, extend for AIPersona defaults
- **D-10:** Run full test suite against PostgreSQL — all 1051 tests must pass before migration complete

### Environment Switching
- **D-11:** PostgreSQL only, drop SQLite — simplify to one database, use local PostgreSQL via Docker for development
- **D-12:** Docker Compose for local PostgreSQL — add `docker-compose.yml` with PostgreSQL service

### Schema Compatibility
- **D-13:** Convert JSON String fields to native JSONB — `topics`, `entities`, `preferences`, `regions`, etc. become native Prisma Json type
- **D-14:** Add GIN indexes for JSONB fields — enable fast JSON containment queries (`@>`, `?`) for topics/entities
- **D-15:** Keep LIKE queries for text search — full-text search deferred to future phase

### Claude's Discretion
- PostgreSQL version selection (likely 16.x)
- Exact Prisma adapter package selection (@prisma/adapter-pg or similar)
- Docker Compose port mapping and volume configuration
- Specific JSONB field conversion order

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Configuration
- `server/db/prisma.ts` — Current Prisma client singleton with SQLite adapter (will be replaced)
- `prisma/schema.prisma` — Current schema definition with 13 models
- `prisma.config.ts` — Prisma 7 configuration reading DATABASE_URL from env
- `prisma/seed-badges.ts` — Existing seed script pattern to extend

### Environment
- `.env.example` — Current DATABASE_URL pattern documentation (lines 13-17)

### Testing
- `vitest.config.ts` — Test configuration for running suite against PostgreSQL

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/db/prisma.ts` — Singleton Prisma client pattern, will be updated for PostgreSQL adapter
- `prisma/seed-badges.ts` — Seed script pattern to extend for AIPersona seeding
- All existing Prisma queries — Should work unchanged after adapter swap

### Established Patterns
- Prisma 7 adapter pattern already in place
- DATABASE_URL environment variable already used
- Single PrismaClient instance exported from `server/db/prisma.ts`
- All 13 services use `import { prisma } from '../db/prisma'`

### Integration Points
- `server/db/prisma.ts` — Single file to modify for adapter change
- `prisma/schema.prisma` — Requires provider change and type updates
- `package.json` — Add PostgreSQL adapter package, remove SQLite adapter
- `.env.example` — Update default DATABASE_URL to PostgreSQL format
- `docker-compose.yml` — New file for local PostgreSQL

</code_context>

<specifics>
## Specific Ideas

- Connection pool configuration via DATABASE_URL query params: `?connection_limit=10&connect_timeout=5`
- Health check endpoint pattern: `SELECT 1` with response timing metric
- Docker Compose service name: `postgres` or `db`
- Structured logging using existing console patterns but JSON format for production

</specifics>

<deferred>
## Deferred Ideas

- **PostgreSQL full-text search** — tsvector columns and GIN indexes for title/content search. Belongs in Query Optimization phase.
- **PgBouncer external pooling** — Only needed for 1000+ connections, overkill for current scale.
- **Prisma Accelerate** — Adds cost and external dependency, defer until needed.

</deferred>

---

*Phase: 13-postgresql-migration*
*Context gathered: 2026-04-22*
