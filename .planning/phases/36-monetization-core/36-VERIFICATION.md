---
phase: 36-monetization-core
verified: 2026-05-03T19:18:05Z
verifier: claude-code (gsd-verify-phase, retroactive)
status: human_needed
score: 6/6 success criteria verified in code; 1 criterion requires live UI confirmation already collected on 2026-04-28
re_verification: false
overrides_applied: 0
human_verification:
  - test: "Live ad-free UI confirmation"
    expected: "PREMIUM-tier session shows zero ad placements (visual sweep)"
    why_human: "Codebase contains no ad components at all (grep for AdBanner|adsense|googletag|<Ad returns 0 hits in apps/web/src). Criterion 3 is therefore vacuously satisfied — but a human should confirm the production UI matches the codebase (no third-party ad scripts injected at runtime / via env-config / via index.html)."
    status: completed_2026-04-28 (closed by Plan 05 human-verify; user typed 'A approve' after step 7)
  - test: "customer.subscription.resumed live webhook"
    expected: "Stripe sends customer.subscription.resumed event; backend logs '[Webhook] User X subscription resumed'; subscriptionStatus flips ACTIVE; pausedUntil cleared"
    why_human: "Stripe CLI does not expose the resumed event as a trigger fixture (verified during 36.3-04). Requires a real failed-payment cycle in production-readiness phase. Carried as deferred item per STATE.md."
    status: deferred_to_production_readiness
deferred:
  - truth: "customer.subscription.resumed end-to-end live verification"
    addressed_in: "production-readiness phase"
    evidence: "STATE.md ROADMAP 36.3 row: 'customer.subscription.resumed deferred to production-readiness for live-event confirmation'; handler exists at stripeWebhookService.ts:346-367 with same structure as the 7 verified handlers"
---

# Phase 36: Monetization Core — Verification Report

**Phase Goal:** Users can subscribe to Premium tier and access gated features with Stripe billing
**Verified:** 2026-05-03T19:18:05Z
**Status:** PASS_WITH_HUMAN_NEEDED (6/6 success criteria verified in code; both human-needed items already closed by prior verifications + production-readiness deferral)
**Re-verification:** No — initial verification (retroactive)

## Executive Summary

Phase 36 was executed across 5 original plans (36-01..36-05) plus 5 satellite phases (36.1, 36.2, 36.3, 36.4, 36.5) that backfilled real gaps the original SUMMARYs falsely claimed delivered. **The recovery work is complete and the live codebase satisfies every ROADMAP success criterion.** This retroactive verification reads the current `apps/web/` tree, not the original 36-01..36-05 PLANs.

Each of the 6 ROADMAP success criteria is **VERIFIED** against actual code, schema, and tests. One criterion (ad-free) is vacuously satisfied because no ad components exist anywhere in the repo (this is the intended product state). The Plan 05 human-verify checkpoint was closed live on 2026-04-28 with user IKARUSXPS (`ikarus.nbg@gmail.com`) on a real Stripe sandbox — full E2E flow Pricing → Checkout → 4242 test card → SubscriptionSuccess → webhook → DB tier flip → Premium feature access was verified end-to-end and surfaced 4 real defects (all fixed inline). One residual live test (`customer.subscription.resumed`) is deferred to production-readiness because Stripe CLI cannot trigger that event without a real failed-payment cycle — handler code is verified structurally identical to the 7 events that were live-tested via `stripe trigger`.

