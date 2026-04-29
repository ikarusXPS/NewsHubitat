# Phase 36: Monetization Core - Research

**Researched:** 2026-04-26
**Domain:** Stripe subscriptions, feature gating, A/B testing
**Confidence:** HIGH

## Summary

Phase 36 introduces subscription-based monetization using Stripe Billing with three tiers (Free/Premium/Enterprise). The implementation follows a server-side gating approach with Stripe Checkout (hosted) for payment collection and Stripe Customer Portal for subscription management. Key decisions from CONTEXT.md lock in immediate proration, cancel-at-period-end behavior, 7-day grace period for failed payments, and Redis+DB idempotency for webhooks.

The stack is well-established: Stripe Node.js SDK v22.1.0 for backend billing operations, PostHog Cloud for A/B testing pricing pages and conversion tracking, and server-side middleware for feature gating based on `subscriptionTier` enum stored on the User model. Existing patterns from Phase 35 (API key tiers) and Phase 28 (RBAC middleware) provide templates for tier-based access control.

**Primary recommendation:** Implement Stripe Checkout for payment, Stripe Customer Portal for self-service, webhook handlers with idempotency tracking, and a `requireTier` middleware for feature gating.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Checkout Method | Stripe Checkout (hosted) | Compliance, 3DS, localization handled |
| Subscription Changes | Immediate proration | Standard SaaS, user-friendly |
| Cancellation | Cancel at period end | Standard approach |
| Trial Period | No trial | Free tier serves as perpetual trial |
| Failed Payment Handling | Custom dunning + in-app banner | User choice |
| Grace Period | 7 days | Standard SaaS |
| Subscription Management | Hybrid | In-app overview + Stripe Portal for sensitive actions |
| Annual Billing | Yes, 2 months free | EUR90/year (~16% discount) |
| Currency | Stripe Auto-Detect | Based on customer location |
| Tax Handling | Stripe Tax | Automatic VAT for EU/DE |
| Enterprise Tier | Calendly demo request | User choice |
| Subscription Status UI | Badge in header + Settings detail | User choice |
| Gating Approach | Server-side only | Secure, enum field on User model |
| Idempotency | Redis (24h TTL) + DB backup | Both |
| Signature Verification | Strict (401 on invalid) | Required |
| A/B Testing | PostHog Cloud | Now, self-host later |

### Claude's Discretion

| Area | Notes |
|------|-------|
| AI Queries limit (Free) | 10/day |
| Feed Manager behavior | Custom feeds Premium only |
| Teams tier inheritance | Defer to later |
| Grandfathering | Defer to later |
| USPs to highlight | Based on market analysis |
| Stripe downtime handling | Graceful degradation |
| Mobile responsive design | Claude decides |
| Gift subscriptions | Defer |
| Promo codes | Defer |

### Deferred Ideas (OUT OF SCOPE)

