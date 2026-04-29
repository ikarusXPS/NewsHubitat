# Architecture Patterns: v1.6 Infrastructure & Scale Integration

**Project:** NewsHub
**Researched:** 2026-04-26
**Confidence:** MEDIUM

## Executive Summary

This document analyzes how v1.6 features (Docker Swarm scaling, Advanced AI services, React Native mobile, Subscription billing, Developer API, Video/podcast pipeline) integrate with NewsHub's existing layered monolith architecture (React SPA + Express REST API + PostgreSQL/Redis).

**Key Architecture Decision:** Start with **monorepo structure** for code sharing between web/mobile, deploy **Docker Swarm replicas** for horizontal scaling, introduce **API gateway layer** for developer API, add **microservice option** for heavy AI/media processing while maintaining core monolith.

**Recommended Build Order (dependency-aware):**
1. Monorepo setup → Code sharing foundation
2. API Gateway + Rate limiting → Developer API + tiered access
3. Subscription schema + Stripe webhooks → Monetization foundation
4. Docker Swarm deployment → Horizontal scaling
5. AI credibility service → Enhanced analysis
6. React Native app + Capacitor wrapper → Mobile apps
7. Media pipeline service → Video/podcast content

## Integration Points by Feature Area

### 1. Docker Swarm Horizontal Scaling

#### Existing Architecture Integration
**Current state:** Docker Compose with single app container (3001), PostgreSQL (5433), Redis (6379), Prometheus (9090), Grafana (3000), Alertmanager (9093)

**Integration approach:**
- Convert `docker-compose.yml` to **Docker Stack** format (Swarm-compatible)
- Add `deploy.replicas` to app service for horizontal scaling
- Implement **built-in load balancing** via Swarm routing mesh
- **No code changes required** — Express app is stateless (sessions in Redis)

**New Components:**
```yaml
# docker-stack.yml
services:
  app:
    deploy:
      replicas: 3                    # Horizontal scaling
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        max_attempts: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    # ... existing config
```

**Modified Components:**
- `server/index.ts` — Add graceful shutdown for rolling updates
- `docker-compose.yml` → `docker-stack.yml` — Swarm deploy configuration
- Health checks — Already implemented (`/health`, `/health/db`, `/health/redis`)

**Data Flow Changes:**
- Swarm **ingress routing mesh** distributes requests to healthy replicas
- Redis handles shared state (rate limits, JWT blacklist, cache)
- PostgreSQL connection pooling (already configured via Prisma)

