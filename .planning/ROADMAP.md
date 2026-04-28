# Roadmap: NewsHub

## Milestones

- [x] **v1.0 AI Analysis & User Features** - Phases 1-6 (shipped 2026-04-20)
- [x] **v1.1 Quality & Testing** - Phases 7-12 (completed 2026-04-22)
- [x] **v1.2 Performance & Scale** - Phases 13-17 (completed 2026-04-23)
- [x] **v1.3 Production Ready** - Phases 18-22 (completed 2026-04-23)
- [x] **v1.4 User & Community Features** - Phases 23-28 (completed 2026-04-25)
- [x] **v1.5 Performance Optimization** - Phases 29-34 (completed 2026-04-26)
- [ ] **v1.6 Infrastructure & Scale** - Phases 35-40 (current)

## Phases

<details>
<summary>v1.0 AI Analysis & User Features (Phases 1-6) - SHIPPED 2026-04-20</summary>

- [x] Phase 1: AI Analysis (1/1 plans) - completed 2026-04-18
- [x] Phase 2: Event System (5/5 plans) - completed 2026-04-18
- [x] Phase 3: Auth Completion (5/5 plans) - completed 2026-04-18
- [x] Phase 4: User Preferences (0/0 plans, pre-existing) - completed 2026-04-18
- [x] Phase 5: Bookmarks (0/0 plans, pre-existing) - completed 2026-04-18
- [x] Phase 6: Reading History (6/6 plans) - completed 2026-04-19

</details>

<details>
<summary>v1.1 Quality & Testing (Phases 7-12) - COMPLETED 2026-04-22</summary>

- [x] **Phase 7: Core Backend Service Tests** - aiService, authService, cacheService, cleanupService, emailService (4/4 complete)
- [x] **Phase 8: Data Pipeline Service Tests** - eventsService, focusSuggestionEngine, marketDataService, newsAggregator, newsCrawler, newsApiService (6/6 complete)
- [x] **Phase 9: Extension Service Tests** - personaService, sharingService, stealthScraper, translationService, websocketService (5/5 complete)
- [x] **Phase 10: Frontend Hook & Library Tests** - All hooks and utility libraries (10/10 complete)
- [x] **Phase 11: E2E Tests** - Critical user flow verification (8/8 complete, 62 tests)
- [x] **Phase 12: Bug Fixes & Code Quality** - B7 fix, linting, type coverage, dead code (4/4 complete)

</details>

<details>
<summary>v1.2 Performance & Scale (Phases 13-17) - COMPLETED 2026-04-23</summary>

- [x] **Phase 13: PostgreSQL Migration** - Docker Compose, Prisma adapter, JSONB, health endpoints (5/5 complete)
- [x] **Phase 14: Redis Caching** - JWT blacklist, rate limiting, AI cache (5/5 complete)
- [x] **Phase 15: Query Optimization** - Server-Timing, N+1 elimination, chunked saves (4/4 complete)
- [x] **Phase 16: PWA / Service Worker** - Offline fallback, background sync, install prompt (6/6 complete)
- [x] **Phase 17: Docker Deployment** - Multi-stage build, health checks, production serving (3/3 complete)

</details>

<details>
<summary>v1.3 Production Ready (Phases 18-22) - COMPLETED 2026-04-23</summary>

- [x] **Phase 18: CI/CD Pipeline** - GitHub Actions for build, test, deploy with staging and production environments (3/3 complete)
- [x] **Phase 19: Sentry Error Tracking** - Frontend and backend error capture with source maps and performance monitoring (3/3 complete)
- [x] **Phase 20: Monitoring & Alerting** - Health endpoints, Prometheus metrics, uptime checks, Grafana dashboards (3/3 complete)
- [x] **Phase 21: Load Testing** - k6 scripts, 10k user validation, CI integration, performance baselines (3/3 complete)
- [x] **Phase 22: SMTP Production** - Production email provider, delivery verification, bounce handling (3/3 complete)

</details>

<details>
<summary>v1.4 User & Community Features (Phases 23-28) - COMPLETED 2026-04-25</summary>

- [x] **Phase 23: i18n Foundation** - Multi-language UI with react-i18next, string extraction, browser detection (4/4 complete)
- [x] **Phase 24: Mobile Responsive** - Responsive layouts, touch navigation, optimized images (5/5 complete)
- [x] **Phase 25: Social Sharing** - Share buttons, Open Graph meta tags, share analytics (3/3 complete)
- [x] **Phase 26: OAuth Integration** - Google and GitHub OAuth with account linking (5/5 complete)
- [x] **Phase 27: Comments System** - Article comments with threaded replies and real-time updates (4/4 complete)
- [x] **Phase 28: Team Collaboration** - Team workspaces, shared bookmarks, role-based permissions (5/5 complete)