- Lifetime deals
- Gift subscriptions
- Promo codes for initial launch
- Teams tier inheritance
- Grandfathering existing users
- Education tier (prepared but not active)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAY-01 | User can subscribe to Free tier (limited features) | Server-side gating via `subscriptionTier` enum, rate limits by tier |
| PAY-02 | User can subscribe to Premium tier (EUR9/month via Stripe) | Stripe Checkout Sessions API, Price IDs for monthly/annual |
| PAY-03 | User can subscribe to Enterprise tier (custom pricing) | Calendly integration for demo requests |
| PAY-04 | Premium users get ad-free experience | UI conditional rendering based on `subscriptionTier` |
| PAY-05 | Premium users get unlimited AI queries | `requireTier` middleware bypasses rate limiting for Premium |
| PAY-06 | Premium users get full reading history (no limit) | Remove 7-day filter in history queries for Premium tier |
| PAY-07 | Premium users can export data in multiple formats | Existing export endpoint extended with tier check |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Subscription tier storage | Database (User model) | Redis (cache) | Source of truth in PostgreSQL, cached for fast middleware checks |
| Payment collection | Stripe Checkout (external) | - | PCI compliance offloaded to Stripe |
| Subscription management | Stripe Customer Portal (external) | In-app read-only UI | Sensitive actions (card update, cancel) via Portal |
| Feature gating | API / Backend | Frontend (UI only) | Server enforces limits; frontend shows locked UI |
| Webhook processing | API / Backend | - | Must be server-side for signature verification |
| A/B testing | Frontend + PostHog | Backend (flag sync) | PostHog JS SDK captures experiments |
| Pricing page | Frontend (React) | - | Static marketing page, public route |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | 22.1.0 | Stripe API for subscriptions, checkout, webhooks | [VERIFIED: npm registry] Official Node.js SDK |
| posthog-js | 1.372.1 | Frontend analytics and A/B testing | [VERIFIED: npm registry] Feature flags, experiments |
| posthog-node | 5.30.4 | Backend event tracking | [VERIFIED: npm registry] Server-side conversion events |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express | 5.2.1 | HTTP server (existing) | Webhook endpoint, API routes |
| ioredis | 5.10.1 | Redis client (existing) | Webhook idempotency cache |
| zod | 4.3.6 | Request validation (existing) | Webhook payload validation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout (hosted) | Stripe Elements (embedded) | More customization but PCI scope increases, more code to maintain |
| PostHog | Amplitude, Mixpanel | PostHog has generous free tier (1M events), open-source option for future |
| Redis for idempotency | DB only | Redis provides faster lookups, DB backup handles Redis downtime |

**Installation:**
```bash
cd apps/web
pnpm add stripe@22.1.0 posthog-js@1.372.1 posthog-node@5.30.4 --legacy-peer-deps
```

## Architecture Patterns

### System Architecture Diagram

```
User Browser                  Express Backend                    External Services
     |                              |                                   |
     |  1. View /pricing           |                                   |
     |----------------------------->|                                   |
     |  (A/B variant from PostHog)  |                                   |
     |                              |                                   |
     |  2. Click "Subscribe"        |                                   |
     |----------------------------->|                                   |
     |                              |                                   |
     |  3. POST /api/subscriptions/checkout                             |
     |----------------------------->|                                   |
     |                              |  4. stripe.checkout.sessions.create
     |                              |----------------------------------->|
     |                              |                    Stripe API     |
     |                              |<-----------------------------------|
     |                              |  (session.url)                    |
     |<-----------------------------|                                   |
     |  (redirect to Stripe Checkout)                                   |
     |                              |                                   |
     |  5. Complete payment on Stripe                                   |
     |----------------------------------------------------------------->|
     |                              |                                   |
     |                              |  6. Webhook: checkout.session.completed
     |                              |<-----------------------------------|
     |                              |                                   |
     |                              |  7. Check Redis for event.id      |
     |                              |  8. If new: Update User.subscriptionTier
     |                              |  9. Store event.id in Redis (24h TTL)
     |                              |  10. Return 200                   |
     |                              |----------------------------------->|
     |                              |                                   |
     |  11. Redirect to success_url |                                   |
     |<-----------------------------|                                   |
     |                              |                                   |
     |  12. API calls with tier check                                   |
     |----------------------------->|                                   |
     |                              |  requireTier('PREMIUM') middleware |
     |                              |  -> Allow or 403                  |
```

### Recommended Project Structure

```
server/
  services/
    subscriptionService.ts      # Stripe operations: create session, portal, sync
    stripeWebhookService.ts     # Webhook event handlers with idempotency
  routes/
    subscriptions.ts            # /api/subscriptions/* endpoints
    webhooks/
      stripe.ts                 # POST /api/webhooks/stripe (raw body)
  middleware/
    requireTier.ts              # Feature gating by subscription tier
  config/
    stripe.ts                   # Price IDs, webhook secrets, feature mapping
src/
  pages/
    Pricing.tsx                 # Public pricing page with tiers
    SubscriptionSuccess.tsx     # Post-checkout success page
  components/
    subscription/
      TierCard.tsx              # Tier comparison card component
      SubscriptionBadge.tsx     # Header badge showing tier
      UpgradePrompt.tsx         # Contextual upsell component
      AIUsageCounter.tsx        # Daily AI query usage display
  contexts/
    SubscriptionContext.tsx     # Client-side tier state
public/
  locales/
    en/pricing.json             # i18n for pricing page
    de/pricing.json
    fr/pricing.json
    es/pricing.json
    it/pricing.json
```

