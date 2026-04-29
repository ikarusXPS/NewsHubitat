---
phase: 37-horizontal-scaling
plan: 07
subsystem: infra
tags: [docs, multi-region, postgres-replication, redis-replication, cdn, cap, horizontal-scaling, deploy-03]

# Dependency graph
requires:
  - phase: 37-horizontal-scaling
    provides: "37-04 production single-region Swarm topology (this doc is the explicit forward-looking complement to it; references the 4-replica + 1-worker shape and DEPLOY-04 stop_grace_period contract)"
  - phase: 37-horizontal-scaling
    provides: "37-01 Socket.IO Redis adapter (single-Pub/Sub-plane assumption is the bottleneck this doc names for cross-region fanout — recommends Redis Streams + region-local adapter as INFRA-F01 territory)"
  - phase: 37-horizontal-scaling
    provides: "37-03 PgBouncer transaction-pool pattern (extended in section 3 to per-region pool topology)"
  - phase: 20-monitoring-alerting
    provides: "Prometheus + Grafana + Alertmanager stack (operational-considerations section references Prometheus federation pattern)"
provides:
  - "docs/multi-region-patterns.md — architecture-only documentation closing INFRA-05; 425 lines; 8 numbered sections + Table of Contents + References per RESEARCH.md doc-structure spec"
  - "Forward pointers to INFRA-F01 (active-active impl), INFRA-F02 (Kubernetes migration), INFRA-F03 (CDN edge caching) — 16 explicit citations across the doc"
  - "DEPLOY-03 lock realized: zero vendor templates / zero connection strings / zero account or project IDs (T-37-21 grep gate verified)"
affects:
  - "INFRA-F01 (active-active multi-region implementation — uses this doc as the design lock for routing, write-path pinning, replication choices)"
  - "INFRA-F02 (Kubernetes migration — section 7 deploy-ordering and Prometheus federation guidance carries forward)"
  - "INFRA-F03 (CDN edge caching — section 6 already enumerates cache headers shipping in production today)"
  - "Future ops engineers — doc lives at repo-root docs/ specifically so it is discoverable without GSD context (per Phase 37 CONTEXT.md §Specific Ideas)"

# Tech tracking
tech-stack:
  added: []  # docs-only plan; no runtime tech added
  patterns:
    - "Architecture-only documentation pattern: replication options as side-by-side trade-off tables; per-data-domain consistency requirements as a single comparison table; explicit out-of-scope section at the end with forward requirement IDs"
    - "DEPLOY-03 secrets/templates exclusion: doc names vendors and managed services (Aurora Global, Cloud SQL, Upstash Global, Cloudflare, Fastly, CloudFront, Bunny) without copy-pasteable recipes — vendor selection deferred to INFRA-F01"
    - "Forward-pointer convention: every out-of-scope item names the future requirement ID (INFRA-F01..F03) so a reader following any thread reaches the right next-phase artifact"

key-files:
  created:
    - "docs/multi-region-patterns.md (425 lines, 10 ## sections, INFRA-05 deliverable)"
  modified: []

key-decisions:
  - "Doc location: repo-root docs/ (NOT .planning/) per Phase 37 CONTEXT.md §Specific Ideas — discoverable to ops engineers without GSD-system context"
  - "Single-primary streaming replication recommended as the INFRA-F01 starting point — multi-master Postgres deferred until write-latency becomes a measured problem (currently isn't)"
  - "Cross-region WebSocket fanout pattern: region-local adapter + Redis Streams replication + per-region consumer (durable, replayable). Single-Pub/Sub plane is named explicitly as the Phase 37 limitation"
  - "RSS aggregation worker remains a global singleton in any multi-region topology — running it in two regions causes duplicate NewsArticle inserts and duplicate news:new broadcasts. Stripe webhook handling pinned to home region for the same correctness reason"
  - "Edge caching named as the cheaper first step before full multi-region — for read-heavy NewsHub, INFRA-F03 (CDN) likely closes most of the global-latency gap without requiring INFRA-F01"

patterns-established:
  - "Per-data-domain consistency table: NewsArticle (eventual), User accounts (read-after-write within region), Comments (RAW within region), Subscriptions (strong/global), AI cache (region-local), JWT blacklist (cross-region replicate or shorter TTL), Rate-limit counters (region-local)"
  - "Pre-publication grep gate for documentation: zero matches for credential tokens (aws_access_key, STRIPE_SECRET_KEY, cloudflare api token), real connection strings (postgres://...:password@...), specific account/project IDs"

requirements-completed: [INFRA-05]

# Metrics
duration: ~12min
completed: 2026-04-29
---