</details>

<details>
<summary>v1.5 Performance Optimization (Phases 29-34) - COMPLETED 2026-04-26</summary>

- [x] **Phase 29: Measurement Foundation** - Bundle analyzer, query logging, Lighthouse baseline (3/3 complete)
- [x] **Phase 30: Frontend Code Splitting** - Route-based splitting, lazy image loading, reduced initial bundle (4/4 complete)
- [x] **Phase 31: Virtual Scrolling** - Virtualized rendering for long article lists (3/3 complete)
- [x] **Phase 32: Image Pipeline** - WebP/AVIF conversion, responsive srcset, Cloudinary integration (4/4 complete)
- [x] **Phase 33: Caching Improvements** - Smart invalidation, HTTP cache headers, jitter-based TTL (3/3 complete)
- [x] **Phase 34: Database Optimization** - EXPLAIN ANALYZE audit, composite indexes, N+1 fixes, pool tuning (4/4 complete)

</details>

### v1.6 Infrastructure & Scale (Current)

**Milestone Goal:** Comprehensive expansion across infrastructure, AI capabilities, mobile platforms, monetization, and content types.

- [x] **Phase 35: Infrastructure Foundation** - Monorepo setup and API gateway (completed 2026-04-26)
- [ ] **Phase 36: Monetization Core** - Stripe integration and subscription tiers
- [ ] **Phase 37: Horizontal Scaling** - Docker Swarm and connection pooling
- [ ] **Phase 38: Advanced AI Features** - Credibility scoring, bias detection, fact-checking
- [ ] **Phase 39: Mobile Apps** - Capacitor wrapper and app store deployment
- [ ] **Phase 40: Content Expansion** - Video, podcast, and source expansion

## Phase Details

### Phase 35: Infrastructure Foundation
**Goal**: Developers can access NewsHub data via public API with code sharing infrastructure for mobile apps
**Depends on**: Phase 34 (v1.5 complete)
**Requirements**: INFRA-01 (partial - monorepo prep), PAY-08, PAY-09, PAY-10
**Success Criteria** (what must be TRUE):
  1. Monorepo structure with pnpm workspaces separates web app, shared packages (types, API client, state)
  2. Developer can register for API key through self-service portal
  3. API requests are rate-limited by tier (Free: 10/min, Pro: 100/min) enforced via Redis
  4. Public API endpoints (`/api/v1/public/*`) return versioned responses with OpenAPI documentation
  5. API usage is logged asynchronously without blocking request processing
**Plans**: 5 plans
n**Plans:**
- [x] 35-01-PLAN.md — Monorepo setup with pnpm workspaces and shared types package
- [x] 35-02-PLAN.md — API key service with generation, validation, and storage
- [x] 35-03-PLAN.md — Public API endpoints with OpenAPI docs and rate limiting
- [x] 35-04-PLAN.md — Developer portal UI with Scalar docs and key management
- [x] 35-05-PLAN.md — Integration tests for public API and developer workflows (awaiting human verification)

### Phase 36: Monetization Core
**Goal**: Users can subscribe to Premium tier and access gated features with Stripe billing
**Depends on**: Phase 35 (API infrastructure)
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07
**Success Criteria** (what must be TRUE):
  1. User can view subscription tiers (Free, Premium EUR9/mo, Enterprise custom) with clear feature comparison
  2. User can subscribe to Premium via Stripe Checkout and manage subscription via Customer Portal
  3. Premium users experience ad-free interface with unlimited AI queries
  4. Premium users can access full reading history without 7-day limit
  5. Premium users can export data in JSON and CSV formats
  6. Stripe webhooks update subscription status idempotently without duplicate processing
**Plans**: 5 plans
**Plans:**
- [x] 36-01-PLAN.md — Schema & service foundation (subscription models, SubscriptionService, Stripe config)
- [x] 36-02-PLAN.md — Stripe checkout & webhooks (checkout sessions, idempotent webhook handlers)
- [x] 36-03-PLAN.md — Feature gating middleware (requireTier, AI rate limit bypass, history/export)
- [x] 36-04-PLAN.md — Pricing page & UI components (TierCard, SubscriptionBadge, i18n)
- [ ] 36-05-PLAN.md — Integration testing & human verification (unit tests, E2E, Stripe flow verification)

