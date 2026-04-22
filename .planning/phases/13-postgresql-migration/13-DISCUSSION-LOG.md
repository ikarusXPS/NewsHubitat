# Phase 13: PostgreSQL Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 13-postgresql-migration
**Areas discussed:** Connection pooling strategy, Migration path, Environment switching, Schema compatibility

---

## Connection Pooling Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Prisma built-in pooling | Use Prisma's native connection pool. Simplest setup — just connection_limit in DATABASE_URL. Works well up to ~100 concurrent connections. | ✓ |
| PgBouncer external pooler | Separate pooling layer. Better for serverless/high-scale, but adds operational complexity. Typically used with 1000+ connections. | |
| Prisma Accelerate (cloud proxy) | Managed pooling service from Prisma. Global edge caching, but adds cost and external dependency. | |

**User's choice:** Prisma built-in pooling (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| 10 connections | Standard starting point. Formula: (CPU cores * 2) + effective_spindle_count. Good for single-server deployment. | ✓ |
| 20 connections | Higher throughput for busy apps. May hit PostgreSQL max_connections limits on small instances. | |
| You decide | Let Claude pick based on deployment context during planning. | |

**User's choice:** 10 connections (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Queue and retry | When pool is exhausted, queue requests and retry with backoff. Better user experience, prevents cascade failures. | ✓ |
| Fail fast with error | Return 503 immediately when no connections available. Simpler, but users see errors during spikes. | |
| You decide | Let Claude implement standard error handling during planning. | |

**User's choice:** Queue and retry (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| 5 seconds | Standard timeout. Long enough for pool contention, short enough to fail fast on real issues. | ✓ |
| 10 seconds | More lenient for high-load scenarios. | |
| You decide | Let Claude pick reasonable defaults. | |

**User's choice:** 5 seconds (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add /api/health/db | Dedicated endpoint that runs SELECT 1 to verify DB is reachable. Essential for container orchestration (K8s, Docker health checks). | ✓ |
| Extend existing /api/health | Add DB check to existing health endpoint. Simpler, but mixes concerns. | |
| No separate check | Rely on normal query failures to surface DB issues. | |

**User's choice:** Yes, add /api/health/db (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, 5 minutes | Close idle connections after 5 minutes. Frees resources on PostgreSQL server. Standard practice. | ✓ |
| No idle timeout | Keep connections alive indefinitely. Faster reconnect but wastes server resources. | |
| You decide | Let Claude set reasonable defaults. | |

**User's choice:** Yes, 5 minutes (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, JSON structured logs | Log connection events (pool exhaustion, timeouts, reconnects) as structured JSON. Essential for production monitoring. | ✓ |
| Console logs only | Simple console.log/error for connection issues. Easier to read during development. | |
| You decide | Let Claude implement appropriate logging. | |

**User's choice:** Yes, JSON structured logs (Recommended)

---

## Migration Path

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh start in production | PostgreSQL starts empty. SQLite data is dev/test only. Simplest — no migration complexity. News articles are ephemeral anyway. | ✓ |
| Export/import seed script | Export SQLite data to JSON, import to PostgreSQL. Preserves test accounts, bookmarks, badges. One-time migration. | |
| Dual-mode transition period | App reads from both databases during transition. Complex, but zero-downtime. Overkill for this project scale. | |

**User's choice:** Fresh start in production (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, badges and AI personas | Seed the Badge and AIPersona tables with default data. Users/articles accumulate naturally. You already have seed-badges.ts. | ✓ |
| Yes, full demo data | Seed badges, personas, plus sample articles and a demo user. Better for testing but more maintenance. | |
| No seeding | Completely empty DB. Everything created through normal app usage. | |

**User's choice:** Yes, badges and AI personas (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, test suite against PostgreSQL | Run existing test suite against PostgreSQL to verify schema works. All 1051 tests should pass with PostgreSQL. | ✓ |
| Manual verification | Manually test key flows after migration. Less rigorous but faster. | |
| You decide | Let Claude determine verification approach. | |

**User's choice:** Yes, test suite against PostgreSQL (Recommended)

---

## Environment Switching

| Option | Description | Selected |
|--------|-------------|----------|
| PostgreSQL only, drop SQLite | Simplify to one database. Use local PostgreSQL for dev (Docker). No adapter switching code. Cleaner codebase. | ✓ |
| Env-based adapter switching | Keep both adapters. DATABASE_URL format determines which to use. More flexible but adds complexity. | |
| NODE_ENV-based switching | SQLite in development, PostgreSQL in production. Automatic based on NODE_ENV. Risk of env-specific bugs. | |

**User's choice:** PostgreSQL only, drop SQLite (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Docker Compose | Add docker-compose.yml with PostgreSQL service. Single command to start: docker compose up -d. Standard approach. | ✓ |
| Native installation docs | Document installing PostgreSQL locally. No Docker dependency but more setup variation. | |
| Cloud PostgreSQL only | Use free tier cloud DB (Supabase, Neon) even for dev. Simple but requires internet. | |

**User's choice:** Docker Compose (Recommended)

---

## Schema Compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| Native JSONB | Convert String JSON fields to native Json type. PostgreSQL JSONB enables querying inside JSON. Better performance and validation. | ✓ |
| Keep as String | Leave fields as String with JSON content. No schema change needed. Less PostgreSQL optimization. | |
| Hybrid approach | Convert heavily-queried fields (topics, entities) to JSONB, keep others as String. | |

**User's choice:** Native JSONB (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add GIN indexes for JSONB | GIN indexes enable fast JSON containment queries (@>, ?). Essential for filtering by topics/entities. | ✓ |
| Keep existing indexes only | Use current index definitions. JSONB queries will be slower but simpler migration. | |
| You decide | Let Claude optimize indexes during planning. | |

**User's choice:** Yes, add GIN indexes for JSONB (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep LIKE queries for now | Current LIKE/ILIKE queries work in PostgreSQL. Add full-text search later if needed. | ✓ |
| Add PostgreSQL full-text search | Add tsvector columns and GIN indexes for title/content. Better search but scope creep for this phase. | |
| You decide | Let Claude evaluate during planning. | |

**User's choice:** Keep LIKE queries for now (Recommended)

---

## Claude's Discretion

- PostgreSQL version selection (likely 16.x)
- Exact Prisma adapter package selection
- Docker Compose port mapping and volume configuration
- Specific JSONB field conversion order

## Deferred Ideas

- PostgreSQL full-text search — deferred to Query Optimization phase
- PgBouncer — overkill for current scale
- Prisma Accelerate — adds external dependency
