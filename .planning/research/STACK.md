# Technology Stack — Performance Optimization

**Project:** NewsHub v1.5 - Performance Optimization
**Researched:** 2026-04-25
**Confidence:** HIGH

## Executive Summary

This research identifies the specific libraries and tools needed to add performance optimization features to the existing NewsHub application. The recommendations focus on **incremental additions** to the validated v1.4 stack (React 19, Vite 8, Express 5, PostgreSQL via Prisma 7, Redis) rather than replacing existing infrastructure.

**Key principles:**
- **Leverage existing infrastructure** — Redis already available for cache invalidation, PostgreSQL for query optimization
- **Native-first approach** — Use built-in browser APIs (Intersection Observer, native lazy loading) before third-party libraries
- **Zero breaking changes** — All additions are opt-in and backward compatible

## Recommended Stack Additions

### Virtual Scrolling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@tanstack/react-virtual** | 3.13.24 | Virtual scrolling for news feeds | Headless (10-15KB), supports variable sizing, infinite scroll, smooth scrolling. React 19 compatible. Actively maintained by TanStack. |

**Alternatives considered:**
- `react-window` — Lighter (2-3KB) but lacks dynamic sizing and infinite scroll features needed for news feeds
- `react-virtualized` — Deprecated, 30KB, not recommended for new projects in 2026

**Installation:**
```bash
npm install @tanstack/react-virtual
```

**Why @tanstack/react-virtual:**
- Handles variable-height news cards (different content lengths)
- Built-in infinite scroll support for pagination
- Framework-agnostic core with React adapter
- 60 FPS rendering for thousands of items
- Active maintenance (latest release: 7 days ago as of April 2026)

---

### Image Optimization (Backend)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **sharp** | 0.34.5 | Server-side image processing | 4-5x faster than ImageMagick. Native AVIF/WebP support. Used by Next.js. Node 18+ compatible. |

**Installation:**
```bash
npm install sharp
```

**Why sharp:**
- **Performance:** Uses libvips (C library) for exceptional speed
- **Formats:** JPEG, PNG, WebP, AVIF, GIF, SVG, TIFF support
- **Quality:** AVIF at quality 60-70 = JPEG 85; WebP at 75-85 = JPEG 85
- **Ecosystem:** Industry standard (Next.js default, 1M+ weekly downloads)
- **Compression:** WebP 25-35% smaller than JPEG, AVIF 50% smaller

**Use cases:**
- Convert uploaded images to WebP/AVIF
- Generate responsive image sets (srcset)
- Optimize thumbnails for article cards
- Resize images for different viewports

---

### Image Optimization (Frontend Build)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **vite-imagetools** | 9.0.2 | Build-time image optimization | Generates srcset, converts formats, integrates with Vite import system. Works at build time (zero runtime overhead). |

**Installation:**
```bash
npm install -D vite-imagetools
```

**Why vite-imagetools:**
- **Zero runtime cost** — All transformations happen at build time
- **Developer experience** — Import images with query parameters: `?w=200;400;800`
- **Automatic srcset** — Generates responsive image sets automatically
- **Format conversion** — WebP/AVIF conversion via import directives
- **Vite integration** — First-class support for Vite's module system

**Example usage:**
```typescript
// Generates srcset with 200px, 400px, 800px versions
import srcset from '../images/hero.jpg?w=200;400;800&format=webp'
```

---

### Lazy Loading (Images)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **react-intersection-observer** | 10.0.3 | Lazy load images on scroll | Lightweight wrapper for native IntersectionObserver API. Provides hooks and render props. React 19 compatible. |

**Installation:**
```bash
npm install react-intersection-observer
```

**Why react-intersection-observer:**
- **Native API wrapper** — Uses browser's IntersectionObserver (no polyfill needed for modern browsers)
- **React 19 compatible** — Latest version supports React 19 hooks
- **Reuses instances** — Optimizes performance by sharing observer instances
- **Testing support** — Built-in utilities for Jest/Vitest
- **Preloading** — Supports 50px margin for preloading before viewport