### Phase 36.1 (INSERTED): Add Subscription Schema Fields — **COMPLETE** (2026-04-28, verified PASS 5/5)
**Goal**: Backfill subscription/Stripe fields on the User model that Phase 36-01 was marked complete without — currently blocks 36-05 because committed `subscriptionService.ts` references fields the Prisma client doesn't have
**Depends on**: Phase 36 plans 01-04 (committed code already references these fields)
**Requirements**: PAY-01 (foundational schema for subscription state)
**Success Criteria** (all verified TRUE):
  1. ✅ `User` model has all 5 subscription fields with correct types and nullability (`schema.prisma:117-123`)
  2. ✅ Unique indexes on `stripeCustomerId` and `stripeSubscriptionId` (confirmed via psql `\d "User"`)
  3. ✅ `pnpm typecheck` exits 0 (subscriptionService.ts read path patched with `?? 'FREE'` / `?? 'ACTIVE'` fallbacks)
  4. ✅ Migration applied via `prisma db push` (5 columns + 2 unique indexes in live Postgres; `--accept-data-loss` used because Prisma 7 warns on unique indexes over nullable columns even when empty — safe in dev)
  5. ✅ No regressions: 1289/1289 tests pass on main tree (auth/OAuth/team/cleanup services all green)
**Plans**: 36.1-01 ✅ — 4 commits (a0df872, f2e5324, 1af3a5a, 3d95c2f) + SUMMARY + VERIFICATION
**Known Stubs (deferred to a future phase 36.2)**: ProcessedWebhookEvent model, ReferralReward model, Campaign model, StudentVerification model, additional User fields (pausedUntil, showPremiumBadge, customAccentColor, referral fields, student-verification fields), Prisma `SubscriptionTier`/`SubscriptionStatus` enums. All claimed by 36-01-SUMMARY but not delivered; not required to unblock 36-05.

### Phase 36.2 (INSERTED): Close 36-debt — schema models + cleanup
**Goal**: Close the broader 36-Schuld — backfill the models, fields, and Prisma enums that Phase 36-01 SUMMARY claimed but never wrote to disk; remove unused dependencies surfaced during the depcheck audit (commit `87ba5e4`).
**Depends on**: Phase 36.1 (subscription schema foundation), Phase 36 plans 01-04 (Stripe service, webhooks, middleware, pricing page)
**Requirements**: PAY-02..PAY-07 (closure of unmet portions; 36.1 closed PAY-01)
**Success Criteria** (what must be TRUE):
  1. Prisma schema contains the 4 missing models: `ProcessedWebhookEvent`, `ReferralReward`, `Campaign`, `StudentVerification` with appropriate fields, indexes, and relations
  2. `User` model has the additional fields claimed by 36-01-SUMMARY: `pausedUntil`, `showPremiumBadge`, `customAccentColor`, plus referral fields (`referralCode`, `referredBy`, `freeMonthsEarned`) and student-verification fields (`isStudent`, `studentVerifiedUntil`)
  3. Prisma `SubscriptionTier` and `SubscriptionStatus` enums replace the current `String?` typing (consumer code adjusted to import enums; no breakage)
  4. `pnpm typecheck` and full unit-test suite pass (no regressions)
  5. Unused-deps cleanup: `@radix-ui/react-dialog`, `class-variance-authority`, `intl-messageformat`, `pg`, `@types/pg` removed from `apps/web/package.json` (verified via depcheck after removal)
  6. `36-01-SUMMARY.md` annotated with explicit reference to 36.1 + 36.2 as gap-closure (audit trail)
**Plans** (4 plans, 3 waves):

**Wave 1** *(parallel — disjoint files)*:
- [x] 36.2-01-PLAN.md — Schema additions: 4 new models + 8 User fields + 2 enums + back-relations (no db push) — completed 2026-04-28 (1976489, 44aa829)
- [x] 36.2-02-PLAN.md — Depcheck cleanup: remove 5 unused deps from apps/web/package.json + regenerate lockfile — completed 2026-04-28 (b9e068b)

**Wave 2** *(blocked on Plan 01)*:
- [x] 36.2-03-PLAN.md — [BLOCKING] db push + prisma generate + stripe.ts re-export refactor + verify typecheck/tests — completed 2026-04-28 (556694f, 30466e2)

**Wave 3** *(blocked on Plans 01-03 — needs commit SHAs for audit trail)*:
- [x] 36.2-04-PLAN.md — Audit-trail annotation on 36-01-SUMMARY.md + PRODUCTION-MIGRATION.md handoff — completed 2026-04-28 (5cb75f3)

