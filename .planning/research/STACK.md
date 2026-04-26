# Technology Stack: v1.6 Infrastructure & Scale

**Project:** NewsHub
**Researched:** 2026-04-26
**Overall Confidence:** HIGH

## Executive Summary

This document outlines stack additions for v1.6's five feature areas: (1) Docker Swarm horizontal scaling, (2) Advanced AI (credibility/bias/fact-checking), (3) Mobile apps (React Native/Capacitor), (4) Freemium + Developer API, (5) Video/podcast/social content. Existing stack (React 19, Express 5, PostgreSQL, Redis, Prisma) remains unchanged; additions integrate with current architecture.

---

## 1. Infrastructure & Horizontal Scaling

### New Dependencies

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| N/A (Docker Swarm) | Built-in | Container orchestration | Native to Docker Engine, no separate installation needed |
| Traefik | v3.6+ | Reverse proxy & load balancer | Auto-discovery of Swarm services, automatic HTTPS with Let's Encrypt, sticky sessions support |

### Integration Points

**Docker Swarm Setup:**
- Uses existing `docker-compose.yml` as base, converted to `docker-stack.yml` for Swarm deployment
- Existing services (app, postgres, redis, prometheus, grafana) become replicated services
- Overlay network replaces bridge network for multi-node communication

**Traefik Configuration:**
```yaml
# Add to docker-stack.yml
traefik:
  image: traefik:v3.6
  command:
    - --providers.swarm.endpoint=unix:///var/run/docker.sock
    - --providers.swarm.exposedbydefault=false
    - --entrypoints.web.address=:80
    - --entrypoints.websecure.address=:443
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
  deploy:
    placement:
      constraints: [node.role == manager]
```

**Session Affinity for WebSocket:**
- Existing Socket.IO connections require sticky sessions
- Traefik labels: `traefik.http.services.app.loadbalancer.sticky.cookie=true`
- Alternative: Use DNSRR mode (`endpoint_mode: dnsrr`) for direct container routing

### Migration Notes

**Single-Region First (v1.6):**
- Deploy Swarm cluster on single cloud provider region (AWS us-east-1 or eu-central-1)
- Multi-node setup: 3 manager nodes + N worker nodes for high availability
- No breaking changes to application code; environment-based configuration only

**Scaling Commands:**
```bash
docker stack deploy -c docker-stack.yml newshub
docker service scale newshub_app=5  # Scale to 5 replicas
docker service logs -f newshub_app
```

**Database Considerations:**
- PostgreSQL: Single instance (NOT replicated in Swarm), use managed service (AWS RDS, DigitalOcean)
- Redis: Enable persistence, consider Redis Sentinel for HA in production
- Connection pooling already configured via Prisma (see `server/config/database.ts`)

**Monitoring Integration:**
- Existing Prometheus + Grafana stack works with Swarm
- Add Traefik metrics endpoint to Prometheus scrape config
- No code changes needed; Docker labels expose metrics

### Not Needed

- **Kubernetes:** Swarm provides sufficient orchestration for current scale (10k validated users)
- **Custom auto-scaling scripts:** Manual scaling adequate for v1.6; defer metrics-based auto-scaling to v1.7+
- **Service mesh (Istio/Linkerd):** Traefik provides necessary routing/TLS; excessive complexity for current needs