# Phase 37 Plan 07: Multi-Region Patterns Documentation Summary

**Architecture-only `docs/multi-region-patterns.md` covering when multi-region is justified, active-active vs active-passive, Postgres + Redis replication options, per-data-domain consistency tables, CDN edge caching, deploy-ordering, and explicit forward-pointers to INFRA-F01..F03 — closes INFRA-05 and honors the DEPLOY-03 zero-vendor-templates lock.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-29T03:18:00Z
- **Completed:** 2026-04-29T03:30:39Z
- **Tasks:** 1
- **Files created:** 1 (`docs/multi-region-patterns.md`, 425 lines)
- **Files modified:** 0

## Accomplishments

- **Architecture-only multi-region patterns doc authored at repo-root `docs/`** (not under `.planning/`) so ops engineers can reach it without GSD-system context — per Phase 37 CONTEXT.md §Specific Ideas.
- **All 8 sections from RESEARCH.md §Multi-Region Patterns Doc Structure (lines 925-947) covered** with NewsHub-specific guidance, plus Table of Contents and References sections.
- **DEPLOY-03 lock honored end-to-end:** zero vendor templates, zero copy-pasteable deploy recipes, zero credential strings, zero account/project IDs. T-37-21 pre-publication grep gate VERIFIED PASSING (see verification block below).
- **16 explicit forward-pointers to INFRA-F01 / INFRA-F02 / INFRA-F03** across the doc — every out-of-scope item names its future requirement ID so a reader following any thread reaches the right next-phase artifact.
- **NewsHub-specific guidance baked in:** read-heavy profile justifies single-primary Postgres + per-region read replicas; RSS worker singleton MUST stay global (running in two regions = duplicate NewsArticle inserts); Comments + Team bookmarks need read-after-write within a region; Stripe webhook handling pinned to home region for global consistency on payment confirmations; AI cache region-local (re-compute on miss).
- **Single-Pub/Sub-plane limitation of `@socket.io/redis-adapter` named explicitly** with the recommended INFRA-F01 pattern (region-local adapter + Redis Streams replication + per-region consumer that re-emits to local Pub/Sub) — durable and replayable, unlike raw cross-region Pub/Sub.
- **CDN edge caching section (§6) already enumerates the existing `Cache-Control` headers** shipped today (`/api/news` 5min, `/api/news/sources` 24h, `/api/news/:id` 5min) so INFRA-F03 implementation is a wiring exercise, not a header-design exercise.

## 8 Sections Covered (One-Line Summary Per Section)

1. **When to go multi-region** — Three forcing functions (latency goals, data residency, availability targets); explicit "what 30k doesn't need / what 300k probably does" framing; CDN as cheaper first step.
2. **Active-active vs active-passive** — Definitions, fits, write-conflict semantics; per-user pinning vs nearest-region writes; NewsHub fit (read-heavy works for active-active); RSS worker + Stripe as singleton write paths.
3. **Postgres replication options** — Streaming (default for INFRA-F01), logical (selective sync), Aurora Global, Cloud SQL, Neon; multi-master is hard and deferred; per-region PgBouncer extension of Phase 37 pattern.
4. **Redis replication options** — Master-replica, Cluster, Elasticache, Upstash Global; CRITICAL: Socket.IO adapter single-Pub/Sub-plane bottleneck and the Redis-Streams-per-region cross-region fanout pattern; AI cache / rate-limit / JWT blacklist all region-local.
5. **Latency-vs-consistency trade-offs** — CAP framing; per-data-domain consistency table covering 10 data domains (NewsArticle, NewsSource, User, Comments, Bookmarks, ReadingHistory, TeamBookmark, Subscription, JWT blacklist, rate-limit, AI cache, real-time WS); read-heavy profile is the structural reason multi-region is viable for NewsHub.
6. **CDN edge caching** — Cacheable list (5 endpoints + static assets) with their existing `Cache-Control` headers; not-cacheable list (auth, account, history, mutations, WS, Stripe webhook); cache-key dimensions (Vary, query params, NEVER Authorization); stale-while-revalidate; INFRA-F03 pointer.
7. **Operational considerations** — DNS routing (GeoDNS, latency-based, anycast); deploy ordering (schema first, then app, region by region; worker singleton stop-first); Prometheus federation; Traefik dashboard exposure cited per Plan 04 mitigation (T-37-22); replication-lag alerts; cost note (~2x cloud bill).
8. **What this phase does NOT do** — Explicit out-of-scope list with INFRA-F01..F03 pointers; vendor selection deferred; multi-region load testing deferred to post-INFRA-F01; cross-region failover automation deferred.

## Task Commits

