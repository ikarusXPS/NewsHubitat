# Phase 39: Mobile Apps - Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 27 (12 new, 15 modified) — see RESEARCH.md "Recommended Project Structure"
**Analogs found:** 25 / 27 (2 have no close match — biometric and Capacitor config are greenfield)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/mobile/capacitor.config.ts` | config | n/a | (none — greenfield) | no analog |
| `apps/mobile/package.json` | config | n/a | `apps/web/package.json` (workspace member) | role-match |
| `apps/web/server/services/pushService.ts` | service (singleton) | event-driven (emit→send) | `apps/web/server/services/subscriptionService.ts` | exact (singleton + env-gated SDK init) |
| `apps/web/server/services/notificationFanoutService.ts` | service (orchestrator) | event-driven (hook→fanout) | `apps/web/server/services/cleanupService.ts` + `newsAggregator.ts:284-293` (emit hook point) | composite |
| `apps/web/server/services/digestSchedulerService.ts` | service (cron) | scheduled (setInterval) | `apps/web/server/services/cleanupService.ts` (daily cron) | exact |
| `apps/web/server/routes/push.ts` | route | request-response (CRUD) | `apps/web/server/routes/auth.ts` (Zod) + `apps/web/server/routes/bookmarks.ts` (idempotent upsert) | composite |
| `apps/web/server/routes/keywordWatch.ts` | route | request-response (CRUD) | `apps/web/server/routes/bookmarks.ts` (per-user list with composite unique) | exact |
| `apps/web/server/routes/notifications.ts` | route | request-response | `apps/web/server/routes/auth.ts` (Zod schema pattern) | role-match |
| `apps/web/server/middleware/pushVolumeLimiter.ts` | middleware | request-response (rate gate) | `apps/web/server/middleware/rateLimiter.ts:115-174` (`aiTierLimiter`) | exact |
| `apps/web/prisma/schema.prisma` (PushSubscription, KeywordWatch, NotificationPreference) | model | persistence | `Bookmark` (per-user composite unique) + `EmailDigest`/`EmailSubscription` (per-user prefs) | exact |
| `apps/web/server/openapi/schemas.ts` (additions) | config | n/a | existing `schemas.ts` Zod-OpenAPI lines 1-80 | exact |
| `apps/web/src/lib/platform.ts` | utility | sync helper | `apps/web/src/lib/utils.ts` (single-responsibility export pattern) | role-match |
| `apps/web/src/hooks/usePushNotifications.ts` | hook | event-driven (listener registration) | `apps/web/src/hooks/useServiceWorker.ts` (Workbox listener cleanup) | exact |
| `apps/web/src/hooks/useBiometricAuth.ts` | hook | request-response (plugin call) | `apps/web/src/hooks/useServiceWorker.ts` (plugin-wrapping hook) | role-match |
| `apps/web/src/components/OfflineBanner.tsx` | component | request-response (status display) | `apps/web/src/components/OfflineBanner.tsx` (already exists — modify, not create) + `InstallPromptBanner.tsx` (z-index, dismissible) | already-exists |
| `apps/web/src/components/settings/NotificationsSection.tsx` | component | request-response (form) | `apps/web/src/components/settings/ConnectedAccounts.tsx` (the only existing settings/* file; same section idiom) | exact |
| `apps/web/src/components/UpgradePrompt.tsx` (modified) | component | retrofit | self (D-08 branch added) | self |
| `apps/web/src/components/subscription/TierCard.tsx` (modified) | component | retrofit | self | self |
| `apps/web/src/components/subscription/AIUsageCounter.tsx` (modified) | component | retrofit | self | self |
| `apps/web/src/contexts/AuthContext.tsx` (modified) | context | retrofit | self (login/logout hooks) | self |
| `apps/web/src/hooks/useHapticFeedback.ts` (modified) | hook | retrofit | self | self |
| `apps/web/src/components/InstallPromptBanner.tsx` (modified) | component | retrofit | self | self |
| `apps/web/src/pages/Settings.tsx` (modified) | page | retrofit | self (drop-in `<NotificationsSection />` after `<ConnectedAccounts />`) | self |
| `apps/web/server/services/newsAggregator.ts` (modified) | service | retrofit | self (lines 284-293 emit hook) | self |
| `apps/web/server/services/cleanupService.ts` (modified) | service | retrofit | self (extend `deleteExpiredAnalytics` pattern for `pushSubscription`) | self |
| `apps/web/server/middleware/aiTierLimiter.ts` (modified) | middleware | retrofit | self (lines 164-171 — 429 handler doesn't need a code change; the **route consumer** of the 429 needs `isNativeApp()` branching) | self |
| `.github/workflows/mobile-ios.yml` | ci | trigger-driven build | `.github/workflows/load-test.yml` (workflow_dispatch + secrets + artifact upload) + `.github/workflows/ci.yml` (pnpm + Node 22 setup) | composite |
| `.github/workflows/mobile-android.yml` | ci | trigger-driven build | same composite | composite |

---

## Pattern Assignments

### `apps/web/server/services/pushService.ts` (service, singleton + event-driven)

**Analog:** `apps/web/server/services/subscriptionService.ts`

**Imports + env-gated SDK init pattern** (`subscriptionService.ts:1-46`):
```typescript
import Stripe from 'stripe';
import { prisma } from '../db/prisma';
import { CacheService, CACHE_TTL } from './cacheService';
import { STRIPE_CONFIG, PRICE_TO_TIER, type SubscriptionTier } from '../config/stripe';
import logger from '../utils/logger';

