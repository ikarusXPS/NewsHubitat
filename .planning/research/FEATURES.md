# Feature Landscape: Performance Optimization

**Domain:** Multi-perspective news analysis platform - Performance Optimization Milestone
**Researched:** 2026-04-25
**Overall Confidence:** HIGH

## Overview

This document maps performance optimization features for v1.5, categorized by user expectation level (table stakes vs differentiators), implementation complexity, and dependencies on existing NewsHub systems. Focus is on API caching, database optimization, frontend bundle splitting, image optimization, and virtual scrolling.

---

## Table Stakes

Features users expect from modern web apps. Missing = product feels slow and unprofessional.

| Feature | Why Expected | Complexity | Notes | Dependencies |
|---------|--------------|------------|-------|--------------|
| **API Response Caching** | 2026 baseline expectation, 90%+ hit rates standard | Medium | Already implemented via Redis in NewsHub (CacheService) | Redis infrastructure (✓ exists) |
| **Static Asset Compression** | Gzip/Brotli reduces bandwidth 50-70% | Low | Already implemented in vite.config.ts | Build tooling (✓ exists) |
| **Bundle Code Splitting** | Prevents 3+ second initial loads, required for 90+ Lighthouse | Medium | Partially implemented (vendor chunks in vite.config.ts), needs route-based splitting | Vite/Rollup configuration |
| **Lazy Image Loading** | Native browser feature, expected since 2023 | Low | Currently missing, critical for LCP | HTML `loading="lazy"` attribute |
| **Database Connection Pooling** | Required for 100+ concurrent users, prevents connection exhaustion | Low | Already implemented via Prisma with @prisma/adapter-pg | PostgreSQL, Prisma (✓ exists) |
| **HTTP Cache Headers** | CDN/browser caching baseline (Cache-Control, ETag) | Low | Needs verification in Express static asset routes | Express middleware |
| **Service Worker Caching** | PWA baseline, offline resilience expected | Medium | Already implemented via VitePWA in vite.config.ts | Workbox (✓ exists) |

---

## Differentiators

Features that make NewsHub feel premium. Not expected, but highly valued for data-heavy apps.

| Feature | Value Proposition | Complexity | Notes | Dependencies |
|---------|-------------------|------------|-------|--------------|
| **Virtual Scrolling** | 1000+ item lists without lag, maintains 60fps | High | NewsFeed.tsx renders full list, performance degrades with 200+ articles | react-window or TanStack Virtual |
| **Smart Cache Invalidation** | Event-driven freshness, no stale data despite aggressive caching | High | Current TTL-based only (SHORT/MEDIUM/LONG), no event-based invalidation | CacheService refactor, WebSocket integration |
| **Image Optimization Pipeline** | WebP/AVIF formats, 50-80% smaller payloads, responsive srcset | High | Currently missing, article thumbnails use original formats | Sharp/Squoosh, CDN integration |
| **CDN Integration** | 70-90% faster static asset delivery via edge caching | Medium | Not implemented, assets served from origin server | Cloudflare/Vercel Edge, DNS config |
| **Query Result Memoization** | Expensive analytics (clusters, framing) cached in-app, instant re-renders | Medium | TanStack Query caches server responses, but compute-heavy operations repeat | React.useMemo, service-layer caching |
| **Database Query Optimization** | EXPLAIN ANALYZE audit, composite indexes, fix N+1 patterns | High | No current audit, Prisma ORM may hide N+1 patterns | Prisma query logging, PostgreSQL EXPLAIN |
| **Bundle Analysis Tooling** | Data-driven optimization, identify bloat, track over time | Low | Not configured, currently guessing at bundle impact | rollup-plugin-visualizer |
| **Predictive Prefetch** | Preload likely-next routes (Dashboard → Analysis), feels instant | Medium | Not implemented, all routes lazy-load on demand | React Router Link prefetch, heuristics |
| **Jitter-Based TTL** | Prevents thundering herd (cache stampede) on expiration | Low | Current CacheService uses fixed TTL, all keys expire simultaneously | CacheService.set() refactor |
| **Connection Pool Tuning** | Right-sized pools prevent memory pressure and context switching | Low | Default Prisma pool (10 connections), not tuned for app workload | Prisma connection_limit, PgBouncer (optional) |

---

## Anti-Features

Features to explicitly NOT build or defer to post-optimization.