**Cross-cutting constraints:**
- D-01: Prisma enums use UPPERCASE values (`FREE PREMIUM ENTERPRISE`, `ACTIVE PAST_DUE CANCELED PAUSED`) — appears in Plans 01, 03
- D-02: Use `prisma db push --accept-data-loss` (dev-only); production migration deferred to PRODUCTION-MIGRATION.md — appears in Plans 03, 04
- D-10: Schema work and depcheck cleanup live in **separate plans with separate commits** — enforced by Plans 01 and 02 disjoint `files_modified`

### Phase 36.3 (INSERTED): Fix Stripe Webhook Monorepo Path
**Goal**: Restore Stripe webhook handler and subscription routes to the live monorepo backend — Phase 36-02 committed three source files plus `index.ts` edits to the orphaned root `server/` directory instead of `apps/web/server/`, leaving the running backend with no `/api/webhooks/stripe` route. All Stripe events return 404 in `stripe listen` despite the JSON raw-body parser and webhook secret being in place.
**Depends on**: Phase 36.1 (subscription schema), Phase 36.2 (provides `ProcessedWebhookEvent` model used by webhook idempotency — required before webhook handler is wired live)
**Requirements**: PAY-02 (Stripe Checkout), PAY-03 (Customer Portal), PAY-06 (idempotent webhook processing)
**Success Criteria** (what must be TRUE):
  1. `apps/web/server/services/stripeWebhookService.ts`, `apps/web/server/routes/webhooks/stripe.ts`, and `apps/web/server/routes/subscriptions.ts` exist with the same logic as the orphaned root copies (idempotency, signature verification, price-ID whitelist preserved)
  2. Webhook route mounted in `apps/web/server/index.ts` BEFORE `express.json()` so raw body is available for HMAC verification
  3. Subscription routes (`/api/subscriptions/checkout`, `/portal`, `/status`) mounted after `/api/teams` with `authMiddleware`
  4. `stripe trigger checkout.session.completed` against the live backend returns HTTP 200 (not 404) for all forwarded events in `stripe listen` output
  5. Orphaned files at root `server/services/stripeWebhookService.ts`, `server/routes/webhooks/stripe.ts`, `server/routes/subscriptions.ts` removed; root `server/index.ts` reverted or deleted (no longer used by `pnpm dev:backend`)
  6. `pnpm typecheck && pnpm test:run` exits 0 with no regressions
**Plans**: To be created via `/gsd-plan-phase 36.3`

### Phase 37: Horizontal Scaling
**Goal**: System handles 30k concurrent users through horizontal scaling and connection pooling
**Depends on**: Phase 36 (subscription tiers defined)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Application scales to N replicas via Docker Swarm with `deploy.replicas` configuration
  2. Traefik load balancer distributes traffic across replicas with health check validation
  3. PgBouncer connection pooler handles 100+ concurrent connections without exhaustion
  4. WebSocket connections maintain sticky sessions across replicas using Traefik configuration
  5. Multi-region deployment patterns documented for future horizontal expansion
**Plans**: TBD

### Phase 38: Advanced AI Features
**Goal**: Users see source credibility scores and can fact-check claims with AI assistance
**Depends on**: Phase 36 (Premium tier gating)
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07
**Success Criteria** (what must be TRUE):
  1. User sees credibility score (0-100) on each news source with confidence indicator
  2. Credibility score reflects multiple signals (accuracy, transparency, correction history)
  3. User sees political bias indicator (left/center/right) per source with methodology explanation
  4. User can compare framing analysis showing how different sources cover same topic
  5. User can request fact-check on specific claims with confidence level and source citations
  6. AI analysis results are cached in Redis with 24h TTL to minimize inference costs
**Plans**: TBD
**UI hint**: yes

### Phase 39: Mobile Apps
**Goal**: Users can install native iOS and Android apps from app stores with push notifications
**Depends on**: Phase 35 (monorepo code sharing)
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05, MOB-06, MOB-07, MOB-08
**Success Criteria** (what must be TRUE):
  1. User can download app from iOS App Store via Capacitor wrapper
  2. User can download app from Google Play Store via Capacitor wrapper
  3. User receives push notifications for breaking news matching their region preferences
  4. User receives personalized alerts based on reading history patterns
  5. User can authenticate via biometric (Face ID/Touch ID/fingerprint)
  6. App displays cached articles offline in read-only mode
  7. Mobile apps share 60%+ business logic with web through monorepo packages
**Plans**: TBD
**UI hint**: yes

