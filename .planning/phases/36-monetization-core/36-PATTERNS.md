# Phase 36: Monetization Core - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 11 (new/modified files)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `prisma/schema.prisma` | model | schema | `prisma/schema.prisma` (self) | exact |
| `server/services/subscriptionService.ts` | service | CRUD + external-API | `server/services/authService.ts` | exact |
| `server/services/stripeWebhookService.ts` | service | event-driven | `server/services/cleanupService.ts` | role-match |
| `server/routes/subscriptions.ts` | route | request-response | `server/routes/teams.ts` | exact |
| `server/routes/webhooks/stripe.ts` | route | event-driven | `server/routes/auth.ts` (partial) | partial |
| `server/middleware/requireTier.ts` | middleware | request-response | `server/middleware/teamAuth.ts` | exact |
| `server/config/stripe.ts` | config | static | `server/config/aiProviders.ts` | exact |
| `src/pages/Pricing.tsx` | page | request-response | `src/pages/Settings.tsx` | role-match |
| `src/components/subscription/TierCard.tsx` | component | UI | `src/components/PresetCard.tsx` | role-match |
| `src/components/subscription/SubscriptionBadge.tsx` | component | UI | `src/components/LockedFeature.tsx` | exact |
| `src/components/subscription/UpgradePrompt.tsx` | component | UI | `src/components/LockedFeature.tsx` | exact |

## Pattern Assignments

---

### `prisma/schema.prisma` (model, schema)

**Analog:** `prisma/schema.prisma` (self - extend existing)

**Enum pattern** (lines 1-13):
```prisma
// Existing enum pattern from schema
// Add after existing models, before indexes

enum SubscriptionTier {
  FREE
  PREMIUM
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  PAUSED
}
```

**User model extension pattern** (lines 66-135):
```prisma
model User {
  // ... existing fields ...

  // Phase 36: Subscription (add after existing fields)
  subscriptionTier      SubscriptionTier   @default(FREE)
  subscriptionStatus    SubscriptionStatus @default(ACTIVE)
  stripeCustomerId      String?            @unique
  stripeSubscriptionId  String?            @unique
  subscriptionEndsAt    DateTime?
  pausedUntil           DateTime?

  // Premium perks
  showPremiumBadge      Boolean            @default(true)
  customAccentColor     String?

  // Referrals
  referralCode          String?            @unique
  referredBy            String?
  freeMonthsEarned      Int                @default(0)

  // Student discount
  isStudent             Boolean            @default(false)
  studentVerifiedUntil  DateTime?
}
```

**New model pattern** (follow TeamInvite pattern at lines 417-432):
```prisma
model ProcessedWebhookEvent {
  id        String   @id
  eventType String
  processed DateTime @default(now())

  @@index([processed])
}
```

---

### `server/services/subscriptionService.ts` (service, CRUD + external-API)

**Analog:** `server/services/authService.ts`

**Imports pattern** (lines 1-8):
```typescript
import Stripe from 'stripe';
import { prisma } from '../db/prisma';
import { CacheService, CACHE_TTL } from './cacheService';
import logger from '../utils/logger';
```

**Singleton pattern** (lines 47-59):
```typescript
export class SubscriptionService {
  private static instance: SubscriptionService;
  private stripe: Stripe;

  private constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28',
    });
    console.log('Subscription service initialized');
  }

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }
}
```

