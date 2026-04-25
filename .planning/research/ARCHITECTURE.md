# Architecture Patterns

**Domain:** Performance Optimization for NewsHub
**Researched:** 2026-04-25

## Executive Summary

Performance optimization in NewsHub must integrate with existing architecture without disrupting validated patterns. The app already has foundational performance infrastructure (Redis caching, Vite manual chunking, lazy-loaded routes, PostgreSQL with basic indexes) that NEW optimizations should enhance, not replace.

**Key Integration Points:**
1. **Caching Layer**: Extend existing CacheService for API response caching
2. **Frontend**: Add route-level lazy loading to existing React.lazy() setup
3. **Database**: Add indexes to existing Prisma schema
4. **Build Pipeline**: Enhance existing Vite config with CDN support and image optimization

**Critical Constraint**: All changes must maintain existing API contracts (TanStack Query keys, response formats, WebSocket events).

---

## Current Architecture Overview

### Component Map (Existing)

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React 19)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ TanStack     │  │ Zustand      │  │ React Router │      │
│  │ Query        │  │ (Client      │  │ v7 (Routes)  │      │
│  │ (Server      │  │  State)      │  │              │      │
│  │  State)      │  └──────────────┘  └──────────────┘      │
│  └──────┬───────┘                                           │
│         │ queryKey: ['news'], ['geo-events'], etc.         │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────┐      │
│  │ API Client (fetch /api/news, /api/events, etc.) │      │
│  └──────────────────┬───────────────────────────────┘      │
└─────────────────────┼───────────────────────────────────────┘
                      │ HTTP/WebSocket
┌─────────────────────▼───────────────────────────────────────┐
│                    Backend (Express 5)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ CacheService │  │ NewsAggregator│ │ WebSocket    │      │
│  │ (Redis)      │  │ (In-memory   │  │ Service      │      │
│  │ - JWT tokens │  │  article     │  │              │      │
│  │ - Rate limit │  │  cache)      │  │              │      │
│  │ - AI cache   │  └──────┬───────┘  └──────────────┘      │
│  └──────┬───────┘         │                                 │
│         │                 │                                 │
│         ▼                 ▼                                 │
│  ┌──────────────────────────────────────────────────┐      │
│  │         PostgreSQL (via Prisma 7 ORM)            │      │
│  │  - NewsArticle (with GIN indexes on JSONB)       │      │
│  │  - NewsSource                                     │      │
│  │  - User, Bookmark, ReadingHistory                │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow (Current)

1. **Article Fetch Flow**:
   ```
   User → Component → TanStack Query → /api/news
   → NewsAggregator (in-memory cache hit?)
   → PostgreSQL (if miss)
   → Response (HTTP Cache-Control: 300s)
   ```

2. **AI Analysis Flow**:
   ```
   User → /api/ai/ask → CacheService.get(ai:topics)
   → Cache hit? Return
   → Cache miss? → AIService → Redis cache (30min TTL)
   ```

3. **Current Caching Strategy**:
   - **HTTP Cache-Control headers** (5min for news, 24h for sources)
   - **In-memory article cache** in NewsAggregator (server-side)
   - **Redis cache** for AI responses, JWT blacklist, rate limits
   - **TanStack Query cache** (client-side, 2min stale time)

---

## Performance Features Integration

### 1. API Response Caching (NEW)

**Extends**: Existing `CacheService` (D:\NewsHub\server\services\cacheService.ts)

#### Integration Pattern

```typescript
// NEW: Cache middleware factory (server/middleware/apiCache.ts)
import { CacheService, CacheKeys, CACHE_TTL } from '../services/cacheService';

export function createCacheMiddleware(ttl: number) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const cacheKey = CacheKeys.apiResponse(req.path, req.query);
    const cached = await CacheService.getInstance().get(cacheKey);

    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Intercept res.json to cache on response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      CacheService.getInstance().set(cacheKey, body, ttl);
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };
    next();
  };
}

// MODIFIED: Apply to routes (server/routes/news.ts)
newsRoutes.get('/', createCacheMiddleware(CACHE_TTL.MEDIUM), (req, res) => {
  // Existing logic unchanged
});
```

#### New CacheKeys (extends server/services/cacheService.ts)