export class SubscriptionService {
  private static instance: SubscriptionService;
  private stripe: Stripe | null;
  private cacheService: CacheService;

  private constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('[SubscriptionService] STRIPE_SECRET_KEY not set - service will be unavailable');
      this.stripe = null;
    } else {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: STRIPE_CONFIG.apiVersion,
      });
      console.log('[SubscriptionService] Initialized with Stripe API');
    }
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  isAvailable(): boolean {
    return !!this.stripe;
  }
```

**What to copy:**
- `private static instance` + `static getInstance()` + `private constructor()` triad — Phase 39 `PushService` follows the same shape.
- `if (!process.env.FIREBASE_PRIVATE_KEY) { ... this.app = null; }` graceful degradation — push send is optional in dev.
- `isAvailable()` predicate — `notificationFanoutService` short-circuits when push isn't configured.
- `[ServiceName]` log prefix convention.
- Inject `CacheService.getInstance()` for Redis-backed dedup/volume keys.

**Note on RESEARCH Pattern 3 excerpt** (`pushService.ts` skeleton at RESEARCH.md lines 440-505): the dead-token cleanup loop and 200-token chunking are unique to FCM; the **outer scaffolding** (singleton, env check, isAvailable, logger prefix) must match `subscriptionService.ts` exactly.

---

### `apps/web/server/services/notificationFanoutService.ts` (service, event-driven orchestrator)

**Analog (composite):** `apps/web/server/services/cleanupService.ts` (singleton + lifecycle) + `apps/web/server/services/newsAggregator.ts:284-293` (emit hook point)

**Singleton + lifecycle pattern** (`cleanupService.ts:20-72`):
```typescript
export class CleanupService {
  private static instance: CleanupService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {
    logger.info('Cleanup service initialized');
  }

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Cleanup service already running');
      return;
    }
    this.isRunning = true;
    this.runCleanup().catch(err => logger.error('Initial cleanup failed:', err));
    this.intervalId = setInterval(() => {
      this.runCleanup().catch(err => logger.error('Scheduled cleanup failed:', err));
    }, CLEANUP_INTERVAL_MS);
    logger.info('Cleanup service started - runs daily');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Cleanup service stopped');
  }
```

**Hook point — `newsAggregator.ts:284-293`** (the emit point new fanout service must subscribe to):
```typescript
            // JOB-03: cross-replica fanout via worker Socket.IO Emitter
            // (T-37-06: cache invalidation lives inside emitNewArticle in
            // Plan 01's full workerEmitter implementation).
            if (isNew) {
              emitNewArticle(article);
              // Breaking news heuristic: critical-severity sentiment
              if (article.sentiment === 'negative' && article.sentimentScore <= -0.7) {
                emitBreakingNews(article);
              }
            }
```

**What to copy:**
- Singleton + `start()`/`stop()` graceful shutdown (planner: wire into the same server-bootstrap block that calls `CleanupService.getInstance().start()`).
- Hook **into the existing `emitNewArticle` / `emitBreakingNews` calls in `workerEmitter.ts`** — RESEARCH calls this out at line 94 ("Hooks `emitNewArticle` / `emitBreakingNews` from `newsAggregator.ts:288-291`"). Do NOT add a new emit point in `newsAggregator.ts` itself; subscribe inside `workerEmitter` or via a Redis pub/sub channel.
- `try/catch logger.error('cleanup:error', err); throw err;` outer wrapping for fanout cycle.

---

### `apps/web/server/services/digestSchedulerService.ts` (service, scheduled)

**Analog:** `apps/web/server/services/cleanupService.ts` (`runCleanup` daily-cycle pattern)

**Daily cron pattern** (`cleanupService.ts:14-18, 52-58`):
```typescript
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = DAY_IN_MS;  // D-18: Daily interval

// inside start():
this.intervalId = setInterval(() => {
  this.runCleanup().catch(err => logger.error('Scheduled cleanup failed:', err));
}, CLEANUP_INTERVAL_MS);
```

**What to copy:**
- Per Open Question #3 in RESEARCH (lines 1022-1026): use a single **hourly** `setInterval(... 3600000)` that finds users whose digest-hour-in-their-timezone matches the current UTC hour, then dispatches. Mirrors the `cleanupService.runCleanup()` outer try/catch.
- Run-once-on-startup pattern (`cleanupService.ts:48-50`):
```typescript
// Run immediately on startup (D-18)
this.runCleanup().catch(err => {
  logger.error('Initial cleanup failed:', err);
});
```

---

### `apps/web/server/routes/push.ts` (route, request-response CRUD)

**Analog (composite):** `apps/web/server/routes/auth.ts` (Zod validation) + `apps/web/server/routes/bookmarks.ts` (per-user idempotent upsert with composite unique key)

**Zod schema + safeParse + formatZodError pattern** (`auth.ts:13-90`):
```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, authMiddleware } from '../services/authService';

export const authRoutes = Router();

const authService = AuthService.getInstance();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// Zod validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    /* ... */,
});

// Helper to format Zod errors
function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}

authRoutes.post('/register', async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: formatZodError(result.error) });
    return;
  }
  const { email, password, name } = result.data;
  try {
    const authResult = await authService.register(email, password, name);
    res.status(201).json({ success: true, data: authResult });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Registration failed',
    });
  }
});
```

**Idempotent upsert pattern** (`bookmarks.ts:1-46` — directly mirrors `PushSubscription` `@@unique([userId, token])`):
```typescript
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../services/authService';
import { prisma } from '../db/prisma';