**Hybrid approach (recommended):**
```tsx
// Use native loading="lazy" with Intersection Observer fallback
<img
  src={src}
  loading="lazy"  // Native lazy loading
  ref={ref}       // Intersection Observer for older browsers
  className={inView ? 'loaded' : 'loading'}
/>
```

**Note:** For critical above-the-fold images (LCP elements), use `loading="eager"` and `fetchPriority="high"` to avoid 35% slower LCP.

---

### Response Compression

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **compression** | 1.7.5 | HTTP response compression | Standard Express middleware. Brotli + gzip support. Zero config for most use cases. |

**Installation:**
```bash
npm install compression
```

**Why compression (not shrink-ray-current):**
- **Stability** — Standard Express.js middleware, battle-tested
- **Brotli support** — Automatic Brotli compression (70-90% size reduction)
- **Fallback chain** — Tries Brotli → gzip → deflate based on Accept-Encoding
- **Zero config** — Works out-of-box with `app.use(compression())`
- **Maintenance** — Actively maintained, unlike shrink-ray-current (last update 2021)

**Configuration (recommended):**
```typescript
app.use(compression({
  threshold: 1024,  // Only compress responses > 1KB
  level: 6,         // Balance between speed and compression
}));
```

**Performance:**
- Reduces API response sizes by 70-90%
- Brotli: 95ms encoding time (2.5x faster than gzip in 2026 benchmarks)
- gzip: Universal browser support fallback

---

### Cache Management (No New Library Needed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **ioredis** | ✓ Existing | Redis client with cache patterns | Already in use for JWT blacklist and rate limiting. Supports clustering, pipelining, Sentinel. |

**What's needed:** Implementation patterns, not new libraries.

**Cache invalidation strategies:**

1. **TTL-Based Expiration** (simplest)
```typescript
// Set cache with TTL
await redis.setex(key, 300, JSON.stringify(data));  // 5 minutes
```

2. **Event-Driven Invalidation** (for strong consistency)
```typescript
// Invalidate when data changes
async function updateArticle(id: string, data: any) {
  await db.article.update({ where: { id }, data });
  await redis.del(`article:${id}`);  // Invalidate cache
  await redis.del('article:list:*');  // Invalidate list caches
}
```

3. **Tag-Based Invalidation** (for complex dependencies)
```typescript
// Store tag-to-key mappings
await redis.sadd(`tag:region:usa`, `article:${id}`);
// Invalidate all articles in region
const keys = await redis.smembers('tag:region:usa');
await redis.del(...keys);
```

**Recommended pattern for NewsHub:**
- **TTL for read-heavy data:** Article lists (5 min), sentiment stats (10 min)
- **Event-driven for writes:** Article updates, user preferences
- **Tag-based for regions:** Invalidate by region/source when new articles arrive

**Connection pooling (already configured):**
- ioredis uses single connection with multiplexing (no pooling library needed)
- For high concurrency: Use `generic-pool` with ioredis (only if metrics show bottleneck)

---

### Database Query Optimization (No New Library Needed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Prisma** | 7.x (existing) | ORM with query optimization tools | Built-in `@@index` directive, Query Insights included with Prisma Postgres. |
| **pg_stat_statements** | Built-in | PostgreSQL query statistics | Tracks every query's execution time, call count, resource usage. Essential for finding slow queries. |

**What's needed:** Enable extensions and use built-in Prisma tools.

**Setup steps:**

1. **Enable pg_stat_statements** (PostgreSQL extension)
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