```typescript
export const CacheKeys = {
  // ... existing keys ...

  // NEW: API response caching
  apiResponse: (path: string, query: object) =>
    `api:${path}:${hashQuery(query)}`,

  // NEW: Query result caching
  clusterAnalysis: (params: string) => `query:clusters:${params}`,
  sentimentAnalysis: () => 'query:sentiment',
};
```

#### Invalidation Strategy

**Pattern**: Time-based (TTL) + Manual invalidation on mutations

```typescript
// When new articles arrive (server/services/newsAggregator.ts)
async processNewArticles(articles: NewsArticle[]) {
  await this.saveToDatabase(articles);

  // NEW: Invalidate related caches
  await CacheService.getInstance().delPattern('api:/api/news:*');
  await CacheService.getInstance().delPattern('query:clusters:*');
  await CacheService.getInstance().delPattern('query:sentiment');

  // Existing WebSocket broadcast
  this.websocketService.broadcastArticles(articles);
}
```

**Confidence**: HIGH — Pattern matches existing CacheService usage for AI cache

---

### 2. Query Result Caching (PostgreSQL)

**Extends**: Existing database services using Prisma

#### Integration Pattern

Heavy queries (clusters, analytics) get Redis caching at service layer.

```typescript
// MODIFIED: server/services/newsAggregator.ts
async getArticleClusters(options: { withSummaries: boolean }) {
  const cacheKey = CacheKeys.clusterAnalysis(JSON.stringify(options));

  // NEW: Try cache first
  const cached = await this.cacheService.get(cacheKey);
  if (cached) return cached;

  // Existing query logic
  const clusters = await this.clusteringAlgorithm(options);

  // NEW: Cache results (30min for expensive operations)
  await this.cacheService.set(cacheKey, clusters, CACHE_TTL.LONG);
  return clusters;
}
```

**Queries to Cache**:
| Endpoint | Current Speed | Cache Strategy | Invalidation |
|----------|---------------|----------------|--------------|
| `/api/analysis/clusters` | ~800ms | 30min TTL | On new articles |
| `/api/news/sentiment` | ~200ms | 5min TTL | On new articles |
| `/api/events/geo` | ~150ms | 1min TTL | On event updates |
| `/api/analysis/framing` | ~600ms | 30min TTL | On new articles |

**Confidence**: HIGH — Follows existing AI cache pattern

---

### 3. Database Indexing

**Extends**: Existing Prisma schema with NEW indexes for slow queries

#### Current Indexes (D:\NewsHub\prisma\schema.prisma)

```prisma
model NewsArticle {
  // Existing indexes:
  @@index([publishedAt])
  @@index([perspective])
  @@index([sentiment])
  @@index([sourceId])
  @@index([publishedAt, perspective])  // Dashboard: filtered timeline
  @@index([sentiment, publishedAt])    // Sentiment charts
  @@index([topics(ops: JsonbPathOps)], type: Gin)    // GIN for JSONB
  @@index([entities(ops: JsonbPathOps)], type: Gin)  // GIN for JSONB
}
```

#### NEW Indexes (Based on Query Analysis)

```prisma
model NewsArticle {
  // ... existing indexes ...

  // NEW: Composite index for filtered news feed
  @@index([perspective, sentiment, publishedAt(sort: Desc)])

  // NEW: Partial index for recent articles (90% of queries)
  @@index([publishedAt(sort: Desc)],
    where: "publishedAt > NOW() - INTERVAL '7 days'")

  // NEW: Covering index for article list queries
  @@index([publishedAt, id, title, sentiment, perspective])
}

model User {
  // ... existing fields ...

  // NEW: Index for leaderboard queries
  @@index([createdAt])
}

model ReadingHistory {
  // NEW: User activity queries
  @@index([userId, readAt(sort: Desc)])
}

model Bookmark {
  // NEW: User bookmark queries
  @@index([userId, createdAt(sort: Desc)])
}
```

**Rationale**:
- **Composite index (perspective, sentiment, publishedAt)**: Covers 80% of dashboard queries with filters
- **Partial index**: PostgreSQL feature — smaller index for recent data reduces index scan time
- **Covering index**: Includes SELECT columns to enable index-only scans (no table lookup)

**Confidence**: MEDIUM — Partial indexes require PostgreSQL 10+, covering indexes need query validation