**Sources:**
- [Docker Swarm horizontal scaling guide](https://betterstack.com/community/guides/scaling-docker/horizontally-scaling-swarm/)
- [Swarm mode key concepts](https://docs.docker.com/engine/swarm/key-concepts/)

---

### 2. AI Credibility/Bias/Fact-Check Services

#### Existing Architecture Integration
**Current state:** Singleton `AIService` with multi-provider fallback (OpenRouter → Gemini → Anthropic), Redis cache for responses

**Integration approach:**
- Extend `AIService` with **new analysis methods** (credibilityScore, biasDetection, factCheck)
- Reuse existing multi-provider pattern for reliability
- Add **signal-based scoring architecture** (aggregate granular signals → final score)
- Cache results in Redis with 24h TTL (analysis rarely changes)

**New Components:**
```typescript
// server/services/credibilityService.ts
interface CredibilitySignals {
  factuality: number;           // Claim verification (0-1)
  sourceReliability: number;    // From NewsSource.reliability
  biasScore: number;            // Political bias detection (-1 to +1)
  persuasionTechniques: string[]; // Detected propaganda patterns
  logicalFallacies: string[];   // Reasoning errors
  sentiment: number;            // From existing sentiment analysis
}

interface CredibilityScore {
  overall: number;              // Aggregated score (0-100)
  signals: CredibilitySignals;
  confidence: number;           // Model confidence (0-1)
  explanation: string;          // Human-readable reasoning
}

class CredibilityService {
  async scoreArticle(article: NewsArticle): Promise<CredibilityScore>
  async detectBias(article: NewsArticle): Promise<BiasAnalysis>
  async factCheck(claim: string, context: string[]): Promise<FactCheckResult>
}
```

**Modified Components:**
- `server/services/aiService.ts` — Add credibility/bias prompts to existing provider methods
- `prisma/schema.prisma` — Add `NewsArticle.credibilityScore`, `NewsArticle.biasScore`, `NewsArticle.factCheckStatus`
- `server/routes/analysis.ts` — New endpoints `/api/analysis/credibility/:id`, `/api/analysis/bias/:id`
- Frontend components — Add credibility badges to `SignalCard.tsx`

**Data Flow Changes:**
1. Article ingestion → sentiment analysis → **credibility scoring** → database
2. User requests article → fetch from DB with credibility data → render badge
3. Background job — recalculate credibility for articles > 7 days old (scores drift)

**Architecture Pattern:**
**Two-step credibility assessment** (research-backed):
1. Detect granular signals (factuality, bias, fallacies, persuasion)
2. Aggregate signals via weighted formula → single score

**Cache Strategy:**
```typescript
// Redis key: "credibility:{articleId}:{version}"
// TTL: 24 hours (analysis stable within a day)
// Version bump: when credibility algorithm updates
```

**Sources:**
- [Survey on Automatic Credibility Assessment](https://arxiv.org/html/2410.21360v1)
- [Cognitive Biases in Fact-Checking](https://www.sciencedirect.com/science/article/pii/S0306457324000323)

---

### 3. React Native + Capacitor Code Sharing

#### Existing Architecture Integration
**Current state:** Monolithic React SPA (Vite 8) in `src/`, no mobile app

**Integration approach:**
- Convert to **pnpm workspaces monorepo** (most stable 2026 stack)
- Extract platform-agnostic code to shared packages
- Use **Capacitor** for wrapping web app (highest code reuse ~95%)
- Use **React Native** only if native UI needed (lower code reuse ~60%)

**Monorepo Structure:**
```
NewsHub/
├── apps/
│   ├── web/              # Existing Vite app (moved from root)
│   ├── mobile-rn/        # React Native app (if native UI needed)
│   └── mobile-capacitor/ # Capacitor wrapper (web → native)
├── packages/
│   ├── shared-types/     # TypeScript types (NewsArticle, etc.)
│   ├── shared-utils/     # Date formatting, validation, etc.
│   ├── shared-api/       # TanStack Query hooks, API client
│   ├── shared-state/     # Zustand store (platform-agnostic)
│   └── ui-components/    # Platform-agnostic React components
├── server/               # Express API (unchanged)
└── pnpm-workspace.yaml
```

**New Components:**
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'server'
```

```json
// packages/shared-api/package.json
{
  "name": "@newshub/shared-api",
  "exports": {
    "./client": "./src/apiClient.ts",
    "./hooks": "./src/hooks/index.ts"
  }
}
```

**Modified Components:**
- `src/` → `apps/web/src/` — Move existing web app
- `src/types/` → `packages/shared-types/` — Extract types
- `src/lib/api.ts` → `packages/shared-api/` — Extract API client
- `src/store/` → `packages/shared-state/` — Extract Zustand store
- Root `package.json` → workspace root (scripts orchestration)

**Code Sharing Strategy:**

| Layer | Web | Capacitor | React Native | Location |
|-------|-----|-----------|--------------|----------|
| Business Logic | ✓ | ✓ | ✓ | `packages/shared-api/` |
| State Management | ✓ | ✓ | ✓ | `packages/shared-state/` |
| API Client | ✓ | ✓ | ✓ | `packages/shared-api/` |
| Types | ✓ | ✓ | ✓ | `packages/shared-types/` |
| UI Components | ✓ | ✓ | ⚠ Rewrite | `packages/ui-components/` or platform-specific |
| Navigation | ⚠ Platform-specific | ⚠ Platform-specific | ⚠ Platform-specific | Per-app |

**Capacitor vs React Native Decision:**
- **Capacitor:** 95% code reuse, reuse existing web components, faster development
- **React Native:** 60% code reuse, native UI/UX, requires UI rewrite

**Recommendation:** Start with **Capacitor wrapper** (fast MVP), add React Native later if native UI feedback demands it.

**Data Flow Changes:**
- Mobile apps → same REST API endpoints → no backend changes
- Shared `@newshub/shared-api` client → consistent API calls
- Platform-specific wrappers for Camera, Notifications, etc.

**Sources:**
- [Capacitor vs React Native 2025](https://nextnative.dev/comparisons/capacitor-vs-react-native)
- [TypeScript Monorepo Best Practice 2026](https://hsb.horse/en/blog/typescript-monorepo-best-practice-2026/)
- [pnpm workspaces + Turborepo 2026](https://medium.com/@mernstackdevbykevin/monorepos-with-typescript-93c9233f6df8)

---

### 4. Subscription/Billing System

#### Existing Architecture Integration
**Current state:** No billing, all users free, PostgreSQL User model with preferences

**Integration approach:**
- Add **Stripe subscription schema** to Prisma
- Implement **webhook handler** for subscription events (idempotent)
- Middleware checks subscription tier before protected endpoints
- Stripe Node.js SDK for checkout, portal, webhooks

**New Components:**
```prisma
// prisma/schema.prisma
enum SubscriptionTier {
  FREE
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  TRIALING
  PAST_DUE
  CANCELED
  INCOMPLETE
}

model Subscription {
  id                String             @id @default(cuid())
  userId            String             @unique
  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  tier              SubscriptionTier   @default(FREE)
  status            SubscriptionStatus @default(ACTIVE)

  stripeCustomerId      String?        @unique
  stripeSubscriptionId  String?        @unique
  stripePriceId         String?

  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean        @default(false)

  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  @@index([tier, status])
}

model StripeEvent {
  id            String   @id  // Stripe event ID
  type          String
  processed     Boolean  @default(false)
  data          Json
  createdAt     DateTime @default(now())

  @@index([type, processed])
}
```

```typescript
// server/routes/billing.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST /api/billing/checkout
// Create Stripe Checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    customer: subscription.stripeCustomerId,
    line_items: [{ price: PRICE_IDS.PRO, quantity: 1 }],
    mode: 'subscription',
    success_url: `${FRONTEND_URL}/settings/billing?success=true`,
    cancel_url: `${FRONTEND_URL}/settings/billing?canceled=true`,
  });
  res.json({ url: session.url });
});