2. **Find slow queries**
```sql
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

3. **Add indexes in Prisma schema**
```prisma
model NewsArticle {
  id        String   @id @default(cuid())
  region    String
  sentiment String
  createdAt DateTime @default(now())

  @@index([region, createdAt])  // Composite index for region filtering + sorting
  @@index([sentiment])           // Single-column index for sentiment filtering
}
```

4. **Use Prisma Query Insights** (included with Prisma Postgres)
```bash
# Install SQL commenter for ORM attribution
npm install @prisma/sqlcommenter-query-insights
```

**Tools for analysis:**
- **pganalyze** ($149/month) — Index Advisor with "What If?" analysis, tries hundreds of index combinations
- **pgMustard** (€95/year) — EXPLAIN plan visualization, identifies index-only scan potential, late filters
- **Built-in EXPLAIN ANALYZE** (free) — PostgreSQL's query planner output

**For NewsHub:** Start with free tools (pg_stat_statements, EXPLAIN ANALYZE, Prisma Query Insights). Add paid tools only if complex queries justify cost.

---

### Code Splitting (No New Library Needed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vite** | 8.x (existing) | Build tool with automatic code splitting | Built-in support for dynamic imports, route-based splitting via `React.lazy()`. |

**What's needed:** Implementation patterns using existing Vite + React features.

**Route-based code splitting (recommended):**
```typescript
// Before: Direct import (all routes in main bundle)
import Dashboard from './pages/Dashboard';

// After: Lazy import (Dashboard in separate chunk)
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Dashboard />
</Suspense>
```

**Manual chunk configuration (if needed):**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'charts': ['recharts', 'globe.gl'],
          'ui': ['@headlessui/react', 'framer-motion'],
        }
      }
    }
  }
});
```

**Best practices:**
- **Route-level splitting** — Easiest win, split by page
- **Avoid micro-chunks** — Too many small chunks hurts performance
- **Preload critical chunks** — Vite adds `<link rel="modulepreload">` automatically

---

### CDN Integration (No New Library Needed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vite `base` config** | Built-in | CDN URL prefix for static assets | Native Vite feature, no plugin needed. |

**What's needed:** Configuration, not libraries.

**For Cloudflare CDN (recommended for NewsHub):**

1. **Update Vite config**
```typescript
// vite.config.ts
export default defineConfig({
  base: process.env.NODE_ENV === 'production'
    ? 'https://cdn.newshub.example.com/'
    : '/',
});
```

2. **Deploy static assets to Cloudflare Workers**
```json
// wrangler.jsonc
{
  "name": "newshub-cdn",
  "compatibility_date": "2026-04-25",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS"
  }
}
```

**Why Cloudflare:**
- **Free tier** — No cost for moderate traffic
- **Global network** — 330+ data centers
- **Auto SSL** — Free SSL certificates
- **DDoS protection** — Built-in
- **Cache control** — 80% reduction in origin server load
- **Brotli support** — Automatic compression

**Alternative:** If already using another CDN (AWS CloudFront, Fastly), just update `base` config to point to CDN URL.

---

## What NOT to Add

| Library | Why NOT |
|---------|---------|
| **Next.js Image component** | NewsHub uses Vite, not Next.js. Use sharp + vite-imagetools instead. |
| **react-window** | Too limited — lacks variable sizing and infinite scroll needed for news feeds. |
| **shrink-ray-current** | Unmaintained (last update 2021). Use standard `compression` middleware. |
| **generic-pool** (for Redis) | ioredis uses single connection with multiplexing. Add pooling only if metrics show bottleneck. |
| **pganalyze/pgMustard** (initially) | Start with free tools (pg_stat_statements, EXPLAIN ANALYZE). Add paid tools only if justified. |
| **Separate bundler plugins** | Vite handles code splitting natively via React.lazy(). No plugin needed. |

---

## Integration Points

### 1. Virtual Scrolling → NewsFeed Component
```typescript
// src/components/NewsFeed.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: articles.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 350,  // Estimated card height
  overscan: 5,              // Render 5 extra items for smooth scrolling
});
```