### Pattern 1: Stripe Checkout Session Creation

**What:** Create a Checkout Session that redirects user to Stripe-hosted payment page
**When to use:** User clicks "Subscribe" on pricing page

```typescript
// Source: https://docs.stripe.com/api/checkout/sessions/create
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28', // Pin API version
});

export async function createCheckoutSession(
  userId: string,
  priceId: string, // STRIPE_PRICE_ID_MONTHLY or STRIPE_PRICE_ID_ANNUAL
  customerEmail: string
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: user?.stripeCustomerId || undefined,
    customer_email: user?.stripeCustomerId ? undefined : customerEmail,
    customer_creation: user?.stripeCustomerId ? undefined : 'always',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/pricing`,
    client_reference_id: userId, // Link to internal user
    metadata: { userId }, // Available in webhooks
    automatic_tax: { enabled: true }, // Stripe Tax for EU VAT
    allow_promotion_codes: false, // Deferred per CONTEXT.md
  });

  return session.url!;
}
```

### Pattern 2: Webhook Signature Verification with Raw Body

**What:** Verify Stripe webhook signatures using raw request body
**When to use:** All Stripe webhook endpoints (CRITICAL for security)

```typescript
// Source: https://docs.stripe.com/webhooks/signature
import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// CRITICAL: Raw body parser MUST be applied BEFORE json parser
export const stripeWebhookRouter = express.Router();

stripeWebhookRouter.post(
  '/stripe',
  express.raw({ type: 'application/json' }), // Raw body for signature
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body, // Raw buffer, NOT parsed JSON
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process event...
    res.status(200).json({ received: true });
  }
);
```

### Pattern 3: Idempotent Webhook Processing

**What:** Prevent duplicate processing of the same webhook event
**When to use:** All webhook handlers

```typescript
// Source: Based on Stripe best practices
import { CacheService, CACHE_TTL } from './cacheService';
import { prisma } from '../db/prisma';

const IDEMPOTENCY_TTL = CACHE_TTL.DAY; // 24 hours per CONTEXT.md

export async function processWebhookIdempotently(
  eventId: string,
  eventType: string,
  handler: () => Promise<void>
): Promise<{ processed: boolean; duplicate: boolean }> {
  const cacheService = CacheService.getInstance();
  const cacheKey = `webhook:stripe:${eventId}`;

  // 1. Check Redis first (fast path)
  const cached = await cacheService.get<boolean>(cacheKey);
  if (cached) {
    console.log(`Webhook ${eventId} already processed (Redis)`);
    return { processed: false, duplicate: true };
  }

  // 2. Check DB backup (Redis may have evicted)
  const dbRecord = await prisma.processedWebhookEvent.findUnique({
    where: { id: eventId },
  });
  if (dbRecord) {
    // Re-cache in Redis
    await cacheService.set(cacheKey, true, IDEMPOTENCY_TTL);
    console.log(`Webhook ${eventId} already processed (DB)`);
    return { processed: false, duplicate: true };
  }

  // 3. Process the event
  await handler();

  // 4. Mark as processed in both Redis and DB
  await Promise.all([
    cacheService.set(cacheKey, true, IDEMPOTENCY_TTL),
    prisma.processedWebhookEvent.create({
      data: { id: eventId, eventType },
    }),
  ]);

  return { processed: true, duplicate: false };
}
```

### Pattern 4: Feature Gating Middleware

**What:** Server-side middleware to restrict features by subscription tier
**When to use:** Protected routes requiring Premium or Enterprise

```typescript
// Source: Based on existing authMiddleware pattern
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

type SubscriptionTier = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

interface AuthRequest extends Request {
  user?: { userId: string };
}

const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  FREE: 0,
  PREMIUM: 1,
  ENTERPRISE: 2,
};