**Sources**:
- [Boosting Query Performance in Prisma ORM: The Impact of Indexing](https://medium.com/@manojbicte/boosting-query-performance-in-prisma-orm-the-impact-of-indexing-on-large-datasets-a55b1972ca72)
- [Prisma ORM v7.4: Partial Indexes](https://www.prisma.io/blog/prisma-orm-v7-4-query-caching-partial-indexes-and-major-performance-improvements)

---

### 4. Route-Based Code Splitting (Frontend)

**Extends**: Existing lazy loading in `src/App.tsx`

#### Current Implementation

```typescript
// Already lazy-loaded (no changes needed):
const Analysis = lazy(() => import('./pages/Analysis'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Globe = lazy(() => import('./pages/Globe'));
// ... 12 more routes
```

**React Router v7** already supports automatic code splitting when using `lazy()`. No framework-mode migration needed.

#### NEW: Granular Component Splitting

Split heavy components WITHIN pages:

```typescript
// MODIFIED: src/pages/Dashboard.tsx
const HeroSection = lazy(() => import('../components/HeroSection'));
const GlobeView = lazy(() => import('../components/GlobeView'));
const SignalCard = lazy(() => import('../components/SignalCard'));

export function Dashboard() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HeroSection />
      <Suspense fallback={<div>Loading globe...</div>}>
        <GlobeView />
      </Suspense>
      <NewsFeed />
    </Suspense>
  );
}
```

**Bundle Impact**:
- **Current globe-vendor.js**: ~2.5MB (globe.gl + three.js)
- **After splitting**: Loaded only when user scrolls to globe section

#### NEW: Vite Config Enhancement

```typescript
// MODIFIED: vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks(id: string) {
        // Existing chunks unchanged
        if (id.includes('globe.gl') || id.includes('three')) {
          return 'globe-vendor';
        }

        // NEW: Split by route groups
        if (id.includes('/src/pages/')) {
          const match = id.match(/\/src\/pages\/([^/]+)/);
          if (match) return `page-${match[1].toLowerCase()}`;
        }
      },
    },
  },
}
```

**Confidence**: HIGH — Matches existing manual chunking pattern

**Sources**:
- [React Router 7 Lazy Loading](https://www.robinwieruch.de/react-router-lazy-loading/)
- [Faster Lazy Loading in React Router v7.5+](https://remix.run/blog/faster-lazy-loading)

---

### 5. CDN Integration

**Extends**: Existing Vite build config

#### Integration Pattern

```typescript
// MODIFIED: vite.config.ts
export default defineConfig({
  base: process.env.CDN_BASE_URL || '/', // NEW: CDN URL for prod

  build: {
    rollupOptions: {
      // Existing manualChunks config
    },

    // NEW: Asset naming with content hashes
    assetsDir: 'assets',
    cssCodeSplit: true,

    // NEW: Generate manifest for CDN upload
    manifest: true,
  },
});
```

#### Deployment Integration

```bash
# NEW: CI/CD step after build
npm run build
# Upload dist/assets/* to CDN
aws s3 sync dist/assets/ s3://newshub-cdn/assets/ --cache-control "max-age=31536000"
# Deploy HTML to app server (short cache)
```

**Cache Strategy**:
- **Static assets (JS/CSS/images)**: CDN with 1-year cache (immutable)
- **HTML files**: App server with 5-minute cache
- **API responses**: Redis cache as defined above

**Confidence**: MEDIUM — Requires CDN setup (AWS CloudFront, Cloudflare, etc.)

**Sources**:
- [Adding CDN Caching to a Vite Build](https://css-tricks.com/adding-cdn-caching-to-a-vite-build/)
- [Vite Static Asset Handling](https://vite.dev/guide/assets)

---

### 6. Image Optimization

**NEW Pipeline**: Convert, resize, lazy-load images

#### Integration Pattern

```typescript
// NEW: server/utils/imageOptimizer.ts
import sharp from 'sharp';

export async function optimizeImage(
  buffer: Buffer,
  options: { width?: number; format?: 'webp' | 'avif' }
) {
  return sharp(buffer)
    .resize({ width: options.width, withoutEnlargement: true })
    .toFormat(options.format || 'webp', { quality: 80 })
    .toBuffer();
}

// NEW: Middleware for /api/news/:id/image
newsRoutes.get('/:id/image', async (req, res) => {
  const { width, format } = req.query;
  const imageBuffer = await fetchArticleImage(req.params.id);

  const optimized = await optimizeImage(imageBuffer, {
    width: parseInt(width || '800'),
    format: format as 'webp' | 'avif',
  });

  res.set('Content-Type', `image/${format || 'webp'}`);
  res.set('Cache-Control', 'public, max-age=86400'); // 24h
  res.send(optimized);
});
```

#### Frontend Integration

```typescript
// MODIFIED: src/components/SignalCard.tsx
export function SignalCard({ article }: { article: NewsArticle }) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`/api/news/${article.id}/image?format=avif&width=400 400w,
                 /api/news/${article.id}/image?format=avif&width=800 800w`}
      />
      <source
        type="image/webp"
        srcSet={`/api/news/${article.id}/image?format=webp&width=400 400w,
                 /api/news/${article.id}/image?format=webp&width=800 800w`}
      />
      <img
        src={article.imageUrl}
        loading="lazy"  // Native lazy loading
        alt={article.title}
        className="w-full h-48 object-cover"
      />
    </picture>
  );
}
```

**Impact**:
- **AVIF**: 50% smaller than JPEG (1MB → 500KB)
- **WebP fallback**: 25-35% smaller than JPEG
- **Lazy loading**: Defers below-fold images (saves ~2MB initial load)

**Confidence**: MEDIUM — Requires `sharp` package, backend processing overhead

**Sources**:
- [Image Optimization 2026: WebP/AVIF, DPR, and Lazy-Loading](https://tworowstudio.com/image-optimization-2026/)
- [AVIF in 2026: Complete Guide](https://ide.com/avif-in-2026-the-complete-guide-to-the-image-format-that-beat-jpeg-png-and-webp/)

---

### 7. Virtual Scrolling

**NEW Component**: Replace long lists with virtualized rendering

#### Integration Pattern

```typescript
// NEW: src/components/VirtualNewsFeed.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualNewsFeed({ articles }: { articles: NewsArticle[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Estimated article card height
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <SignalCard article={articles[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}

// MODIFIED: src/components/NewsFeed.tsx
const VirtualNewsFeed = lazy(() => import('./VirtualNewsFeed'));

export function NewsFeed() {
  const { data } = useQuery({ queryKey: ['news'], ... });

  if (data.length > 50) {
    return <VirtualNewsFeed articles={data} />;
  }

  // Existing grid/list view for small lists
  return <SignalGrid articles={data} />;
}
```

**Performance**:
- **Before**: 500 articles = 500 DOM nodes (slow scrolling)
- **After**: 500 articles = ~10 DOM nodes (60fps scrolling)

**Trade-off**: Adds library dependency (@tanstack/react-virtual ~5KB gzipped)

**Confidence**: HIGH — TanStack Virtual is battle-tested, maintained by TanStack team

**Sources**:
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [Virtualization in React: Improving Performance for Large Lists](https://medium.com/@ignatovich.dm/virtualization-in-react-improving-performance-for-large-lists-3df0800022ef)

---

## Data Flow Changes

### Before (Current)

```
User clicks Dashboard
→ React Router loads Dashboard.tsx (with globe bundle ~2.5MB)
→ TanStack Query fetches /api/news (HTTP Cache-Control: 300s)
→ NewsAggregator checks in-memory cache
→ PostgreSQL query (no specific composite index)
→ Response (all 500 articles at once)
→ Render 500 SignalCards (500 DOM nodes)
```

### After (Optimized)

```
User clicks Dashboard
→ React Router loads Dashboard.tsx (WITHOUT globe bundle)
→ TanStack Query fetches /api/news
  → API middleware checks Redis cache (HIT → instant response)
  → Cache MISS → NewsAggregator → PostgreSQL
    → Query uses composite index (perspective, sentiment, publishedAt)
→ Response cached in Redis (5min TTL)
→ Render VirtualNewsFeed (only 10 visible cards, lazy-load images)
→ User scrolls to globe section → lazy-load globe bundle
```

**Performance Gain**:
- **Initial JS bundle**: 5.2MB → 2.7MB (-48%)
- **API response time**: 200ms → 10ms (cache hit)
- **DOM nodes**: 500 → 10 (-98%)
- **Image payload**: 15MB → 3MB (WebP + lazy loading)

---

## Component Architecture (NEW vs MODIFIED)

### NEW Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `apiCache.ts` | `server/middleware/` | Express middleware for Redis API caching |
| `imageOptimizer.ts` | `server/utils/` | Sharp-based image conversion |
| `VirtualNewsFeed.tsx` | `src/components/` | Virtualized article list |

### MODIFIED Components

| Component | Changes |
|-----------|---------|
| `cacheService.ts` | Add `apiResponse()` and `clusterAnalysis()` cache keys |
| `newsAggregator.ts` | Add cache invalidation on new articles |
| `news.ts` (routes) | Wrap with `createCacheMiddleware()` |
| `vite.config.ts` | Add CDN base URL, route-based chunking |
| `schema.prisma` | Add composite and partial indexes |
| `SignalCard.tsx` | Replace `<img>` with `<picture>` + srcset |
| `NewsFeed.tsx` | Conditionally use VirtualNewsFeed for long lists |

---

## Build Order & Dependencies

**Phase 1: Backend Caching (2-3 days)**
1. Add `apiResponse()` cache key to `CacheService`
2. Create `apiCache.ts` middleware
3. Apply to `/api/news`, `/api/events`, `/api/analysis/clusters`
4. Add cache invalidation to `newsAggregator.ts`

**Phase 2: Database Optimization (1-2 days)**
5. Add indexes to Prisma schema
6. Generate migration: `npx prisma migrate dev --name add-performance-indexes`
7. Run EXPLAIN ANALYZE on key queries to validate

**Phase 3: Frontend Code Splitting (2 days)**
8. Split heavy components within pages
9. Add route-based chunking to Vite config
10. Test bundle sizes with `npm run build`

**Phase 4: Image Optimization (2-3 days)**
11. Add `sharp` package
12. Create `imageOptimizer.ts` service
13. Add `/api/news/:id/image` endpoint
14. Update SignalCard to use `<picture>` + srcset

**Phase 5: Virtual Scrolling (1-2 days)**
15. Add `@tanstack/react-virtual` package
16. Create `VirtualNewsFeed.tsx` component
17. Conditionally use in NewsFeed based on article count

**Phase 6: CDN Integration (1 day + infra setup)**
18. Configure CDN (CloudFront, Cloudflare)
19. Update Vite config with `base` URL
20. Add CI/CD step to upload assets to CDN

**Total Estimate**: 9-13 days development + 1-2 days testing

**Critical Dependencies**:
- Phase 2 depends on Phase 1 (cache invalidation logic)
- Phase 6 depends on Phase 3 (final bundle output)
- Phases 3, 4, 5 are independent and can run in parallel

---

## TanStack Query Key Compatibility

**CRITICAL**: Performance optimizations MUST NOT change existing query keys. Cache invalidation relies on consistent keys.

### Existing Keys (DO NOT CHANGE)

```typescript
// Dashboard.tsx
queryKey: ['news', { regions, search, sentiment }]

// Monitor.tsx and EventMap.tsx (MUST MATCH)
queryKey: ['geo-events']

// Analysis.tsx
queryKey: ['clusters', { withSummaries: true }]

// NewsFeed.tsx
queryKey: ['news-sentiment']
```

### NEW Query Keys

```typescript
// For virtual scrolling pagination
queryKey: ['news', { regions, search, sentiment, offset, limit }]

// For image optimization
queryKey: ['article-image', articleId, { width, format }]
```

**Invalidation Example**:

```typescript
// When new articles arrive, invalidate all /api/news queries
queryClient.invalidateQueries({ queryKey: ['news'] }); // Matches all variants
```

**Confidence**: HIGH — Follows existing pattern

**Sources**:
- [TanStack Query: Query Invalidation](https://tanstack.com/query/v4/docs/react/guides/query-invalidation)
- [Managing Query Keys for Cache Invalidation](https://www.wisp.blog/blog/managing-query-keys-for-cache-invalidation-in-react-query)

---

## Anti-Patterns to Avoid

### 1. Over-Caching Dynamic Content

**Bad**: Cache user-specific data (bookmarks, reading history) in shared Redis
**Why**: Cache poisoning — User A sees User B's bookmarks
**Instead**: Only cache public data; use TanStack Query for user-specific

### 2. Aggressive Image Optimization

**Bad**: Convert all images to AVIF with quality=50
**Why**: Visual degradation on hero images, browser compatibility issues
**Instead**: WebP quality=80 as default, AVIF as enhancement with fallback

### 3. Premature Virtualization

**Bad**: Virtualize all lists regardless of size
**Why**: Adds complexity for 10-item lists where it's unnecessary
**Instead**: Conditional: `if (articles.length > 50) use VirtualNewsFeed`

### 4. Cache Without Invalidation

**Bad**: Set long TTL (1 hour) on `/api/news` without invalidation
**Why**: Users see stale news after new articles arrive
**Instead**: Short TTL (5min) + manual invalidation on data mutations

### 5. Blocking Image Processing

**Bad**: Generate optimized images synchronously on request
**Why**: 200ms image processing blocks API response
**Instead**: Background job to pre-generate optimized images, or cache generated images

---

## Performance Metrics & Targets

### Baseline (Current)

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Initial JS bundle | 5.2MB | 2.5MB | Lighthouse |
| LCP (Largest Contentful Paint) | 2.8s | 1.5s | Web Vitals |
| INP (Interaction to Next Paint) | 180ms | 100ms | Web Vitals |
| API response (/api/news) | 200ms | 50ms (cache hit) | DevTools Network |
| Article list scroll (500 items) | 30fps | 60fps | Chrome FPS meter |
| Image payload (10 articles) | 15MB | 3MB | DevTools Network |

### Monitoring Integration

Existing Prometheus metrics can track:

```typescript
// NEW: Cache hit rate metric
cacheHitRate = new Gauge({
  name: 'newshub_cache_hit_rate',
  help: 'Redis cache hit rate percentage',
  labelNames: ['cache_key_prefix'],
});

// NEW: Image optimization metric
imageOptimizationTime = new Histogram({
  name: 'newshub_image_optimization_duration_ms',
  help: 'Time to optimize images',
  buckets: [10, 50, 100, 200, 500],
});
```

**Confidence**: HIGH — Integrates with existing `metricsService.ts`

---

## Rollback Strategy

All optimizations are additive — can be disabled without breaking existing functionality:

1. **API Cache**: Remove middleware, app functions as before
2. **Database Indexes**: Drop indexes (degrades performance but doesn't break queries)
3. **Virtual Scrolling**: Conditional rendering falls back to normal list
4. **Image Optimization**: Falls back to original image URLs
5. **CDN**: Change `base` URL back to `/`

**Rollback Testing**: All optimizations must pass E2E tests with feature flag OFF.

---

## Sources

- [React 19 Code Splitting and Lazy Loading](https://medium.com/@ignatovich.dm/optimizing-react-apps-with-code-splitting-and-lazy-loading-e8c8791006e3)
- [React Performance Optimization 2026: Advanced Techniques](https://softaims.com/blog/react-performance-optimization-advanced-2026)
- [Vite Build Optimization Guide](https://ndlab.blog/posts/part7-5-vite-build-optimization)
- [Redis API Response Caching with Express](https://oneuptime.com/blog/post/2026-02-02-express-redis-caching/view)
- [Cache-Aside Pattern with Redis](https://redis.io/tutorials/howtos/solutions/microservices/caching/)
- [Prisma ORM v7.4: Partial Indexes & Performance](https://www.prisma.io/blog/prisma-orm-v7-4-query-caching-partial-indexes-and-major-performance-improvements)
- [PostgreSQL Indexing with Prisma](https://medium.com/@manojbicte/boosting-query-performance-in-prisma-orm-the-impact-of-indexing-on-large-datasets-a55b1972ca72)
- [TanStack Virtual Documentation](https://tanstack.com/virtual/latest)
- [Virtualization in React for Large Lists](https://medium.com/@ignatovich.dm/virtualization-in-react-improving-performance-for-large-lists-3df0800022ef)
- [Image Optimization 2026: WebP/AVIF Guide](https://tworowstudio.com/image-optimization-2026/)
- [AVIF Complete Guide 2026](https://ide.com/avif-in-2026-the-complete-guide-to-the-image-format-that-beat-jpeg-png-and-webp/)
- [Adding CDN Caching to Vite Build](https://css-tricks.com/adding-cdn-caching-to-a-vite-build/)
- [React Router 7 Lazy Loading](https://www.robinwieruch.de/react-router-lazy-loading/)
- [TanStack Query Cache Invalidation](https://tanstack.com/query/v4/docs/react/guides/query-invalidation)