const router = Router();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// POST /api/bookmarks - Create bookmark (idempotent)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { articleId } = req.body;

    if (!articleId || typeof articleId !== 'string') {
      res.status(400).json({ success: false, error: 'articleId is required' });
      return;
    }

    // Check if bookmark exists (idempotent)
    const existing = await prisma.bookmark.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });
    if (existing) {
      res.status(200).json({ success: true, data: existing });
      return;
    }

    const bookmark = await prisma.bookmark.create({ data: { userId, articleId } });
    res.status(201).json({ success: true, data: bookmark });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create bookmark',
    });
  }
});
```

**What to copy:**
- Always `authMiddleware` (NOT `authRoutes`'s registration shape — push subscribe MUST be authenticated).
- `userId_token` Prisma composite-unique lookup before create (idempotent — re-registration on app reinstall must not throw).
- Zod `safeParse` → 400 with `formatZodError`.
- `success: true | false, data | error` envelope.

**Per-route MUST-DO from CLAUDE.md §"Public API & OpenAPI":** add Zod schema in `server/openapi/schemas.ts` (see "Shared Patterns: Zod-OpenAPI" below). Run `pnpm openapi:generate` after.

---

### `apps/web/server/routes/keywordWatch.ts` (route, request-response CRUD)

**Analog:** `apps/web/server/routes/bookmarks.ts` (per-user list with composite unique)

Same idempotent-upsert pattern as `push.ts` above. Use `userId_keyword` composite unique on `KeywordWatch`.

---

### `apps/web/server/middleware/pushVolumeLimiter.ts` (middleware, request-response rate gate)

**Analog:** `apps/web/server/middleware/rateLimiter.ts:115-174` (`aiTierLimiter`)

**Tiered Redis-backed rate-limit pattern** (`rateLimiter.ts:110-174`):
```typescript
/**
 * Tier-aware AI rate limiter (Phase 36)
 * FREE: 10 requests/day (per TIER_LIMITS)
 * PREMIUM/ENTERPRISE: Unlimited (skip rate limiting)
 */
export const aiTierLimiter = (() => {
  const cacheService = CacheService.getInstance();
  const redisClient = cacheService.getClient();

  let store: RedisStore | undefined;
  if (redisClient) {
    store = new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        redisClient.call(command, ...args) as Promise<RedisReply>,
      prefix: 'rl:ai-tier:',
    });
  }

  return rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours for daily limit
    max: 10, // FREE tier limit per CONTEXT.md
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.userId || req.ip || 'anonymous';
    },
    skip: async (req: Request) => {
      if (!cacheService.isAvailable()) return true;
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user?.userId) return false;

      const cacheKey = `user:tier:${authReq.user.userId}`;
      let tier = await cacheService.get<string>(cacheKey);
      if (!tier) {
        const user = await prisma.user.findUnique({
          where: { id: authReq.user.userId },
          select: { subscriptionTier: true },
        });
        tier = user?.subscriptionTier || 'FREE';
        await cacheService.set(cacheKey, tier, CACHE_TTL.MEDIUM);
      }
      return tier === 'PREMIUM' || tier === 'ENTERPRISE';
    },
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: 'Daily AI query limit reached (10/day for free tier)',
        upgradeUrl: '/pricing',
        limit: 10,
      });
    },
    store,
  });
})();
```

**What to copy:**
- IIFE module-level limiter — instantiated once at import.
- `prefix: 'rl:push-volume:'` for the Redis key namespace.
- `keyGenerator: req.user.userId` — D-07 caps by user, not IP (matches RESEARCH note "Volume cap keyed by `userId`, not by token. User with 3 devices still capped at 5/day FREE").
- For D-07 dual cap (5 FREE / 10 PREMIUM): two limiters or a single limiter with `max` derived in `keyGenerator`. Recommend: branch `max` inside `skip` after reading tier. The limiter scope is the **fanout job** (server-internal), not an HTTP middleware — so adapt the shape to a `canSendNow(userId): Promise<boolean>` helper rather than `rateLimit({...})`.

**Note for planner:** `pushVolumeLimiter` lives in `middleware/` per RESEARCH file structure but **isn't actually Express middleware** — it's a counter helper consumed by `notificationFanoutService`. Either rename to `services/pushVolumeService.ts` or keep the location and adapt the IIFE pattern to a class with `canSend(userId, tier): Promise<boolean>` method.

---

### `apps/web/prisma/schema.prisma` (PushSubscription, KeywordWatch, NotificationPreference)

**Analog for `PushSubscription`:** `Bookmark` (per-user composite unique) — `schema.prisma:176-185`:
```prisma
model Bookmark {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  articleId String
  createdAt DateTime @default(now())

  @@unique([userId, articleId])
  @@index([userId])
}
```

**Analog for `KeywordWatch`:** same `Bookmark` shape — composite unique on `[userId, keyword]`, JSONB array for `regionsScope[]` (mirror `EmailSubscription.regions` JSONB pattern at `schema.prisma:225`).

**Analog for `NotificationPreference`:** `EmailSubscription` (per-user singleton row) — `schema.prisma:219-235`:
```prisma
model EmailSubscription {
  id          String    @id @default(cuid())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  email       String
  frequency   String // daily, weekly, realtime
  regions     Json // D-13: JSONB array of regions to include
  topics      Json // D-13: JSONB array of topics to include
  minSeverity String    @default("medium")
  isActive    Boolean   @default(true)
  lastSentAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([userId])
  @@index([frequency])
}
```

**What to copy for all three new models:**
- `id String @id @default(cuid())` (project standard).
- `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` — cascade-delete on user deletion.
- `userId String` separately indexed (`@@index([userId])`).
- `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt` for mutable rows (not push tokens).
- D-13 JSONB convention with `// D-13: JSONB array` comment.
- `@@unique([userId, token])` for `PushSubscription` (D-04), `@@unique([userId, keyword])` for `KeywordWatch`, `@@unique([userId])` for `NotificationPreference`.