// POST /api/webhooks/stripe
// Stripe webhook handler (IDEMPOTENT)
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);

  // Idempotency check
  const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing?.processed) {
    return res.json({ received: true }); // Already processed
  }

  // Queue event for async processing
  await eventQueue.add({ eventId: event.id, type: event.type, data: event.data });

  // Mark as received
  await prisma.stripeEvent.create({
    data: { id: event.id, type: event.type, data: event.data }
  });

  res.json({ received: true }); // Return 200 within 20 seconds
});
```

```typescript
// server/middleware/subscriptionGuard.ts
export function requireTier(minTier: SubscriptionTier) {
  return async (req, res, next) => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id }
    });

    if (!subscription || TIER_ORDER[subscription.tier] < TIER_ORDER[minTier]) {
      return res.status(403).json({ error: 'Upgrade required' });
    }

    next();
  };
}

// Usage:
// router.get('/api/analysis/credibility/:id', requireAuth, requireTier('PRO'), ...)
```

**Modified Components:**
- `prisma/schema.prisma` — Add Subscription, StripeEvent models
- `server/routes/` — Add `billing.ts` for checkout, portal, webhooks
- `server/middleware/` — Add `subscriptionGuard.ts` for tier checks
- Frontend — Add `BillingSettings.tsx`, Stripe Elements for checkout

**Data Flow Changes:**
1. User clicks "Upgrade" → POST `/api/billing/checkout` → Stripe Checkout
2. User completes payment → Stripe sends webhook → `/api/webhooks/stripe`
3. Webhook handler → verify signature → queue event → update `Subscription` model
4. Protected endpoint → `requireTier('PRO')` → check DB → allow/deny

**Webhook Event Handling:**
```typescript
// Critical events to handle
const SUBSCRIPTION_EVENTS = [
  'checkout.session.completed',   // Initial subscription
  'invoice.paid',                  // Recurring payment (use this as primary)
  'invoice.payment_failed',        // Payment failure
  'customer.subscription.updated', // Plan change
  'customer.subscription.deleted', // Cancellation
];
```

**Idempotency Pattern:**
- Store `event.id` in `StripeEvent` table
- Check existence before processing
- Return 200 immediately after deduplication
- Process event in background queue (async)

**Sources:**
- [Using webhooks with subscriptions (Stripe)](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Perfect Prisma Schema for SaaS 2026](https://dev.to/huangyongshan46a11y/the-perfect-prisma-schema-for-a-saas-app-nextjs-16-postgresql-5b28)
- [Stripe webhook best practices](https://www.magicbell.com/blog/stripe-webhooks-guide)

---

### 5. Rate-Limited Developer API

#### Existing Architecture Integration
**Current state:** `express-rate-limit` with Redis store, 3 tiers (auth 5/min, AI 10/min, news 100/min)

**Integration approach:**
- Add **API Gateway layer** (Express middleware) before existing routes
- Tiered rate limiting based on API key → subscription tier mapping
- Reuse existing Redis rate limit store
- Add API key management (generate, revoke, rotate)

**New Components:**
```prisma
// prisma/schema.prisma
model ApiKey {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  key           String   @unique  // SHA-256 hash of actual key
  name          String             // User-friendly label
  lastUsedAt    DateTime?

  tier          SubscriptionTier   // Inherited from subscription
  customLimits  Json?              // Optional per-key overrides

  createdAt     DateTime @default(now())
  revokedAt     DateTime?

  @@index([userId])
  @@index([key, revokedAt])
}

model ApiUsage {
  id            String   @id @default(cuid())
  apiKeyId      String
  endpoint      String
  timestamp     DateTime @default(now())
  statusCode    Int
  responseTime  Int      // milliseconds

  @@index([apiKeyId, timestamp])
  @@index([timestamp])  // For cleanup job
}
```

```typescript
// server/middleware/apiGateway.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const TIER_LIMITS = {
  FREE:       { windowMs: 60_000, max: 10 },    // 10/min
  PRO:        { windowMs: 60_000, max: 100 },   // 100/min
  ENTERPRISE: { windowMs: 60_000, max: 1000 },  // 1000/min
};