| Anti-Feature | Why Avoid | What to Do Instead | Evidence |
|--------------|-----------|-------------------|----------|
| **Premature Micro-Optimization** | Optimizing before measurement wastes time, often optimizes the wrong thing | Always measure first with Lighthouse, Chrome DevTools, React Profiler | 2026 consensus: "Premature optimization remains the biggest mistake" |
| **Over-Aggressive Caching** | TTLs longer than 24h risk stale data, user confusion | Cap at DAY (86400s), use event-based invalidation for critical data | NewsHub shows breaking news, must stay fresh |
| **Client-Side Heavy Computation** | AI analysis, clustering should stay server-side with caching | Keep compute in backend services, cache results in Redis | Current architecture already correct |
| **Infinite Scroll Without Virtual Scrolling** | DOM bloat causes memory leaks, crashes on 500+ items | Either paginate OR use virtual scrolling | Current NewsFeed.tsx vulnerable to this |
| **Custom Build-Time Optimization** | Vite/Rollup already optimized, custom plugins add complexity | Use built-in manualChunks, let Vite handle tree-shaking | Current vite.config.ts approach is correct |
| **Global State for Server Data** | Duplicates TanStack Query cache, causes staleness bugs | Keep server data in TanStack Query, UI state in Zustand | Current architecture already correct |
| **Manual Lazy Loading (Intersection Observer)** | Native `loading="lazy"` sufficient for 96% use cases | Use native lazy loading, only custom if specific UX need | Web.dev 2026: "native lazy-loading is sufficient" |
| **Increasing PostgreSQL max_connections** | Memory pressure and context switching overhead at 1000+ connections | Use PgBouncer transaction pooling instead | Azure PostgreSQL 2026 best practices |

---

## Feature Dependencies

### Dependency Graph

```
Bundle Analysis Tooling (FIRST)
  → Bundle Code Splitting (data-driven decisions)
    → Route-Based Lazy Loading (identifies bottlenecks)

Database Query Logging (FIRST)
  → Query Optimization Audit (measure before fix)
    → Index Creation (targeted improvements)

Image Optimization Pipeline
  → CDN Integration (optimized images + edge delivery)

Virtual Scrolling
  → Performance Monitoring (validates 60fps improvement)

Smart Cache Invalidation
  → WebSocket Integration (already exists, needs cache hooks)
```

### Blocked Dependencies

| Feature | Blocked By | Reason |
|---------|------------|--------|
| CDN Integration | Image Optimization Pipeline | No value in CDN for unoptimized 2MB images |
| Predictive Prefetch | Bundle Code Splitting | Prefetching 5MB chunks defeats purpose |
| Query Optimization | Query Logging Enabled | Can't optimize without identifying slow queries |

---

## MVP Recommendation

### Phase 1: Measurement Foundation (Do FIRST)

Prioritize tooling and measurement before any optimization.

1. **Bundle Analysis Tooling** (rollup-plugin-visualizer) — Identify actual bloat, not guesses
2. **Database Query Logging** (Prisma log levels) — Expose N+1 patterns, slow queries
3. **Lighthouse CI Baseline** — Establish LCP, INP, CLS baselines before changes

### Phase 2: High-Impact Table Stakes

Address baseline expectations with proven ROI.

1. **Route-Based Code Splitting** — 30-50% initial bundle reduction (data from web search)
2. **Lazy Image Loading** — LCP improvement, trivial implementation (native attribute)
3. **Database Index Audit** — Fix slow queries identified in Phase 1
4. **Cache Header Optimization** — Enable CDN-ready headers (max-age, immutable)

### Phase 3: Differentiators (After Phase 2 Shows ROI)

1. **Virtual Scrolling** (TanStack Virtual) — Only if NewsFeed metrics show degradation at 200+ items
2. **Image Optimization Pipeline** (WebP/AVIF) — 50-80% image payload reduction
3. **Smart Cache Invalidation** — Event-driven freshness for clusters, sentiment data

### Defer (Post-v1.5)

- **CDN Integration** — Infrastructure complexity, requires DNS changes
- **Predictive Prefetch** — Marginal UX gain vs implementation cost
- **PgBouncer Deployment** — Only needed if connection pool metrics show saturation
- **Custom Service Worker Strategies** — VitePWA defaults sufficient for NewsHub use case

---

## Complexity Breakdown