export function requireTier(minTier: SubscriptionTier) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { subscriptionTier: true, subscriptionStatus: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    // Check status is active (not past_due, canceled, paused)
    if (user.subscriptionStatus !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Active subscription required',
        subscriptionStatus: user.subscriptionStatus,
      });
    }

    // Check tier hierarchy
    const userTierLevel = TIER_HIERARCHY[user.subscriptionTier];
    const requiredLevel = TIER_HIERARCHY[minTier];

    if (userTierLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: `${minTier} subscription required`,
        currentTier: user.subscriptionTier,
        requiredTier: minTier,
        upgradeUrl: '/pricing',
      });
    }

    next();
  };
}
```

### Pattern 5: PostHog A/B Testing in React

**What:** Use feature flags for pricing page variants
**When to use:** A/B testing pricing presentation

```typescript
// Source: https://posthog.com/docs/libraries/react
import { PostHogProvider, useFeatureFlagVariantKey } from '@posthog/react';
import posthog from 'posthog-js';

// Initialize in App.tsx
posthog.init(process.env.VITE_POSTHOG_API_KEY!, {
  api_host: process.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
  capture_pageview: false, // Manual pageview capture
});

// In Pricing component
function PricingPage() {
  const variant = useFeatureFlagVariantKey('pricing-page-experiment');

  // Track experiment exposure
  useEffect(() => {
    if (variant) {
      posthog.capture('pricing_page_viewed', { variant });
    }
  }, [variant]);

  if (variant === 'variant-a') {
    return <PricingLayoutA />;
  } else if (variant === 'variant-b') {
    return <PricingLayoutB />;
  }

  // Control (default)
  return <PricingLayoutDefault />;
}
```

### Anti-Patterns to Avoid

- **Client-side feature gating only:** Never trust client-side checks. Always enforce tier limits server-side. Client UI should show "locked" state but server MUST reject unauthorized requests.

- **Storing raw webhook payloads:** Only store event ID for idempotency. Full payloads contain sensitive payment data and increase storage costs.

- **Parsing JSON before signature verification:** Express `express.json()` middleware parses the body, destroying the raw bytes needed for HMAC verification. Use `express.raw()` for webhook routes.

- **Synchronous webhook processing:** Heavy operations (email, analytics) should be fire-and-forget or queued. Return 200 quickly to prevent Stripe retries.

- **Relying on client_reference_id alone:** Always include `metadata.userId` as backup. Stripe Customer Portal doesn't preserve client_reference_id on subsequent events.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment form | Custom credit card input | Stripe Checkout (hosted) | PCI DSS compliance, 3DS, fraud detection |
| Subscription management UI | Custom cancel/upgrade forms | Stripe Customer Portal | PCI scope, localization, SCA compliance |
| Tax calculation | Manual VAT lookup tables | Stripe Tax | EU DAC7, nexus tracking, rate updates |
| Webhook retries | Custom retry queue | Stripe's built-in retry | 3-day exponential backoff, dashboard visibility |
| Proration calculation | Manual billing math | `proration_behavior: 'create_prorations'` | Edge cases with mid-cycle changes |
| Currency conversion | Exchange rate APIs | Stripe Adaptive Pricing | Real-time rates, payer currency display |

**Key insight:** Stripe handles the hard parts of subscription billing (compliance, retries, proration, disputes). Hand-rolling any of these creates maintenance burden and compliance risk.

## Common Pitfalls

### Pitfall 1: express.json() Before Webhook Route

**What goes wrong:** Webhook signature verification fails with "No signatures found matching the expected signature for payload"
**Why it happens:** Express parses JSON body before webhook handler, corrupting raw bytes needed for HMAC
**How to avoid:** Mount webhook route with `express.raw()` BEFORE general `express.json()` middleware
**Warning signs:** All webhook events fail verification; Stripe CLI `listen` works but production fails

### Pitfall 2: Not Handling Duplicate Webhooks

**What goes wrong:** Double-charging customers, duplicate database records, incorrect subscription state
**Why it happens:** Stripe delivers events at-least-once; network issues cause retries
**How to avoid:** Idempotency check before processing using `event.id` as key
**Warning signs:** Multiple `checkout.session.completed` logs for single checkout

### Pitfall 3: Blocking Webhook Response

**What goes wrong:** Stripe retries webhooks unnecessarily, hitting rate limits
**Why it happens:** Handler takes >20 seconds (email, heavy DB operations)
**How to avoid:** Return 200 immediately, process async (fire-and-forget pattern)
**Warning signs:** Webhook endpoint timeout alerts in Stripe dashboard

### Pitfall 4: Ignoring subscription.status

**What goes wrong:** Users with `past_due` status still access premium features
**Why it happens:** Only checking `subscriptionTier`, not `subscriptionStatus`
**How to avoid:** `requireTier` middleware checks BOTH tier AND status
**Warning signs:** Revenue loss without corresponding access revocation

### Pitfall 5: Hardcoding Price IDs

**What goes wrong:** Different Price IDs in test vs live mode cause checkout failures
**Why it happens:** Copy-pasting live Price IDs into development code
**How to avoid:** Use environment variables: `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`
**Warning signs:** "No such price" errors when switching Stripe modes

### Pitfall 6: Missing Customer Portal Configuration

**What goes wrong:** Portal sessions fail with "No active configuration" error
**Why it happens:** Customer Portal must be configured in Stripe Dashboard before API use
**How to avoid:** Configure Portal in Dashboard > Settings > Billing > Customer Portal FIRST
**Warning signs:** API errors when creating `billingPortal.sessions`

## Code Examples

### Webhook Event Handler (Subscription Events)

```typescript
// Source: https://docs.stripe.com/billing/subscriptions/webhooks
import Stripe from 'stripe';
import { prisma } from '../db/prisma';
import { processWebhookIdempotently } from './webhookIdempotency';