**Method with error handling pattern** (lines 61-127, adapted from register method):
```typescript
async createCheckoutSession(
  userId: string,
  priceId: string,
  customerEmail: string
): Promise<string> {
  // Fetch existing customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  const session = await this.stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: user?.stripeCustomerId || undefined,
    customer_email: user?.stripeCustomerId ? undefined : customerEmail,
    customer_creation: user?.stripeCustomerId ? undefined : 'always',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/pricing`,
    client_reference_id: userId,
    metadata: { userId },
    automatic_tax: { enabled: true },
    allow_promotion_codes: false,
  });

  return session.url!;
}
```

---

### `server/services/stripeWebhookService.ts` (service, event-driven)

**Analog:** `server/services/cacheService.ts` + RESEARCH.md pattern

**Idempotency with Redis+DB pattern** (adapted from cacheService lines 136-166):
```typescript
import { CacheService, CACHE_TTL, CacheKeys } from './cacheService';
import { prisma } from '../db/prisma';
import logger from '../utils/logger';

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
    logger.info(`Webhook ${eventId} already processed (Redis)`);
    return { processed: false, duplicate: true };
  }

  // 2. Check DB backup (Redis may have evicted)
  const dbRecord = await prisma.processedWebhookEvent.findUnique({
    where: { id: eventId },
  });
  if (dbRecord) {
    await cacheService.set(cacheKey, true, IDEMPOTENCY_TTL);
    logger.info(`Webhook ${eventId} already processed (DB)`);
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

---

### `server/routes/subscriptions.ts` (route, request-response)

**Analog:** `server/routes/teams.ts`

**Imports pattern** (lines 1-14):
```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../services/authService';
import { SubscriptionService } from '../services/subscriptionService';

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

const router = Router();
```

**Zod validation pattern** (lines 24-57):
```typescript
const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID required'),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
});

function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}
```

**POST handler with service call pattern** (lines 116-156):
```typescript
router.post('/checkout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = checkoutSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: formatZodError(result.error),
      });
      return;
    }

    const userId = req.user!.userId;
    const { priceId } = result.data;

    const subscriptionService = SubscriptionService.getInstance();
    const checkoutUrl = await subscriptionService.createCheckoutSession(
      userId,
      priceId,
      req.user!.email
    );

    res.status(200).json({
      success: true,
      data: { url: checkoutUrl },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
```

---

### `server/routes/webhooks/stripe.ts` (route, event-driven)

**Analog:** `server/routes/auth.ts` (partial - no express.raw() precedent in codebase)

**CRITICAL: Raw body parser for webhook signature** (from RESEARCH.md):
```typescript
import express, { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { handleStripeWebhook } from '../../services/stripeWebhookService';
import logger from '../../utils/logger';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// CRITICAL: Raw body parser MUST be used for signature verification
router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body, // Raw buffer, NOT parsed JSON
        signature,
        webhookSecret
      );
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    try {
      await handleStripeWebhook(event);
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error('Webhook processing error:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

export default router;
```

**Server integration note:** Mount webhook route BEFORE express.json() in `server/index.ts`:
```typescript
// BEFORE express.json()
import stripeWebhookRouter from './routes/webhooks/stripe';
app.use('/api/webhooks/stripe', stripeWebhookRouter);

// AFTER - existing express.json() middleware
app.use(express.json({ ... }));
```

---

### `server/middleware/requireTier.ts` (middleware, request-response)

**Analog:** `server/middleware/teamAuth.ts`

**Imports pattern** (lines 1-8):
```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
```

**Type definition pattern** (lines 9-14):
```typescript
export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

export interface TierRequest extends Request {
  user?: { userId: string; email: string };
  userTier?: SubscriptionTier;
}
```

**Middleware factory pattern** (adapted from lines 67-86):
```typescript
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  FREE: 0,
  PREMIUM: 1,
  ENTERPRISE: 2,
};

export function requireTier(minTier: SubscriptionTier) {
  return async (req: TierRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { subscriptionTier: true, subscriptionStatus: true },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    // Check status is active
    if (user.subscriptionStatus !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: 'Active subscription required',
        subscriptionStatus: user.subscriptionStatus,
      });
      return;
    }

    // Check tier hierarchy
    const userTierLevel = TIER_HIERARCHY[user.subscriptionTier as SubscriptionTier];
    const requiredLevel = TIER_HIERARCHY[minTier];

    if (userTierLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        error: `${minTier} subscription required`,
        currentTier: user.subscriptionTier,
        requiredTier: minTier,
        upgradeUrl: '/pricing',
      });
      return;
    }

    req.userTier = user.subscriptionTier as SubscriptionTier;
    next();
  };
}
```

---

### `server/config/stripe.ts` (config, static)

**Analog:** `server/config/aiProviders.ts` (pattern for externalizing config)

**Config structure pattern:**
```typescript
// Environment-based price IDs
export const STRIPE_CONFIG = {
  priceIds: {
    monthly: process.env.STRIPE_PRICE_ID_MONTHLY!,
    annual: process.env.STRIPE_PRICE_ID_ANNUAL!,
  },
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
} as const;

// Price to tier mapping
export const PRICE_TO_TIER: Record<string, 'PREMIUM' | 'ENTERPRISE'> = {
  [process.env.STRIPE_PRICE_ID_MONTHLY!]: 'PREMIUM',
  [process.env.STRIPE_PRICE_ID_ANNUAL!]: 'PREMIUM',
};

// Feature limits by tier
export const TIER_LIMITS = {
  FREE: {
    aiQueriesPerDay: 10,
    historyDays: 7,
    dataExport: false,
    comments: false,
    aiPersonas: false,
    emailDigestFrequency: ['weekly'],
    teamCreation: false,
    shareAnalytics: false,
    forceTranslation: false,
    clusterSummaries: false,
    realtimeUpdates: false,
    advancedFilters: false,
    customPresets: false,
  },
  PREMIUM: {
    aiQueriesPerDay: Infinity,
    historyDays: Infinity,
    dataExport: ['json', 'csv'],
    comments: true,
    aiPersonas: true,
    emailDigestFrequency: ['daily', 'realtime'],
    teamCreation: true,
    shareAnalytics: true,
    forceTranslation: true,
    clusterSummaries: true,
    realtimeUpdates: true,
    advancedFilters: true,
    customPresets: true,
  },
  ENTERPRISE: {
    // Same as PREMIUM plus...
    dataExport: ['json', 'csv', 'pdf'],
    teamBilling: true,
    enterpriseAnalytics: true,
  },
} as const;
```

---

### `src/pages/Pricing.tsx` (page, request-response)

**Analog:** `src/pages/Settings.tsx`

**Imports pattern** (lines 1-18):
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, Sparkles, Building, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Toast } from '../components/Toast';
```

**Page component structure** (lines 25-100):
```typescript
export function Pricing() {
  const { t } = useTranslation(['pricing', 'common']);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  // Toast state (follow Settings.tsx pattern)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false,
  });

  const handleSubscribe = async (priceId: string) => {
    if (!isAuthenticated) {
      // Show auth modal
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
        },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Checkout failed',
        type: 'error',
        isOpen: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white font-mono mb-4">
          {t('pricing:title')}
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          {t('pricing:subtitle')}
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        {/* ... billing cycle toggle ... */}
      </div>

      {/* Tier Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Free, Premium, Enterprise cards */}
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
```

---

### `src/components/subscription/TierCard.tsx` (component, UI)

**Analog:** `src/components/PresetCard.tsx`

**Component props pattern:**
```typescript
interface TierCardProps {
  name: string;
  price: number;
  billingCycle: 'monthly' | 'annual';
  features: string[];
  isPopular?: boolean;
  isCurrent?: boolean;
  onSubscribe: () => void;
  isLoading?: boolean;
}
```

**Card styling pattern** (follow cyber theme):
```typescript
export function TierCard({
  name,
  price,
  billingCycle,
  features,
  isPopular,
  isCurrent,
  onSubscribe,
  isLoading,
}: TierCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-6 transition-all',
        isPopular
          ? 'border-[#00f0ff] bg-[#00f0ff]/5 scale-105'
          : 'border-gray-700 bg-gray-800'
      )}
    >
      {isPopular && (
        <div className="inline-block px-3 py-1 mb-4 rounded-full bg-[#00f0ff]/20 text-[#00f0ff] text-xs font-mono uppercase">
          Most Popular
        </div>
      )}

      <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
      <div className="mb-6">
        <span className="text-3xl font-bold text-white">EUR{price}</span>
        <span className="text-gray-400">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
            <Check className="h-4 w-4 text-[#00ff88]" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onSubscribe}
        disabled={isLoading || isCurrent}
        className={cn(
          'w-full py-3 rounded-lg font-medium transition-colors',
          isCurrent
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : isPopular
            ? 'bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        )}
      >
        {isCurrent ? 'Current Plan' : isLoading ? 'Loading...' : 'Subscribe'}
      </button>
    </div>
  );
}
```

---

### `src/components/subscription/SubscriptionBadge.tsx` (component, UI)

**Analog:** `src/components/LockedFeature.tsx`

**Imports pattern** (lines 1-12):
```typescript
import { Crown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
```

**Component pattern** (adapted from LockedFeature lines 27-68):
```typescript
interface SubscriptionBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function SubscriptionBadge({ className, showLabel = true }: SubscriptionBadgeProps) {
  const { user } = useAuth();

  // Only show for Premium/Enterprise users
  if (!user || user.subscriptionTier === 'FREE') {
    return null;
  }

  const tierColors = {
    PREMIUM: 'text-[#00f0ff] bg-[#00f0ff]/10 border-[#00f0ff]/30',
    ENTERPRISE: 'text-[#bf00ff] bg-[#bf00ff]/10 border-[#bf00ff]/30',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-mono uppercase tracking-wider',
        tierColors[user.subscriptionTier as 'PREMIUM' | 'ENTERPRISE'],
        className
      )}
    >
      <Crown className="h-3 w-3" />
      {showLabel && user.subscriptionTier}
    </div>
  );
}
```

---

### `src/components/subscription/UpgradePrompt.tsx` (component, UI)

**Analog:** `src/components/LockedFeature.tsx`

**Feature lock overlay pattern** (lines 38-68):
```typescript
interface UpgradePromptProps {
  feature: string;
  requiredTier?: 'PREMIUM' | 'ENTERPRISE';
  className?: string;
}