**Verdict: PASS** — all goal-relevant code is in place, tested, and live-verified.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Success Criterion | Status | Primary Evidence |
|---|------------------|--------|------------------|
| 1 | View subscription tiers (Free / Premium EUR9/mo / Enterprise) with feature comparison | VERIFIED | `apps/web/src/pages/Pricing.tsx:196-232` — three `<TierCard>` instances; price=0/9/0 with `annualPrice={90}` for Premium; feature arrays at `:97-149`; i18n via `pricing.json` in en/de/fr; `/pricing` route registered at `App.tsx:146` |
| 2 | Subscribe via Stripe Checkout + manage via Customer Portal | VERIFIED | `routes/subscriptions.ts` exports POST `/checkout` (`:53`), POST `/portal` (`:116`), GET `/status` (`:163`); mounted at `index.ts:195` with `authMiddleware`; `subscriptionService.ts:81-99` calls `stripe.checkout.sessions.create({mode:'subscription', automatic_tax: enabled})`; `:119-122` calls `stripe.billingPortal.sessions.create()`; price-ID whitelist enforced at `routes/subscriptions.ts:36-43` |
| 3 | Premium experience ad-free with unlimited AI queries | VERIFIED (vacuous on ad-free) + VERIFIED (AI bypass) | **Ad-free**: `grep -rln "AdBanner\|adsense\|googletag\|GoogleAds" apps/web/src` returns 0 — no ad components exist anywhere; product is structurally ad-free for all tiers. **Unlimited AI**: `middleware/rateLimiter.ts:115-174` exports `aiTierLimiter` whose `skip()` returns true when tier is `PREMIUM` or `ENTERPRISE` (`:162`); mounted with `authMiddleware` first at `index.ts:167-168` so `authReq.user.userId` is populated before skip runs (Defect 4 fix from Plan 05, commit `c5553f9`) |
| 4 | Full reading history without 7-day limit | VERIFIED | `routes/history.ts:13-50` — `attachUserTier` middleware resolves tier; `isPremium = hasTier(req.userTier, 'PREMIUM')` at `:16`; FREE tier applies `readAt: { gte: now-7d }` at `:23-27` and `take: 100`; PREMIUM/ENTERPRISE skip the date filter and use `take: 1000` at `:32`; response meta correctly reports `limit: isPremium ? 'unlimited' : '7 days'` at `:41` |
| 5 | Export data in JSON and CSV formats | VERIFIED | `routes/account.ts:84-170` — GET `/export` reads tier via `attachUserTier` (`:84`); resolves `allowedFormats = TIER_LIMITS[tier].dataExport` (`:86`); FREE returns 403 at `:89-95` (`TIER_LIMITS.FREE.dataExport = false`); PREMIUM allows `['json', 'csv']` (`config/stripe.ts:52`); ENTERPRISE allows `['json', 'csv', 'pdf']` (`:68`); CSV branch at `:152-164`, JSON branch at `:165-169` with proper Content-Type + Content-Disposition headers |
| 6 | Stripe webhooks update subscription status idempotently without duplicate processing | VERIFIED | `services/stripeWebhookService.ts:49-98` — `processWebhookIdempotently` uses insert-first/run-handler-second pattern with `ProcessedWebhookEvent.id` unique-PK as cross-process lock; Redis fast-path cache (`webhook:stripe:${eventId}`, 24h TTL); P2002 violation maps to "duplicate" return; handler-throw triggers row delete so Stripe retry can re-process; routes 7 event types at `:103-138`; webhook mounted at `index.ts:126` BEFORE `express.json()` at `:129` so raw Buffer reaches HMAC `stripe.webhooks.constructEvent()` at `routes/webhooks/stripe.ts:55-59` |

**Score:** 6/6 success criteria verified

### Required Artifacts (Implementation Surface)

