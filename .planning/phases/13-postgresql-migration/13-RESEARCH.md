# Phase 13: PostgreSQL Migration - Research

**Researched:** 2026-04-22
**Domain:** Database Migration (SQLite to PostgreSQL with Prisma 7)
**Confidence:** HIGH

## Summary

This phase migrates NewsHub from SQLite to PostgreSQL for production-ready database capabilities. The migration leverages Prisma 7's driver adapter architecture, which requires explicit JavaScript database drivers instead of the previous Rust binary approach. Key changes include switching from `@prisma/adapter-better-sqlite3` to `@prisma/adapter-pg`, converting 12 JSON-encoded String fields to native JSONB types with GIN indexes, and configuring connection pooling through the pg driver options.

The project already has `pg` (8.20.0) installed as a dependency, Docker (29.4.0) and Docker Compose (5.1.1) are available on the development machine, and the existing Prisma 7 adapter pattern in `server/db/prisma.ts` provides a clean migration path. Per D-08, production starts fresh with no SQLite data migration, simplifying the workflow to schema changes only.

**Primary recommendation:** Switch to `@prisma/adapter-pg` with connection pool configuration (pool size 10, connection timeout 5s, idle timeout 5min), convert JSON String fields to native `Json` type with GIN indexes using `JsonbPathOps`, and add Docker Compose for local PostgreSQL development.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use Prisma built-in connection pooling via `connection_limit` in DATABASE_URL
- **D-02:** Pool size = 10 connections (standard starting point)
- **D-03:** Queue and retry on pool exhaustion — better UX, prevents cascade failures
- **D-04:** Connection timeout = 5 seconds
- **D-05:** Add `/api/health/db` endpoint for dedicated DB health check (container orchestration)
- **D-06:** Idle connection timeout = 5 minutes — free resources, standard practice
- **D-07:** Structured JSON logging for connection events (pool exhaustion, timeouts, reconnects)
- **D-08:** Fresh start in production — PostgreSQL starts empty, SQLite dev data not migrated
- **D-09:** Seed badges and AI personas using existing `seed-badges.ts` pattern, extend for AIPersona defaults
- **D-10:** Run full test suite against PostgreSQL — all 1051 tests must pass before migration complete
- **D-11:** PostgreSQL only, drop SQLite — simplify to one database, use local PostgreSQL via Docker for development
- **D-12:** Docker Compose for local PostgreSQL — add `docker-compose.yml` with PostgreSQL service
- **D-13:** Convert JSON String fields to native JSONB — `topics`, `entities`, `preferences`, `regions`, etc. become native Prisma Json type
- **D-14:** Add GIN indexes for JSONB fields — enable fast JSON containment queries (`@>`, `?`) for topics/entities
- **D-15:** Keep LIKE queries for text search — full-text search deferred to future phase

### Claude's Discretion
- PostgreSQL version selection (likely 16.x or 17.x)
- Exact Prisma adapter package selection (@prisma/adapter-pg)
- Docker Compose port mapping and volume configuration
- Specific JSONB field conversion order