### Phase 40: Content Expansion
**Goal**: Users can access video and podcast content with transcription for Premium subscribers
**Depends on**: Phase 36 (Premium tier for transcription gating)
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07
**Success Criteria** (what must be TRUE):
  1. System aggregates from 200+ news sources across existing and new regions
  2. User can browse podcast episodes related to news topics with embedded player
  3. Premium users see podcast transcription with timestamp navigation
  4. User can view embedded video content from YouTube and Vimeo sources
  5. Premium users see auto-generated video transcription with searchable text
  6. Media pipeline handles video/audio transcoding with Cloudinary integration
  7. Storage costs remain predictable through embed-first strategy and upload quotas
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. AI Analysis | v1.0 | 1/1 | Complete | 2026-04-18 |
| 2. Event System | v1.0 | 5/5 | Complete | 2026-04-18 |
| 3. Auth Completion | v1.0 | 5/5 | Complete | 2026-04-18 |
| 4. User Preferences | v1.0 | 0/0 | Complete | 2026-04-18 |
| 5. Bookmarks | v1.0 | 0/0 | Complete | 2026-04-18 |
| 6. Reading History | v1.0 | 6/6 | Complete | 2026-04-19 |
| 7. Core Backend Service Tests | v1.1 | 4/4 | Complete | 2026-04-20 |
| 8. Data Pipeline Service Tests | v1.1 | 6/6 | Complete | 2026-04-21 |
| 9. Extension Service Tests | v1.1 | 5/5 | Complete | 2026-04-21 |
| 10. Frontend Hook & Library Tests | v1.1 | 10/10 | Complete | 2026-04-21 |
| 11. E2E Tests | v1.1 | 8/8 | Complete | 2026-04-22 |
| 12. Bug Fixes & Code Quality | v1.1 | 4/4 | Complete | 2026-04-22 |
| 13. PostgreSQL Migration | v1.2 | 5/5 | Complete | 2026-04-22 |
| 14. Redis Caching | v1.2 | 5/5 | Complete | 2026-04-22 |
| 15. Query Optimization | v1.2 | 4/4 | Complete | 2026-04-22 |
| 16. PWA / Service Worker | v1.2 | 6/6 | Complete | 2026-04-22 |
| 17. Docker Deployment | v1.2 | 3/3 | Complete | 2026-04-23 |
| 18. CI/CD Pipeline | v1.3 | 3/3 | Complete | 2026-04-23 |
| 19. Sentry Error Tracking | v1.3 | 3/3 | Complete | 2026-04-23 |
| 20. Monitoring & Alerting | v1.3 | 3/3 | Complete | 2026-04-23 |
| 21. Load Testing | v1.3 | 3/3 | Complete | 2026-04-23 |
| 22. SMTP Production | v1.3 | 3/3 | Complete | 2026-04-23 |
| 23. i18n Foundation | v1.4 | 4/4 | Complete | 2026-04-24 |
| 24. Mobile Responsive | v1.4 | 5/5 | Complete | 2026-04-24 |
| 25. Social Sharing | v1.4 | 3/3 | Complete | 2026-04-24 |
| 26. OAuth Integration | v1.4 | 5/5 | Complete | 2026-04-24 |
| 27. Comments System | v1.4 | 4/4 | Complete | 2026-04-25 |
| 28. Team Collaboration | v1.4 | 5/5 | Complete | 2026-04-25 |
| 29. Measurement Foundation | v1.5 | 3/3 | Complete | 2026-04-25 |
| 30. Frontend Code Splitting | v1.5 | 4/4 | Complete | 2026-04-25 |
| 31. Virtual Scrolling | v1.5 | 3/3 | Complete | 2026-04-25 |
| 32. Image Pipeline | v1.5 | 4/4 | Complete | 2026-04-26 |
| 33. Caching Improvements | v1.5 | 3/3 | Complete | 2026-04-25 |
| 34. Database Optimization | v1.5 | 4/4 | Complete | 2026-04-26 |
| 35. Infrastructure Foundation | v1.6 | 5/5 | Complete | 2026-04-26 |
| 36. Monetization Core | v1.6 | 4/5 | In Progress | - |
| 37. Horizontal Scaling | v1.6 | 0/? | Not started | - |
| 38. Advanced AI Features | v1.6 | 0/? | Not started | - |
| 39. Mobile Apps | v1.6 | 0/? | Not started | - |
| 40. Content Expansion | v1.6 | 0/? | Not started | - |

---

*Roadmap created: 2026-04-18*
*Last updated: 2026-04-28 — Phase 36.2 complete (4/4 plans: schema additions + depcheck cleanup + db push + audit trail); awaiting `/gsd-verify-phase 36.2`*