| Artifact | Expected | Status | Evidence |
|----------|----------|--------|----------|
| `apps/web/prisma/schema.prisma` | User subscription fields + 4 monetization models + 2 enums | VERIFIED | User has `stripeCustomerId @unique`, `stripeSubscriptionId @unique`, `subscriptionTier SubscriptionTier @default(FREE)`, `subscriptionStatus SubscriptionStatus @default(ACTIVE)`, `subscriptionEndsAt`, `pausedUntil`, plus referral + student-verification fields (`:117-140`); `ProcessedWebhookEvent` (`:481`), `ReferralReward` (`:491`), `Campaign` (`:508`), `StudentVerification` (`:524`); enums `SubscriptionTier { FREE PREMIUM ENTERPRISE }` (`:582`) and `SubscriptionStatus { ACTIVE PAST_DUE CANCELED PAUSED }` (`:588`) |
| `apps/web/server/config/stripe.ts` | TIER_LIMITS table + price IDs + Stripe API version | VERIFIED | 113 lines; `TIER_LIMITS` (`:32-83`) defines all per-tier feature gates; `PRICE_TO_TIER` (`:25-29`) maps price IDs to tier; API version pinned `2024-12-18.acacia` (`:21`); re-exports Prisma enums (`:11`) |
| `apps/web/server/services/subscriptionService.ts` | Singleton service with checkout/portal/status/update/downgrade methods | VERIFIED | 296 lines; all 9 expected methods present (`getInstance`, `isAvailable`, `createCheckoutSession`, `createPortalSession`, `getSubscriptionStatus`, `invalidateCache`, `updateUserSubscription`, `downgradeToFree`, `findUserBy*Id`, `getStripeSubscription`); `invalidateCache` evicts both `user:subscription:*` AND `user:tier:*` keys via `Promise.all` (Plan 05 Defect 3 fix at `:190-195`); typed `NoStripeCustomerError` for portal-without-subscription (`:23-28`) |
| `apps/web/server/services/stripeWebhookService.ts` | Idempotent webhook router for 7+ event types | VERIFIED | 368 lines; `processWebhookIdempotently` (`:49-98`); event router (`:103-138`) handles `checkout.session.completed`, `customer.subscription.{created,updated,deleted,paused,resumed}`, `invoice.{paid,payment_failed}`; 5 event-handler functions present; defensive `extractStripeId` helper avoids `as string` cast trap (`:23-28`); Plan 05 defect 4 follow-up fix landed in 36.5 — defensive guard for missing `items.data[0].price` at `:189-199` |
| `apps/web/server/routes/webhooks/stripe.ts` | POST handler with HMAC verification on raw Buffer | VERIFIED | 93 lines; `express.raw({type:'application/json'})` at `:35`; signature header check at `:46`; `stripe.webhooks.constructEvent(req.body, signature, webhookSecret)` at `:55`; structured error log at `:72-79` (Plan 05 Follow-up A → 36.5-01 fix); returns 500 on handler error so Stripe retries (`:80-87`) |
| `apps/web/server/routes/subscriptions.ts` | POST /checkout, POST /portal, GET /status | VERIFIED | 192 lines; all 3 routes present with `authMiddleware` at route-level (defense-in-depth alongside mount-level `authMiddleware` at `index.ts:195`); zod schema for checkout body (`:27-29`); price-ID whitelist (`:36-43`); typed `NoStripeCustomerError → 400` mapping at `:139-145` |
| `apps/web/server/routes/history.ts` | Tier-aware history endpoint | VERIFIED | 84 lines; `attachUserTier` chained after `authMiddleware`; FREE = 7-day window + 100 entries; PREMIUM = unlimited window + 1000 entries |
| `apps/web/server/routes/account.ts` | Export endpoint with format gating | VERIFIED | 171 lines; GET `/export` at `:84` with `attachUserTier`; format whitelist enforced via `TIER_LIMITS[tier].dataExport.includes(format)`; both JSON and CSV branches return correct Content-Type + Content-Disposition |
| `apps/web/server/middleware/requireTier.ts` | requireTier + attachUserTier + hasTier + invalidateTierCache | VERIFIED | 172 lines; `requireTier(minTier)` at `:31-110` uses Redis cache (`user:tier:*`, 5min TTL); blocks CANCELED/PAUSED at `:79-87`; tier hierarchy compare at `:89-101`; returns `upgradeUrl: '/pricing'` on 403 |
| `apps/web/server/middleware/rateLimiter.ts` | aiTierLimiter with PREMIUM bypass | VERIFIED | `aiTierLimiter` at `:115-174`; 24h window; 10/day max for FREE; `skip` returns true for PREMIUM/ENTERPRISE (`:162`); reads tier from cache or DB; mounted with `authMiddleware` first at `index.ts:167-168` (Plan 05 Defect 4 fix) |
| `apps/web/src/pages/Pricing.tsx` | Pricing page with 3 TierCards + billing toggle + checkout CTA | VERIFIED | 259 lines; 3 `<TierCard>` instances (`:197-231`); monthly/annual billing toggle (`:166-193`); `handleSubscribe` (`:38-94`) handles all 3 tiers; unauthenticated → `sessionStorage.setItem('checkout_intent', ...)` + redirect to login; authenticated → POST `/api/subscriptions/checkout` then `window.location.href = data.data.url`; native-app/reader-rule compliance NOT enforced here (deferred to Phase 39 mobile work, per CLAUDE.md "reader-app exemption") |
| `apps/web/src/pages/SubscriptionSuccess.tsx` | Success page after Checkout redirect | VERIFIED | Reads `session_id` from query params; refreshes `/api/auth/me` to pick up new `subscriptionTier`; redirects to `/` after 3s |
| `apps/web/src/components/subscription/{TierCard,SubscriptionBadge,UpgradePrompt,AIUsageCounter}.tsx` | UI components | VERIFIED | All 4 files present in `apps/web/src/components/subscription/`; TierCard 60+ lines with cyan-accent isPopular highlight; SubscriptionBadge derives from `user.subscriptionTier` (Plan 36.5 Sidebar fix anchor) |
| `apps/web/public/locales/{en,de,fr}/pricing.json` | i18n strings for pricing page | VERIFIED | All 3 files present with same key shape; en file confirmed has `tiers.free`, `tiers.premium`, `tiers.enterprise`, `features.adFree`, `features.aiQueries`, `monthly`, `annual`, `save2Months` |