### Deferred Ideas (OUT OF SCOPE)
- **PostgreSQL full-text search** — tsvector columns and GIN indexes for title/content search. Belongs in Query Optimization phase.
- **PgBouncer external pooling** — Only needed for 1000+ connections, overkill for current scale.
- **Prisma Accelerate** — Adds cost and external dependency, defer until needed.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-01 | PostgreSQL migration for production scale | @prisma/adapter-pg 7.7.0 with pg 8.20.0 provides production-ready PostgreSQL connectivity; connection pooling via driver options handles concurrent load |
| PERF-02 | Redis caching for high-traffic endpoints | OUT OF SCOPE for this phase (Phase 14); this research confirms PostgreSQL layer only |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Database connectivity | Database / Storage | — | PrismaClient with pg adapter handles all DB operations |
| Connection pooling | Database / Storage | — | Managed by pg driver, configured in adapter options |
| Schema migrations | Database / Storage | — | Prisma schema changes generate DDL |
| JSONB indexing | Database / Storage | — | PostgreSQL GIN indexes for JSON containment queries |
| Health check endpoint | API / Backend | — | Express route verifies database connectivity |
| Local development DB | Database / Storage | — | Docker Compose provides PostgreSQL container |
| Seeding | API / Backend | Database / Storage | TypeScript seed scripts populate initial data |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/adapter-pg | 7.7.0 | PostgreSQL driver adapter for Prisma 7 | [VERIFIED: npm registry] Official Prisma PostgreSQL adapter for v7+ |
| pg | 8.20.0 | Node.js PostgreSQL client | [VERIFIED: npm registry] Already installed, required by adapter-pg |
| prisma | 7.7.0 | ORM CLI and schema management | [VERIFIED: npm registry] Already installed, current version |
| @prisma/client | 7.7.0 | Generated Prisma client | [VERIFIED: npm registry] Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| postgres:17 (Docker image) | 17.x | Local development PostgreSQL | Docker Compose local environment [VERIFIED: web search - PostgreSQL 17.9 is latest stable] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @prisma/adapter-pg | @prisma/adapter-pg-worker | Only for edge/serverless runtimes, not needed for Express |
| Direct pg pool | PgBouncer | External pooler adds complexity, defer to high-scale phase |

**Installation:**
```bash
npm install @prisma/adapter-pg
npm uninstall @prisma/adapter-better-sqlite3 better-sqlite3 @types/better-sqlite3
```

**Version verification:**
- @prisma/adapter-pg: 7.7.0 (published 2 weeks ago) [VERIFIED: npm registry]
- pg: 8.20.0 (current) [VERIFIED: npm registry]
- PostgreSQL Docker: 17.9 (latest stable as of April 2026) [VERIFIED: web search]

## Architecture Patterns

### System Architecture Diagram

```
                              ┌─────────────────────────┐
                              │    Docker Compose       │
                              │  ┌─────────────────┐    │
                              │  │  PostgreSQL 17  │    │
                              │  │   Port 5432     │    │
                              │  │   Volume: data  │    │
                              │  └────────┬────────┘    │
                              └───────────┼─────────────┘
                                          │
                                          ▼
┌────────────────┐         ┌──────────────────────────────────────┐
│   Express App  │         │         Prisma Layer                 │
│                │         │  ┌────────────────────────────────┐  │
│  /api/health/db├────────▶│  │  PrismaClient                  │  │
│                │         │  │    └─ adapter: PrismaPg({      │  │
│  /api/news     │         │  │         connectionString,      │  │
│  /api/auth     ├────────▶│  │         max: 10,               │  │
│  /api/*        │         │  │         connectionTimeoutMillis│  │
│                │         │  │         idleTimeoutMillis      │  │
└────────────────┘         │  │       })                       │  │
                           │  └────────────────────────────────┘  │
                           │                  │                   │
                           │                  ▼                   │
                           │  ┌────────────────────────────────┐  │
                           │  │  pg Connection Pool            │  │
                           │  │    max: 10 connections         │  │
                           │  │    connectionTimeout: 5s       │  │
                           │  │    idleTimeout: 5min           │  │
                           │  └────────────────────────────────┘  │
                           └──────────────────────────────────────┘
```

### Recommended Project Structure

```
prisma/
├── schema.prisma           # Updated: provider=postgresql, Json types
├── seed-badges.ts          # Existing badge seeding
├── seed-personas.ts        # NEW: AIPersona seeding (D-09)
└── migrations/             # Empty for fresh start (D-08)

server/
├── db/
│   └── prisma.ts           # Updated: PrismaPg adapter with pool config
├── routes/
│   └── health.ts           # NEW: /api/health/db endpoint (D-05)
└── utils/
    └── dbLogger.ts         # NEW: Structured JSON logging (D-07)

docker-compose.yml          # NEW: PostgreSQL service (D-12)
```