export async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const keyHash = hashString(apiKey);
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { key: keyHash, revokedAt: null },
    include: { user: { include: { subscription: true } } }
  });

  if (!apiKeyRecord) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  // Attach tier to request for rate limiter
  req.apiKey = apiKeyRecord;
  req.tier = apiKeyRecord.tier;

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() }
  });

  next();
}

export function createTieredLimiter() {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:api:',
    }),
    keyGenerator: (req) => `${req.apiKey.id}:${req.tier}`,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        tier: req.tier,
        limit: TIER_LIMITS[req.tier].max,
        resetAt: new Date(Date.now() + TIER_LIMITS[req.tier].windowMs),
      });
    },
    skip: (req) => !req.apiKey, // Skip if no API key (handled by apiKeyAuth)
    windowMs: (req) => TIER_LIMITS[req.tier].windowMs,
    max: (req) => TIER_LIMITS[req.tier].max,
  });
}

// Usage:
// app.use('/api/v1', apiKeyAuth, createTieredLimiter(), apiRoutes);
```

**Modified Components:**
- `server/routes/` — Prefix existing routes with `/api/v1/` for versioning
- `server/middleware/rateLimiter.ts` — Extract tiered logic, reuse in API gateway
- `server/index.ts` — Mount API gateway middleware before `/api/v1` routes
- Frontend — Add API key management UI in settings

**Data Flow Changes:**
1. Developer request → `X-API-Key` header → `apiKeyAuth` middleware
2. Lookup API key → get tier → attach to `req.tier`
3. Rate limiter → check Redis → `rl:api:{keyId}:{tier}` → allow/deny
4. Request proceeds to existing routes (no changes to business logic)
5. Log usage → `ApiUsage` table (async, non-blocking)

**API Gateway Architecture:**
```
Client Request
  ↓
[API Gateway Middleware]
  ├─ apiKeyAuth          (validate key, attach tier)
  ├─ createTieredLimiter (Redis rate limit by tier)
  ├─ usageLogger         (log to ApiUsage table)
  └─ errorHandler        (standardized API errors)
  ↓
[Existing Express Routes]
  └─ /api/v1/news, /api/v1/analysis, etc.
```

**Two-Level Rate Limiting:**
1. **Global limit** (protect infrastructure): 10,000 req/min across all API keys
2. **Per-tier limit** (enforce SLA): FREE 10/min, PRO 100/min, ENTERPRISE 1000/min

**Sources:**
- [Express API Gateway Rate Limiting 2026](https://oneuptime.com/blog/post/2026-02-02-express-rate-limiting/view)
- [Building API Gateway in Node.js Part III](https://medium.com/@dmytro.misik/building-api-gateway-in-node-js-part-iii-rate-limiting-5d94f3f498ec)

---

### 6. Video/Podcast Content Pipeline

#### Existing Architecture Integration
**Current state:** RSS/HTML scraping for text articles, Puppeteer stealth scraper for paywalls

**Integration approach:**
- Add **media ingestion service** (separate from article scraper)
- Use **external transcoding service** (Cloudinary Video or AWS MediaConvert)
- Store video metadata in PostgreSQL, video files in CDN
- **Optional:** Extract to separate microservice if processing is CPU-heavy

**New Components:**
```prisma
// prisma/schema.prisma
enum MediaType {
  VIDEO
  PODCAST
  AUDIO
}

enum TranscodingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model MediaContent {
  id              String            @id @default(cuid())
  type            MediaType
  title           String
  description     String?

  // Source
  sourceUrl       String            @unique
  sourceId        String            // NewsSource reference
  source          NewsSource        @relation(fields: [sourceId], references: [id])

  // Metadata
  duration        Int?              // seconds
  thumbnailUrl    String?
  publishedAt     DateTime

  // Transcoding
  originalFileUrl String?
  transcodedUrls  Json?             // { "1080p": "url", "720p": "url", "480p": "url" }
  transcodingStatus TranscodingStatus @default(PENDING)

  // Transcript
  transcript      String?           // AI-generated transcript
  summary         String?           // AI summary

  // Analytics
  perspective     String
  sentiment       String?
  topics          Json?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([type, publishedAt])
  @@index([sourceId])
  @@index([transcodingStatus])
}
```

```typescript
// server/services/mediaIngestionService.ts
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';

export class MediaIngestionService {
  private static instance: MediaIngestionService;

  async ingestYouTubeVideo(videoUrl: string): Promise<MediaContent> {
    // 1. Extract video metadata (YouTube API or yt-dlp)
    const metadata = await this.extractMetadata(videoUrl);

    // 2. Create database record
    const media = await prisma.mediaContent.create({
      data: {
        type: 'VIDEO',
        sourceUrl: videoUrl,
        title: metadata.title,
        description: metadata.description,
        duration: metadata.duration,
        thumbnailUrl: metadata.thumbnail,
        publishedAt: metadata.publishedAt,
        sourceId: metadata.sourceId,
        transcodingStatus: 'PENDING',
      }
    });

    // 3. Queue transcoding job (async)
    await this.queueTranscoding(media.id, videoUrl);

    return media;
  }