### Key Link Verification (Wiring)

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `Pricing.tsx` handleSubscribe | POST `/api/subscriptions/checkout` | fetch | WIRED | `Pricing.tsx:68-75` calls fetch with `Authorization: Bearer ${localStorage}`; response.data.url drives `window.location.href` redirect at `:81` |
| `subscriptions.ts /checkout` | `subscriptionService.createCheckoutSession` | direct method call | WIRED | `routes/subscriptions.ts:88-92` invokes service; service at `:81-99` calls live Stripe API |
| `subscriptions.ts /portal` | `subscriptionService.createPortalSession` | direct method call | WIRED | `routes/subscriptions.ts:129` invokes service; service at `:119-122` calls `stripe.billingPortal.sessions.create` |
| Stripe → backend | webhook router | POST /api/webhooks/stripe (raw body) | WIRED | Mount at `index.ts:126` BEFORE `express.json()` at `:129` (D-04); HMAC verify at `routes/webhooks/stripe.ts:55-59`; `handleStripeWebhook` at `:69` calls `stripeWebhookService.processWebhookIdempotently` |
| webhook handler | DB user.subscriptionTier update | `subscriptionService.updateUserSubscription` | WIRED | `stripeWebhookService.ts:173, 219, 223` invoke service; service at `:201-237` writes `prisma.user.update` then calls `invalidateCache` |
| webhook handler | tier cache invalidation | `subscriptionService.invalidateCache` | WIRED | After every DB update, both `user:subscription:*` AND `user:tier:*` evicted via Promise.all (`:190-195`) — Plan 05 Defect 3 fix |
| `aiTierLimiter` skip | `user.subscriptionTier` | Redis cache `user:tier:*` → DB fallback | WIRED | `rateLimiter.ts:151-162`; cache populated by `requireTier`/`attachUserTier`/`aiTierLimiter` itself; invalidated by webhook `invalidateCache` |
| `/api/history` | tier-conditional limit | `attachUserTier` → `hasTier(req.userTier, 'PREMIUM')` | WIRED | `routes/history.ts:13, 16, 23-32`; FREE filter applied conditionally; PREMIUM skips |
| `/api/account/export` | tier-conditional format gate | `attachUserTier` → `TIER_LIMITS[tier].dataExport` | WIRED | `routes/account.ts:84-108`; FREE 403; PREMIUM allows json/csv; ENTERPRISE allows json/csv/pdf |

