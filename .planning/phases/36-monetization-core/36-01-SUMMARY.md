---
phase: 36-monetization-core
plan: 01
subsystem: backend/subscription
tags: [stripe, subscription, schema, monetization]
dependency_graph:
  requires: []
  provides:
    - SubscriptionTier enum (FREE, PREMIUM, ENTERPRISE)
    - SubscriptionStatus enum (ACTIVE, PAST_DUE, CANCELED, PAUSED)
    - User subscription fields (stripeCustomerId, subscriptionTier, etc.)
    - ProcessedWebhookEvent model for idempotency
    - SubscriptionService singleton
    - TIER_LIMITS configuration
  affects:
    - prisma/schema.prisma
    - server/config/stripe.ts
    - server/services/subscriptionService.ts
tech_stack:
  added:
    - stripe@22.1.0
  patterns:
    - Singleton service (SubscriptionService)
    - Redis caching for subscription status
    - Stripe Checkout (hosted) for PCI compliance
key_files:
  created:
    - server/config/stripe.ts
    - server/services/subscriptionService.ts
  modified:
    - prisma/schema.prisma
    - .env.example
    - package.json
    - pnpm-lock.yaml
decisions:
  - "API version pinned to 2024-12-18.acacia for stability"
  - "FREE tier: 10 AI queries/day, 7-day history (per CONTEXT.md)"
  - "PREMIUM tier: unlimited AI queries, unlimited history"
  - "5-minute cache TTL for subscription status (CACHE_TTL.MEDIUM)"
  - "Graceful degradation when STRIPE_SECRET_KEY not set"
metrics:
  duration: 13m 15s
  completed: 2026-04-26T15:46:00Z
  tasks: 3
  files_created: 2
  files_modified: 4
---

# Phase 36 Plan 01: Subscription Schema & Service Foundation Summary

Stripe subscription schema and SubscriptionService singleton with checkout/portal session creation and tier-based caching.

## What Was Built

### Task 1: Prisma Schema Extension (b5622c5)
Extended the Prisma schema with subscription-related models and fields:

**New Enums:**
- `SubscriptionTier`: FREE, PREMIUM, ENTERPRISE
- `SubscriptionStatus`: ACTIVE, PAST_DUE, CANCELED, PAUSED

**User Model Extensions:**
- `subscriptionTier` (default: FREE)
- `subscriptionStatus` (default: ACTIVE)
- `stripeCustomerId` (unique)
- `stripeSubscriptionId` (unique)
- `subscriptionEndsAt`
- `pausedUntil`
- Premium perks: `showPremiumBadge`, `customAccentColor`
- Referral fields: `referralCode`, `referredBy`, `freeMonthsEarned`
- Student discount: `isStudent`, `studentVerifiedUntil`

**New Models:**
- `ProcessedWebhookEvent` - Webhook idempotency tracking
- `ReferralReward` - Referral reward history
- `Campaign` - Seasonal promotion campaigns
- `StudentVerification` - Student discount verification queue

### Task 2: Stripe Configuration (9193e71)
Created `server/config/stripe.ts` with externalized configuration:

**Exports:**
- `STRIPE_CONFIG` - Secret key, webhook secret, price IDs
- `TIER_LIMITS` - Feature limits per tier (matching CONTEXT.md Feature Gating table)
- `PRICE_TO_TIER` - Price ID to tier mapping for webhook processing
- `PRICING` - EUR 9/month, EUR 90/year (2 months free)
- `getTierLimits()` - Helper to get limits for a tier
- `hasFeature()` - Helper to check if feature is available

**FREE Tier Limits:**
- 10 AI queries/day
- 7-day reading history
- No data export, comments, AI personas
- Weekly email digest only
- No team creation, share analytics, real-time updates

### Task 3: SubscriptionService (895013d)
Created singleton service with Stripe SDK integration:

**Methods:**
- `getInstance()` - Singleton accessor
- `isAvailable()` - Check if Stripe is configured
- `createCheckoutSession()` - Create Stripe Checkout session
- `createPortalSession()` - Create Stripe Customer Portal session
- `getSubscriptionStatus()` - Get tier/status with Redis caching
- `invalidateCache()` - Clear subscription cache
- `updateUserSubscription()` - Sync subscription from Stripe webhook
- `downgradeToFree()` - Handle subscription cancellation
- `findUserBySubscriptionId()` - Lookup user by Stripe subscription
- `findUserByCustomerId()` - Lookup user by Stripe customer
- `getStripeSubscription()` - Retrieve subscription from Stripe API

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `prisma validate` passes
- [x] `prisma generate` creates updated client
- [x] `npm run typecheck` passes (all workspaces)
- [x] Schema contains SubscriptionTier enum with FREE, PREMIUM, ENTERPRISE
- [x] Schema contains SubscriptionStatus enum with ACTIVE, PAST_DUE, CANCELED, PAUSED
- [x] User model has subscriptionTier field defaulting to FREE
- [x] ProcessedWebhookEvent model exists for idempotency
- [x] TIER_LIMITS.FREE.aiQueriesPerDay = 10
- [x] SubscriptionService exports singleton with all required methods
- [x] .env.example documents STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, price IDs

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b5622c5 | feat(36-01): add subscription schema with tier enums and webhook tracking |
| 2 | 9193e71 | feat(36-01): add Stripe configuration with tier limits |
| 3 | 895013d | feat(36-01): add SubscriptionService singleton for Stripe operations |

## Known Stubs

None - all code is fully implemented and functional.

## Threat Flags

None - no new security surface introduced beyond what was documented in the plan's threat model.

## Self-Check: PASSED

- [x] prisma/schema.prisma exists and contains SubscriptionTier
- [x] server/config/stripe.ts exists and exports STRIPE_CONFIG
- [x] server/services/subscriptionService.ts exists and exports SubscriptionService
- [x] Commit b5622c5 exists in git log
- [x] Commit 9193e71 exists in git log
- [x] Commit 895013d exists in git log

---
*Completed: 2026-04-26T15:46:00Z*