  async queueTranscoding(mediaId: string, sourceUrl: string): Promise<void> {
    // Option 1: Cloudinary Video upload + transformation
    const result = await cloudinary.uploader.upload(sourceUrl, {
      resource_type: 'video',
      eager: [
        { width: 1920, height: 1080, crop: 'limit', format: 'mp4' },
        { width: 1280, height: 720, crop: 'limit', format: 'mp4' },
        { width: 854, height: 480, crop: 'limit', format: 'mp4' },
      ],
      eager_async: true, // Process in background
      notification_url: `${API_URL}/webhooks/cloudinary`, // Callback when done
    });

    // Update database with transcoding job ID
    await prisma.mediaContent.update({
      where: { id: mediaId },
      data: {
        transcodingStatus: 'PROCESSING',
        originalFileUrl: result.secure_url,
      }
    });
  }

  async generateTranscript(mediaId: string): Promise<void> {
    // Use Whisper API (OpenAI) or Gemini for audio transcription
    const media = await prisma.mediaContent.findUnique({ where: { id: mediaId } });

    const audioUrl = media.transcodedUrls['audio_only']; // Extract audio track
    const transcript = await this.transcribeAudio(audioUrl);

    await prisma.mediaContent.update({
      where: { id: mediaId },
      data: { transcript }
    });
  }

  async summarizeTranscript(mediaId: string): Promise<void> {
    // Reuse AIService for summarization
    const media = await prisma.mediaContent.findUnique({ where: { id: mediaId } });
    const summary = await aiService.summarize(media.transcript);

    await prisma.mediaContent.update({
      where: { id: mediaId },
      data: { summary }
    });
  }
}
```

**Modified Components:**
- `server/config/sources.ts` — Add video/podcast RSS feeds
- `server/services/newsAggregator.ts` — Call `mediaIngestionService` for media links
- Frontend — Add `VideoPlayer.tsx`, `PodcastPlayer.tsx` components
- `src/pages/Dashboard.tsx` — Add media content section

**Data Flow (Video Ingestion Pipeline):**
```
1. RSS Feed → Detect video link
   ↓
2. MediaIngestionService.ingestYouTubeVideo()
   ↓
3. Extract metadata → Create MediaContent record (PENDING)
   ↓
4. Queue transcoding job → Cloudinary/MediaConvert
   ↓
5. Transcoding service → Process video → Webhook callback
   ↓
6. Update MediaContent (COMPLETED) → Store transcoded URLs
   ↓
7. Background: Generate transcript (Whisper) → Summarize (AI)
   ↓