**Concrete model shapes** (planner consumes for prisma migration):
```prisma
model PushSubscription {
  id          String   @id @default(cuid())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  platform    String   // 'ios' | 'android' (D-04)
  token       String
  createdAt   DateTime @default(now())
  lastSeenAt  DateTime @default(now())

  @@unique([userId, token])
  @@index([userId])
  @@index([lastSeenAt])  // for cleanupService 90-day prune
}

model KeywordWatch {
  id            String   @id @default(cuid())
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId        String
  keyword       String
  regionsScope  Json     // D-13: JSONB array of PerspectiveRegion (empty = all)
  createdAt     DateTime @default(now())

  @@unique([userId, keyword])
  @@index([userId])
}

model NotificationPreference {
  id              String   @id @default(cuid())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId          String   @unique
  enabled         Boolean  @default(true)
  triggerBreaking Boolean  @default(true)
  triggerAffinity Boolean  @default(true)
  triggerKeyword  Boolean  @default(true)
  triggerDigest   Boolean  @default(true)
  digestHour      Int      @default(8)       // 0-23, in user's timezone
  quietHoursStart String   @default("22:00") // HH:MM, user-local
  quietHoursEnd   String   @default("07:00")
  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())
}
```

---

### `apps/web/src/lib/platform.ts` (utility, sync helper)

**Analog:** `apps/web/src/lib/utils.ts` (single-responsibility named exports)

**Pattern** (`utils.ts:1-7`):
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**What to copy:**
- Named exports (no default).
- Tiny file, single responsibility.
- The exact contents are spelled out in RESEARCH.md Pattern 1 lines 343-358.

---

### `apps/web/src/hooks/usePushNotifications.ts` (hook, listener registration with cleanup)

**Analog:** `apps/web/src/hooks/useServiceWorker.ts`

**Listener registration + cleanup pattern** (`useServiceWorker.ts:1-53`):
```typescript
import { useEffect, useRef, useState } from 'react';
import { Workbox } from 'workbox-window';

interface ServiceWorkerState {
  needRefresh: boolean;
  isRegistered: boolean;
  error: string | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    needRefresh: false,
    isRegistered: false,
    error: null,
  });
  const wbRef = useRef<Workbox | null>(null);

  useEffect(() => {
    // Only register in production
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
      return;
    }
    const workbox = new Workbox('/sw.js');
    workbox.addEventListener('waiting', () => {
      setState((prev) => ({ ...prev, needRefresh: true }));
    });
    workbox.addEventListener('activated', () => {
      setState((prev) => ({ ...prev, isRegistered: true }));
    });
    workbox.register().catch((err) => {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setState((prev) => ({ ...prev, error: errorMessage }));
    });
    wbRef.current = workbox;
  }, []);
  // ...
}
```

**What to copy:**
- `useEffect` with **early-return guard** (`!('serviceWorker' in navigator) || !import.meta.env.PROD`) — Phase 39 hook guards on `!isNativeApp() || !isAuthenticated || !jwt`.
- State immutability (`setState((prev) => ({ ...prev, ... }))`).
- The exact `cleanups: Array<() => void>` cleanup-array pattern is spelled out in RESEARCH.md lines 685-702 — **copy that block verbatim**.
- `wbRef.current = workbox` ref-store-for-imperative-API equivalent: store the listener `Handle` for cleanup on unmount.

---

### `apps/web/src/hooks/useBiometricAuth.ts` (hook, plugin call)

**Analog:** None precise (greenfield biometric plugin wrapper). The closest **shape** is `useServiceWorker.ts` (also wraps a third-party imperative API).

**What to copy from `useServiceWorker.ts`:**
- Early-return guard for non-applicable platforms (web).
- `try/catch` around plugin calls.

**Concrete code spelled out in RESEARCH.md Pattern 2 lines 391-426** — planner copies that block verbatim. It's a non-React module (top-level async functions, not a hook). RESEARCH file structure lists it under `hooks/` but the exports are **plain async functions**, not a hook. Planner should:
- Either rename to `apps/web/src/lib/biometric.ts` (alongside `platform.ts`), OR
- Wrap in a thin `useBiometricAuth()` hook that exposes `{ persist, unlock, clear }` as memoized callbacks.

---

### `apps/web/src/components/OfflineBanner.tsx` (component, status display)

**ALREADY EXISTS** at `apps/web/src/components/OfflineBanner.tsx`. Phase 39 likely needs to **modify it** for D-12 (online/offline `navigator.onLine` listener + dismissibility). The current implementation:

**Existing OfflineBanner pattern** (`OfflineBanner.tsx:1-55`):
```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useBackendStatus } from '../hooks/useBackendStatus';

export function OfflineBanner() {
  const { isOnline, isChecking, error, retry } = useBackendStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden border-b border-[#ff0044]/30"
        >
          <div className="bg-gradient-to-r from-[#ff0044]/20 via-[#ff0044]/10 to-[#ff0044]/20 backdrop-blur-sm">
            {/* ... icon, message, retry button ... */}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Z-index + dismissible pattern (analog):** `apps/web/src/components/InstallPromptBanner.tsx:13-29`:
```typescript
className={cn(
  'fixed left-0 right-0 z-30', // z-30 below bottom nav (z-40) per D-30
  'border-t border-cyan-500/30',
  'bg-gradient-to-r from-[#00f0ff]/20 via-[#00f0ff]/10 to-[#00f0ff]/20',
  'backdrop-blur-sm'
)}
```

**What Phase 39 needs (D-12, RESEARCH OQ-1):**
- Existing banner already drives off `useBackendStatus` (which polls `/api/health`). RESEARCH says "subscribes to the existing `useBackendStatus` hook (or a new `navigator.onLine` listener)". Planner pick: keep current `useBackendStatus` driver (no change needed) OR add `navigator.onLine` for instant feedback. Both are fine; current code is closer to the latter via fetch-fail.
- **Add per-session dismissibility** (RESEARCH OQ-1 recommendation): `useState(true)` for visible, dismiss button hides for current online/offline cycle, auto-rehides when `navigator.onLine` flips back to true. Mirror the `dismiss` pattern from `useInstallPrompt.ts:52-55`.
- **Z-index check:** current banner uses `border-b` flow layout (not fixed). RESEARCH recommends `z-30` (between Header z-20 and AuthModal z-50, below ConsentBanner z-100). If converted to `fixed`, use `z-30` per `InstallPromptBanner.tsx` precedent.

---

### `apps/web/src/components/settings/NotificationsSection.tsx` (component, settings form)

**Analog:** `apps/web/src/components/settings/ConnectedAccounts.tsx` — the only existing `settings/*` file. Mirrors the section-component idiom RESEARCH Q-05 calls out.

**Section-component pattern** (`ConnectedAccounts.tsx:1-9, 44-72, 223-303`):
```typescript
import { useState, useEffect } from 'react';
import { Link2, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useOAuthPopup } from '../../hooks/useOAuthPopup';
import { cn } from '../../lib/utils';
import { Toast } from '../Toast';
import { ConfirmDialog } from '../ConfirmDialog';

export function ConnectedAccounts() {
  const { t } = useTranslation(['settings', 'auth']);
  const { token } = useAuth();

  const [providers, setProviders] = useState<ConnectedProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
    message: '', type: 'info', isOpen: false,
  });

  useEffect(() => {
    const fetchProviders = async () => {
      if (!token) return;
      try {
        const response = await fetch('/api/auth/oauth/providers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setProviders(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch providers:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProviders();
  }, [token]);

  return (
    <>
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-[#00f0ff]" />
          {t('settings:connectedAccounts.title')}
        </h2>
        {/* ... rows of toggles/buttons ... */}
      </div>
      <Toast {...} />
      <ConfirmDialog {...} />
    </>
  );
}
```

**What to copy:**
- File location: `apps/web/src/components/settings/NotificationsSection.tsx`.
- Outer wrapper: `<div className="rounded-lg border border-gray-700 bg-gray-800 p-4">` (matches existing Settings sections).
- `<h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">` with cyan-accent icon.
- `useTranslation(['settings'])` + `useAuth()` + `fetch('/api/...', { headers: { Authorization: \`Bearer ${token}\` } })`.
- `Toast` + `ConfirmDialog` for in-section feedback.
- Drop into `Settings.tsx` after line 305 (`<ConnectedAccounts />`):
```tsx
{/* Connected Accounts Section - only show when authenticated */}
{isAuthenticated && user && <ConnectedAccounts />}

{/* NEW Phase 39 — drop here */}
{isAuthenticated && user && <NotificationsSection />}
```

---

### Reader-app gating retrofits (D-08, D-09)

For each modified component, the planner adds an `isNativeApp()` branch. Concrete per-file targets:

#### `apps/web/src/components/UpgradePrompt.tsx`

**Branch insertion point** (`UpgradePrompt.tsx:30-46` — the `inline` variant currently navigates to `/pricing`):
```typescript
  if (inline) {
    return (
      <button
        onClick={() => navigate('/pricing')}     // ← D-08 GATE HERE
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
          'bg-[#00f0ff]/10 border border-[#00f0ff]/30',
          'text-[#00f0ff] text-sm font-mono',
          'hover:bg-[#00f0ff]/20 transition-colors',
          className
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t('upgrade.unlockFeature', { feature })}
      </button>
    );
  }
```
And the overlay variant at `UpgradePrompt.tsx:55-58`:
```typescript
      <div
        onClick={() => navigate('/pricing')}      // ← D-08 GATE HERE
        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-lg cursor-pointer transition-all group-hover:bg-black/70"
      >
```

**Apply RESEARCH Pattern 1 (lines 360-380)** — early-return with neutral D-09 message when `isNativeApp()`. Plain text URL, no clickable link.

#### `apps/web/src/components/subscription/TierCard.tsx`

**Modification:** Entire `TierCard` rendering should be **suppressed** in mobile. Wrap the export or the consumer (Pricing page) with `if (isNativeApp()) return null`. Concrete suppression site at `TierCard.tsx:51-149` — the whole `<div className={cn('relative rounded-xl border p-6 ...')}>...</div>` is the pricing surface to hide. Easiest: branch at the **caller** in `apps/web/src/pages/Pricing.tsx` (not yet read by this analysis — planner verifies during implementation).

#### `apps/web/src/components/subscription/AIUsageCounter.tsx`

**Branch insertion point** (`AIUsageCounter.tsx:99-106` — the upgrade link at the bottom):
```typescript
      {remaining <= 2 && (
        <a
          href="/pricing"                          // ← D-08 GATE HERE
          className="block mt-2 text-xs text-[#00f0ff] hover:underline"
        >
          {t('ai.upgradeCta')}
        </a>
      )}
    </div>
  );
}
```
**Action:** When `isNativeApp()`, omit the `<a href="/pricing">` block entirely (the counter itself can stay — it shows usage, not pricing).

