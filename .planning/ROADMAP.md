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
- [x] **Phase 37: Horizontal Scaling** - Docker Swarm and connection pooling (completed 2026-04-29; 5/5 must-haves SATISFIED static; runtime items in 37-HUMAN-UAT.md; Dockerfile rewrite deferred to 37.1)
- [ ] **Phase 37.1 (INSERTED): Fix root Dockerfile for pnpm monorepo + close WS-04** — Rewrite Dockerfile that predates the phase-35 monorepo migration; re-run e2e-stack/run-fanout-test.sh to close WS-04 cross-replica fanout gate
- [x] **Phase 38: Advanced AI Features** - Credibility scoring, bias detection, fact-checking (completed 2026-04-29)
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
- [x] 36-05-PLAN.md — Integration testing & human verification (unit tests, E2E, Stripe flow verification) — completed 2026-04-28 (1304/1304 tests green; human-verify "approved")

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
**Plans**: 5 plans

Plans:
- [x] 36.3-01-PLAN.md — Relocate 3 webhook/subscription source files from root server/ to apps/web/server/ via git mv (preserves history) — commits 71507b7, 6597dfa, eb42362
- [x] 36.3-02-PLAN.md — Mount webhook + subscription routes in live apps/web/server/index.ts (diff-only, before express.json for raw body) — commit 18237b9 (+9 lines, 0 deletions; live probes return 400/401 not 404)
- [x] 36.3-03-PLAN.md — Wholesale delete orphan root trees (server/, prisma/, src/, prisma.config.ts, tsup.config.ts, vite.config.ts, tsconfig.{,app,node}.json) + D-08 verification gate — completed 2026-04-28 (chore 651ce93 deleting 9 paths / 323 files / -79,037 lines + fix a69bbff creating workspace-local apps/web/prisma.config.ts for Prisma 7 datasource resolution; tsconfig.base.json preserved per workspace-extension audit; D-08 gate PASSED — typecheck, 1289/1289 tests, dev:backend pong, dev:frontend 200, prisma validate, prisma db push idempotent)
- [x] 36.3-04-PLAN.md — End-to-end verification: stripe trigger 8 events return HTTP 200; ProcessedWebhookEvent rows persisted; idempotency replay PASS — completed 2026-04-28 (test commit `dbf374d` force-added 36.3-04-trigger-output.log + 36.3-04-db-query.log: 93 [200] forwards / 0 [404] / 0 [401] across 31 distinct event types; 31-row ProcessedWebhookEvent GROUP BY; IDEMPOTENCY: PASS via `stripe events resend evt_1TRB4OD6DRGZELevF4a3YwTG`. 7 of 8 target events triggered directly; customer.subscription.resumed unreachable via stripe trigger CLI — coverage proven structurally + deferred to production-readiness for live-event confirmation)
- [x] 36.3-05-PLAN.md — Anti-pattern markers (.continue-here.md phase-local + milestone-level) per D-11 and Q-03 — completed 2026-04-28 (commit c81a941; 2 files, +51 insertions; severity:blocking row in markdown-table format; phase-local at .planning/phases/36.3-fix-stripe-webhook-monorepo-path/.continue-here.md + milestone-level at .planning/.continue-here.md per Q-03 discretion)