8. Frontend: Fetch `/api/media?type=VIDEO` → Render VideoPlayer
```

**Microservice Consideration:**
If video processing becomes CPU/memory-heavy:
- Extract to separate **Media Processing Service** (Node.js worker)
- Communicate via **message queue** (Redis Pub/Sub or RabbitMQ)
- Main app → publish job → worker processes → webhook callback

**Sources:**
- [Video transcoding for streaming platforms](https://www.linkedin.com/pulse/high-level-design-video-transcoding-streaming-platforms-debaraj-rout-nguhf)
- [Trace audio/podcast processing pipelines](https://oneuptime.com/blog/post/2026-02-06-trace-audio-podcast-processing-pipelines-opentelemetry/view)
- [4K video podcasting 2026](https://www.podcastvideos.com/articles/switching-to-4k-video-podcasts-2026/)

---

## New vs Modified Components Summary

### New Components (Build from scratch)

| Component | Purpose | Location | Dependencies |
|-----------|---------|----------|--------------|
| `docker-stack.yml` | Swarm deployment config | Root | Docker Swarm mode |
| `CredibilityService` | AI credibility/bias/fact-check | `server/services/` | AIService, Redis |
| `MediaIngestionService` | Video/podcast pipeline | `server/services/` | Cloudinary, Whisper API |
| `ApiKey` model | API key management | `prisma/schema.prisma` | Subscription model |
| `Subscription` model | Stripe billing | `prisma/schema.prisma` | User model |
| `MediaContent` model | Video/podcast metadata | `prisma/schema.prisma` | NewsSource model |
| `packages/shared-*` | Monorepo shared code | `packages/` | pnpm workspaces |
| `apps/mobile-capacitor/` | Capacitor wrapper | `apps/` | Shared packages |
| `server/middleware/apiGateway.ts` | API key auth + tiered rate limit | `server/middleware/` | Redis, express-rate-limit |
| `server/routes/billing.ts` | Stripe checkout + webhooks | `server/routes/` | Stripe SDK |

### Modified Components (Extend existing)

| Component | Changes | Reason |
|-----------|---------|--------|
| `server/services/aiService.ts` | Add credibilityScore(), detectBias(), factCheck() | Extend AI capabilities |
| `prisma/schema.prisma` | Add Subscription, ApiKey, MediaContent models | New features require data models |
| `server/routes/analysis.ts` | Add `/credibility/:id`, `/bias/:id` endpoints | Expose new AI services |
| `src/types/index.ts` → `packages/shared-types/` | Extract to shared package | Code sharing for mobile |
| `src/store/` → `packages/shared-state/` | Extract to shared package | Code sharing for mobile |
| `docker-compose.yml` | Convert to docker-stack.yml with deploy config | Swarm compatibility |
| `server/index.ts` | Add graceful shutdown, mount API gateway | Swarm rolling updates, API versioning |
| `server/middleware/rateLimiter.ts` | Extract tiered logic for reuse | Shared between web + API gateway |

---

## Suggested Build Order (Dependency-Aware)

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Enable code sharing and API infrastructure

1. **Monorepo Setup**
   - Convert to pnpm workspaces
   - Extract shared packages (types, utils, api, state)
   - Verify web app still builds

   **Why first:** Required for all mobile work (Phase 6), foundational change

2. **API Gateway + Rate Limiting**
   - Add ApiKey model to Prisma
   - Implement `apiGateway.ts` middleware
   - Add `/api/v1` versioning
   - Create API key management UI

   **Why second:** Required for Developer API (monetization), reused in subscription tier checks

### Phase 2: Monetization (Weeks 3-4)
**Goal:** Enable revenue generation

3. **Subscription Schema + Stripe Integration**
   - Add Subscription model to Prisma
   - Implement Stripe checkout flow
   - Add webhook handler (idempotent)
   - Create billing settings UI

   **Why third:** Monetization unlocks PRO features, gates advanced AI

4. **Subscription Tier Guards**
   - Implement `requireTier()` middleware
   - Gate credibility/bias features behind PRO tier
   - Add upgrade prompts in UI

   **Why fourth:** Enforces business model, depends on Subscription schema

### Phase 3: Infrastructure (Weeks 5-6)
**Goal:** Enable horizontal scaling

5. **Docker Swarm Deployment**
   - Convert `docker-compose.yml` to `docker-stack.yml`
   - Add graceful shutdown to Express app
   - Test rolling updates
   - Configure monitoring for replicas

   **Why fifth:** Can be done in parallel with AI work, no schema changes

### Phase 4: Advanced AI (Weeks 7-9)
**Goal:** Differentiate product with credibility features

6. **AI Credibility Service**
   - Extend AIService with credibility/bias methods
   - Add CredibilityService (signal aggregation)
   - Add credibility fields to NewsArticle model
   - Create background job for scoring
   - Add credibility badges to UI

   **Why sixth:** Depends on subscription tiers (PRO feature), needs API gateway for usage tracking

### Phase 5: Mobile (Weeks 10-12)
**Goal:** Ship mobile apps

7. **Capacitor Wrapper**
   - Create `apps/mobile-capacitor/` app
   - Configure Capacitor plugins (Camera, Push, etc.)
   - Build iOS/Android apps
   - Submit to app stores

   **Why seventh:** Depends on monorepo (Phase 1), reuses all shared packages

8. **React Native App (Optional)**
   - Create `apps/mobile-rn/` if needed
   - Rewrite UI layer with React Native components
   - Test platform-specific features

   **Why last:** Only if Capacitor UX feedback demands native UI

### Phase 6: Content Expansion (Weeks 13-15)
**Goal:** Add video/podcast content

9. **Media Pipeline Service**
   - Add MediaContent model to Prisma
   - Implement MediaIngestionService
   - Integrate Cloudinary for transcoding
   - Add Whisper for transcription
   - Create video/podcast player UI

   **Why last:** Independent feature, CPU-heavy (consider microservice extraction)

---

## Data Flow Changes Summary

### Request Flow (Before)
```
Client → Express App → Business Logic → PostgreSQL/Redis → Response
```

### Request Flow (After v1.6)
```
Client (Web/Mobile/API)
  ↓
API Gateway (if /api/v1)
  ├─ API Key Auth
  ├─ Tiered Rate Limit
  └─ Usage Logging
  ↓
Swarm Load Balancer (routing mesh)
  ↓
Express App Replica (1 of N)
  ├─ Subscription Tier Guard (if protected endpoint)
  └─ Business Logic
  ↓
Services Layer
  ├─ AIService (+ Credibility/Bias)
  ├─ MediaIngestionService (video/podcast)
  └─ TranslationService (existing)
  ↓
Data Layer
  ├─ PostgreSQL (Prisma) — NewsArticle, Subscription, ApiKey, MediaContent
  └─ Redis — Rate limits, JWT blacklist, AI cache
  ↓