#### `apps/web/server/middleware/aiTierLimiter.ts` — NO server-side change needed

The 429 handler at `rateLimiter.ts:164-171`:
```typescript
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: 'Daily AI query limit reached (10/day for free tier)',
        upgradeUrl: '/pricing',
        limit: 10,
      });
    },
```
**Per CLAUDE.md "Architectural Responsibility Map" (RESEARCH lines 89-90):** "Reader-app gating (hide pricing UI) | Browser/Client (Capacitor.getPlatform check) | — | Detection seam runs in WebView; backend doesn't know whether request came from native wrapper (and shouldn't — backend stays platform-agnostic)."

**The fix is at the call site, not the middleware:** wherever the SPA consumes the 429 (likely `useAuth` hook or a fetch wrapper for `/api/ai/*`), the toast/error display branches on `isNativeApp()` and shows the D-09 generic copy instead of routing to `upgradeUrl: '/pricing'`. **Planner: locate the 429 handler in the SPA fetch layer and add the branch there.** Search hint: `Grep("upgradeUrl|429", glob: "apps/web/src/**/*.{ts,tsx}")`.

#### `apps/web/src/contexts/AuthContext.tsx`

**Hook insertion points** (`AuthContext.tsx:93-115` — login):
```typescript
  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', { /* ... */ });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem(TOKEN_KEY, data.data.token);
    // ← INSERT D-11: persistJwtBehindBiometric(data.data.token, data.data.user.id);
    setToken(data.data.token);
    setUser(data.data.user);
    Sentry.setUser({ /* ... */ });
  }, []);
```

And **logout** (find in same file): `localStorage.removeItem(TOKEN_KEY)` site → also call `clearBiometricJwt()`.

**RESEARCH lines 642-657 spell out the bootstrap unlock** — adds to `main.tsx` before `ReactDOM.render`.

#### `apps/web/src/hooks/useHapticFeedback.ts`

**Modification** (`useHapticFeedback.ts:8-17`):
```typescript
export function useHapticFeedback() {
  const lightTap = () => {
    // Check API availability (iOS Safari doesn't support)
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // 10ms vibration per D-14
    }
  };
```
**Action:** Try `@capacitor/haptics` first when `isNativeApp()`, fall back to `navigator.vibrate` on web. Mirrors RESEARCH lines 116-117 ("Wire inside `useHapticFeedback` (replace `navigator.vibrate` when running in Capacitor; keep web fallback)").

#### `apps/web/src/components/InstallPromptBanner.tsx`

**Modification** (`InstallPromptBanner.tsx:6-11`):
```typescript
export function InstallPromptBanner() {
  const { showBanner, install, dismiss } = useInstallPrompt();
  if (!showBanner) {
    return null;
  }
```
**Action:** Add `if (isNativeApp()) return null;` early return — the install banner is redundant inside the native wrapper (RESEARCH line 145).

#### `apps/web/server/services/cleanupService.ts`

**Modification** — extend the `deleteExpiredAnalytics` pattern (`cleanupService.ts:185-202`):
```typescript
  private async deleteExpiredAnalytics(): Promise<void> {
    const cutoffDate = new Date(Date.now() - ANALYTICS_RETENTION_DAYS * DAY_IN_MS);
    const result = await prisma.shareClick.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    if (result.count > 0) {
      logger.info(`cleanup:deleted_analytics count=${result.count} retention=${ANALYTICS_RETENTION_DAYS}d`);
    }
  }
```
**Action:** Add a sibling `deleteStalePushSubscriptions()` that prunes `prisma.pushSubscription.deleteMany({ where: { lastSeenAt: { lt: cutoffDate } } })` (90-day retention, matches existing analytics retention). Wire into `runCleanup()` at `cleanupService.ts:77-98`.

#### `apps/web/server/services/newsAggregator.ts`

**No source change needed** — RESEARCH lines 287-291 are the existing emit hook. `notificationFanoutService` subscribes to `emitNewArticle` / `emitBreakingNews` indirectly via `workerEmitter.ts` (the abstraction layer). Planner: trace `workerEmitter.ts` and add a `pushFanout` subscriber there.

---

### CI workflow files

**Analog (composite):** `.github/workflows/load-test.yml` (workflow_dispatch + secrets + artifact upload + GH summary) + `.github/workflows/ci.yml` (pnpm + Node 22 setup steps).

**Trigger + secrets pattern** (`load-test.yml:1-37`):
```yaml
name: Load Test

on:
  workflow_dispatch:  # D-29: Manual dispatch only (expensive test)
    inputs:
      scenario:
        description: 'Test scenario to run'
        required: true
        default: 'load'
        type: choice
        options:
          - smoke
          - load

jobs:
  load-test:
    name: k6 Load Test
    runs-on: ubuntu-latest
    timeout-minutes: 30  # D-11: 10min test + buffer

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup k6
        uses: grafana/setup-k6-action@v1
        with:
          k6-version: '0.53.0'

      - name: Run k6 load test
        env:
          K6_BASE_URL: ${{ secrets.STAGING_URL }}
          K6_SCENARIO: ${{ github.event.inputs.scenario }}
        run: |
          k6 run k6/load-test.js --out json=summary.json
        continue-on-error: true
```

**pnpm + Node 22 setup pattern** (`ci.yml:14-37`):
```yaml
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
```