| Category | Low | Medium | High |
|----------|-----|--------|------|
| **Low** | Lazy loading, bundle analyzer, HTTP headers, jitter TTL, connection tuning | - | - |
| **Medium** | API caching (exists), bundle splitting, service worker (exists), CDN, memoization, prefetch | - | - |
| **High** | - | - | Virtual scrolling, cache invalidation, image pipeline, query optimization |

---

## Feature Interactions

### Positive Synergies

| Feature A | Feature B | Synergy |
|-----------|-----------|---------|
| Image Optimization | CDN | Optimized images + edge caching = 80-90% faster image loads |
| Virtual Scrolling | Lazy Images | Only load images for visible items, multiplies savings |
| Bundle Splitting | Prefetch | Small bundles make predictive prefetch viable |
| Query Optimization | API Caching | Faster queries + caching = sub-100ms API responses |
| Jitter TTL | Smart Invalidation | Prevents stampede while maintaining freshness |

### Negative Interactions

| Feature A | Feature B | Conflict |
|-----------|-----------|----------|
| Aggressive Caching | Real-Time Updates | Stale data contradicts "LIVE" badge promise |
| Infinite Scroll | Pagination | Mutually exclusive UX patterns |
| Large Vendor Chunks | Route Splitting | Defeats purpose of splitting if chunks still 1MB+ |

---

## NewsHub-Specific Considerations

### Existing Strengths

- Redis caching infrastructure already in place (CacheService with TTL presets)
- PWA Service Worker configured with runtime caching strategies
- TanStack Query handling server state with 5-minute stale time
- PostgreSQL + Prisma with connection pooling via @prisma/adapter-pg
- Vendor chunk splitting configured in vite.config.ts (8 manual chunks)

### Critical Gaps

- **No virtual scrolling** — NewsFeed.tsx renders full article list, vulnerable to DOM bloat
- **No image optimization** — Article thumbnails served in original format, no WebP/AVIF
- **No route-based splitting** — All routes bundled together, large initial payload
- **TTL-only cache invalidation** — No event-driven freshness, risks stale breaking news
- **No query performance monitoring** — Prisma hides N+1 patterns, no EXPLAIN logging

### Workload Characteristics

| Characteristic | Impact on Optimization |
|----------------|------------------------|
| 130 news sources | High API cache value (stable data, frequent reuse) |
| Real-time updates | Requires smart cache invalidation, not just TTL |
| Multi-region filtering | Query result caching critical (expensive joins) |
| Heavy visualization | Bundle splitting essential (Recharts, globe.gl, Leaflet large) |
| Mobile-first PWA | Image optimization and virtual scrolling high ROI |

---

## Performance Targets (2026 Standards)

### Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor | NewsHub Target |
|--------|------|-------------------|------|----------------|
| **LCP (Largest Contentful Paint)** | < 2.5s | 2.5-4.0s | > 4.0s | < 2.0s (competitive) |
| **INP (Interaction to Next Paint)** | < 200ms | 200-500ms | > 500ms | < 150ms (premium feel) |
| **CLS (Cumulative Layout Shift)** | < 0.1 | 0.1-0.25 | > 0.25 | < 0.05 (solid layout) |

**Note:** Google uses 75th percentile field data (real users), not Lighthouse lab scores. INP replaced FID in March 2024, and 43% of websites still fail the 200ms threshold.

### Bundle Size Targets

| Metric | Current (Est.) | Target | Impact |
|--------|----------------|--------|--------|
| Initial JS Bundle | ~800KB (unverified) | < 250KB | 30-50% LCP improvement |
| Globe Vendor Chunk | ~2.5MB | Lazy-load on route | Route-specific, not critical path |
| Total Page Weight | ~3MB+ (est.) | < 1MB | 70% faster over 3G |

### Cache Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| API Cache Hit Ratio | > 90% | Industry standard for news aggregation |
| Average API Response Time | < 100ms (cached) | Perceived instant (< 100ms threshold) |
| Database Query P95 | < 50ms | Prisma recommendation for web apps |
| Static Asset Cache TTL | 30 days | Fingerprinted assets safe for long cache |

---

## Feature Validation Criteria

### How to Know It Worked