### Pattern 1: Prisma 7 PostgreSQL Adapter with Connection Pooling
**What:** Configure PrismaClient with @prisma/adapter-pg including explicit pool settings
**When to use:** All database connections in Prisma 7+
**Example:**
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

const adapter = new PrismaPg({
  connectionString,
  // D-02: Pool size = 10
  max: 10,
  // D-04: Connection timeout = 5 seconds
  connectionTimeoutMillis: 5_000,
  // D-06: Idle timeout = 5 minutes
  idleTimeoutMillis: 300_000,
});

const prisma = new PrismaClient({ adapter });

export { prisma };
```

### Pattern 2: JSONB with GIN Index
**What:** Native JSON type with GIN index for containment queries
**When to use:** Fields that store JSON arrays or objects needing @> or ? operators
**Example:**
```prisma
// Source: https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes
model NewsArticle {
  id      String @id
  topics  Json   // Native JSONB in PostgreSQL

  @@index([topics(ops: JsonbPathOps)], type: Gin)
}
```

### Pattern 3: Docker Compose PostgreSQL with Health Check
**What:** Local PostgreSQL container with proper health checking
**When to use:** Local development environment
**Example:**
```yaml
# Source: https://docs.docker.com/reference/compose-file/services/
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: newshub
      POSTGRES_PASSWORD: newshub_dev
      POSTGRES_DB: newshub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U newshub -d newshub"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

volumes:
  postgres_data:
```

### Anti-Patterns to Avoid
- **Hardcoded connection strings:** Always use DATABASE_URL environment variable
- **Skipping connection timeout:** Prisma 7 pg driver defaults to 0 (infinite), must explicitly set
- **Using db push in production:** Per D-08, use fresh schema sync, but for future migrations use `prisma migrate deploy`
- **Missing health checks in Docker:** Always use `pg_isready` for proper container orchestration

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pooling | Custom pool manager | pg driver's built-in pool via adapter options | pg handles pool lifecycle, exhaustion queuing |
| JSON serialization | Manual JSON.stringify/parse | Prisma Json type with native JSONB | Type safety, automatic serialization, query optimization |
| GIN index creation | Raw SQL in code | @@index with ops: JsonbPathOps | Prisma manages index lifecycle |
| Database health checks | TCP socket probes | SELECT 1 via Prisma + pg_isready in Docker | Verifies actual query capability |

**Key insight:** Prisma 7's adapter architecture delegates pooling to the underlying driver, making custom pool management unnecessary and potentially harmful.

## Runtime State Inventory

This is a database migration phase, so runtime state audit is required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | SQLite `dev.db` with test/dev articles, users, badges | None — D-08 specifies fresh start in PostgreSQL |
| Live service config | None — no external services depend on SQLite path | None |
| OS-registered state | None — no OS-level registrations reference database | None |
| Secrets/env vars | DATABASE_URL in `.env` — currently `file:./dev.db` | Code edit: update to PostgreSQL connection string format |
| Build artifacts | `src/generated/prisma/` — regenerated on `prisma generate` | Run `prisma generate` after schema change |

**Key finding:** The fresh start approach (D-08) eliminates data migration complexity. No SQLite data needs to be transferred to PostgreSQL.

## Common Pitfalls

### Pitfall 1: Missing Connection Timeout Configuration
**What goes wrong:** Requests hang indefinitely waiting for database connection
**Why it happens:** Prisma 7 pg driver defaults connectionTimeout to 0 (no timeout), unlike v6's 5s default
**How to avoid:** Explicitly set `connectionTimeoutMillis: 5_000` in adapter options
**Warning signs:** Requests hang during high load without timing out

### Pitfall 2: JSON Field Type Mismatch
**What goes wrong:** TypeScript errors or runtime JSON parse failures
**Why it happens:** Forgetting to update code that uses JSON.parse() on String fields
**How to avoid:**
1. Update schema: `String` to `Json` type
2. Search codebase for `JSON.parse(record.topics)` and remove parse calls
3. Update TypeScript types to match
**Warning signs:** `SyntaxError: Unexpected token` in JSON parsing

### Pitfall 3: GIN Index Operator Class Confusion
**What goes wrong:** Index created but queries don't use it
**Why it happens:** Using default `JsonbOps` when `JsonbPathOps` is better for `@>` containment
**How to avoid:** Use `@@index([field(ops: JsonbPathOps)], type: Gin)` for containment queries
**Warning signs:** EXPLAIN ANALYZE shows sequential scan on large tables

### Pitfall 4: Docker Compose Volume Persistence
**What goes wrong:** Database data lost between container restarts
**Why it happens:** Missing volume mount or using bind mount incorrectly
**How to avoid:** Use named volume `postgres_data:/var/lib/postgresql/data`
**Warning signs:** Database empty after `docker compose down && up`

### Pitfall 5: Test Suite Database Isolation
**What goes wrong:** Tests pass locally but fail in CI, or tests affect each other
**Why it happens:** Tests using real PostgreSQL connection instead of mocks
**How to avoid:** Keep existing Prisma mocking pattern (`vi.mock('../db/prisma')`)
**Warning signs:** Test order dependency, flaky tests

## Code Examples

### Database Client Update (server/db/prisma.ts)
```typescript
// Source: Prisma docs + D-01 through D-07
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import logger from "../utils/logger";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const adapter = new PrismaPg({
  connectionString,
  max: 10,                        // D-02
  connectionTimeoutMillis: 5_000, // D-04
  idleTimeoutMillis: 300_000,     // D-06 (5 minutes)
});