**Artifact upload pattern** (`load-test.yml:39-48`):
```yaml
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: k6-results-${{ github.event.inputs.scenario }}-${{ github.run_number }}
          path: |
            summary.json
            summary.html
          retention-days: 30
```

**What to copy for `mobile-ios.yml` / `mobile-android.yml`:**
- **Trigger:** `on: push: tags: ['v*']` (per RESEARCH line 967, 979 — NOT every PR; keeps required-checks list lean per CLAUDE.md branch-protection note).
- **Runner:** `macos-latest` for iOS, `ubuntu-latest` for Android (RESEARCH lines 968, 980).
- **Steps:** Checkout → pnpm/setup-node@v4 with Node 22 → `pnpm install --frozen-lockfile` → `pnpm --filter @newshub/web build` → `pnpm --filter @newshub/mobile exec cap sync {ios|android}` → Fastlane (iOS) or Gradle bundleRelease (Android).
- **Secrets:** Use `${{ secrets.MATCH_PASSWORD }}` etc. — full secret list at RESEARCH lines 976, 988.
- **Artifacts:** `actions/upload-artifact@v4` with `retention-days: 30` (matches existing 30-day pattern).
- **No matrix needed:** RESEARCH calls for separate workflows (`mobile-ios.yml`, `mobile-android.yml`), not a matrix — keeps signing keys / runner cost separated. Don't introduce a `strategy.matrix` here.

**Don't copy from `ci.yml`:** the `services: postgres / redis` block — mobile builds don't need DB. Don't copy the bundle-analysis or e2e jobs.

---

## Shared Patterns

### Authentication (all new authenticated routes)

**Source:** `apps/web/server/services/authService.ts` (exports `authMiddleware`)
**Apply to:** `push.ts`, `keywordWatch.ts`, `notifications.ts`

```typescript
import { authMiddleware } from '../services/authService';

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  // ...
});
```

`AuthRequest` type interface (copied verbatim in `bookmarks.ts:7-9`, `auth.ts:9-11`):
```typescript
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}
```

### Zod validation + OpenAPI schema (all new public-API routes)

**Source:** `apps/web/server/openapi/schemas.ts:1-45` (existing `extendZodWithOpenApi` setup)
**Apply to:** push subscribe/unsubscribe, keyword-watch CRUD, notification preferences

```typescript
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const PushSubscribeSchema = z.object({
  platform: z.enum(['ios', 'android']).openapi({ description: 'Native platform' }),
  token: z.string().min(1).max(4096).openapi({ example: 'fcm_token_abc123...' }),
}).openapi('PushSubscribe');
```

Then in route file:
```typescript
const result = PushSubscribeSchema.safeParse(req.body);
if (!result.success) {
  res.status(400).json({ success: false, error: formatZodError(result.error) });
  return;
}
```

**MUST:** run `pnpm openapi:generate` after adding schemas (CLAUDE.md §"Public API & OpenAPI").

### Error handling (services + routes)

**Source:** project-wide convention; representative excerpt from `bookmarks.ts:40-45`:
```typescript
} catch (err) {
  res.status(500).json({
    success: false,
    error: err instanceof Error ? err.message : 'Failed to create bookmark',
  });
}
```

For services: `try { ... } catch (err) { logger.error('service:operation_name', err); throw err; }` (per `cleanupService.ts:93-97`).

### Response envelope

**Source:** project-wide. All routes return:
```typescript
{ success: true, data: <payload> }
// or
{ success: false, error: <string>, /* optional: upgradeUrl, retryAfter, limit */ }
```

### Singleton service initialization

**Source:** `subscriptionService.ts:30-53`, `cleanupService.ts:20-34`, `cacheService.ts:36-52`

```typescript
export class FooService {
  private static instance: FooService;
  private constructor() { /* env-validated init */ }
  static getInstance(): FooService {
    if (!FooService.instance) {
      FooService.instance = new FooService();
    }
    return FooService.instance;
  }
}
```

### Reader-app platform branch (D-08 / D-09 single seam)

**Source:** to be created at `apps/web/src/lib/platform.ts` (RESEARCH Pattern 1)
**Apply to:** `UpgradePrompt`, `TierCard`, `AIUsageCounter`, `InstallPromptBanner`, the AI-429 toast handler in the SPA fetch layer

```typescript
// import once
import { isNativeApp } from '../../lib/platform';

// branch shape — early return BEFORE any pricing surface or external link
if (isNativeApp()) {
  return (
    <div>
      <p>{t('upgrade.notAvailableOnPlan')}</p>
      <p className="text-gray-400">
        {t('upgrade.visitWebsiteHint', { domain: 'newshub.example' })}
      </p>
      {/* NOTE: 'newshub.example' is plain TEXT — no <a href>, no clickable link.
          Apple Rule 3.1.1(a). RESEARCH Pitfall 7. */}
    </div>
  );
}
```

### i18n (DE/EN/FR locked per Phase 23)

**Apply to:** every new user-facing string in the components above. RESEARCH lines 78, 118 — ~6-10 new keys per locale: push permission rationale, biometric prompts, D-09 "feature not available", offline banner.

Translation files: `apps/web/src/i18n/locales/{de,en,fr}/`.

### GDPR cleanup (90-day retention)

**Source:** `cleanupService.ts:188-202` (`deleteExpiredAnalytics`)
**Apply to:** new `deleteStalePushSubscriptions()` method — prune `pushSubscription` rows where `lastSeenAt > 90 days`.

### Z-index ladder (CLAUDE.md §"Z-index ladder")