**Sources:**
- [Docker Swarm horizontal scaling guide](https://betterstack.com/community/guides/scaling-docker/horizontally-scaling-swarm/)
- [Traefik Docker Swarm setup](https://doc.traefik.io/traefik/setup/swarm/)
- [Docker Swarm sticky sessions with Traefik](https://github.com/traefik/traefik/issues/1024)
- [Docker Swarm load balancing patterns](https://reintech.io/blog/load-balancing-strategies-docker-swarm)

---

## 2. Advanced AI: Credibility, Bias, Fact-Checking

### New Dependencies

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| N/A (Custom scoring) | - | Source credibility scoring | Build on existing multi-provider AI; no suitable OSS library found |
| N/A (IBM AI Fairness 360) | Python | Bias detection (optional) | Python-only; consider for future Python microservice |
| N/A (API-based) | - | Fact-checking | Use Google Fact Check API (free tier) + ClaimBuster API |

### Implementation Strategy

**Source Credibility Scoring:**
- **Approach:** Custom scoring algorithm based on existing NewsSource model
- **Factors:** Reliability (already in DB), age of source, citation patterns, sentiment consistency
- **Storage:** Add `credibilityScore` (0-100) field to `NewsSource` table
- **Update frequency:** Weekly batch job, cache results in Redis

```typescript
// New service: server/services/credibilityService.ts
interface CredibilityFactors {
  reliabilityScore: number;    // From existing bias.reliability
  sourceAge: number;            // Domain age from WHOIS
  citationCount: number;        // How often cited by other sources
  sentimentConsistency: number; // Variance in sentiment over time
}
```

**Bias Detection:**
- **Approach:** Extend existing `aiService.ts` multi-provider chain
- **Method:** Framing analysis per article using OpenRouter free models
- **Storage:** Add `biasAnalysis` JSONB field to `NewsArticle` table
- **Features:** Political leaning (-100 left to +100 right), framing type, loaded language detection

```typescript
// Extend server/services/aiService.ts
interface BiasAnalysis {
  politicalLean: number;  // -100 to +100
  framingType: 'episodic' | 'thematic' | 'strategic' | 'conflict';
  loadedLanguage: string[];  // Array of biased terms
  confidence: number;
}
```

**Fact-Checking:**
- **Primary API:** [Google Fact Check Tools API](https://developers.google.com/fact-check/tools/api) (free, no quota)
- **Fallback:** ClaimBuster API for automated claim detection
- **Process:** Extract claims from article → query Google API → store results as `factChecks` JSONB in `NewsArticle`
- **Rate limiting:** Max 1 req/sec to Google API

```typescript
// New service: server/services/factCheckService.ts
interface FactCheckResult {
  claim: string;
  claimant: string;
  rating: 'true' | 'false' | 'mixture' | 'unverified';
  source: string;  // Fact-checking org (Snopes, PolitiFact, etc.)
  url: string;
}
```

### Integration Points

**Existing AI Service:**
- Credibility/bias use existing `aiService.ts` multi-provider fallback (OpenRouter → Gemini → Anthropic)
- Fact-checking uses dedicated HTTP client (Axios) for Google API
- All results cached in Redis with 24h TTL

**Database Schema Changes:**
```prisma
// prisma/schema.prisma
model NewsArticle {
  // ... existing fields
  biasAnalysis     Json?
  factChecks       Json?
  credibilityScore Int?
}

model NewsSource {
  // ... existing fields
  credibilityScore Int?  // 0-100
  lastScoreUpdate  DateTime?
}
```

**API Endpoints:**
```
GET /api/news/:id/bias          # Bias analysis for article
GET /api/news/:id/fact-check    # Fact-check results
GET /api/sources/credibility    # Credibility scores for all sources
```

### Migration Notes

**Gradual Rollout:**
- Phase 1: Credibility scoring (batch process on existing sources)
- Phase 2: Bias detection (on-demand for new articles)
- Phase 3: Fact-checking (opt-in per user preference)

**Cost Considerations:**
- Google Fact Check API: FREE (no quota limit)
- Bias/credibility use existing free AI provider quotas (OpenRouter: unlimited free tier models)
- Expected cost: $0/month for 10k users

### Not Needed

- **IBM AI Fairness 360:** Python-only library; overkill for news bias detection (designed for ML model fairness)
- **NewsGuard API:** Commercial service ($$$); custom scoring more cost-effective
- **Separate ML model training:** Existing LLM APIs provide sufficient accuracy; defer custom models to v2.0+

**Sources:**
- [AI bias detection tools comparison](https://www.trysight.ai/blog/ai-model-bias-detection-tools)
- [Google Fact Check Tools API](https://developers.google.com/fact-check/tools/api)
- [Automated fact-checking guide](https://spotlight.ebu.ch/p/automated-fact-checking-osint-api-guide)
- [Credibility assessment framework](https://arxiv.org/html/2410.21360v1)

---

## 3. Mobile Experience: React Native + Capacitor

### New Dependencies

#### React Native with Expo (Primary Mobile Approach)

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| expo | ^55.0.17 | React Native platform | Managed workflow, EAS Build/Update, SDK 55 with React Native 0.79 |
| react-native | 0.79.x | Cross-platform framework | Latest with New Architecture enabled by default |
| expo-notifications | latest | Push notifications | Unified API for FCM + APNs |
| expo-router | latest | Navigation | File-based routing, aligns with web app patterns |
| expo-secure-store | latest | Encrypted storage | JWT token storage (replaces localStorage) |
| @react-native-async-storage/async-storage | latest | Persistent storage | Zustand persistence (replaces localStorage) |

#### Capacitor (Secondary - Web App Wrapper)

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| @capacitor/core | ^8.3.1 | Native bridge | Wrap existing React web app for app stores |
| @capacitor/ios | ^8.3.1 | iOS platform | iOS app store deployment |
| @capacitor/android | ^8.3.1 | Android platform | Google Play deployment |
| @capacitor/push-notifications | latest | Push notifications | Native push for web app wrapper |

### Strategy: Dual Approach

**Recommendation:** Build BOTH for different purposes.

#### Option A: React Native (Primary for v1.6)
**When:** Building native-first mobile experience from scratch
**Pros:**
- True native performance and UX patterns
- 74.6% of Expo SDK 52 projects use New Architecture (mature adoption)
- Extensive ecosystem (maps, charts, authentication)
- Shared business logic with web (TypeScript, TanStack Query, Zustand patterns)

**Cons:**
- Separate codebase from web app (cannot reuse React components directly)
- Learning curve for native-specific patterns

**Implementation:**
```bash
# Create Expo app
npx create-expo-app newshub-mobile --template blank-typescript

# Install dependencies
npx expo install expo-router expo-notifications expo-secure-store
npm install @tanstack/react-query zustand
```

**Architecture:**
```
newshub-mobile/
├── app/              # Expo Router pages (file-based routing)
│   ├── (tabs)/
│   │   ├── index.tsx    # News feed
│   │   ├── analysis.tsx
│   │   └── profile.tsx
│   └── _layout.tsx
├── src/
│   ├── services/     # Shared with web (API clients)
│   ├── store/        # Zustand slices (adapted from web)
│   ├── components/   # Native components (NOT React web components)
│   └── types/        # Shared TypeScript types
```

#### Option B: Capacitor (Quick Win for v1.6)
**When:** Fastest path to app stores with existing web app
**Pros:**
- Reuse 100% of existing React web app code
- Deploy to iOS/Android in days, not weeks
- Progressive migration: start with web wrapper, add native features incrementally

**Cons:**
- WebView performance (CSS animations GPU-accelerated, but JS slower than native)
- Less native feel (web UI patterns, not platform-native)

**Implementation:**
```bash
# Add Capacitor to existing Vite React app
npm install @capacitor/core @capacitor/cli
npx cap init newshub com.newshub.app

# Add platforms
npx cap add ios
npx cap add android

# Build web app and sync
npm run build
npx cap sync
```

**Modification Required:**
```typescript
// src/store/index.ts - Detect Capacitor environment
import { Capacitor } from '@capacitor/core';
import { Storage } from '@capacitor/preferences';

const isNative = Capacitor.isNativePlatform();
const storage = isNative ? Storage : localStorage;
```

### Push Notifications Setup

#### React Native (Expo)
```typescript
// app/_layout.tsx
import * as Notifications from 'expo-notifications';

// Request permissions
const { status } = await Notifications.requestPermissionsAsync();

// Get Expo Push Token (handles both FCM and APNs)
const token = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-expo-project-id'
});
```

**Environment Requirements:**
- No API keys needed for Expo Push Service (Expo handles FCM/APNs routing)
- For direct FCM/APNs: `GOOGLE_SERVICES_JSON` (Android), Apple Developer Account (iOS)

#### Capacitor
```typescript
// src/services/pushNotifications.ts
import { PushNotifications } from '@capacitor/push-notifications';

await PushNotifications.requestPermissions();
await PushNotifications.register();

PushNotifications.addListener('registration', (token) => {
  console.log('Push token:', token.value);
});
```

### PWA Enhancements (Web)

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| workbox-core | ^7.4.0 | Service worker | Already used; enhance for background sync + push |
| vite-plugin-pwa | ^0.21.1 | PWA manifest generation | Already used; add push notification config |

**Enhancements:**
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  workbox: {
    // Enable background sync
    runtimeCaching: [{
      urlPattern: /^https:\/\/api\.newshub\.com\/.*$/,
      handler: 'NetworkFirst',
      options: {
        backgroundSync: {
          name: 'newshub-sync',
          options: { maxRetentionTime: 24 * 60 }
        }
      }
    }]
  },
  // Push notification support
  includeAssets: ['firebase-messaging-sw.js']
})
```

**Web Push Setup:**
```typescript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "...",
  projectId: "newshub",
  messagingSenderId: "..."
});

const messaging = firebase.messaging();
```

### Integration Points

**Shared API Client:**
- Reuse existing `src/services/*.ts` (newsService, authService, etc.)
- React Native: Use `react-native-fetch-api` (drop-in fetch polyfill)
- Capacitor: Native fetch works as-is

**State Management:**
- Zustand store: 90% reusable, adjust persistence layer
- TanStack Query: 100% compatible with React Native

**Authentication:**
- Web: JWT in `localStorage`
- React Native: JWT in `expo-secure-store` (encrypted)
- Capacitor: JWT in `@capacitor/preferences` (secure on iOS/Android)

### Migration Notes

**Recommended Sequence:**
1. **v1.6.1:** Capacitor wrapper (1 week) → quick app store presence
2. **v1.6.2:** Enhanced PWA with push notifications (1 week)
3. **v1.6.3:** React Native app (4-6 weeks) → native experience for engaged users

**App Store Deployment:**
- **iOS:** Requires paid Apple Developer Account ($99/year)
- **Android:** Google Play ($25 one-time)
- **EAS Build (Expo):** Cloud builds, $29/month for unlimited builds

### Not Needed

- **Flutter:** Dart ecosystem, not TypeScript; cannot share code with web app
- **Ionic Framework:** Capacitor provides native bridge; Ionic UI components unnecessary (have Tailwind design system)
- **React Native Firebase (rnfirebase):** Expo's `expo-notifications` handles FCM/APNs; simpler API

**Sources:**
- [React Native 0.77/0.79 and Expo SDK 53](https://expo.dev/changelog/sdk-53)
- [Capacitor vs React Native comparison](https://www.pkgpulse.com/blog/react-native-vs-expo-vs-capacitor-cross-platform-mobile-2026)
- [Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Capacitor latest version](https://github.com/ionic-team/capacitor/releases)
- [PWA push notifications guide](https://www.digitalapplied.com/blog/progressive-web-apps-2026-pwa-performance-guide)

---

## 4. Monetization: Freemium + Developer API

### New Dependencies

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| stripe | ^22.1.0 | Payment processing | Industry standard, subscription billing built-in |
| express-rate-limit | ^8.4.1 | Rate limiting | Already used; extend for tiered API limits |
| swagger-ui-express | ^5.0.1 | API documentation | Interactive API docs for developers |
| swagger-jsdoc | ^6.2.8 | OpenAPI spec generation | Generate docs from JSDoc comments |

### Freemium Implementation

**Stripe Setup:**
```bash
npm install stripe
```

**Products & Pricing Tiers:**
```typescript
// server/config/subscriptionTiers.ts
export const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    features: {
      articlesPerDay: 50,
      aiQuestionsPerDay: 5,
      regionsAccess: ['usa', 'europa', 'deutschland'],
      biasDetection: false,
      factChecking: false,
      apiAccess: false
    }
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 9.99,
    stripePriceId: 'price_xxx',  // From Stripe dashboard
    features: {
      articlesPerDay: -1,  // Unlimited
      aiQuestionsPerDay: 100,
      regionsAccess: 'all',
      biasDetection: true,
      factChecking: true,
      apiAccess: false
    }
  },
  DEVELOPER: {
    id: 'developer',
    name: 'Developer',
    priceMonthly: 29.99,
    stripePriceId: 'price_yyy',
    features: {
      articlesPerDay: -1,
      aiQuestionsPerDay: 500,
      regionsAccess: 'all',
      biasDetection: true,
      factChecking: true,
      apiAccess: true,
      apiRateLimit: 1000  // requests/hour
    }
  }
};
```

**Subscription Creation:**
```typescript
// server/services/subscriptionService.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function createSubscription(userId: string, priceId: string) {
  const customer = await stripe.customers.create({
    metadata: { userId }
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent']
  });

  return subscription;
}
```

**Database Schema:**
```prisma
// prisma/schema.prisma
model User {
  // ... existing fields
  subscriptionTier   String   @default("free")  // free | premium | developer
  stripeCustomerId   String?  @unique
  stripeSubscriptionId String? @unique
  subscriptionStatus String?  // active | past_due | canceled
  apiKey             String?  @unique  // For developer tier
  apiKeyCreatedAt    DateTime?
}

model UsageRecord {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  resourceType  String   // articles | ai_questions | api_requests
  count         Int
  date          DateTime @default(now())

  @@index([userId, date])
}
```

**Middleware for Feature Gating:**
```typescript
// server/middleware/subscriptionGuard.ts
export function requireFeature(feature: keyof typeof SUBSCRIPTION_TIERS.PREMIUM.features) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;  // Assumes auth middleware
    const tier = SUBSCRIPTION_TIERS[user.subscriptionTier.toUpperCase()];

    if (!tier.features[feature]) {
      return res.status(403).json({
        error: 'Upgrade required',
        feature,
        currentTier: user.subscriptionTier
      });
    }

    next();
  };
}

// Usage
app.post('/api/news/:id/fact-check',
  requireAuth,
  requireFeature('factChecking'),
  factCheckController
);
```

### Developer API

**API Key Generation:**
```typescript
// server/services/apiKeyService.ts
import crypto from 'crypto';

function generateApiKey(): string {
  return 'nh_' + crypto.randomBytes(32).toString('hex');
}

async function createApiKey(userId: string) {
  const apiKey = generateApiKey();

  await prisma.user.update({
    where: { id: userId },
    data: {
      apiKey,
      apiKeyCreatedAt: new Date()
    }
  });

  return apiKey;
}
```

**API Authentication Middleware:**
```typescript
// server/middleware/apiKeyAuth.ts
export async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || !apiKey.startsWith('nh_')) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const user = await prisma.user.findUnique({
    where: { apiKey }
  });

  if (!user || user.subscriptionTier !== 'developer') {
    return res.status(401).json({ error: 'Invalid or inactive API key' });
  }

  req.user = user;
  next();
}
```

**Rate Limiting by Tier:**
```typescript
// server/middleware/tieredRateLimit.ts
import rateLimit from 'express-rate-limit';

export function createTieredLimiter(resource: string) {
  return rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: async (req) => {
      const user = req.user;
      if (!user) return 10;  // Anonymous

      const tier = SUBSCRIPTION_TIERS[user.subscriptionTier.toUpperCase()];
      return tier.features.apiRateLimit || 50;
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({  // Use existing Redis
      client: redisClient,
      prefix: `rate_limit:${resource}:`
    })
  });
}

// Usage
app.get('/api/v1/news',
  authenticateApiKey,
  createTieredLimiter('api_requests'),
  newsController
);
```

**OpenAPI Documentation:**
```typescript
// server/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NewsHub API',
      version: '1.0.0',
      description: 'Multi-perspective news analysis API'
    },
    servers: [
      { url: 'https://api.newshub.com/v1' }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    }
  },
  apis: ['./server/routes/*.ts']  // Files with JSDoc annotations
};

const specs = swaggerJsdoc(options);

// Mount in app
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
```

**API Endpoints (Developer Tier):**
```
GET  /api/v1/news              # List articles with filters
GET  /api/v1/news/:id          # Single article
GET  /api/v1/sources           # News sources with credibility
GET  /api/v1/analysis/clusters # Topic clusters
POST /api/v1/analysis/bias     # Bias analysis for text
POST /api/v1/analysis/factcheck # Fact-check claims
GET  /api/v1/events/geo        # Geo-located events
GET  /api/v1/usage             # API usage statistics
```

### Integration Points

**Stripe Webhooks:**
```typescript
// server/routes/webhooks.ts
app.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']!;
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'customer.subscription.created':
        // Activate premium features
        break;
      case 'customer.subscription.deleted':
        // Downgrade to free tier
        break;
      case 'invoice.payment_failed':
        // Notify user
        break;
    }

    res.json({ received: true });
  }
);
```

**Frontend Integration:**
```typescript
// src/components/SubscriptionModal.tsx
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

async function handleUpgrade(priceId: string) {
  const response = await fetch('/api/subscriptions/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId })
  });

  const { sessionId } = await response.json();
  const stripe = await stripePromise;
  await stripe?.redirectToCheckout({ sessionId });
}
```

### Migration Notes

**Environment Variables:**
```bash
# .env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Gradual Feature Rollout:**
1. Launch with Free tier only (all users)
2. Add Premium tier ($9.99/mo) with bias/fact-checking
3. Add Developer tier ($29.99/mo) with API access

**Pricing Strategy:**
- Free tier: Generous enough to hook users (50 articles/day)
- Premium tier: Power users, serious analysts
- Developer tier: Businesses, researchers, integrators

### Not Needed

- **Paddle/Lemon Squeezy:** Stripe more mature, better Node.js SDK
- **Custom billing system:** Stripe handles subscriptions, invoices, tax compliance
- **Separate API gateway product:** Express + express-rate-limit sufficient for v1.6 scale

**Sources:**
- [Stripe Node.js subscription guide](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [API rate limiting in Node.js 2026](https://medium.com/@gagandeep023/building-an-api-gateway-rate-limiter-from-scratch-in-node-js-9c373694d9f6)
- [Swagger/OpenAPI for Express](https://oneuptime.com/blog/post/2026-01-25-swagger-documentation-nodejs-apis/view)

---

## 5. Content Expansion: Video, Podcasts, Social

### New Dependencies

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| node-podcast-parser | ^2.3.0 | Podcast RSS parsing | Mature, 2.3k GitHub stars, handles iTunes extensions |
| rss-parser | ^3.13.0 | Generic RSS/Atom | Fallback for non-podcast feeds |
| N/A (API-based) | - | YouTube transcription | Use TranscriptAPI or youtube-transcript-api |
| N/A (API-based) | - | Social media scraping | Use ScrapeCreators or Bright Data APIs |

### Podcast Integration

**RSS Feed Parsing:**
```typescript
// server/services/podcastService.ts
import podcastParser from 'node-podcast-parser';
import fetch from 'node-fetch';

async function fetchPodcastFeed(feedUrl: string) {
  const response = await fetch(feedUrl);
  const xml = await response.text();

  return new Promise((resolve, reject) => {
    podcastParser.parseString(xml, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

interface PodcastEpisode {
  title: string;
  description: string;
  pubDate: Date;
  audioUrl: string;
  duration: number;
  transcript?: string;
}
```

**Podcast Sources:**
```typescript
// server/config/podcastSources.ts
export const PODCAST_SOURCES = [
  {
    id: 'nyt-daily',
    name: 'The Daily (NYT)',
    feedUrl: 'https://feeds.simplecast.com/54nAGcIl',
    region: 'usa',
    language: 'en'
  },
  {
    id: 'bbc-global-news',
    name: 'BBC Global News Podcast',
    feedUrl: 'https://podcasts.files.bbci.co.uk/p02nq0gn.rss',
    region: 'europa',
    language: 'en'
  },
  // Add 20+ news podcasts across regions
];
```

**Database Schema:**
```prisma
model PodcastEpisode {
  id            String   @id @default(cuid())
  podcastId     String
  title         String
  description   String   @db.Text
  audioUrl      String
  transcriptUrl String?
  transcript    String?  @db.Text
  duration      Int      // seconds
  pubDate       DateTime
  region        String
  language      String
  createdAt     DateTime @default(now())

  @@index([pubDate, region])
}
```

### Video Transcription

**YouTube Transcript Fetching:**
```typescript
// server/services/videoService.ts
import axios from 'axios';

async function getYouTubeTranscript(videoId: string): Promise<string> {
  // Option 1: TranscriptAPI (paid, reliable)
  const response = await axios.get(
    `https://api.transcriptapi.com/v1/transcripts/${videoId}`,
    { headers: { 'X-API-Key': process.env.TRANSCRIPT_API_KEY } }
  );

  return response.data.transcript;

  // Option 2: Free YouTube transcript (via youtube-transcript-api proxy)
  // Note: More fragile, subject to YouTube changes
}

interface VideoContent {
  id: string;
  title: string;
  channelName: string;
  publishedAt: Date;
  transcript: string;
  thumbnailUrl: string;
  viewCount: number;
  region: string;
}
```

**Video Sources:**
```typescript
// server/config/videoSources.ts
export const VIDEO_SOURCES = [
  {
    id: 'cnn-youtube',
    name: 'CNN',
    channelId: 'UCupvZG-5ko_eiXAupbDfxWw',
    region: 'usa',
    type: 'youtube'
  },
  {
    id: 'dw-news',
    name: 'DW News',
    channelId: 'UCknLrEdhRCp1aegoMqRaCZg',
    region: 'deutschland',
    type: 'youtube'
  },
  // Add major news channels
];
```

### Social Media Content

**Recommended Approach: API-Based (Not Self-Hosted Scraping)**

**Why API-based:**
- Platform anti-bot protections update weekly (especially TikTok, Twitter/X)
- Legal compliance (ToS violations, rate limits)
- Infrastructure cost (proxies, CAPTCHA solving)

**Top Provider: ScrapeCreators**
```typescript
// server/services/socialMediaService.ts
import axios from 'axios';

const SCRAPECREATORS_API = 'https://api.scrapecreators.com/v1';

async function getTweetThread(tweetId: string) {
  const response = await axios.get(
    `${SCRAPECREATORS_API}/twitter/thread`,
    {
      params: { id: tweetId },
      headers: { 'X-API-Key': process.env.SCRAPECREATORS_KEY }
    }
  );

  return response.data;
}

async function getRedditPost(postId: string) {
  const response = await axios.get(
    `${SCRAPECREATORS_API}/reddit/post`,
    { params: { id: postId } }
  );

  return response.data;
}

async function getTikTokVideo(videoId: string) {
  const response = await axios.get(
    `${SCRAPECREATORS_API}/tiktok/video`,
    { params: { id: videoId } }
  );

  return {
    caption: response.data.desc,
    author: response.data.author.uniqueId,
    stats: response.data.stats,
    videoUrl: response.data.video.downloadAddr
  };
}
```

**Alternative: Bright Data (Enterprise)**
- More expensive ($500+/month) but higher reliability
- Includes proxy infrastructure
- GDPR compliant data collection

**Database Schema:**
```prisma
model SocialMediaPost {
  id          String   @id @default(cuid())
  platform    String   // twitter | reddit | tiktok
  externalId  String   @unique
  content     String   @db.Text
  author      String
  authorMeta  Json?    // followers, verified, etc.
  engagement  Json     // likes, shares, comments
  mediaUrls   String[]
  transcript  String?  @db.Text  // For video content
  publishedAt DateTime
  region      String?
  sentiment   String?
  createdAt   DateTime @default(now())

  @@index([platform, publishedAt])
}
```

### Content Type Unification

**Abstract Content Model:**
```typescript
// server/types/content.ts
export type ContentSource = 'rss' | 'podcast' | 'video' | 'social';

export interface UnifiedContent {
  id: string;
  type: ContentSource;
  title: string;
  text: string;  // Article body | Transcript | Post content
  author: string;
  sourceId: string;
  sourceName: string;
  region: PerspectiveRegion;
  language: string;
  publishedAt: Date;
  mediaUrl?: string;  // Audio | Video | Image
  sentiment?: Sentiment;
  biasAnalysis?: BiasAnalysis;
  factChecks?: FactCheckResult[];
  engagement?: {
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
  };
}
```

**Unified Feed API:**
```typescript
// server/routes/content.ts
app.get('/api/v1/content', async (req, res) => {
  const { types, regions, startDate, endDate } = req.query;

  // Query across NewsArticle, PodcastEpisode, VideoContent, SocialMediaPost
  const content = await aggregateContent({
    types: types?.split(',') || ['rss', 'podcast', 'video', 'social'],
    regions: regions?.split(','),
    dateRange: { start: startDate, end: endDate }
  });

  res.json({ data: content });
});
```

### Integration Points

**Transcription Cost Management:**
- Podcast/Video transcripts cached indefinitely (immutable content)
- On-demand transcription: Queue system (Bull or BullMQ with Redis)
- Batch process: Transcribe top 100 videos daily (prioritize by view count)

**Storage Considerations:**
- Text content: PostgreSQL (existing)
- Audio/Video files: DO NOT store; link to source URLs
- Transcripts: PostgreSQL (searchable via full-text search)

**Search Integration:**
- Extend existing search to include podcast transcripts and video captions
- Use PostgreSQL `tsvector` for full-text search across all content types

### Migration Notes

**Phased Rollout:**
1. **Phase 1:** Podcast RSS (10 sources, transcripts optional)
2. **Phase 2:** YouTube videos (20 channels, batch transcription)
3. **Phase 3:** Social media (curated posts, not full scraping)

**Cost Estimates (10k users):**
- TranscriptAPI: $0.05/video, ~$150/month for 3k videos
- ScrapeCreators: $199/month (unlimited scraping)
- Bright Data: $500+/month (enterprise)

**Recommended for v1.6:** ScrapeCreators ($199/mo) for social, free youtube-transcript-api for videos (with fallback to paid if needed)

### Not Needed

- **Self-hosted web scraping (Puppeteer/Playwright):** Too fragile, high infrastructure cost
- **Video/audio hosting:** Use source URLs; NewsHub is aggregator, not host
- **Real-time social media streaming:** Batch processing sufficient for news analysis

**Sources:**
- [Top YouTube Transcript APIs 2026](https://api.market/blog/magicapi/youtube-transcript/top-youtube-transcript-apis)
- [Social media scraping APIs comparison](https://www.xpoz.ai/blog/comparisons/best-social-media-scraping-apis-compared-2026/)
- [Podcast RSS parsing with Node.js](https://github.com/akupila/node-podcast-parser)
- [Social media scraping in 2026](https://scrapfly.io/blog/posts/social-media-scraping)

---

## Environment Variables Summary

```bash
# Existing (no changes)
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
OPENROUTER_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=

# New for v1.6
# Monetization
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Content Expansion
TRANSCRIPT_API_KEY=  # TranscriptAPI (optional)
SCRAPECREATORS_KEY=  # Social media scraping

# Mobile (Expo)
EXPO_PROJECT_ID=  # From expo.dev

# Optional
NEWSGUARD_API_KEY=  # If using commercial credibility API
```

---

## Installation Command Summary

```bash
# Infrastructure (no new npm packages, Docker Swarm built-in)

# AI Features (no new npm packages, use existing aiService)

# Mobile - React Native
npx create-expo-app newshub-mobile --template blank-typescript
cd newshub-mobile
npx expo install expo-router expo-notifications expo-secure-store
npm install @tanstack/react-query zustand

# Mobile - Capacitor
cd newshub  # Existing web app
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/push-notifications

# Monetization
npm install stripe swagger-ui-express swagger-jsdoc
# express-rate-limit already installed

# Content Expansion
npm install node-podcast-parser rss-parser
```

---

## Total Cost Estimate (v1.6)

| Service | Monthly Cost | Note |
|---------|--------------|------|
| Docker Swarm Infrastructure | $0 | OSS |
| Traefik | $0 | OSS |
| AI (OpenRouter/Gemini) | $0 | Free tiers |
| Stripe | $0 + 2.9% + 30¢/txn | No monthly fee |
| Expo EAS Build | $29 | Optional, can build locally |
| Apple Developer | $99/year | Required for iOS |
| Google Play | $25 | One-time |
| TranscriptAPI | $150 | ~3k videos/month |
| ScrapeCreators | $199 | Social media scraping |
| **Total** | **~$380/mo** | **Excluding revenue from subscriptions** |

**Break-even:** ~40 Premium subscribers ($9.99/mo) or 13 Developer subscribers ($29.99/mo)

---

## Not Adding to Stack (Already Have)

- **PostgreSQL:** Already using with Prisma
- **Redis:** Already using for caching and rate limiting
- **TanStack Query:** Already using for server state
- **Zustand:** Already using for client state
- **Express:** Already using v5 with TypeScript
- **Prometheus + Grafana:** Already monitoring
- **Socket.IO:** Already handling WebSocket
- **Multi-provider AI:** Already have OpenRouter → Gemini → Anthropic chain
- **Authentication:** Already have JWT-based auth
- **Docker Compose:** Upgrading to Docker Swarm (same files, different deploy command)

---

## Next Steps

1. **Infrastructure:** Convert `docker-compose.yml` → `docker-stack.yml`, add Traefik service
2. **AI Features:** Implement credibility scoring batch job, extend aiService for bias detection
3. **Mobile:** Build Capacitor wrapper first (quick win), then start React Native app
4. **Monetization:** Set up Stripe account, create products/prices, implement subscription flow
5. **Content:** Add podcast RSS sources, integrate TranscriptAPI, set up ScrapeCreators account

---

**Last Updated:** 2026-04-26
**Confidence:** HIGH (all versions verified, sources cited, integration paths clear)