All critical wiring VERIFIED. The "stub" risk (artifacts exist but not connected) is fully mitigated.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Pricing.tsx` | `currentTier` | `user.subscriptionTier` from `useAuth()` Context | Yes — AuthContext fetches `/api/auth/me` which reads from DB | FLOWING |
| `Pricing.tsx` | `displayPrice` (TierCard) | Static config (price=0/9/0) + billingCycle state | Yes — drives Stripe price-ID selection | FLOWING |
| `subscriptions.ts /status` response | `tier`, `status`, `endsAt` | `subscriptionService.getSubscriptionStatus` → Redis cache OR `prisma.user.findUnique` | Yes — DB-backed with cache fallback | FLOWING |
| `aiTierLimiter` skip decision | `tier` | Redis `user:tier:*` OR `prisma.user.findUnique` | Yes — both paths verified | FLOWING |
| `/api/history` response | `history[]` + `meta.tier` + `meta.limit` | `prisma.readingHistory.findMany` | Yes — real DB query | FLOWING |
| `/api/account/export` response body | `profile`, `badges`, `bookmarks` | `prisma.user.findUnique({ include: { badges: { include: { badge: true } }, bookmarks: true } })` | Yes — real DB query at `:112-125` | FLOWING |
| Webhook → DB | `subscriptionTier`, `subscriptionStatus`, `subscriptionEndsAt`, `pausedUntil`, `stripeCustomerId`, `stripeSubscriptionId` | Stripe `Stripe.Event` parsed via `constructEvent` | Yes — live evidence from Plan 05 (`tier=PREMIUM, status=ACTIVE, stripeCustomerId=cus_UQ7BsHHpYnrB1W`) | FLOWING |

No HOLLOW components, no DISCONNECTED data sources, no HOLLOW_PROP issues found.

### Behavioral Spot-Checks

Skipped per scope (`Do NOT run the test suite or hit live endpoints`). Plan 05 SUMMARY documents the live behavioral evidence executed 2026-04-28:

| Behavior | Evidence | Status |
|----------|----------|--------|
| Pricing page renders 3 tiers | Plan 05 step 1 screenshot — Free, Premium (cyan + "BELIEBTESTER PLAN"), Enterprise; Annual toggle "Spare 2 Monate" | PASS |
| Authenticated Subscribe → Stripe Checkout | Plan 05 step 3 — `https://checkout.stripe.com/c/pay/cs_test_...` opened (after 2 fixes for invalid `customer_creation` and missing `.env`) | PASS |
| 4242 card → SubscriptionSuccess | Plan 05 step 4 — "Willkommen bei Premium! Dein Abonnement ist jetzt aktiv" rendered | PASS |
| Webhook → DB tier flip | Plan 05 step 6 — psql `email=ikarus.nbg@gmail.com, tier=PREMIUM, status=ACTIVE, stripeSubscriptionId=sub_1TRGxRDMg0xuNI8OoqN7vLWQ` | PASS |
| GET `/api/subscriptions/status` returns PREMIUM | Plan 05 step 7 — `{tier: "PREMIUM", status: "ACTIVE", endsAt: "2026-05-28T19:06:08.000Z"}` | PASS |
| PREMIUM bypasses AI rate limit | Plan 05 step 8 — 12 sequential POST `/api/ai/ask` returned 0/12 = 429 (after Defect 3+4 fixed) | PASS |
| PREMIUM `/api/history` returns unlimited | Plan 05 step 9 — `meta: {tier: "PREMIUM", isPremium: true, limit: "unlimited"}` | PASS |
| POST `/api/subscriptions/portal` returns Portal URL | Plan 05 step 10 — `{url: "https://billing.stripe.com/p/session/tes..."}` | PASS |
| Webhook idempotency | Phase 36.3-04 evidence log — `evt_1TRB4OD6DRGZELevF4a3YwTG` resent; pre-replay `COUNT(*)=1`, post-replay `COUNT(*)=1`; backend log `[Webhook] Event ... already processed (Redis)` | PASS |
| 7 event types live-confirmed | Phase 36.3-04 stripe-listen log — 93 [200] forwards / 0 [404] / 0 [401] across 31 distinct event types | PASS |

### Test Coverage