export function UpgradePrompt({ feature, requiredTier = 'PREMIUM', className }: UpgradePromptProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div
      className={cn('relative group cursor-pointer', className)}
      onClick={() => navigate('/pricing')}
    >
      {/* Overlay with lock icon */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded flex items-center justify-center z-10 transition-opacity group-hover:bg-black/70">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <Lock className="h-6 w-6 text-[#00f0ff]" />
          <div className="text-xs font-mono">
            <p className="text-gray-300">
              {t('upgrade.required', { tier: requiredTier })}
            </p>
            <p className="text-[#00f0ff] mt-1">
              {t('upgrade.clickToUnlock')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Shared Patterns

### Authentication Middleware
**Source:** `server/services/authService.ts` (lines 558-603)
**Apply to:** All subscription routes

```typescript
export async function authMiddleware(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const authService = AuthService.getInstance();
  const payload = authService.verifyToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  // ... blacklist check, token version check ...

  (req as unknown as { user: JWTPayload }).user = payload;
  next();
}
```

### Error Handling (Routes)
**Source:** `server/routes/teams.ts` (lines 139-155)
**Apply to:** All subscription route handlers

```typescript
try {
  // ... operation ...
} catch (err) {
  const message = err instanceof Error ? err.message : 'Operation failed';

  // Specific error handling
  if (message.includes('specific error')) {
    res.status(400).json({ success: false, error: message });
    return;
  }

  res.status(500).json({
    success: false,
    error: message,
  });
}
```

### Zod Validation
**Source:** `server/routes/auth.ts` (lines 14-57)
**Apply to:** All POST/PUT endpoints

```typescript
const schema = z.object({
  field: z.string().min(1, 'Field required'),
});

function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}

// In handler
const result = schema.safeParse(req.body);
if (!result.success) {
  res.status(400).json({
    success: false,
    error: formatZodError(result.error),
  });
  return;
}
```

### Redis Cache Keys
**Source:** `server/services/cacheService.ts` (lines 387-419)
**Apply to:** Webhook idempotency

```typescript
// Add to CacheKeys export
export const CacheKeys = {
  // ... existing keys ...

  // Subscription
  webhookIdempotency: (eventId: string) => `webhook:stripe:${eventId}`,
  userSubscription: (userId: string) => `user:subscription:${userId}`,
  tierLimits: (userId: string) => `tier:limits:${userId}`,
} as const;
```

### Lazy Route Loading
**Source:** `src/routes.ts` (lines 11-13)
**Apply to:** Pricing page

```typescript
export const Pricing = lazyWithRetry(() =>
  import('./pages/Pricing').then(m => ({ default: m.Pricing }))
);

// Add to routePreloaders
export const routePreloaders: Record<string, () => void> = {
  // ... existing ...
  '/pricing': () => {
    Pricing.preload();
  },
};
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | - | - | All files have analogs in codebase |

**Note:** Webhook raw body parsing (`express.raw()`) has no precedent in the codebase but is documented in RESEARCH.md Pattern 2.

---

## Metadata

**Analog search scope:** `server/services/`, `server/routes/`, `server/middleware/`, `src/pages/`, `src/components/`, `prisma/`
**Files scanned:** 58
**Pattern extraction date:** 2026-04-26

---

## Key Implementation Notes

1. **Webhook Route Mounting Order:** The Stripe webhook route MUST be mounted BEFORE `express.json()` middleware in `server/index.ts` to preserve raw body for signature verification.

2. **Tier Hierarchy:** Follow the team role pattern from `teamAuth.ts` for tier hierarchy checking - simple numeric comparison.

3. **Idempotency:** Use dual Redis+DB pattern from cacheService for webhook deduplication with 24h TTL.

4. **UI Components:** Follow cyber theme colors (`#00f0ff` cyan accent, `#00ff88` success green) from existing components.

5. **Route Registration:** Add `/api/subscriptions` to `server/index.ts` following the teams route pattern at line 166.