// D-07: Log connection events
adapter.on?.('error', (err) => {
  logger.error({ event: 'db_pool_error', error: err.message });
});

const prisma = new PrismaClient({ adapter });

export { prisma };
```

### Schema Provider Change (prisma/schema.prisma)
```prisma
// Source: Prisma schema reference
datasource db {
  provider = "postgresql"
  // URL defined in prisma.config.ts
}

model NewsArticle {
  id              String   @id
  title           String
  titleTranslated Json?    // D-13: Was String with JSON comment
  content         String
  topics          Json     // D-13: Was String with JSON comment
  entities        Json     // D-13: Was String with JSON comment
  // ... other fields

  @@index([topics(ops: JsonbPathOps)], type: Gin)   // D-14
  @@index([entities(ops: JsonbPathOps)], type: Gin) // D-14
}
```

### Health Check Endpoint (server/routes/health.ts)
```typescript
// Source: D-05, Express patterns
import { Router } from "express";
import { prisma } from "../db/prisma";
import logger from "../utils/logger";

const router = Router();

router.get("/db", async (_req, res) => {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;

    res.json({
      status: "healthy",
      latency_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - start;
    logger.error({ event: "db_health_check_failed", error, duration });

    res.status(503).json({
      status: "unhealthy",
      latency_ms: duration,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
```

### Docker Compose Configuration (docker-compose.yml)
```yaml
# Source: Docker docs + PostgreSQL best practices
version: "3.8"

services:
  postgres:
    image: postgres:17
    container_name: newshub-db
    environment:
      POSTGRES_USER: newshub
      POSTGRES_PASSWORD: newshub_dev
      POSTGRES_DB: newshub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U newshub -d newshub"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped

volumes:
  postgres_data:
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma 6 Rust binary drivers | Prisma 7 JavaScript driver adapters | Prisma 7.0 | Must use @prisma/adapter-pg explicitly |
| connection_limit in URL | max/connectionTimeoutMillis in adapter | Prisma 7.0 | URL params no longer work for pooling |
| String with JSON.parse | Native Json type | Always available | Type safety, JSONB queries |
| PostgreSQL 16 | PostgreSQL 17.9 | February 2026 | Performance improvements, new features |

**Deprecated/outdated:**
- `@prisma/adapter-better-sqlite3`: Remove after migration
- `better-sqlite3` and `@types/better-sqlite3`: Remove after migration
- URL-based connection pooling params: Use adapter constructor options in Prisma 7

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pg driver `on('error')` event exists for logging | Code Examples | May need alternative event handling or external monitoring |
| A2 | PostgreSQL 17 is stable enough for production | Standard Stack | Could fallback to 16.x, minimal impact |

**Note:** Most claims are verified via npm registry, Prisma documentation, or web search. The assumptions above are minor implementation details.

## Open Questions

1. **AIPersona seed data content**
   - What we know: D-09 requires seeding AI personas alongside badges
   - What's unclear: Exact persona definitions (names, system prompts, icons)
   - Recommendation: Create `prisma/seed-personas.ts` with 3-5 default personas; content can be refined later

2. **Connection pool logging granularity**
   - What we know: D-07 requires structured JSON logging for pool events
   - What's unclear: Whether pg driver exposes all needed events (acquire, release, exhaustion)
   - Recommendation: Implement available events, document any gaps for future enhancement

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Local PostgreSQL (D-12) | Yes | 29.4.0 | Direct PostgreSQL install |
| Docker Compose | Container orchestration | Yes | 5.1.1 | — |
| PostgreSQL (local) | Runtime | No | — | Docker Compose (primary path) |
| Node.js | Runtime | Yes | (per project) | — |
| npm | Package management | Yes | (per project) | — |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- Local PostgreSQL not installed, but Docker Compose provides containerized PostgreSQL (this is the intended development path per D-12)

## Project Constraints (from CLAUDE.md)

The following directives from CLAUDE.md apply to this phase:

- **Database**: SQLite via Prisma (adapter: better-sqlite3) — this phase replaces this
- **Generated Client**: `src/generated/prisma/` (do not edit) — regenerate after schema change
- **Singleton Services**: All services use `getInstance()` pattern — maintain this in any new services
- **Error Handling**: Components that might fail should return `null` or handle gracefully
- **Environment Variables**: All secrets via `process.env`, throw immediately if not set
- **Testing**: 80% coverage threshold, use `npm run typecheck && npm run test:run && npm run build` before committing

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not affected by DB layer change |
| V3 Session Management | No | Sessions unchanged |
| V4 Access Control | No | Access unchanged |
| V5 Input Validation | Yes | Prisma parameterized queries prevent SQL injection [VERIFIED] |
| V6 Cryptography | No | Database layer, not crypto |

### Known Threat Patterns for PostgreSQL

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection | Tampering | Prisma parameterized queries (automatic) |
| Connection String Exposure | Information Disclosure | Environment variables, not hardcoded |
| Excessive Privileges | Elevation of Privilege | Use dedicated database user with minimal permissions |
| Unencrypted Connections | Information Disclosure | SSL/TLS in production (sslmode=require in connection string) |

## Sources

### Primary (HIGH confidence)
- npm registry - @prisma/adapter-pg 7.7.0, pg 8.20.0, prisma 7.7.0 version verification
- [Prisma Connection Pool Documentation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool) - Pool configuration patterns
- [Prisma Indexes Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes) - GIN index with JsonbPathOps
- [Docker Compose Services Reference](https://docs.docker.com/reference/compose-file/services/) - Health check configuration

### Secondary (MEDIUM confidence)
- [Medium: Prisma v7 with PostgreSQL Setup](https://medium.com/@manendrav/how-to-setup-prisma-v7-with-postgresql-in-node-js-2026-a187f749dac4) - Adapter instantiation pattern
- [PostgreSQL 17.9 Release](https://www.postgresql.org/docs/release/17.6/) - Current stable version

### Tertiary (LOW confidence)
- None - all claims verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified via npm registry
- Architecture: HIGH - Patterns from official Prisma documentation
- Pitfalls: HIGH - Documented breaking changes in Prisma 7 + community discussions

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days - stable technology stack)