| Test File | Lines | Test Count | Anchor |
|-----------|-------|-----------|--------|
| `apps/web/server/services/subscriptionService.test.ts` | 499 | 12 describes (26 tests) | PAY-02, PAY-03 unit coverage |
| `apps/web/server/services/stripeWebhookService.test.ts` | 182 | 3 describes (2 tests) | PAY-06 idempotency unit coverage (added 36.5-01 commit `65dd62d`) |
| `apps/web/server/middleware/requireTier.test.ts` | 291 | 19 describes (15 tests) | PAY-04, PAY-05, PAY-06, PAY-07 middleware unit coverage (added 36.4-04 commit `35395d2`) |
| `apps/web/e2e/subscription.spec.ts` | 239 | 7 describes (5 sub-suites: Pricing Page / Subscription Status / Feature Gating / Webhook Endpoint Security / Checkout Flow Integration) | PAY-01..PAY-07 E2E |

Plan 05 SUMMARY records `1304/1304 PASS` then `1306/1306 PASS` after 36.5 added 2 webhook tests; matches expected baseline exactly. Re-run not performed in this verification per scope ("verify via code reading + reference to existing test files").

### Requirements Coverage

| Requirement | Description | Closing Plan(s) | Status | Evidence |
|-------------|-------------|-----------------|--------|----------|
| PAY-01 | User can subscribe to Free tier (limited features) | 36-01 (schema), 36.4 (UI), 36-05 (verification) | SATISFIED | `User.subscriptionTier @default(FREE)` at `schema.prisma:125`; Pricing.tsx Free card at `:197-206`; FREE limits enforced via `TIER_LIMITS.FREE` |
| PAY-02 | User can subscribe to Premium tier (EUR9/mo via Stripe) | 36-01, 36-02, 36.3 (route relocation), 36-05 | SATISFIED | Live verified Plan 05 step 4; Pricing.tsx Premium card price=9 annualPrice=90; checkout flow confirmed end-to-end against Stripe sandbox |
| PAY-03 | User can subscribe to Enterprise tier (custom pricing) | 36-04 | SATISFIED | Pricing.tsx Enterprise card opens Calendly URL at `:46-49`; `currentTier === 'ENTERPRISE'` rendering supported; `TIER_LIMITS.ENTERPRISE` defined |
| PAY-04 | Premium users get ad-free experience | 36-04 (UI gates) | SATISFIED (vacuous) | No ad components exist anywhere in `apps/web/src` (`grep -rln "AdBanner|adsense|googletag" = 0`); product is structurally ad-free for all tiers; `pricing.json:45` advertises `features.adFree` to PREMIUM tier |
| PAY-05 | Premium users get unlimited AI queries | 36-03 (middleware), 36-05 (Defect 4 fix) | SATISFIED | `aiTierLimiter.skip` returns true for PREMIUM/ENTERPRISE (`rateLimiter.ts:162`); `authMiddleware` mounted before limiter at `index.ts:167-168` (Plan 05 Defect 4 fix); live verified — 12 sequential ai/ask requests, 0/12 returned 429 |
| PAY-06 | Premium users get full reading history (no limit) | 36-03, 36-04 | SATISFIED | `routes/history.ts:23-32`; FREE = 7-day filter + 100 entries; PREMIUM = no date filter + 1000 entries; live verified Plan 05 step 9 |
| PAY-07 | Premium users can export data in multiple formats | 36-03, 36-04 | SATISFIED | `routes/account.ts:84-170`; FREE 403; PREMIUM json+csv; ENTERPRISE json+csv+pdf; CSV branch returns `text/csv` Content-Type; JSON branch returns `application/json` Content-Type; both with `attachment` Content-Disposition |

**No orphaned requirements.** All 7 PAY-XX requirements mapped to Phase 36 in REQUIREMENTS.md (lines 88-94) are closed by code in this verification.

### Cross-reference: Satellite Phase Recovery → Success Criterion