1. **Task 1: Author docs/multi-region-patterns.md** — `3bcac0f` (docs)

**SUMMARY commit:** to follow this commit (final commit of plan).

## Files Created/Modified

- **`docs/multi-region-patterns.md`** (NEW, 425 lines) — Architecture-only multi-region patterns documentation covering the 8 sections above plus Table of Contents and References. Cites Phase 37 RESEARCH.md, CONTEXT.md (DEPLOY-03), Plan 04 SUMMARY, and external Postgres/Redis/Streams/Socket.IO docs.

## Decisions Made

- **Doc location: repo-root `docs/`** (NOT `.planning/`). Phase 37 CONTEXT.md §Specific Ideas is explicit: this doc must be reachable by ops engineers who don't have GSD-system context. The `docs/` directory at repo root already exists (API.md, ARCHITECTURE.md, CONFIGURATION.md, DEPLOYMENT.md, etc.) and is not in the project's anti-pattern forbidden-roots list (`server/`, `prisma/`, `src/` at root are forbidden; `docs/` is allowed and conventional).
- **Single-primary streaming replication is the INFRA-F01 starting point**, not multi-master. NewsHub's read-heavy profile + singleton RSS worker write path means the conflict-resolution tax of multi-master Postgres cannot be justified by the write-latency win. Multi-master deferred until measured.
- **CDN edge caching named as the cheaper first step.** For a read-heavy product like NewsHub, INFRA-F03 (CDN edge) likely closes most of the global-latency gap without requiring INFRA-F01. The doc says this explicitly so an ops engineer reading it doesn't sequence the work in the wrong order.
- **Cross-region WebSocket fanout via Redis Streams + region-local adapter**, NOT cross-region Pub/Sub. Pub/Sub is fire-and-forget; a transient cross-region link blip becomes silent loss. Streams give a stored offset → transient blips become lag, not loss. This is the correctness-driven pattern, not a performance optimization.

## Deviations from Plan

None — plan executed exactly as written. The plan provided a sample markdown body in `<action>`; the actual doc adapts the prose substantially (longer, with tighter NewsHub-specific framing, ToC, additional rows in the consistency table for JWT blacklist + rate-limit counters + WebSocket events) but preserves the 8-section structure verbatim and all the locked content elements (DEPLOY-03 / INFRA-05 / INFRA-F01..F03 citations, T-37-21 grep gate verification, NewsHub-specific guidance for read-heavy + RSS singleton + Comments + Team bookmarks).

This is consistent with the plan's `<action>` direction: "adapt the prose but keep the section structure and NewsHub-specific guidance from RESEARCH.md".

## Issues Encountered

- **Worktree base mismatch at startup.** The worktree was created on `test-ci-pipeline` HEAD (`75ff45e`, phase 18 work), not on the expected Wave 4 base `0e7989477ef9cd930679d65f7120641d5360a326` (which contains the Wave 3 + earlier-Wave-4 phase 37 commits). Resolved via `git reset --hard 0e7989477ef9cd930679d65f7120641d5360a326` per the `<worktree_branch_check>` instructions. After reset, all prior 37-* artifacts (including 37-04-SUMMARY.md) were available for context. No further issues.

## T-37-21 Pre-Publication Grep Gate (Forbidden Patterns)

Verified ZERO matches for the four forbidden pattern classes in `docs/multi-region-patterns.md`:

| Pattern class | Grep | Result |
|---|---|---|
| `aws_access_key` (case-insensitive) | `grep -iE "aws_access_key" docs/multi-region-patterns.md` | 0 matches — PASS |
| `STRIPE_SECRET_KEY` (case-insensitive) | `grep -iE "STRIPE_SECRET_KEY" docs/multi-region-patterns.md` | 0 matches — PASS |
| `cloudflare api token` (case-insensitive) | `grep -iE "cloudflare api token" docs/multi-region-patterns.md` | 0 matches — PASS |
| Real connection strings (`postgres://...:password@...`) | `grep -iE "postgres://[^/]+:[^/]+@" docs/multi-region-patterns.md` | 0 matches — PASS |
| Specific account/project IDs (`account.id.[0-9]{10,}`, `projectId`, `proj_[a-z0-9]{10,}`) | `grep -iE "account.id.[0-9]{10,}\|projectId\|proj_[a-z0-9]{10,}" docs/multi-region-patterns.md` | 0 matches — PASS |

The doc names vendors generically (Cloudflare, Fastly, AWS CloudFront, Bunny, KeyCDN, Aurora Global Database, Cloud SQL, Elasticache, Upstash Global, Neon, Patroni, repmgr, BDR, Bucardo, pglogical, Yugabyte) without any copy-pasteable configuration, credentials, URLs, or recipes. **DEPLOY-03 lock honored.**