External Services
  ├─ Stripe (webhooks for subscriptions)
  ├─ Cloudinary (video transcoding)
  ├─ OpenAI/Gemini (AI analysis, Whisper transcription)
  └─ CDN (transcoded video files)
```

---

## Architecture Decision Records (ADRs)

### ADR-1: Monorepo with pnpm Workspaces
**Decision:** Use pnpm workspaces over Nx or Turborepo
**Rationale:** Most stable 2026 stack, zero config needed, compatible with existing tooling
**Tradeoff:** No built-in task orchestration (add Turborepo later if needed)

### ADR-2: Capacitor First, React Native Optional
**Decision:** Start with Capacitor wrapper, add React Native only if UX demands it
**Rationale:** 95% code reuse vs 60%, faster MVP, reuses existing web components
**Tradeoff:** Less "native feel" than React Native

### ADR-3: Monolith + Optional Microservices
**Decision:** Keep core as monolith, extract media processing if CPU-heavy
**Rationale:** Avoid premature microservices complexity, extract only when necessary
**Tradeoff:** Media processing may slow API if kept in monolith

### ADR-4: Stripe for Billing
**Decision:** Use Stripe Subscriptions over custom billing
**Rationale:** Battle-tested, PCI compliant, webhook infrastructure included
**Tradeoff:** 2.9% + 30¢ per transaction

### ADR-5: Redis for Rate Limiting
**Decision:** Continue using Redis for rate limits (not in-memory)
**Rationale:** Works across Swarm replicas, already deployed
**Tradeoff:** Redis dependency (but already required for cache)

### ADR-6: Cloudinary for Video Transcoding
**Decision:** Use Cloudinary over self-hosted FFmpeg
**Rationale:** No infrastructure to manage, CDN included, webhook callbacks
**Tradeoff:** Cost scales with video volume (consider AWS MediaConvert at scale)

---

## Open Questions & Risks

### Open Questions
1. **Swarm vs Kubernetes?** — Swarm is simpler, but K8s has better autoscaling. Validate load patterns first.
2. **Monorepo migration strategy?** — Big-bang migration or gradual extraction? (Recommend gradual)
3. **Video storage costs?** — How many hours/month? Affects Cloudinary vs self-hosted decision.
4. **AI credibility accuracy?** — Needs validation dataset. Consider human review for first 100 articles.
5. **Mobile push notifications?** — Requires FCM/APNs integration, not in scope?

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Swarm rolling updates fail | HIGH | Test in staging, add health checks, set `update_config.failure_action: rollback` |
| Stripe webhook idempotency bugs | HIGH | Add `StripeEvent` deduplication table, test with Stripe CLI |
| Video transcoding costs exceed budget | MEDIUM | Set monthly cap in Cloudinary, alert at 80% usage |
| Mobile app store rejection | MEDIUM | Follow Apple/Google guidelines, have fallback web app |
| AI credibility model bias | HIGH | Validate with diverse dataset, add human review layer |
| Monorepo migration breaks build | MEDIUM | Create feature branch, test thoroughly, gradual rollout |

---

## Performance Considerations

### Docker Swarm Scaling
- **Latency:** Routing mesh adds ~1ms per hop (negligible)
- **Throughput:** Horizontal scaling → linear capacity increase (10k → 30k users with 3 replicas)
- **Bottleneck:** PostgreSQL connection pool (already configured, 20 connections max)

### AI Credibility Analysis
- **Latency:** +500-2000ms per article (add background job, not request-path)
- **Cache:** Redis cache with 24h TTL (analysis stable)
- **Throughput:** Batch processing 10 articles/min (acceptable for background job)

### Video Transcoding
- **Latency:** 5-10 minutes for 10-minute video (async, webhook callback)
- **Storage:** 1GB raw video → 300MB transcoded (3:1 compression)
- **Cost:** ~$0.05 per video (Cloudinary pricing)

### Monorepo Build Times
- **Initial build:** +30s for shared packages
- **Incremental:** No change (TypeScript project references)
- **CI:** Cache shared packages, parallel builds

---

## Monitoring & Observability

### New Metrics to Track

**Infrastructure (Prometheus):**
- `swarm_replicas_total` — Number of healthy replicas
- `swarm_service_update_duration` — Rolling update time
- `api_gateway_requests_total{tier}` — API usage by tier
- `stripe_webhook_latency` — Webhook processing time

**Business Metrics:**
- Subscription tier distribution (FREE/PRO/ENTERPRISE)
- API key creation/revocation rate
- Video transcoding success/failure rate
- AI credibility analysis coverage (% of articles scored)

**Alerting:**
- Stripe webhook processing > 10 seconds (risk timeout)
- API rate limit hit rate > 20% (tier may be too low)
- Video transcoding failure rate > 5%
- Swarm replica count < desired replicas

---

## Security Considerations

### API Key Security
- Store SHA-256 hashes, never plaintext keys
- Generate keys with `crypto.randomBytes(32)` (256-bit entropy)
- Allow key rotation (invalidate old, generate new)
- Log all API key usage for audit trail

### Stripe Webhook Security
- **Verify signature** on every webhook (`stripe.webhooks.constructEvent`)
- Use HTTPS-only webhook URLs
- Idempotency check (prevent replay attacks)
- Timeout protection (return 200 within 20s)

### Video Content Security
- Validate video URLs before ingestion (prevent SSRF)
- Scan uploaded videos for malware (ClamAV or VirusTotal API)
- Rate limit video uploads (prevent abuse)
- CDN signed URLs for premium content (prevent hotlinking)

### Swarm Security
- TLS encryption for swarm overlay network (enabled by default)
- Secrets management via Docker Secrets (not env vars)
- Node authorization tokens for worker joins
- Regular security updates (automated with Watchtower)

---

## Cost Estimates (Monthly)

### Infrastructure (Assuming 10k users, 3 Swarm replicas)
- **Compute:** 3 × $20 (DigitalOcean Droplets) = $60
- **PostgreSQL:** $15 (managed instance)
- **Redis:** $10 (managed instance)
- **Monitoring:** $0 (self-hosted Prometheus/Grafana)

### Third-Party Services
- **Stripe:** 2.9% + 30¢ per transaction (variable)
- **Cloudinary:** $99/month (50GB storage, 10 hours video)
- **OpenAI/Gemini:** $50/month (AI analysis, transcription)
- **Sentry:** $26/month (50k events)

**Total:** ~$260/month base cost (before revenue from subscriptions)

**Break-even:** 30 PRO users at $9/month ($270 revenue)

---

## Sources

### Docker Swarm Scaling
- [How to Scale Docker Swarm Horizontally in Production](https://betterstack.com/community/guides/scaling-docker/horizontally-scaling-swarm/)
- [Swarm mode key concepts | Docker Docs](https://docs.docker.com/engine/swarm/key-concepts/)
- [Scaling Applications with Docker Swarm](https://www.codingexplorations.com/blog/scaling-applications-with-docker-swarm-achieving-horizontally-scalable-and-highly-available-systems)

### React Native Code Sharing
- [Capacitor vs React Native: Complete Comparison 2025](https://nextnative.dev/comparisons/capacitor-vs-react-native)
- [Monorepos with TypeScript in 2026](https://medium.com/@mernstackdevbykevin/monorepos-with-typescript-93c9233f6df8)
- [TypeScript Monorepo Best Practice 2026](https://hsb.horse/en/blog/typescript-monorepo-best-practice-2026/)

### Stripe Subscription Billing
- [Using webhooks with subscriptions | Stripe Documentation](https://docs.stripe.com/billing/subscriptions/webhooks)
- [The Perfect Prisma Schema for a SaaS App (Next.js 16 + PostgreSQL)](https://dev.to/huangyongshan46a11y/the-perfect-prisma-schema-for-a-saas-app-nextjs-16-postgresql-5b28)
- [Stripe Webhooks: Complete Guide with Event Examples](https://www.magicbell.com/blog/stripe-webhooks-guide)

### API Gateway Rate Limiting
- [How to Add Rate Limiting to Express APIs](https://oneuptime.com/blog/post/2026-02-02-express-rate-limiting/view)
- [Building API Gateway in Node.js: Part III — Rate Limiting](https://medium.com/@dmytro.misik/building-api-gateway-in-node-js-part-iii-rate-limiting-5d94f3f498ec)
- [Node.js Rate Limiting: Complete Guide to API Protection](https://reintech.io/blog/nodejs-rate-limiting-protecting-apis-from-abuse)

### Video/Podcast Pipeline
- [High-Level Design of Video Transcoding for Streaming Platforms](https://www.linkedin.com/pulse/high-level-design-video-transcoding-streaming-platforms-debaraj-rout-nguhf)
- [How to Trace Audio and Podcast Processing Pipelines](https://oneuptime.com/blog/post/2026-02-06-trace-audio-podcast-processing-pipelines-opentelemetry/view)
- [The Strategic Transition to 4K Video Podcasting in 2026](https://www.podcastvideos.com/articles/switching-to-4k-video-podcasts-2026/)

### AI Credibility/Bias Detection
- [A Survey on Automatic Credibility Assessment](https://arxiv.org/html/2410.21360v1)
- [Cognitive Biases in Fact-Checking and Their Countermeasures](https://www.sciencedirect.com/science/article/pii/S0306457324000323)
- [Microservices Architecture for AI Applications 2025](https://medium.com/@meeran03/microservices-architecture-for-ai-applications-scalable-patterns-and-2025-trends-5ac273eac232)

---

**End of Architecture Integration Analysis**

**Next Steps:** Use this document to inform roadmap creation in `.planning/ROADMAP.md`. Prioritize phases based on build order and dependencies outlined above.