**Apply to:** `OfflineBanner` (z-30 per RESEARCH OQ-1), Capacitor splash (outside CSS — native overlay).

| Layer | z-index |
|---|---|
| scan-line CSS effect | `z-0` |
| Header | `z-20` |
| **OfflineBanner / InstallPromptBanner** | **`z-30`** |
| AuthModal / Compare modal | `z-50` |
| FocusOnboarding | `z-[90]` |
| ConsentBanner | `z-[100]` |

---

## No Analog Found

| File | Role | Data Flow | Reason | Planner falls back to |
|---|---|---|---|---|
| `apps/mobile/capacitor.config.ts` | config | n/a | No Capacitor project exists yet | RESEARCH "Code Examples" lines 600-637 (concrete config) |
| `apps/web/src/hooks/useBiometricAuth.ts` | hook | request-response | No biometric/keychain pattern exists in the SPA | RESEARCH Pattern 2 lines 391-426 (concrete code) — note: more lib/ shape than hook/ shape |
| `apps/mobile/ios/`, `apps/mobile/android/` native projects | native | n/a | Generated by `cap add ios` / `cap add android`; no hand-authored analog | Capacitor CLI output |

---

## Metadata

**Analog search scope:**
- `apps/web/server/services/` (53 files scanned)
- `apps/web/server/routes/` (26 files scanned)
- `apps/web/server/middleware/` (15 files scanned)
- `apps/web/server/openapi/` (1 file scanned)
- `apps/web/src/hooks/` (26 files scanned)
- `apps/web/src/components/` and `apps/web/src/components/settings/` and `apps/web/src/components/subscription/`
- `apps/web/src/lib/` (11 files scanned)
- `apps/web/src/contexts/` (`AuthContext.tsx` only)
- `apps/web/src/pages/Settings.tsx`
- `apps/web/prisma/schema.prisma`
- `.github/workflows/` (2 files scanned)

**Files read (full or targeted ranges):**
- `subscriptionService.ts` (lines 1-120)
- `cleanupService.ts` (full)
- `cacheService.ts` (lines 1-120)
- `newsAggregator.ts` (lines 1-80, 270-320)
- `bookmarks.ts` (full)
- `auth.ts` (lines 1-120)
- `rateLimiter.ts` (lines 1-200)
- `useBackendStatus.ts` (full)
- `useServiceWorker.ts` (full)
- `useInstallPrompt.ts` (full)
- `useHapticFeedback.ts` (full)
- `OfflineBanner.tsx` (full)
- `InstallPromptBanner.tsx` (full)
- `ConnectedAccounts.tsx` (full)
- `UpgradePrompt.tsx` (full)
- `TierCard.tsx` (full)
- `AIUsageCounter.tsx` (full)
- `AuthContext.tsx` (lines 1-120)
- `utils.ts` (full)
- `Settings.tsx` (full — 909 lines)
- `schema.prisma` (lines 1-100, grep-located 144-235 for User/Bookmark/EmailSubscription/EmailDigest/UserPersona)
- `openapi/schemas.ts` (lines 1-80)
- `.github/workflows/ci.yml` (lines 1-300)
- `.github/workflows/load-test.yml` (full)

**Pattern extraction date:** 2026-04-29

---

## PATTERN MAPPING COMPLETE

**Phase:** 39 - mobile-apps
**Files classified:** 27
**Analogs found:** 25 / 27

### Coverage
- Files with exact analog: 14
- Files with role-match analog: 6
- Files with composite analog (multiple sources): 5
- Files with no analog (greenfield Capacitor/biometric): 2

### Key Patterns Identified
- **All backend services follow the singleton `getInstance()` triad with env-gated graceful-degradation init** (subscriptionService.ts is the canonical analog for `pushService`).
- **All authenticated routes use `authMiddleware` + Zod `safeParse` + `formatZodError` + `{success, data|error}` envelope** (auth.ts + bookmarks.ts compose the analog for push/keyword/notification routes).
- **Tier-aware rate limiting uses an IIFE module-level `rateLimit` with Redis store + `skip` reading cached `subscriptionTier`** (`aiTierLimiter` is the exact template for `pushVolumeLimiter` — but planner should adapt to a `canSend(userId): Promise<boolean>` helper since fanout is server-internal, not HTTP).
- **Per-user tables follow `id cuid + userId Cascade-FK + @@unique([userId, X]) + @@index([userId])`** (Bookmark is the exact analog for PushSubscription, KeywordWatch).
- **Reader-app gating uses a single `isNativeApp()` seam imported from `apps/web/src/lib/platform.ts`** — every pricing surface branches on it. The 429 handler in `aiTierLimiter` itself does NOT branch (backend stays platform-agnostic per CLAUDE.md responsibility map); the SPA's 429 consumer does.
- **Settings sections all follow the `<div className="rounded-lg border border-gray-700 bg-gray-800 p-4">` outer + `<h2>` cyan-icon-header + Toast/ConfirmDialog inner pattern** (ConnectedAccounts.tsx is the only existing settings/* analog; NotificationsSection mirrors it exactly).
- **CI workflows for mobile mimic load-test.yml's manual-trigger + secrets + 30-day artifact retention shape, NOT ci.yml's matrix-style required-checks shape** — keeps mobile builds off the master-branch protection list.
- **The fanout hook point is `workerEmitter.ts` (consumer of `newsAggregator.ts:287-292`'s emits)** — Phase 39 subscribes there, does NOT add a new emit point in `newsAggregator.ts`.

### File Created
`D:\NewsHub\.planning\phases\39-mobile-apps\39-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns by file path + line numbers in PLAN.md files.