type SubscriptionTier = 'FREE' | 'PREMIUM' | 'ENTERPRISE';
type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED';

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_PRICE_ID_MONTHLY!]: 'PREMIUM',
  [process.env.STRIPE_PRICE_ID_ANNUAL!]: 'PREMIUM',
  // Add Enterprise Price IDs as needed
};

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  await processWebhookIdempotently(event.id, event.type, async () => {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.paused':
        await handleSubscriptionPaused(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.resumed':
        await handleSubscriptionResumed(event.data.object as Stripe.Subscription);
        break;
    }
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || session.client_reference_id;
  if (!userId) {
    console.error('checkout.session.completed: No userId found');
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Fetch subscription to get price -> tier mapping
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const tier = PRICE_TO_TIER[priceId] || 'PREMIUM';

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionTier: tier,
      subscriptionStatus: 'ACTIVE',
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
    },
  });

  console.log(`User ${userId} subscribed to ${tier}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!user) return;

  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    paused: 'PAUSED',
  };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: statusMap[subscription.status] || 'ACTIVE',
      subscriptionEndsAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : new Date(subscription.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: 'FREE',
      subscriptionStatus: 'CANCELED',
      stripeSubscriptionId: null,
      subscriptionEndsAt: null,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Renewal: extend subscription period
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'ACTIVE',
      subscriptionEndsAt: new Date(invoice.period_end * 1000),
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!user) return;

  // Set to PAST_DUE but don't revoke access yet (7-day grace per CONTEXT.md)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'PAST_DUE',
    },
  });

  // TODO: Send dunning email via emailService
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'PAUSED',
      pausedUntil: subscription.pause_collection?.resumes_at
        ? new Date(subscription.pause_collection.resumes_at * 1000)
        : null,
    },
  });
}

async function handleSubscriptionResumed(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'ACTIVE',
      pausedUntil: null,
    },
  });
}
```

### Create Billing Portal Session

```typescript
// Source: https://docs.stripe.com/api/customer_portal/sessions/create
export async function createPortalSession(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error('No Stripe customer found for user');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.APP_URL}/settings`,
  });

  return session.url;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe API v2024 | API v2026-01-28 | Q1 2026 | Pin version to avoid breaking changes |
| FID metric | INP (Interaction to Next Paint) | 2024 | A/B test conversion tracking uses INP |
| Self-host PostHog | PostHog Cloud first | 2025 | Cloud has better uptime; self-host later |
| express.raw({ type: '*/*' }) | express.raw({ type: 'application/json' }) | 2025 | More specific content-type matching |

