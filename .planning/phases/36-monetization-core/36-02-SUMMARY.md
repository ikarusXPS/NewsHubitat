---
phase: 36-monetization-core
plan: 02
subsystem: backend/subscription
tags: [stripe, webhooks, idempotency, subscription-api]
dependency_graph:
  requires:
    - SubscriptionService (from 36-01)
    - ProcessedWebhookEvent model (from 36-01)
    - STRIPE_CONFIG (from 36-01)
  provides:
    - handleStripeWebhook function
    - processWebhookIdempotently function
    - POST /api/webhooks/stripe endpoint
    - POST /api/subscriptions/checkout endpoint
    - POST /api/subscriptions/portal endpoint
    - GET /api/subscriptions/status endpoint
  affects:
    - server/services/stripeWebhookService.ts
    - server/routes/webhooks/stripe.ts
    - server/routes/subscriptions.ts
    - server/index.ts
tech_stack:
  added: []
  patterns:
    - Idempotent webhook processing (Redis+DB dual storage)
    - Raw body parsing for HMAC signature verification
    - Price ID whitelist for security
key_files:
  created:
    - server/services/stripeWebhookService.ts
    - server/routes/webhooks/stripe.ts
    - server/routes/subscriptions.ts
  modified:
    - server/index.ts
decisions:
  - "Webhook route mounted BEFORE express.json() for raw body access"
  - "24h idempotency TTL via Redis with DB backup (CACHE_TTL.DAY)"
  - "Return 200 even on processing errors to prevent Stripe retries"
  - "PAST_DUE status on payment failure (7-day grace per CONTEXT.md)"
  - "Price ID whitelist validation prevents arbitrary price injection (T-36-06)"
metrics:
  duration: 4m 45s
  completed: 2026-04-26T15:57:31Z
  tasks: 3
  files_created: 3
  files_modified: 1
---

# Phase 36 Plan 02: Stripe Webhook Handling & Subscription API Summary

Idempotent Stripe webhook processing with Redis+DB dual storage, raw body signature verification, and subscription checkout/portal API endpoints with price ID whitelist.

## What Was Built

### Task 1: Stripe Webhook Service (0ec4634)
Created `server/services/stripeWebhookService.ts` with idempotent event processing:

**Exports:**
- `processWebhookIdempotently()` - Dual Redis+DB idempotency check (24h TTL)
- `handleStripeWebhook()` - Routes events to specific handlers

**Event Handlers:**
- `checkout.session.completed` - Creates initial subscription via SubscriptionService
- `customer.subscription.{created,updated}` - Updates tier and status
- `customer.subscription.deleted` - Downgrades to FREE tier
- `invoice.paid` - Extends subscription period on renewal
- `invoice.payment_failed` - Sets PAST_DUE status (7-day grace per CONTEXT.md)
- `customer.subscription.paused` - Sets PAUSED status with resume date
- `customer.subscription.resumed` - Reactivates to ACTIVE status

**Idempotency Flow:**
1. Check Redis cache (`webhook:stripe:{eventId}`)
2. Check DB (`ProcessedWebhookEvent` model) if not in Redis
3. Process event if not found
4. Store in both Redis (24h TTL) and DB

### Task 2: Webhook Route (a32f285)
Created `server/routes/webhooks/stripe.ts`:

- Uses `express.raw({ type: 'application/json' })` for raw body
- Verifies signature via `stripe.webhooks.constructEvent()`
- Returns 401 on invalid signature (strict per CONTEXT.md)
- Returns 200 even on processing errors (prevents Stripe retries)
- Graceful 503 when Stripe not configured

### Task 3: Subscription Routes and Mounting (6049d1e)
Created `server/routes/subscriptions.ts` and updated `server/index.ts`:

**Endpoints:**
- `POST /api/subscriptions/checkout` - Creates Stripe Checkout session
- `POST /api/subscriptions/portal` - Creates Stripe Customer Portal session
- `GET /api/subscriptions/status` - Returns tier, status, and endsAt

**Security:**
- All endpoints require `authMiddleware`
- Price ID whitelist validation via `isValidPriceId()` (T-36-06 mitigation)
- 503 response when Stripe service unavailable

**Mounting:**
- Webhook route mounted at line 108, BEFORE `express.json()` at line 111
- Subscription routes mounted at `/api/subscriptions` after teams route

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `processWebhookIdempotently` exported from stripeWebhookService
- [x] `handleStripeWebhook` exported from stripeWebhookService
- [x] `handleStripeWebhook` handles `checkout.session.completed`
- [x] `handleStripeWebhook` handles `customer.subscription.deleted`
- [x] `handlePaymentFailed` sets status to `PAST_DUE` (not immediate downgrade)
- [x] Webhook route uses `express.raw({ type: 'application/json' })`
- [x] Webhook route verifies signature via `stripe.webhooks.constructEvent`
- [x] Webhook route returns 401 on invalid signature
- [x] Webhook route mounted BEFORE `express.json()` in server/index.ts
- [x] Subscription routes require `authMiddleware`
- [x] Price ID validation against `STRIPE_CONFIG.priceIds` whitelist
- [x] TypeScript compilation succeeds

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 0ec4634 | feat(36-02): add Stripe webhook service with idempotency |
| 2 | a32f285 | feat(36-02): add Stripe webhook route with raw body parser |
| 3 | 6049d1e | feat(36-02): add subscription API routes and mount webhook endpoint |

## Known Stubs

None - all code is fully implemented and functional.

## Threat Flags

None - all security mitigations from threat model implemented:
- T-36-04: Signature verification via `stripe.webhooks.constructEvent`
- T-36-05: Idempotency via `processWebhookIdempotently`
- T-36-06: Price ID whitelist via `isValidPriceId()`
- T-36-07: Quick 200 response with async processing

## Self-Check: PASSED

- [x] server/services/stripeWebhookService.ts exists
- [x] server/routes/webhooks/stripe.ts exists
- [x] server/routes/subscriptions.ts exists
- [x] Commit 0ec4634 exists in git log
- [x] Commit a32f285 exists in git log
- [x] Commit 6049d1e exists in git log

---
*Completed: 2026-04-26T15:57:31Z*