## T-37-22 Mitigation (Traefik Dashboard Exposure)

The doc's §7 Operational considerations cites the Traefik dashboard exposure issue per the Plan 04 mitigation: "If multi-region operators need the Traefik dashboard (port 8080 in Phase 37 / Plan 04), keep the bind to `127.0.0.1:8080:8080` per Plan 04's mitigation. Never expose the dashboard on `0.0.0.0:8080` in production — it leaks routing topology and backend service names to the public internet. SSH-tunnel into the host or front it with an authenticated reverse proxy."

T-37-22 disposition is `accept` with the constraint that any mention cite Plan 04's localhost binding — verified.

## User Setup Required

None — Plan 07 only authors documentation. No env vars, no service config, no operator action required.

## Next Phase Readiness

- **INFRA-05 closed.** The doc is the deliverable; nothing else in Phase 37 is required for this requirement.
- **Phase 37 itself:** with Plans 01-07 done (assuming Plans 05/06 land before merge), Phase 37 ROADMAP success criteria are all addressed; ready for Phase 37 verification + UAT.
- **INFRA-F01 (future):** the doc IS the design lock. INFRA-F01's plan-phase will read this doc and produce concrete vendor selection + topology + deploy plan.
- **INFRA-F03 (future, CDN edge):** §6 enumerates the cache headers already shipping in production today. INFRA-F03 implementation is a wiring exercise.

## Self-Check: PASSED

**File presence:**
- `docs/multi-region-patterns.md` — FOUND (425 lines)
- `.planning/multi-region-patterns.md` — CORRECTLY ABSENT (must NOT exist at this path)
- `.planning/phases/37-horizontal-scaling/37-07-SUMMARY.md` — FOUND (this file)

**Verification block (Plan §verification):**
- `test -f docs/multi-region-patterns.md` — PASS
- `test ! -f .planning/multi-region-patterns.md` — PASS
- `grep -c "^## " docs/multi-region-patterns.md` returns 10 (>= 8 required) — PASS
- `grep -E "INFRA-F0[123]" docs/multi-region-patterns.md | wc -l` returns 16 (>= 3 required) — PASS
- NewsHub-specific guidance present (`Comments`, `Team bookmarks` ⇒ TeamBookmark, `RSS`, `read-heavy`, `read-after-write` all matched) — PASS
- T-37-21 forbidden-pattern grep gate (5 pattern classes) — PASS (all 0 matches)
- Length: 425 lines (> 200 required) — PASS

**Anti-pattern guard (project-global `.planning/.continue-here.md`):**
- No files written under root `server/`, `prisma/`, `src/` — PASS
- File is at `docs/` (repo root, allowed by .continue-here.md and conventional location) — PASS

**Threat-model mitigations:**
- T-37-21 (Information Disclosure / vendor template leak): grep gate PASS — see table above
- T-37-22 (Traefik dashboard exposure): cited in §7 with Plan 04 localhost-binding constraint — VERIFIED

**Plan must-haves (frontmatter `must_haves.truths`):**
- Doc exists at `docs/multi-region-patterns.md` (NOT `.planning/`) — PASS
- All 8 sections from RESEARCH.md doc structure covered — PASS
- NewsHub-specific characteristics cited (read-heavy; RSS asynchronous → eventual consistency for articles; Comments + Team bookmarks read-after-write within region) — PASS
- Documentation only (no vendor templates / connection strings / deploy recipes) — PASS
- Forward-pointers to INFRA-F01 / INFRA-F02 / INFRA-F03 explicit — PASS (16 occurrences)
- Doc lives at `docs/` (not `.planning/`) for ops discoverability — PASS

**Plan must-haves (frontmatter `must_haves.artifacts`):**
- `docs/multi-region-patterns.md` provides architecture-only documentation covering INFRA-05; no vendor templates — PASS
- min_lines: 250 — PASS (425 lines)
- contains: "INFRA-F01" — PASS (multiple occurrences)

**Plan must-haves (frontmatter `must_haves.key_links`):**
- Link from `docs/multi-region-patterns.md` to REQUIREMENTS.md INFRA-F01/F02/F03 via explicit out-of-scope section pointing forward, pattern `INFRA-F0[123]` — PASS (§8 "What this phase does NOT do" enumerates all three)

**Commit presence:**
- `3bcac0f` (docs(37-07): author multi-region patterns documentation) — FOUND on this worktree branch

---
*Phase: 37-horizontal-scaling*
*Plan: 07*
*Completed: 2026-04-29*