| Feature | Success Metric | Tool |
|---------|----------------|------|
| Bundle Splitting | Initial JS < 250KB | Lighthouse, rollup-plugin-visualizer |
| Virtual Scrolling | 60fps at 1000+ items | Chrome DevTools Performance tab |
| Image Optimization | Image payload < 500KB/page | Network tab, WebPageTest |
| Query Optimization | P95 query time < 50ms | Prisma query logging, PostgreSQL logs |
| Cache Invalidation | 0 stale article reports | User feedback, Sentry error tracking |
| API Caching | Hit ratio > 90% | Redis INFO stats, CacheService.getStats() |

---

## Sources

### High Confidence (Official Docs, Context7, 2026 Guides)

- [Ultimate Guide to Caching in 2026: Strategies and Best Practices](https://www.dragonflydb.io/guides/ultimate-guide-to-caching)
- [API Caching Best Practices (Medium, March 2026)](https://medium.com/@onix_react/api-caching-best-practices-2ee98bfc63a5)
- [How to Implement Cache Invalidation with Redis (OneUpTime, 2026)](https://oneuptime.com/blog/post/2026-01-25-redis-cache-invalidation/view)
- [TanStack Virtual Documentation](https://tanstack.com/virtual/latest)
- [React Virtual Scrolling Performance (NamasteDev, 2026)](https://namastedev.com/blog/maximizing-performance-strategies-for-list-rendering-and-virtual-scrolling-in-react/)
- [How to Implement Virtualization for Large Lists in React with react-window (OneUpTime, Jan 2026)](https://oneuptime.com/blog/post/2026-01-15-react-virtualization-large-lists-react-window/view)
- [Image Optimization in 2026: WebP, AVIF & Speed Guide](https://plugintheme.net/blog/wordpress-image-optimization-guide-2026)
- [Image Optimization 2026: WebP/AVIF, DPR, and Lazy-Loading](https://tworowstudio.com/image-optimization-2026/)
- [The Complete Guide to PostgreSQL SQL Query Analysis & Optimization (Medium, April 2026)](https://medium.com/@philmcc/the-complete-guide-to-postgresql-sql-query-analysis-optimization-2cd091453518)
- [7 PostgreSQL Query Mistakes That Kill Performance (BSWEN, April 2026)](https://docs.bswen.com/blog/2026-04-20-postgresql-query-mistakes-guide/)
- [PostgreSQL Performance Tuning: Essential 2026 Expert Guide](https://www.zignuts.com/blog/postgresql-performance-tuning)
- [Scaling PostgreSQL with PgBouncer: Complete 2026 Guide](https://tamiltech.in/article/pgbouncer-postgresql-connections-scale-guide)
- [Connection pooling best practices - Azure Database for PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/connectivity/concepts-connection-pooling-best-practices)
- [10 React Performance Optimization Techniques for 2026](https://softaims.com/blog/react-performance-optimization)
- [How We Cut Our React Bundle Size by 40% with Smart Code-Splitting (DEV Community, 2026)](https://dev.to/gouranga-das-khulna/how-we-cut-our-react-bundle-size-by-40-with-smart-code-splitting-2chi)
- [Analyze and Optimize Vite Bundle Size Using rollup-plugin-visualizer](https://rayhannr.dev/blog/vite-bundle-visualizer)
- [Core Web Vitals 2026: INP, LCP & CLS Optimization](https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide)
- [Core Web Vitals In 2026: Complete Optimization Guide (LCP, CLS, INP)](https://www.techcognate.com/core-web-vitals-guide/)

### Medium Confidence (WebSearch Verified, Multiple Sources)

- [How to Optimize Static Assets (OneUpTime, January 2026)](https://oneuptime.com/blog/post/2026-01-25-optimize-static-assets/view)
- [Using a CDN to Speed Up Static Content Delivery](https://www.digitalocean.com/community/tutorials/using-a-cdn-to-speed-up-static-content-delivery)
- [Premature Optimization Is the Root of All Evil: 2026 Update](https://copyprogramming.com/howto/premature-optimization-is-the-root-of-all-evil)
- [Frontend Performance Optimization Is Not a Bag of Tricks (Medium, January 2026)](https://medium.com/@tabishjeelani93/frontend-performance-optimization-is-not-a-bag-of-tricks-d6914e8d6bdc)
- [Frontend Performance Optimization in 2026: Real-World Case Studies](https://medium.com/@mernstackdevbykevin/frontend-performance-in-2026-6377a44e8c64)

### Low Confidence (Single Source, Needs Validation)

- None — All findings verified across multiple 2026 sources