### 2. Image Optimization → Article Upload Flow
```typescript
// server/routes/articles.ts
import sharp from 'sharp';

// Convert uploaded image to WebP + AVIF
await sharp(inputBuffer)
  .resize(1200, 630, { fit: 'cover' })
  .webp({ quality: 80 })
  .toFile('output.webp');

await sharp(inputBuffer)
  .resize(1200, 630, { fit: 'cover' })
  .avif({ quality: 65 })
  .toFile('output.avif');
```

### 3. Lazy Loading → SignalCard Component
```typescript
// src/components/SignalCard.tsx
import { useInView } from 'react-intersection-observer';

const { ref, inView } = useInView({
  triggerOnce: true,
  rootMargin: '50px',  // Preload 50px before entering viewport
});

<img ref={ref} src={inView ? imageUrl : placeholder} loading="lazy" />
```

### 4. Cache Invalidation → News Aggregator Service
```typescript
// server/services/newsAggregator.ts
async function fetchNewArticles() {
  const articles = await fetchFromSources();
  await db.article.createMany({ data: articles });

  // Invalidate caches
  await redis.del('articles:list');
  await redis.del('articles:count:*');
  articles.forEach(a => redis.sadd(`tag:region:${a.region}`, `article:${a.id}`));
}
```

### 5. Response Compression → Express App Setup
```typescript
// server/index.ts
import compression from 'compression';

app.use(compression({
  threshold: 1024,
  level: 6,
}));
```

### 6. Code Splitting → Router Configuration
```typescript
// src/App.tsx
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Analysis = React.lazy(() => import('./pages/Analysis'));
const Monitor = React.lazy(() => import('./pages/Monitor'));

<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/analysis" element={<Analysis />} />
    <Route path="/monitor" element={<Monitor />} />
  </Routes>
</Suspense>
```

---

## Dependencies Summary

### Production Dependencies
```json
{
  "dependencies": {
    "@tanstack/react-virtual": "^3.13.24",
    "compression": "^1.7.5",
    "react-intersection-observer": "^10.0.3",
    "sharp": "^0.34.5"
  },
  "devDependencies": {
    "vite-imagetools": "^9.0.2"
  }
}
```

### PostgreSQL Extensions (enable via SQL)
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Optional (add only if metrics justify)
```json
{
  "dependencies": {
    "@prisma/sqlcommenter-query-insights": "latest"  // ORM-level query attribution
  }
}
```

---

## Installation Script

```bash
# Install production dependencies
npm install @tanstack/react-virtual compression react-intersection-observer sharp

# Install dev dependencies
npm install -D vite-imagetools

# Enable PostgreSQL extension (run in database)
psql -d newshub -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Optional: Prisma Query Insights
# npm install @prisma/sqlcommenter-query-insights
```

---

## Validation Checklist

Before marking research complete:

- [x] All libraries have current versions (verified via npm, official docs)
- [x] Integration points identified for existing codebase
- [x] Alternatives considered with rationale for rejection
- [x] Zero breaking changes to existing stack
- [x] Native browser APIs prioritized over third-party libraries
- [x] Performance benefits quantified from official sources
- [x] Installation and setup steps provided
- [x] "What NOT to add" section prevents scope creep

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Virtual Scrolling | HIGH | @tanstack/react-virtual is industry standard, React 19 compatible, actively maintained |
| Image Optimization (Backend) | HIGH | sharp is Next.js default, 4-5x faster than alternatives, stable API |
| Image Optimization (Frontend) | HIGH | vite-imagetools integrates with existing Vite setup, zero runtime cost |
| Lazy Loading | HIGH | Native IntersectionObserver API + react-intersection-observer wrapper, proven pattern |
| Compression | HIGH | Standard Express middleware, Brotli benchmarks from 2026 sources |
| Cache Invalidation | MEDIUM | Patterns are well-established, but NewsHub-specific TTL values need tuning |
| Database Optimization | HIGH | Prisma 7 + pg_stat_statements are standard tools, Query Insights included |
| Code Splitting | HIGH | Vite 8 built-in feature, React.lazy() is React 19 standard |
| CDN Integration | MEDIUM | Cloudflare configuration is straightforward, but NewsHub needs DNS setup |

