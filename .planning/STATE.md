---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Quality & Testing
status: planning
last_updated: "2026-04-22T18:42:59.723Z"
last_activity: 2026-04-22
progress:
  total_phases: 11
  completed_phases: 8
  total_plans: 47
  completed_plans: 47
  percent: 100
---

# State: NewsHub

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-20)

**Core value:** Users can see how the same story is covered by different regional perspectives
**Current focus:** v1.2 Performance & Scale

## Current Position

Phase: 17 of 17 (Docker Deployment)
Plans: 0/3 plans complete
Status: Ready to execute Phase 17
Last activity: 2026-04-23

Progress: Phase 16 complete, Phase 17 planned (3 plans in 2 waves)

## Milestone Progress

**Milestone:** v1.2 - Performance & Scale
**Goal:** Production-ready infrastructure with PostgreSQL, Redis, Docker
**Status:** Planning
**Previous:** v1.1 complete 2026-04-22

**Phases:**

- Phase 7: Core Backend Service Tests (5 requirements)
- Phase 8: Data Pipeline Service Tests (6 requirements)
- Phase 9: Extension Service Tests (5 requirements)
- Phase 10: Frontend Hook & Library Tests (10 requirements)
- Phase 11: E2E Tests (10 requirements)
- Phase 12: Bug Fixes & Code Quality (5 requirements)

**Total requirements:** 41

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status |
|----------|------|--------|
| verification | Phase 03 human verification | human_needed |
| uat | Phase 06 UAT tests | blocked |

**Note:** These are environmental/operational items, not code defects:

- Phase 03: Email flows work but need SMTP server for production testing
- Phase 06: UAT tests blocked by no live RSS feeds during testing

## Session Context

**Last action:** Planned Phase 17 (Docker Deployment) - 3 plans in 2 waves created
**Next step:** Execute Phase 17 (Docker Deployment)
**Resume file:** .planning/phases/17-docker-deployment/17-01-PLAN.md
**Checkpoint:** None

## Decisions

- **2026-04-20:** cleanupService tests use vi.useFakeTimers() with vi.setSystemTime() for deterministic date-based testing
- **2026-04-20:** Shared EmailService mock instance via closure for cross-test assertion access
- **2026-04-21:** Use undefined (not null) for optional sourceLang parameter in DeepL mock assertions
- **2026-04-21:** personaService tests use globalThis to pass mock function into vi.mock factory for hoisting compatibility
- **2026-04-21:** vi.resetModules() with dynamic import for fresh module-level Map state in sharingService tests
- **2026-04-21:** vi.hoisted() for Socket.IO mock with globalThis for connection handler capture in websocketService tests
- **2026-04-21:** Module-level mockLaunch function for puppeteer-extra to avoid vi.mock hoisting issues in stealthScraper tests
- **2026-04-22:** Three Playwright projects: setup, chromium (unauthenticated), chromium-auth (authenticated with storageState)
- **2026-04-22:** localStorage bypass via addInitScript for FocusOnboarding modal in E2E tests; domcontentloaded wait strategy for WebSocket apps
- **2026-04-22:** Bookmarks page tests run under chromium project (not chromium-auth) - page uses client-side localStorage, not server authentication
- **2026-04-22:** Serial test mode for Profile page tests to avoid auth state race conditions between parallel workers
- **2026-04-22:** ESLint config: allow underscore prefix for unused vars; disable no-explicit-any for test files
- **2026-04-22:** PrismaPg adapter with inline pool configuration (max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 300000)
- **2026-04-22:** JsonbPathOps operator class for GIN indexes (optimal for @> containment queries)
- **2026-04-22:** Use SELECT 1 for minimal database connectivity check in /api/health/db endpoint
- **2026-04-22:** Deterministic IDs for AIPersona using slugified name; export pattern with standalone execution guard
- **2026-04-22:** Unit tests with Prisma mocks are independent of database connectivity
- **2026-04-22:** E2E auth tests require live database for user registration/login setup
- **2026-04-22:** SHA-256 hash JWT tokens before storing in Redis blacklist (T-14-01 security mitigation)
- **2026-04-22:** Blacklist check in authMiddleware placed after JWT verification but before tokenVersion check for efficiency
- **2026-04-22:** Changed AIService topicTTL from 24h to 5min for news freshness alignment with TanStack Query stale time
- **2026-04-22:** IP-based rate limiting for auth/news, user-based for AI endpoints; graceful degradation when Redis unavailable (D-03)

## Performance Metrics

| Date | Phase | Plan | Duration (min) | Tasks | Files |
|------|-------|------|----------------|-------|-------|
| 2026-04-20 | 07 | 04 | 4 | 1 | 1 |
| 2026-04-21 | 09 | 01 | 5 | 1 | 1 |
| 2026-04-21 | 09 | 02 | 5 | 1 | 1 |
| 2026-04-21 | 09 | 04 | 4 | 1 | 1 |
| 2026-04-21 | 09 | 05 | 11 | 1 | 1 |
| 2026-04-21 | 09 | 03 | 12 | 1 | 1 |
| 2026-04-22 | 11 | 01 | 5 | 3 | 4 |
| 2026-04-22 | 11 | 02 | 5 | 1 | 1 |
| 2026-04-22 | 11 | 03 | 8 | 1 | 1 |
| 2026-04-22 | 11 | 06 | 17 | 1 | 2 |
| 2026-04-22 | 11 | 05 | 23 | 1 | 2 |
| 2026-04-22 | 11 | 07 | 15 | 1 | 1 |
| 2026-04-22 | 11 | 08 | 17 | 1 | 1 |
| 2026-04-22 | 12 | 01 | 5 | 1 | 1 |
| 2026-04-22 | 12 | 02 | 8 | 3 | 17 |
| 2026-04-22 | 13 | 01 | 8 | 3 | 7 |
| 2026-04-22 | 13 | 02 | 4 | 1 | 1 |
| 2026-04-22 | 13 | 03 | 3 | 2 | 2 |
| 2026-04-22 | 13 | 04 | 5 | 3 | 4 |
| 2026-04-22 | 13 | 05 | 11 | 2 | 0 |
| 2026-04-22 | 14 | 01 | 3 | 3 | 3 |
| 2026-04-22 | 14 | 03 | 7 | 3 | 2 |
| 2026-04-22 | 14 | 04 | 14 | 3 | 3 |
| 2026-04-22 | 14 | 02 | 23 | 4 | 4 |
| 2026-04-22 | 14 | 05 | 12 | 3 | 2 |

## Open Issues

- **13-02 Task 2:** Blocked - Docker Desktop not running, DATABASE_URL still SQLite
- **13-05 Task 3:** Checkpoint reached - E2E auth tests blocked by database unavailability (26/62 passed)

---
*State initialized: 2026-04-18*
*Last updated: 2026-04-23 — Phase 17 planned (3 plans in 2 waves)*
