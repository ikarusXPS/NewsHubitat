# Phase 35: Infrastructure Foundation - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Developers can access NewsHub data via public API with code sharing infrastructure for mobile apps. This phase establishes the monorepo structure for code sharing and exposes a self-service API portal with tiered rate limits.

**Delivers:**
- pnpm workspace monorepo with apps/web and shared packages
- Public API endpoints at /api/v1/public/* with OpenAPI documentation
- Developer portal with self-service API key management
- Tiered rate limiting (Free: 10/min, Pro: 100/min)

</domain>

<decisions>
## Implementation Decisions

### Monorepo Structure
- **D-01:** Use pnpm workspaces with `apps/` + `packages/` layout
- **D-02:** Move existing app to `apps/web`, create `apps/mobile` in Phase 39
- **D-03:** Extract only two packages initially: `packages/types` (shared TypeScript interfaces) and `packages/api-client` (generated from OpenAPI)
- **D-04:** Use source-only exports (raw .ts files) — no separate build step for packages. Apps consume TypeScript directly.

### Public API Design
- **D-05:** Version API via URL prefix: `/api/v1/public/*`
- **D-06:** Authenticate with `X-API-Key` header. Key format: `nh_live_xxxx` or `nh_test_xxxx`
- **D-07:** Use Scalar for OpenAPI documentation (modern UI, try-it-out panel)
- **D-08:** Expose read-only endpoints: news (list, detail), events, sentiment stats. No AI analysis endpoints in Free tier.

### Developer Portal
- **D-09:** Create dedicated `/developers` page with docs, examples, and key management
- **D-10:** Maximum 3 API keys per user (dev/staging/prod pattern)
- **D-11:** Dashboard shows: list of API keys, creation date, last used timestamp, request count this month

### Rate Limit Enforcement
- **D-12:** Store tier on ApiKey model (`tier: 'free' | 'pro'`). Lookup from Redis-cached key metadata.
- **D-13:** Use standard RateLimit headers per IETF draft: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- **D-14:** Use sliding window algorithm (already implemented for internal limits via express-rate-limit + Redis)
- **D-15:** Free tier: 10 req/min, Pro tier: 100 req/min

### Claude's Discretion
- API key format details (prefix length, charset, checksum)
- Exact Scalar UI customization (colors, logo placement)
- OpenAPI spec generation approach (code-first vs spec-first)
- Database schema for ApiKey model (indexes, constraints)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rate Limiting (existing patterns)
- `server/middleware/rateLimiter.ts` — Existing rate limiter with Redis store, IP/user key generators
- `server/config/rateLimits.ts` — Tier-based config structure to extend for API tiers

### Types (extraction candidates)
- `src/types/index.ts` — Main type exports to extract to packages/types
- `src/types/focus.ts`, `feeds.ts`, `gamification.ts` — Domain types

### Requirements
- `.planning/REQUIREMENTS.md` §Monetization — PAY-08, PAY-09, PAY-10 requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/middleware/rateLimiter.ts` — Mature rate limiting with Redis sliding window, can extend for API key tiers
- `server/config/rateLimits.ts` — Tier config pattern to replicate for public API
- `CacheService` — Redis client singleton for API key metadata caching

### Established Patterns
- Express route registration in `server/routes/` — follow same pattern for public API routes
- Middleware chaining for auth + rate limiting
- Standard headers via express-rate-limit `standardHeaders: true`

### Integration Points
- `server/index.ts` — Mount new `/api/v1/public` router
- `src/pages/` — Add new DevelopersPage
- `pnpm-workspace.yaml` (to create) — Workspace root config
- `package.json` — Add workspace protocol dependencies

</code_context>

<specifics>
## Specific Ideas

- Key format `nh_live_xxxx` / `nh_test_xxxx` mirrors Stripe's `sk_live_` / `sk_test_` pattern — familiar to developers
- Scalar docs have better UX than Swagger UI, good for developer experience focus
- 3 keys per user supports standard dev/staging/prod workflow without complexity

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-infrastructure-foundation*
*Context gathered: 2026-04-26*