**Overall confidence:** HIGH — All recommendations use stable, well-documented libraries with active maintenance.

---

## Sources

**Virtual Scrolling:**
- [TanStack Virtual Documentation](https://tanstack.com/virtual/latest)
- [TanStack Virtual React Adapter](https://tanstack.com/virtual/v3/docs/framework/react/react-virtual)
- [@tanstack/react-virtual npm](https://www.npmjs.com/package/@tanstack/react-virtual)

**Image Optimization:**
- [sharp npm package](https://www.npmjs.com/package/sharp)
- [sharp Official Documentation](https://sharp.pixelplumbing.com/)
- [Image Optimization in 2026: WebP/AVIF](https://tworowstudio.com/image-optimization-2026/)
- [Optimise Images with Sharp in Node.js — 2026 Guide](https://meisteritsystems.com/news/optimise-images-with-sharp-in-node-js-full-2026-guide/)
- [vite-imagetools npm](https://www.npmjs.com/package/vite-imagetools)
- [vite-imagetools GitHub](https://github.com/JonasKruckenberg/imagetools)

**Lazy Loading:**
- [react-intersection-observer npm](https://www.npmjs.com/package/react-intersection-observer)
- [react-intersection-observer GitHub](https://github.com/thebuilder/react-intersection-observer)
- [Lazy Loading React Components using Intersection Observer](https://huzaima.io/blog/lazy-loading-react-components-intersection-observer)

**Compression:**
- [Express compression middleware](https://expressjs.com/en/resources/middleware/compression.html)
- [How to Use Compression in Express.js](https://oneuptime.com/blog/post/2026-01-22-nodejs-express-compression/view)
- [HTTP Compression in Node.js: Gzip, Deflate, and Brotli](https://www.ayrshare.com/http-compression-in-node-js-a-dive-into-gzip-deflate-and-brotli/)

**Cache Management:**
- [Redis Cache Invalidation](https://oneuptime.com/blog/post/2026-01-25-redis-cache-invalidation/view)
- [Redis Caching Patterns](https://oneuptime.com/blog/post/2026-01-26-redis-caching-patterns/view)
- [How to Configure Connection Pooling for Redis](https://oneuptime.com/blog/post/2026-01-25-redis-connection-pooling/view)
- [Getting Started with Node.js and Redis](https://redis.io/tutorials/develop/node/gettingstarted/)

**Database Optimization:**
- [Prisma Query Optimization](https://www.prisma.io/docs/postgres/query-optimization)
- [How to Use pg_stat_statements for Query Analysis](https://oneuptime.com/blog/post/2026-01-25-use-pg-stat-statements-query-analysis/view)
- [pganalyze Index Advisor](https://pganalyze.com/index-advisor)
- [Improving query performance with Prisma indexes](https://www.prisma.io/blog/improving-query-performance-using-indexes-1-zuLNZwBkuL)

**Code Splitting:**
- [Boost Your React App's Performance with Vite and Code Splitting](https://benmukebo.medium.com/boost-your-react-apps-performance-with-vite-lazy-loading-and-code-splitting-2fd093128682)
- [Vite Code Splitting That Just Works](https://www.sambitsahoo.com/blog/vite-code-splitting-that-works.html)
- [How to Implement Code Splitting in React](https://oneuptime.com/blog/post/2026-01-15-react-code-splitting-lazy-loading/view)

**CDN Integration:**
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [CDN Configuration for Hugo Sites: Cloudflare](https://dasroot.net/posts/2026/01/cdn-configuration-hugo-cloudflare-beyond/)
- [Adding CDN Caching to a Vite Build](https://css-tricks.com/adding-cdn-caching-to-a-vite-build/)