**Deprecated/outdated:**
- `stripe.paymentIntents.create` for subscriptions: Use `stripe.checkout.sessions.create` with `mode: 'subscription'`
- Manual VAT calculation: Use Stripe Tax with `automatic_tax: { enabled: true }`
- `FID` in Web Vitals: Replaced by `INP` for interaction measurement

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Stripe API version 2026-01-28 is current | Code Examples | Minor - pin to available version at implementation time |
| A2 | PostHog Cloud free tier includes 1M events/month | Summary | Medium - may need to monitor usage or upgrade |
| A3 | Customer Portal doesn't require additional configuration beyond Dashboard | Pitfalls | Low - documented in Stripe docs |
| A4 | FR/ES/IT translations will follow DE/EN namespace pattern | Project Structure | Low - consistent with existing i18n |

## Open Questions

1. **Student Verification Implementation**
   - What we know: 50% discount, .edu/.ac email check + manual review fallback
   - What's unclear: Exact email domain regex for international .ac variants (UK, JP, etc.)
   - Recommendation: Start with common patterns, add admin override for edge cases

2. **Referral System Tracking**
   - What we know: Both parties get 1 month free
   - What's unclear: How to handle referral when referee already has Stripe customer ID
   - Recommendation: Apply credit via Stripe Billing Credits API

3. **Crisp Integration Priority**
   - What we know: Crisp for live chat with FAQ bot
   - What's unclear: Whether Crisp should be Phase 36 or deferred
   - Recommendation: Defer to Phase 36b or 37; focus on core billing first

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | User subscription data | Yes | 15+ | - |
| Redis | Webhook idempotency | Yes | 6+ | DB-only idempotency (slower) |
| Stripe CLI | Local webhook testing | Manual install | - | Stripe Dashboard test webhooks |

**Missing dependencies with no fallback:**
- None - all core dependencies are already in the project

**Missing dependencies with fallback:**
- Stripe CLI (for local development): Use Stripe Dashboard webhook forwarding as alternative

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Existing JWT + authMiddleware |
| V3 Session Management | Yes | Existing tokenVersion pattern |
| V4 Access Control | Yes | requireTier middleware for feature gating |
| V5 Input Validation | Yes | Zod schemas for all subscription endpoints |
| V6 Cryptography | Yes | Stripe handles payment data encryption |

### Known Threat Patterns for Stripe Integration

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook replay attack | Tampering | Stripe signature verification + timestamp check (5-min tolerance) |
| Spoofed checkout success | Spoofing | Always verify subscription status via Stripe API, not client params |
| Feature bypass | Elevation of Privilege | Server-side tier check, never trust client |
| Webhook flooding | Denial of Service | Idempotency + rate limiting on webhook endpoint |
| Customer data exposure | Information Disclosure | Never log full webhook payloads; store only event IDs |

## Sources

### Primary (HIGH confidence)
- [Stripe API Reference - Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create) - Session creation parameters
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks) - Signature verification, retry behavior
- [Stripe Billing Subscriptions Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) - Event lifecycle
- [PostHog React Documentation](https://posthog.com/docs/libraries/react) - Feature flags, useFeatureFlagVariantKey

### Secondary (MEDIUM confidence)
- [Stripe Subscription Integration Guide 2024](https://dev.to/ivanivanovv/stripe-subscription-integration-in-nodejs-2024-ultimate-guide-2ba3) - Community patterns
- [PostHog A/B Testing Tutorial](https://posthog.com/tutorials/react-ab-testing) - Experiment setup
- [Stripe Customer Portal Integration](https://docs.stripe.com/customer-management/integrate-customer-portal) - Portal session creation

### Tertiary (LOW confidence)
- [2026 Stripe Integration Guide](https://www.digitalapplied.com/blog/stripe-payment-integration-developer-guide-2026) - General guidance (validate current APIs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Stripe SDK and PostHog are industry standard, versions verified via npm
- Architecture: HIGH - Follows existing project patterns (services, middleware, routes)
- Pitfalls: HIGH - Based on official Stripe documentation and community reports

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days - Stripe APIs are stable)