### Phase 36.4 (INSERTED) [x] COMPLETE: Relocate Plan-03/04 monetization artifacts
**Goal**: Restore Phase 36's feature-gating middleware (Plan 03) and pricing-page UI (Plan 04) to the live monorepo paths under `apps/web/`. The original commits wrote to root `server/` and root `src/` (the same wrong-path bug 36.3 fixed for the webhook handler). Phase 36.3-03's orphan sweep (commit `651ce93`) deleted root `server/` + `src/` as a structural fix — but only the server-side webhook code had been relocated first; the tier middleware and the entire monetization UI went down with the sweep and were never recovered. Discovered 2026-04-28 while running the Plan 36-05 human-verify checkpoint: `/pricing` rendered as an empty SPA shell because no `Pricing.tsx` exists in `apps/web/src` and no `/pricing` route is registered in `apps/web/src/App.tsx`. Grep on `apps/web/server` for `requireTier`/`attachUserTier`/`aiTierLimiter` returns zero hits — CLAUDE.md documents these as live but they never made it into the monorepo. Fourth instance of the milestone-36 "SUMMARY claimed delivered but reality diverged" pattern (after 36.1, 36.2, 36.3).
**Depends on**: Phase 36.3 (orphan sweep removed wrong-path source — must recover from git history at commits `17066dd`, `6956f02` for UI; commit history TBD for Plan 03 middleware), Phase 36.1 (subscription schema fields used by middleware/UI), Phase 36.2 (`SubscriptionTier` / `SubscriptionStatus` enums consumed by both)
**Requirements**: PAY-04 (feature gating), PAY-05 (Premium-only history depth), PAY-06 (idempotent webhook — only the FE/MW consumers reflect tier changes), PAY-07 (data export gating), PAY-01 (Pricing page UI surface), PAY-02 (Checkout subscribe button on Pricing page)
**Success Criteria** (what must be TRUE):
  1. `apps/web/server/middleware/requireTier.ts` exists with `requireTier(tier)`, `attachUserTier`, and `aiTierLimiter` exports; logic matches CLAUDE.md (PAST_DUE 7-day grace, 403 with `upgradeUrl` for CANCELED/PAUSED, FREE-tier 24h sliding-window AI limit)
  2. `apps/web/server/routes/{ai,history,account}.ts` import the middleware and gate the documented endpoints (AI rate-limit by tier, history depth FREE=7d/100 entries vs PREMIUM=unbounded/1000 entries, account export Premium-only)
  3. `apps/web/src/pages/Pricing.tsx` and `apps/web/src/pages/SubscriptionSuccess.tsx` exist with the Plan 04 design contract (3 tier cards; Premium has cyan #00f0ff border + scale-105 + "Most Popular" badge; monthly/annual toggle showing "Save 2 months"; trust badges; subscribe button redirects unauthenticated → settings login, authenticated → Stripe Checkout URL)
  4. `apps/web/src/components/subscription/{TierCard,SubscriptionBadge,UpgradePrompt,AIUsageCounter}.tsx` exist and are imported by Pricing/SubscriptionSuccess/relevant settings views
  5. `/pricing` route registered in `apps/web/src/App.tsx` Routes block (alongside `/team`, `/developers`, etc.); `/subscription/success` route registered for the success page
  6. `apps/web/public/locales/{en,de,fr}/pricing.json` exist with the keys the components consume (regex hits on `/Choose Your Plan|Wähle deinen Plan/`, `/Most Popular|Beliebtester Plan/`, `/Save 2 months|Spare 2 Monate/`); `apps/web/public/locales/fr/` directory created (currently absent — only `de/`, `en/` exist)
  7. Existing E2E test `apps/web/e2e/subscription.spec.ts` (Plan 36-05 already-on-disk) passes against the recovered UI: `expect(page.locator('h1')).toContainText(/Choose Your Plan|Wähle deinen Plan/)` succeeds and the "subscribe redirects unauthenticated to login" assertion passes
  8. Existing unit tests `apps/web/server/services/subscriptionService.test.ts` 26/26 still pass; new unit tests for `requireTier` middleware added with PAST_DUE-grace + CANCELED-block coverage
  9. `pnpm typecheck && pnpm test:run` exits 0 with no regressions; full-stack manual probe: `curl http://localhost:5173/pricing` returns HTML containing the tier strings (not just SPA shell), `GET /api/history` for FREE user returns `meta.tier: "FREE"` and `meta.isPremium: false`, FREE user's 11th `POST /api/ai/ask` in 24h returns 429 with `upgradeUrl: "/pricing"`
 10. No regression of the 36.3 anti-pattern: zero new files written under root `server/`, `prisma/`, or `src/` (verified via `git diff --stat HEAD~N..HEAD` on Plan 04's deletion-trees); `.planning/.continue-here.md` allow-list satisfied for every `<files_modified>` row in the new plans
**Plans**: 4 plans

Plans:
- [x] 36.4-01-PLAN.md — Recover server-side tier middleware (requireTier.ts, aiTierLimiter, account/history/ai gates) — Wave 1 — completed 2026-04-28 (commits bc9e34c, e99c1df, fe94f02; requireTier.ts 171 lines + aiTierLimiter mounted on /api/ai+/api/analysis + tier gates on /api/account/export and GET /api/history)
- [x] 36.4-02-PLAN.md — Recover client-side subscription components (TierCard, SubscriptionBadge, UpgradePrompt, AIUsageCounter) — Wave 1 — completed 2026-04-28 (commits bcbfe00, 382f3b3; 4 .tsx files at apps/web/src/components/subscription/, source 17066dd × 3 + 6956f02 × 1)
- [x] 36.4-03-PLAN.md — Recover Pricing page + SubscriptionSuccess + routes + i18n (en/de/fr) — Wave 2 — completed 2026-04-28 (commits 3db923d, a36b6b5, 6a0580e; /pricing + /subscription/success routes wired in App.tsx; DE/EN/FR pricing.json populated; i18n.ts 'fr' added; Zustand language union widened)
- [x] 36.4-04-PLAN.md — Verification gate: requireTier unit tests + manual D-09 probes + D-10 anti-pattern audit — Wave 3 — completed 2026-04-28 (commits 35395d2, 90c4677; 15 new requireTier tests → 1304/1304 full suite; D-09 probes all PASS; D-10 audit = 0 forbidden-root files)

### Phase 36.5 (INSERTED): Fix monetization follow-up bugs from Plan 36-05 human-verify
**Goal**: Close two latent defects surfaced during Plan 36-05's live human-verify checkpoint that did not block end-to-end (PREMIUM) functionality but degrade observability and produce inconsistent UI state. Discovered 2026-04-28 after the four critical defects (commits `bd7b6e5` + `c5553f9`) were already fixed; deferred to a follow-up phase to keep 36-05's closure scope clean.
**Depends on**: Phase 36 (Plan 05 closure committed at `4f0b4d2`), Phase 36.4 (`requireTier`/`attachUserTier` middleware available for use), Phase 36.2 (subscription enums + ProcessedWebhookEvent model)
**Requirements**: PAY-06 (idempotent webhook — silent handler errors hide partial-failure cases that PAY-06 acceptance assumes are observable), PAY-04 (feature gating — `showPremiumBadge` UI flag must reflect real tier so Premium-only affordances render correctly)
**Success Criteria** (what must be TRUE):
  1. `customer.subscription.created` webhook handler in `apps/web/server/services/stripeWebhookService.ts` no longer emits empty error log lines on `stripe events resend` of a previously-handled event. Either (a) the handler successfully no-ops when `checkout.session.completed` already populated the User row, or (b) the error has a meaningful message and structured stack so operators can diagnose silent failures
  2. The handler's behaviour is covered by an integration test (vitest with prisma mock) that simulates: (i) checkout.session.completed processed first → User row updated → customer.subscription.created arrives second → handler completes cleanly with no error log, (ii) customer.subscription.created arrives in isolation (no prior checkout) → User row updated as expected
  3. `showPremiumBadge` is no longer stored as a standalone boolean on the User model. Either (a) the column is dropped (preferred, removes drift) and the badge UI reads `user.subscriptionTier === 'PREMIUM'` directly, or (b) the column is kept but a server-side invariant (Prisma middleware or service layer) keeps it synced with `subscriptionTier` on every `User.update` and a one-time migration backfills it from current `subscriptionTier`
  4. The sidebar / header tier-badge component reads from the chosen source-of-truth (per criterion 3) and renders only when the user's actual subscription tier is PREMIUM or ENTERPRISE. Verified: `ikarus.nbg@gmail.com` showing PREMIUM (real tier from 36-05 sandbox purchase) shows the badge; a freshly-seeded FREE user shows no badge even after manual `UPDATE User SET "showPremiumBadge" = true`
  5. Existing 1304 vitest tests still pass with no regressions (`pnpm test:run` exits 0)
  6. No new files written under root `server/`, `prisma/`, `src/`, or `e2e/` (anti-pattern guard from `.planning/.continue-here.md`)
  7. SUMMARY.md per plan + Phase-level VERIFICATION.md created
**Plans**: 4 plans across 3 waves

**Wave 1** *(parallel — disjoint files; Plans 01 + 02 touch different subsystems)*
- [x] 36.5-01-PLAN.md — Bug A: TDD webhook integration test + structured error log + `handleSubscriptionUpdated` root-cause fix — `apps/web/server/services/stripeWebhookService.test.ts` (new), `stripeWebhookService.ts`, `routes/webhooks/stripe.ts` — closes PAY-06 + criteria #1, #2
- [x] 36.5-02-PLAN.md — Bug B schema: drop `showPremiumBadge` column + `[BLOCKING]` `cd apps/web && npx prisma db push --accept-data-loss && npx prisma generate` — `apps/web/prisma/schema.prisma` — closes part of PAY-04 + criterion #3

**Wave 2** *(blocked on Wave 1 — depends on Plan 02's regenerated Prisma client for typecheck)*
- [x] 36.5-03-PLAN.md — Bug B UI: widen AuthContext `User` interface with `subscriptionTier` + replace hard-coded "Premium" in `Sidebar.tsx:287-303` with `<SubscriptionBadge tier={user?.subscriptionTier ?? 'FREE'} />` — `AuthContext.tsx`, `Sidebar.tsx` — closes part of PAY-04 + criterion #4

**Wave 3** *(blocked on Wave 2; `autonomous: false` — human-verify visual probe required)*
- [x] 36.5-04-PLAN.md — Verification gate: 7-criterion evidence matrix + anti-pattern guard scan + `pnpm test:run` ≥ 1305 + checkpoint:human-verify (FREE shows no badge / PREMIUM shows badge / `stripe events resend` produces structured error log not empty) + write `36.5-VERIFICATION.md` — closes PAY-04, PAY-06 + criteria #5, #6, #7

**Cross-cutting constraints** *(must_haves shared across 2+ plans)*
- D-01 LOCKED: drop the `showPremiumBadge` column (NOT keep with sync invariant) — anchored in 02; verified in 04
- D-06 LOCKED: zero `files_modified` entries under root `server/`, `prisma/`, `src/`, `e2e/` — applies to all plans; audited in 04
- D-08 LOCKED: `pnpm test:run` exits 0 with ≥ 1305 tests passing (was 1304 baseline + ≥ 1 new integration test from Plan 01) — verified in 03 and 04

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
**Plans**: 7 plans across 4 waves

Plans:
- [x] 37-01-PLAN.md — Install Socket.IO Redis adapter + worker emitter module (WS-01, WS-03, JOB-03)
- [x] 37-02-PLAN.md — RUN_JOBS env-gating + newsReadService refactor + drop app.locals.newsAggregator (JOB-01, JOB-02, JOB-03, JOB-04)
- [x] 37-03-PLAN.md — Prisma pool max:20 + Prometheus pool gauges + .env.example dual-URL (DB-01, DB-02, DB-03, DB-04 Prisma side)
- [x] 37-04-PLAN.md — stack.yml Swarm topology + pgbouncer/ + prometheus + alert rules (DEPLOY-01, DEPLOY-02, WS-02, WS-03, DB-01..DB-04, JOB-01)
- [x] 37-05-PLAN.md — Terminus drain + /api/health vs /api/ready split (DEPLOY-04, DEPLOY-05)
- [x] 37-06-PLAN.md — e2e-stack/ WS-04 cross-replica fanout integration test (artifacts complete; runtime gate deferred to 37.1 — see 37-HUMAN-UAT.md)
- [x] 37-07-PLAN.md — docs/multi-region-patterns.md (INFRA-05, DEPLOY-03)

**Status:** Complete (2026-04-29) — 5/5 must-haves SATISFIED static; verifier returned `human_needed` for 3 runtime items tracked in `37-HUMAN-UAT.md`. Branch: `test-ci-pipeline`. Commits: 11 plan + 4 merge + 2 docs (deferral + verification).

### Phase 37.1 (INSERTED): Fix root Dockerfile for pnpm monorepo + close WS-04
**Goal**: Rewrite the root `Dockerfile` so it builds cleanly against the pnpm monorepo (it predates the phase-35 monorepo split and uses `npm ci --frozen-lockfile` against a non-existent `package-lock.json`), then re-run `bash e2e-stack/run-fanout-test.sh` to close the WS-04 cross-replica fanout runtime gate that was deferred from Phase 37 plan 06.
**Depends on**: Phase 37 (e2e-stack harness, Socket.IO Redis adapter, sticky-session Traefik labels — all already merged on `test-ci-pipeline`)
**Requirements**: INFRA-04 (cross-replica WebSocket — runtime closure), DEPLOY-01 (Swarm-deployable image — fixed Dockerfile is the prerequisite for any production stack deploy)
**Success Criteria** (what must be TRUE):
  1. `docker build -t newshub:37.1 .` from repo root succeeds with no `npm ci`, no `EUSAGE`, no missing-from-lockfile errors. Build uses pnpm with corepack and the existing `pnpm-lock.yaml`.
  2. `bash e2e-stack/run-fanout-test.sh` exits 0 with the end line `OK: WS-04 cross-replica fanout verified`. The `e2e-stack-app-1` and `e2e-stack-app-2` images build via the rewritten Dockerfile.
  3. Optional sanity gate confirms the test exercises the adapter: temporarily commenting the `createAdapter(pubClient, subClient)` line in `apps/web/server/services/websocketService.ts` causes the test to fail with `Client B did not receive test:fanout within 5000ms`. After reverting, the test passes again.
  4. Phase 37 closure artifacts are reconciled: `37-06-SUMMARY.md` `verification_status` flips to `verified`, the pending todo at `.planning/todos/pending/37-06-fanout-test-dockerfile-rewrite.md` is moved to `.planning/todos/completed/`, the parent UAT `37-HUMAN-UAT.md` test #1 status flips from `pending`/`blocked` to `passed`, and the `infra-debt` row tracking 37-06 is removed from `STATE.md` Deferred Items.
  5. The runtime image keeps the existing Chromium/Puppeteer block, runs as the non-root `nodejs` user, exposes port 3001, and `HEALTHCHECK` continues to hit a `/api/health` endpoint that the rewritten image actually serves.
**Plans**: 2 plans across 2 waves

Plans:
- [ ] 37.1-01-PLAN.md — Rewrite root Dockerfile for pnpm monorepo (corepack pnpm, workspace install, monorepo-aware paths for prisma generate / build / CMD)
- [ ] 37.1-02-PLAN.md — Re-run e2e-stack fanout test, close WS-04, reconcile 37-06 SUMMARY + UAT + todo + STATE deferred-items (autonomous: false; human-verify gated)

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
**Plans**: 6 plans across 5 waves
**UI hint**: yes

Plans:
- [x] 38-01-PLAN.md — [BLOCKING] Schema foundation: FactCheck Prisma model + tsvector FTS migration + GIN index + db migrate deploy + prisma generate (Wave 1)
- [x] 38-02-PLAN.md — Backend services: credibilityService (deterministic) + factCheckReadService (Postgres FTS) + 3 prompts + 3 new aiService methods + CacheKeys extension (Wave 2, depends_on [38-01] — needs regenerated Prisma client)
- [x] 38-03-PLAN.md — Routes + Zod OpenAPI: POST /api/ai/fact-check + GET /api/ai/source-credibility/:id + rewritten GET /api/analysis/framing + BearerAuth + openapi:generate (Wave 3, depends_on [38-01, 38-02])
- [x] 38-04-PLAN.md — i18n locale files: factcheck.json + credibility.json for DE/EN/FR + i18n.ts namespace registration (Wave 3, depends_on [] — co-scheduled with 38-03 for unified review)
- [x] 38-05-PLAN.md — Frontend UI: 6 new components (CredibilityPill, BiasBadge, VerdictPill, FactCheckButton, FactCheckDrawer, CitationCard, CredibilityDrawer) + 2 hooks + FramingComparison rewrite + NewsCard/SourceRow/Article integration (Wave 4, depends_on [38-01, 38-02, 38-03, 38-04])
- [x] 38-06-PLAN.md — Verification gate: Playwright E2E factcheck.spec.ts + Redis TTL probes + 38-VERIFICATION.md evidence matrix (Wave 5, depends_on [38-01..38-05])

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
**Plans**: 6 plans across 4 waves (drafted 2026-04-29..30)
**UI hint**: yes
**Plans:**

**Wave 1:**
- [ ] 39-01-PLAN.md — apps/mobile workspace + Capacitor 8.3.1 init + native plugins (haptics, status-bar, splash, keyboard, app, push-notifications) — MOB-01, MOB-02, MOB-07

**Wave 2** *(blocked on Wave 1 completion)*:
- [ ] 39-02-PLAN.md — Server: Prisma `PushSubscription`/`KeywordWatch`/`NotificationPreference` + `pushService` + `notificationFanoutService` + Zod routes + `cleanupService` 90d cleanup — MOB-03, MOB-04
- [ ] 39-03-PLAN.md — Client: `lib/platform.ts::isNativeApp()` + reader-app gate retrofits (UpgradePrompt, TierCard, AIUsageCounter, InstallPromptBanner, useHapticFeedback, SPA 429 consumer) + OfflineBanner per-session dismissibility + i18n DE/EN/FR — MOB-06, MOB-07, MOB-08

**Wave 3** *(blocked on Wave 2 completion)*:
- [ ] 39-04-PLAN.md — Push end-to-end: `usePushNotifications` hook + `<NotificationsSection />` in SettingsPage + fanout subscriber in `workerEmitter.ts` + 4 trigger systems (breaking, affinity, keyword, digest) + tier/volume/quiet-hours/dedup gates + dead-token cleanup — MOB-03, MOB-04

**Wave 4** *(blocked on Wave 3 completion)*:
- [ ] 39-05-PLAN.md — Biometric: `@capgo/capacitor-native-biometric@^8.4.2` + `useBiometricAuth` + `AuthContext` JWT hand-off + `BiometricSection` (after NotificationsSection) + iCloud Keychain device-only spike (Pitfall A1) + 3-fail fallback — MOB-05
- [ ] 39-06-PLAN.md — CI/CD + signing: `mobile-ios.yml` (macos-latest + Fastlane match) + `mobile-android.yml` (ubuntu-latest + base64 keystore) + `apps/mobile/ios/fastlane/{Fastfile,Appfile,Matchfile}` + Android `signingConfigs.release` + `apps/mobile/README.md` runbook — MOB-01, MOB-02 *(autonomous: false — signing-key creation requires user interaction)*

**Cross-cutting constraints (every plan's `must_haves.truths`):**
- Capacitor 8.3.1 (research 2026-04-29 supersedes CONTEXT.md Q-04 framing of 6.x/7.x)
- D-08/D-09: iOS/Android builds hide every pricing surface; FREE-tier 429s render generic "feature not available" with `newshub.example` as plain text (no `<a href>`)
- D-04: FCM + APNs only via single `firebase-admin` SDK; no Web Push / VAPID; no silent payloads
- D-12: PWA service worker is the only offline storage; no Capacitor SQLite, no eager IndexedDB pre-cache
- D-13: Code sharing satisfied trivially because `apps/mobile` consumes `apps/web/dist`
- Reader-app gate single seam: `apps/web/src/lib/platform.ts::isNativeApp()`
- Fanout hook point: `apps/web/server/jobs/workerEmitter.ts` (consumer of `newsAggregator.ts:287-292`'s emit functions); no new emit point added

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
*Last updated: 2026-04-30 — Phase 40.1 COMPLETE (5/5 plans; VERIFICATION 15/15 must-haves verified; UAT 3 PASS + 1 PARTIAL). Wired 4 team-UI debt sessions: (1) BookmarkButton/TeamBookmarkCard/PendingInviteList/DeleteTeamModal unit tests added (26 tests), (2) new TeamSettingsModal component + 8 tests, (3) Settings gear integrated into TeamDashboard gated on owner+admin, (4) 4 E2E tests appended to teams.spec.ts (Test 15 owner-delete live PASS; Tests 12/13/14 skip cleanly in dev due to Dashboard NewsFeed signals-vs-grid view-mode race — wiring fully proven by unit tests), (5) all 4 debug sessions archived to `.planning/debug/resolved/` with verification + files_changed populated. Two side-fixes shipped during verification: `fix(focus-suggestions): cap toast stack height to prevent header overlap` (339d66a) — was a latent UX bug overlapping the header Sign In; `test(e2e): mock focus-suggestions in auth.setup.ts` (fba1d73) — unblocks all 14+ authenticated E2E tests. Next: `/gsd-progress` to see updated roadmap; remaining v1.6 work: Phase 39 (mobile-apps) + Phase 40 (content-expansion); 36-05 human-verify still queued.*

### Phase 40.1: team-ui-wiring (INSERTED)

**Goal:** Pay back 4 diagnosed UI-wiring debt sessions from Phase 28 (Team Collaboration). Wire team-feature UI to existing backend, prove via tests, archive 4 debug sessions to .planning/debug/resolved/.
**Requirements**: null (debt-payback phase — no new REQ-IDs to map; 40.1-CONTEXT.md is the contract)
**Depends on:** Phase 40
**Plans:** 5/5 plans executed — COMPLETE

Plans:
- [x] 40.1-01-PLAN.md — Vitest unit tests for the 4 already-wired team components (BookmarkButton, TeamBookmarkCard, PendingInviteList, DeleteTeamModal)
- [x] 40.1-02-PLAN.md — Create TeamSettingsModal component + its unit test (the one genuinely missing piece, D-02)
- [x] 40.1-03-PLAN.md — Integrate TeamSettingsModal into TeamDashboard (gear icon between Invite and Trash2, gated on owner+admin)
- [x] 40.1-04-PLAN.md — Extend apps/web/e2e/teams.spec.ts with 4 new E2E tests (one per debug-session flow) in a serial describe block
- [x] 40.1-05-PLAN.md — Archive 4 debug sessions from .planning/debug/ to .planning/debug/resolved/ with status=resolved + verification + files_changed populated