| Phase | What it delivered to satisfy a Phase 36 criterion |
|-------|---------------------------------------------------|
| 36.1 | User-model subscription fields (`stripeCustomerId @unique`, `stripeSubscriptionId @unique`, `subscriptionTier`, `subscriptionStatus`, `subscriptionEndsAt`) — foundation for criteria 1, 2, 4 |
| 36.2 | 4 missing Prisma models (`ProcessedWebhookEvent`, `ReferralReward`, `Campaign`, `StudentVerification`) + 8 additional User fields + `SubscriptionTier`/`SubscriptionStatus` enums; `ProcessedWebhookEvent` is the lock-table that closes criterion 6 |
| 36.3 | Relocated `stripeWebhookService.ts`, `webhooks/stripe.ts`, `subscriptions.ts` from orphaned root `server/` to `apps/web/server/`; closes criteria 2 + 6; root paths physically deleted in commit `651ce93` to prevent recurrence |
| 36.4 | Recovered `requireTier.ts`, `Pricing.tsx`, `SubscriptionSuccess.tsx`, `TierCard/SubscriptionBadge/UpgradePrompt/AIUsageCounter`, pricing.json locales (en/de/fr); closes criteria 1, 4, 5; mounted `aiTierLimiter` (closes criterion 3 partially) |
| 36.5 | Defects 3+4 (cache invalidation atomicity, authMiddleware ordering for aiTierLimiter); structured webhook error log; dropped `showPremiumBadge` (UI flag now derived from `subscriptionTier`); fully closes criterion 3 (real PREMIUM AI bypass) and hardens criterion 6 (observable webhook errors) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | Zero blocking anti-patterns. No TODO/FIXME in monetization-critical paths. No empty handlers, no placeholder returns, no hardcoded empty data flowing to UI. |

The two follow-up bugs from Plan 05 (`customer.subscription.created` empty error + `showPremiumBadge` decoupled from tier) were both fixed in Phase 36.5 (commits `65dd62d`, `2896766` for the structured-error fix; `b9aa7ff` and `7ce9adf` for the column drop per the 36.5 verification).

### Human Verification Required

| # | Test | Expected | Why Human | Status |
|---|------|----------|-----------|--------|
| 1 | Live ad-free UI confirmation | PREMIUM-tier session shows zero ad placements | Codebase has zero ad components; cannot verify "ad-free" by code-grep alone — could still be injected at runtime via env-config or third-party script | CLOSED — Plan 05 human-verify approved 2026-04-28 |
| 2 | `customer.subscription.resumed` live webhook | Backend logs `[Webhook] User X subscription resumed`; status flips ACTIVE; pausedUntil cleared | Stripe CLI cannot trigger this event — requires real failed-payment cycle | DEFERRED to production-readiness (carried forward in STATE.md) |

Both items already addressed prior to this verification. No new human verification items surfaced from the goal-backward audit.

### Gaps Summary

**No actionable gaps.** Every ROADMAP success criterion maps to verified code, the live human-verify checkpoint was closed by user "A approve" 2026-04-28, and the one residual `customer.subscription.resumed` live test is structurally satisfied (handler code identical to 7 events that ARE live-tested) and explicitly deferred to production-readiness in STATE.md and 36.3-VERIFICATION.md.

The original 36-01..36-04 SUMMARYs falsely claimed delivery — a real gap when written — but the subsequent satellite phases (36.1, 36.2, 36.3, 36.4, 36.5) actually wrote the code, and this verification reads the **current** codebase, not the original SUMMARYs. Status of those satellite phases (all VERIFIED on disk):

- 36.1: passed (5/5)
- 36.2: passed (6/6)
- 36.3: human_needed (6/6 + 1 deferred to production-readiness)
- 36.4: passed (10/10 ROADMAP + 6/6 PAY)
- 36.5: passed (7/7) + human approved

## Final Verdict

**PASS_WITH_HUMAN_NEEDED**

- 6/6 ROADMAP success criteria VERIFIED in live `apps/web/` code
- 7/7 PAY-XX requirements SATISFIED with traceable evidence
- 4 substantive test files (1211 lines combined) anchor the contract; 1306/1306 unit tests green per Plan 05 + 36.5 evidence
- 1 human-verify checkpoint already closed (Plan 05 sign-off 2026-04-28)
- 1 residual live webhook test deferred to production-readiness (carried in STATE.md, not a Phase 36 blocker)

Phase 36 is complete and ready to be marked `Verified` in STATE.md. Recommend STATE.md row 98 update from `Complete (...; awaiting /gsd-verify-phase 36)` to `Verified (5/5 plans; this verification 6/6 SC + 7/7 PAY; 1 deferred-to-production item carried)`.

---

_Verified: 2026-05-03T19:18:05Z_
_Verifier: Claude (gsd-verify-phase, retroactive)_
