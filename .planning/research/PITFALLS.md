# Domain Pitfalls

**Domain:** Performance Optimization
**Context:** Adding performance optimizations to existing NewsHub (v1.4) with PostgreSQL, Redis, TanStack Query, React 19, Express 5, Zustand
**Researched:** 2026-04-25

---

## Critical Pitfalls

Mistakes that cause data loss, severe performance degradation, or production outages.

### CP-01: Redis Cache Key Explosion from Missing TTLs

**What goes wrong:** Cache keys accumulate indefinitely. Redis memory usage grows unbounded. Eventually hits maxmemory limit, causing evictions of critical data (JWT blacklist, rate limits) or OOM crashes.

**Why it happens:** Storing cache keys without expiration because "we'll handle cleanup manually" or "this data is important." But cleanup never happens. NewsHub currently has:
- AI response cache (potentially unlimited article combinations)
- Translation cache (130 sources × many languages)
- Query result cache (clusters, analytics, sentiment stats)

**Consequences:**
- Redis maxmemory reached → critical data evicted (JWT blacklist fails, allowing revoked tokens)
- Rate limiting breaks → API abuse succeeds
- Production outage requiring Redis flush (losing ALL cache data)
- Cache hit ratio plummets due to constant evictions

**Prevention:**
- **MANDATORY TTL on ALL cache keys** — No exceptions
- Use Redis `SETEX` or `SET key value EX seconds` — never plain `SET`
- Different TTLs by data type:
  - AI responses: 24 hours (content changes daily)
  - Translation cache: 7 days (static translations)
  - Query results: 5 minutes (news platform, real-time)
  - JWT blacklist: 7 days (token expiration)
- Add jitter to TTLs to prevent thundering herd: `TTL + random(0, 60)`
- Monitor Redis memory usage with alerts at 70% and 85%

**Detection:**
- Warning signs: Redis memory climbing steadily over weeks
- Grep codebase for `redis.set(` without `EX` parameter
- Redis CLI: `KEYS *` count growing indefinitely
- Monitor: Track keys without TTL (`TTL key` returns -1)

**Phase:** API Response Caching (implementation, first cache added)

**Sources:**
- [Redis Anti-Patterns: Common Mistakes](https://redis.io/tutorials/redis-anti-patterns-every-developer-should-avoid/) - HIGH confidence
- [Redis Caching Pitfalls](https://medium.com/@QuarkAndCode/redis-caching-pitfalls-invalidation-testing-best-practices-3950a0660f1a) - HIGH confidence

---

### CP-02: Cache Invalidation Cascade Failures

**What goes wrong:** Article is updated. Backend invalidates `article:123` cache. BUT related caches remain stale:
- Story cluster still references old article title
- Sentiment stats include old sentiment classification
- NewsSource article count is outdated
- Translation cache has old content

Users see mixed data: new article headline with old sentiment, breaking trust.

**Why it happens:** Cache keys designed independently. No tracking of dependencies. When NewsHub updates an article (rare but happens: corrections, sentiment re-classification), invalidating just `article:id` isn't enough.

**Consequences:**
- Data inconsistency visible to users ("This article is positive" but content shows negative sentiment)
- Breaks coverage gap detection (old article counted in region coverage)
- User confusion and bug reports
- Emergency cache flush required (losing all cache benefits)

**Prevention:**
- **Tag-based invalidation pattern**: Store tag-to-key mappings
  ```typescript
  // When caching article
  await redis.set(`article:123`, data, 'EX', 3600);
  await redis.sadd(`tag:article:123`, `article:123`, `cluster:45`, `sentiment:usa`);

  // When invalidating
  const keys = await redis.smembers(`tag:article:123`);
  await redis.del(...keys);
  ```
- Document cache dependencies in CACHE-DEPENDENCIES.md
- Prefer short TTLs (5 minutes) over complex invalidation for NewsHub's real-time nature
- Use `stale-while-revalidate` pattern: serve cached data while fetching fresh in background

**Detection:**
- Test scenario: Update article sentiment → verify all related endpoints return updated data
- Monitor for spikes in support tickets about "wrong data"
- Automated tests for invalidation coverage

**Phase:** API Response Caching (architecture design before implementation)

**Sources:**
- [Three Ways to Maintain Cache Consistency](https://redis.io/blog/three-ways-to-maintain-cache-consistency/) - HIGH confidence
- [Tag-Based Invalidation Pattern](https://medium.com/@rup.singh88/redis-caching-cache-invalidation-a-complete-guide-cc822b87aa4d) - MEDIUM confidence

---

### CP-03: TanStack Query Cache Invalidation Missing at Scale

**What goes wrong:** Frontend cache gets stale. User bookmarks an article, but bookmark icon doesn't update. User creates team, but team list doesn't refresh. No warnings, just silent staleness.

**Why it happens:** NewsHub already uses TanStack Query. Adding features means new mutations. Developers forget to invalidate related queries. "No built-in way to catch missing invalidations, other than manually testing."

**Specific NewsHub risks:**
- Bookmark mutation → must invalidate `['news']`, `['bookmarks']`, `['user-stats']`
- Team creation → must invalidate `['teams']`, `['leaderboard']`
- Reading history → must invalidate `['history']`, `['recommendations']`, `['badges']`

**Consequences:**
- Stale UI showing outdated data
- User sees unbookmarked article despite clicking bookmark
- Gamification badges don't update (user earned badge but doesn't see it)
- Users think feature is broken, stop using it

**Prevention:**
- **Invalidation checklist** in mutation implementation:
  ```typescript
  // BAD: Missing invalidations
  const { mutate } = useMutation({
    mutationFn: bookmarkArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      // MISSING: ['news'], ['user-stats']
    },
  });

  // GOOD: Complete invalidation
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    queryClient.invalidateQueries({ queryKey: ['news'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
  }
  ```
- Document query key relationships in QUERY-KEYS.md
- Organize query keys hierarchically: `['news', 'article', id]` so `['news']` invalidates all
- Test EVERY mutation with React Query DevTools to verify refetch behavior
- Use `exact: false` for broader invalidation: `invalidateQueries({ queryKey: ['news'] })` invalidates `['news', 'article', 123]`

**Detection:**
- Test: Perform mutation → check if related UI updates immediately
- React Query DevTools: Watch for queries marked "stale" but not refetching
- User testing: "Does everything feel live?"

**Phase:** Query Result Caching (every mutation added to codebase)

**Sources:**
- [TanStack Query Invalidation Guide](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) - HIGH confidence
- [Missing Invalidations Discussion](https://github.com/TanStack/query/discussions/2104) - HIGH confidence
- [Stale UI Intermittently](https://github.com/TanStack/query/discussions/6953) - MEDIUM confidence

---

### CP-04: PostgreSQL Over-Indexing Destroys Write Performance

**What goes wrong:** Adding indexes to "speed up queries" actually slows down the app. Article insertion latency increases from 50ms to 300ms. RSS aggregation starts timing out.

**Why it happens:** Every index added = slower writes. Benchmark data: increasing indexes from 7 to 39 reduced throughput to 42% (TPS dropped from ~1400 to ~600). NewsHub's write-heavy operations:
- RSS aggregation: bulk insert 100s of articles
- User actions: bookmarks, reading history, comments
- Real-time updates: sentiment re-classification

**Specific NewsHub risks:**
- Adding indexes to every filterable field (region, sentiment, source, publishedAt, category)
- Composite indexes that overlap: `(region, sentiment)`, `(region, publishedAt)`, `(region)` — wasteful
- Text search indexes on large content fields
- Indexes on columns rarely queried

**Consequences:**
- Write operations become bottleneck
- RSS feed aggregation can't keep up with real-time news
- User actions feel slow (bookmark takes 2 seconds)
- Database CPU spikes during high-traffic periods
- Autovacuum runs for extremely long durations

**Prevention:**
- **Index audit protocol**:
  1. Run query with `EXPLAIN ANALYZE` BEFORE adding index
  2. Confirm query is actually slow (>500ms) and frequent (>100/min)
  3. Add index
  4. Benchmark write operations AFTER adding index
  5. Rollback if write performance degrades >20%
- Prioritize indexes on:
  - Foreign keys (for JOINs)
  - WHERE clause fields in frequent queries
  - ORDER BY fields for sorting
- Avoid indexing:
  - Columns with low cardinality (few unique values, like boolean flags)
  - Columns rarely used in WHERE/ORDER BY
  - Large text fields (use GIN/full-text search instead)
- Monitor index usage: `pg_stat_user_indexes` to find unused indexes

**Detection:**
- Benchmark: Measure bulk insert time before/after index addition
- Monitor write latency in production (Prometheus metrics)
- Check `pg_stat_user_indexes.idx_scan` for zero-usage indexes

**Phase:** Database Indexing (before adding indexes to existing tables)

**Sources:**
- [PostgreSQL Indexes Can Hurt Performance](https://www.percona.com/blog/postgresql-indexes-can-hurt-you-negative-effects-and-the-costs-involved/) - HIGH confidence
- [Benchmarking PostgreSQL: The Hidden Cost of Over-Indexing](https://www.percona.com/blog/benchmarking-postgresql-the-hidden-cost-of-over-indexing/) - HIGH confidence
- [PostgreSQL Indexing Playbook 2026](https://www.sachith.co.uk/postgresql-indexing-playbook-practical-guide-feb-12-2026/) - HIGH confidence

---

### CP-05: N+1 Query Problem with Prisma ORM

**What goes wrong:** Loading 100 articles with their sources. Database executes 101 queries: 1 for articles, then 1 per article for source. Latency explodes from 38ms to 8.9 seconds. Database CPU from 4% to 78%.

**Why it happens:** ORM makes it easy to write inefficient code. NewsHub currently fetches related data:
- Articles → NewsSource
- Articles → Bookmarks (to show bookmark status)
- StoryCluster → Articles → NewsSource
- User → Badges → Badge details
- Team → Members → User details

**Specific NewsHub risks:**
```typescript
// BAD: N+1 query
const articles = await prisma.newsArticle.findMany();
for (const article of articles) {
  article.source = await prisma.newsSource.findUnique({ where: { id: article.sourceId } });
}

// GOOD: Single query with JOIN
const articles = await prisma.newsArticle.findMany({
  include: { source: true }
});
```

**Consequences:**
- Response times measured in seconds, not milliseconds
- Database connection pool exhaustion (1000s of queries)
- Horizontal scaling doesn't help (database becomes bottleneck)
- Users abandon slow pages

**Prevention:**
- **ALWAYS use `include` or `select` for related data** — Never fetch in loops
- Prisma v7.4+ has query caching layer (ensure enabled)
- Use Prisma Query Insights to detect N+1 patterns
- Benchmark: Deep include chains (3+ levels) can produce enormous JOINs slower than N+1 → benchmark anything beyond 2 levels
- Use `relationLoadStrategy: "join"` for one-to-one relationships
- For large one-to-many (e.g., article with 1000s of comments), use separate queries not `include`

**Detection:**
- Enable Prisma query logging: `log: ['query']`
- Count queries per request: Should be <10 for most endpoints
- Load testing reveals N+1 patterns (latency scales linearly with result count)
- Use Prisma Query Insights built into Prisma Postgres

**Phase:** Database Indexing / Query Result Caching (any code touching database)

**Sources:**
- [Prisma N+1 in Production: Real Query Plans](https://blog.pratikpatel.pro/prisma-query-optimization-guide) - HIGH confidence
- [Prisma ORM v7.4: Query Caching](https://www.prisma.io/blog/prisma-orm-v7-4-query-caching-partial-indexes-and-major-performance-improvements) - HIGH confidence
- [Query Optimization | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/advanced/query-optimization-performance) - HIGH confidence

---

### CP-06: React Bundle Splitting Creates Loading Waterfall

**What goes wrong:** Bundle split too aggressively. User navigates to Dashboard → loads route chunk → chunk imports SignalCard → loads SignalCard chunk → SignalCard imports utils → loads utils chunk. 6 sequential network requests instead of 1. Page feels slower despite smaller chunks.

**Why it happens:** "Split everything for smallest bundles!" But splitting at wrong boundaries creates dependency chains.

**Specific NewsHub risks:**
- Splitting every component individually
- Splitting utility functions used across routes
- Splitting UI library components (Recharts, globe.gl)
- Lazy loading critical above-fold content

**Consequences:**
- Waterfall loading: subsequent chunks can't load until previous finish
- Slow 3G users wait 10+ seconds for all chunks
- Lighthouse performance score drops (not improves)
- User sees blank screen longer

**Prevention:**
- **Split at route level ONLY** for initial implementation:
  ```typescript
  const Dashboard = lazy(() => import('./pages/Dashboard'));
  const Analysis = lazy(() => import('./pages/Analysis'));
  ```
- Keep shared utilities in main bundle (loaded once, cached)
- Group related components: All dashboard components in one chunk
- Test on slow 3G connection (Chrome DevTools Network throttling)
- Measure: Bundle size reduction should improve TTI (Time to Interactive), not worsen it
- Prefetch likely next routes: `<link rel="prefetch" href="/analysis.chunk.js">`

**Detection:**
- Network tab: Count sequential requests to load one page
- Lighthouse: Check for "Avoid chaining critical requests" warning
- Real User Monitoring (RUM): Track page load time before/after splitting

**Phase:** Bundle Splitting (architecture decision before implementation)

**Sources:**
- [Code Splitting – React](https://legacy.reactjs.org/docs/code-splitting.html) - HIGH confidence
- [Automatic Code Splitting | React Router](https://reactrouter.com/explanation/code-splitting) - MEDIUM confidence
- [Code Splitting in React – Loadable Components](https://www.freecodecamp.org/news/code-splitting-in-react-loadable-components/) - MEDIUM confidence

---

### CP-07: Virtual Scrolling Breaks Accessibility

**What goes wrong:** Implementing virtual scrolling for long news lists. Keyboard-only users can't access content. Screen readers announce "1000 items" but only 20 are in DOM. Footer becomes unreachable.

**Why it happens:** Virtual scrolling renders only visible items. Great for performance, terrible for accessibility. "While role=feed makes infinite scroll accessible for screen reader users, it leaves a number of users with disabilities behind: keyboard-only users cannot access the content."

**Specific NewsHub risks:**
- NewsFeed with 100s of articles
- Bookmark list with many saved articles
- Reading history timeline
- Comment threads

**Consequences:**
- WCAG 2.1 Level AA violations (legal liability in EU/US)
- Keyboard users can't tab through articles (tabbing doesn't trigger loading)
- Screen reader users miss content (not in DOM = not announced)
- Switch control users (motor disabilities) face extreme difficulty
- Footer links inaccessible (new content loads infinitely)

**Prevention:**
- **Use "Load More" button instead of virtual scrolling** for accessibility
- If virtual scrolling required:
  - Implement ARIA live regions for loaded content announcements
  - Ensure keyboard navigation triggers loading
  - Provide "Skip to footer" landmark
  - Maintain focus position on load
  - Add toggle to disable infinite scroll
- Test with:
  - Keyboard only (no mouse)
  - Screen reader (NVDA, JAWS, VoiceOver)
  - Browser zoom at 200%
- Consider hybrid: "Load More" button that auto-loads on scroll (user control + convenience)

**Detection:**
- Keyboard test: Can you reach footer using only Tab key?
- Screen reader test: Does it announce newly loaded content?
- Axe DevTools / Lighthouse accessibility audit

**Phase:** Virtual Scrolling (design decision before implementation)

**Sources:**
- [Infinite Scrolling & Accessibility Issues - Deque](https://www.deque.com/blog/infinite-scrolling-rolefeed-accessibility-issues/) - HIGH confidence
- [Infinite Scroll & Accessibility - DigitalA11Y](https://www.digitala11y.com/infinite-scroll-accessibility-is-it-any-good/) - HIGH confidence
- [Is Infinite Scrolling Accessible? - BOIA](https://www.boia.org/blog/is-infinite-scrolling-accessible) - MEDIUM confidence

---

## High Severity Pitfalls

Significant problems requiring substantial rework.

### HP-01: CDN Cache Busting Failures with Query Strings

**What goes wrong:** Deploy new version with bug fix. Users still see old broken JavaScript for hours/days because CDN serves cached version. Query string cache busting (`app.js?v=1.2.3`) doesn't work because some CDNs ignore query parameters.

**Why it happens:** Using `?v=` versioning pattern. Works locally, fails in production with certain CDN configurations.

**Specific NewsHub risks:**
- Critical bug fix deployed but not reaching users
- Users report "still broken" after deployment
- Emergency cache purge required (manual process, slow)

**Consequences:**
- Broken production site for extended period
- Users see mix of old and new code (old JS with new HTML)
- Support ticket flood
- Trust damage

**Prevention:**
- **Use content hash in filename, not query string**:
  ```
  BAD:  app.js?v=1.2.3
  GOOD: app.abc123def.js
  ```
- Vite already does this (`vite build` generates `app.[hash].js`)
- Verify build output contains hashes: `dist/assets/*.js` should have random strings
- Set long cache headers for hashed files: `Cache-Control: public, max-age=31536000, immutable`
- Short cache for HTML: `Cache-Control: public, max-age=300` (5 minutes)
- Test: Deploy → check browser receives new hash

**Detection:**
- Build output inspection: Check for `[hash]` in filenames
- Production test: Deploy → hard refresh → verify new version loads
- Monitor: CDN hit ratio should be high (>90%) but cache should update on deploy

**Phase:** CDN Integration (configuration before production)

**Sources:**
- [What is Cache Busting? - KeyCDN](https://www.keycdn.com/support/what-is-cache-busting) - HIGH confidence
- [CDN Cache Busting Best Practices](https://blog.blazingcdn.com/en-us/cdn-js-best-practices-minification-versioning-cache-bust-rules) - MEDIUM confidence
- [How to Create CDN Caching Strategies 2026](https://oneuptime.com/blog/post/2026-01-30-cdn-caching-strategies/view) - MEDIUM confidence

---

### HP-02: Image Optimization Format Confusion

**What goes wrong:** Converting all images to AVIF for "best compression." But AVIF encoding is CPU-intensive, causing server timeouts during bulk conversion. Plus older Safari users see broken images.

**Why it happens:** Chasing maximum compression without considering encoding cost and browser support.

**Specific NewsHub risks:**
- Article thumbnails (130 sources × daily articles = 1000s of images)
- User avatars
- Share preview images (OG tags)
- Static assets (logos, icons)

**Consequences:**
- Image conversion process never completes (times out)
- Older browsers (Safari 15 and earlier) show broken images
- Server CPU spikes during batch conversion
- Slow image serving (encoding on-the-fly)

**Prevention:**
- **Practical 2026 strategy**:
  - **Primary format: WebP** (all modern browsers, 25-35% smaller than JPEG, fast encoding)
  - **Fallback: JPEG** for older browsers
  - **Selective AVIF**: Only for hero images / critical visuals where 20-30% extra compression matters
- Encoding settings:
  - WebP: Quality 75-85
  - AVIF: Quality 60-70 (looks equivalent to JPEG 85)
- Use `<picture>` element for format negotiation:
  ```html
  <picture>
    <source srcset="image.avif" type="image/avif">
    <source srcset="image.webp" type="image/webp">
    <img src="image.jpg" alt="Fallback">
  </picture>
  ```
- Pre-convert images during build, not runtime
- Size considerations: Don't upload 2000px image for 300px thumbnail (wastes bandwidth)

**Detection:**
- Test on Safari 15 to verify fallback works
- Monitor server CPU during image conversion
- Check image serving latency (<200ms target)

**Phase:** Image Optimization (format selection before bulk conversion)

**Sources:**
- [AVIF vs WebP: Which Reigns Supreme in 2026?](https://elementor.com/blog/webp-vs-avif/) - HIGH confidence
- [Image Optimization in 2026: WebP/AVIF](https://tworowstudio.com/image-optimization-2026/) - HIGH confidence
- [Best Image Format for Web in 2026](https://www.thecssagency.com/blog/best-web-image-format) - MEDIUM confidence

---

### HP-03: Stale-While-Revalidate Without Background Job

**What goes wrong:** Implementing stale-while-revalidate for API caching. User request triggers background revalidation... but there's no background job system. Revalidation happens synchronously, making cache pointless.

**Why it happens:** Misunderstanding the pattern. "Serve stale, fetch fresh" requires background processing infrastructure.

**Specific NewsHub risks:**
- Express 5 backend has no job queue system
- Async/await in request handler isn't truly "background"
- Node.js event loop blocks on heavy operations

**Consequences:**
- False sense of performance improvement
- Users still wait for fresh data (no latency reduction)
- Cache serves stale data indefinitely (background update never happens)

**Prevention:**
- **For NewsHub's architecture**, use simpler patterns:
  - **Short TTL (5 minutes) with background refresh**: Set cache, serve from cache, refresh before expiry
  - **Time-based invalidation**: Cache expires, next request fetches fresh and caches
- If implementing stale-while-revalidate:
  - Requires job queue (Bull, BullMQ with Redis)
  - Or separate worker process
  - Or cron job for periodic refresh
- Alternative: Use Redis `GETEX` to extend TTL on access (LRU-like behavior)

**Detection:**
- Load test: Verify stale data is served instantly (<10ms)
- Monitor: Background revalidation jobs should complete
- Check: Stale data shouldn't persist beyond intended freshness window

**Phase:** API Response Caching (pattern selection before implementation)

**Sources:**
- [Stale-While-Revalidate Pattern](https://www.searchcans.com/blog/api-caching-strategies-real-time-data-performance-2026/) - MEDIUM confidence
- [API Gateway Caching Strategies 2026](https://oneuptime.com/blog/post/2026-02-09-api-gateway-caching-strategies/view) - MEDIUM confidence

---

### HP-04: Real-Time Updates Break Cached Responses

**What goes wrong:** NewsHub has WebSocket updates for real-time news. Add API caching with 5-minute TTL. Now users see: WebSocket says "20 new articles" but API returns cached 0 new articles. Data inconsistency.

**Why it happens:** Caching layer doesn't communicate with WebSocket layer.

**Specific NewsHub risks:**
- Real-time sentiment updates via WebSocket
- Live article count in HeroSection
- "LIVE" badge showing new content available
- Bookmark sync across devices

**Consequences:**
- User sees conflicting data (notification says new content, list shows old)
- User clicks "20 new articles" → sees cached list with 0 new
- Trust in real-time feature destroyed
- Bug reports flood in

**Prevention:**
- **Invalidate cache on WebSocket broadcast**:
  ```typescript
  // When WebSocket broadcasts new articles
  io.emit('news:new', articles);
  await redis.del('news:latest'); // Invalidate cache
  ```
- **Reduce cache TTL for real-time endpoints**: 1-2 minutes max
- **Use cache versioning**: Include timestamp in cache key
  ```typescript
  const cacheKey = `news:${Math.floor(Date.now() / 60000)}`; // 1-min buckets
  ```
- **Avoid caching real-time endpoints entirely**: `/api/news/latest` should always hit DB
- Cache only static/aggregated data: historical events, source list, user profiles

**Detection:**
- Test: Trigger WebSocket update → verify API returns fresh data
- Monitor cache hit ratio on real-time endpoints (should be low/zero)
- User acceptance testing for consistency

**Phase:** API Response Caching (integration with existing WebSocket system)

**Sources:**
- [API Caching for Real-Time Data](https://www.searchcans.com/blog/api-caching-strategies-real-time-data-performance-2026/) - MEDIUM confidence
- [How to Handle Caching in REST APIs 2026](https://oneuptime.com/blog/post/2026-02-02-rest-api-caching/view) - MEDIUM confidence

---

### HP-05: Missing srcset for Responsive Images

**What goes wrong:** Implementing responsive layout, but images stay desktop-sized. Mobile users download 2MB hero image scaled down to 300px. Bandwidth wasted, page load slow.

**Why it happens:** Focusing on CSS breakpoints, forgetting image optimization.

**Specific NewsHub risks:**
- Article thumbnails in NewsFeed (grid → list → mobile)
- Hero images on Analysis page
- User avatars (tiny on mobile, larger on desktop)
- Share preview images

**Consequences:**
- Mobile data usage explosion (important in developing markets)
- Slow page loads on mobile (3G/4G networks)
- Lighthouse score penalty
- User frustration, high bounce rate

**Prevention:**
- **Use `srcset` and `sizes` attributes**:
  ```html
  <img
    src="thumbnail-800.jpg"
    srcset="
      thumbnail-400.jpg 400w,
      thumbnail-800.jpg 800w,
      thumbnail-1200.jpg 1200w
    "
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    alt="Article thumbnail"
  />
  ```
- Generate multiple sizes during build/upload:
  - Small: 400px (mobile)
  - Medium: 800px (tablet)
  - Large: 1200px (desktop)
- Lazy load below-fold images: `loading="lazy"`
- Use next-gen formats with fallbacks (see HP-02)

**Detection:**
- Chrome DevTools Network: Check image sizes loaded on mobile
- Lighthouse audit: "Properly size images"
- Test on actual mobile device with network throttling

**Phase:** Image Optimization (implementation)

**Sources:**
- [Image Optimization in 2026](https://tworowstudio.com/image-optimization-2026/) - HIGH confidence
- [Website Speed Optimization Guide 2026](https://www.neelnetworks.com/blog/website-speed-optimization-guide-2026/) - MEDIUM confidence

---

### HP-06: React Memory Leaks from Missing Cleanup

**What goes wrong:** Adding performance monitoring with timers. Component unmounts but timers keep running. Memory usage climbs from 50MB to 500MB over 1 hour of use. Browser tab crashes.

**Why it happens:** useEffect with async operations but no cleanup function. "setTimeout alone accounts for 40% of all findings: 22,384 instances without clearTimeout."

**Specific NewsHub risks:**
- Auto-refresh timers for news feed (every 2 minutes)
- WebSocket subscriptions for real-time updates
- Event listeners for scroll tracking
- Fetch requests for article previews (hover cards)
- Performance monitoring intervals

**Consequences:**
- Memory leak: grows until browser tab crashes
- Performance degrades over time (GC thrashing)
- Users report "app gets slower" after 30 minutes
- Mobile browsers crash quickly (limited memory)

**Prevention:**
- **ALWAYS return cleanup function from useEffect**:
  ```typescript
  // BAD: Memory leak
  useEffect(() => {
    const interval = setInterval(fetchNews, 120000);
    // Missing cleanup!
  }, []);

  // GOOD: Cleanup on unmount
  useEffect(() => {
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval); // Cleanup
  }, []);
  ```
- Cleanup checklist:
  - `setTimeout` → `clearTimeout`
  - `setInterval` → `clearInterval`
  - `addEventListener` → `removeEventListener`
  - WebSocket → `socket.close()`
  - Fetch → `abortController.abort()`
- Use React StrictMode (already enabled) to catch missing cleanups in development
- ESLint rule `react-hooks/exhaustive-deps` doesn't catch missing cleanup → manual review required

**Detection:**
- Chrome DevTools Memory profiler: Take heap snapshot, use app, take another snapshot → check growth
- Monitor: Detached DOM nodes (sign of memory leak)
- Test: Use app for 30+ minutes → memory should stabilize, not grow unbounded
- React DevTools Profiler: Check for components not unmounting properly

**Phase:** All performance phases (code review requirement)

**Sources:**
- [Frontend Memory Leaks: 500-Repository Study](https://stackinsight.dev/blog/memory-leak-empirical-study/) - HIGH confidence
- [Preventing Memory Leaks in React with useEffect](https://www.c-sharpcorner.com/article/preventing-memory-leaks-in-react-with-useeffect-hooks/) - HIGH confidence
- [How to Fix Memory Leaks in React](https://www.freecodecamp.org/news/fix-memory-leaks-in-react-apps/) - MEDIUM confidence

---

## Moderate Pitfalls

Problems causing delays or quality issues.

### MP-01: Premature Optimization Without Profiling

**What goes wrong:** Team adds Redis caching, CDN, bundle splitting, virtual scrolling... but page is still slow. Turns out bottleneck was unoptimized database query (missing index). Wasted 2 weeks on wrong optimizations.

**Why it happens:** "Premature optimization is the root of all evil." Optimizing before measuring.

**Prevention:**
- **ALWAYS profile before optimizing**:
  1. **Frontend**: Lighthouse audit, React DevTools Profiler, Chrome Performance tab
  2. **Backend**: PostgreSQL `EXPLAIN ANALYZE`, Prometheus metrics, APM (Sentry Performance)
  3. **Load testing**: k6 scripts to find bottlenecks under load
- Identify actual bottleneck first:
  - Is it database queries? → Add indexes
  - Is it API latency? → Add caching
  - Is it bundle size? → Code splitting
  - Is it images? → Optimize images
- Establish baseline metrics BEFORE optimization
- Measure improvement AFTER optimization
- Only optimize if metrics show problem AND solution targets root cause

**Detection:**
- Ask: "Do we have profiling data showing this is slow?"
- Verify: Optimization improves the profiled metric

**Phase:** Before any performance work (mandatory first step)

**Sources:**
- [Why Premature Optimization is Evil](https://stackify.com/premature-optimization-evil/) - HIGH confidence
- [Software Performance Optimization Tips 2026](https://techlasi.com/savvy/software-performance-optimization-tips/) - MEDIUM confidence

---

### MP-02: Cache Key Collisions from Poor Design

**What goes wrong:** Caching API response with key `news:latest`. Two users request different regions (USA vs China). Both get same cached response. Wrong data served.

**Why it happens:** Cache key doesn't include all request parameters.

**Prevention:**
- **Include ALL request parameters in cache key**:
  ```typescript
  // BAD: Collisions
  const key = 'news:latest';

  // GOOD: Unique per query
  const key = `news:${region}:${sentiment}:${page}:${limit}`;
  ```
- Serialize complex parameters: `JSON.stringify(filters)`
- Hash long keys to avoid Redis key length limits
- Document cache key format in code comments

**Detection:**
- Test: Two requests with different params → verify different responses
- Monitor cache hit ratio (collisions → lower hit ratio than expected)

**Phase:** API Response Caching (implementation)

---

### MP-03: Over-Invalidation Destroying Cache Benefits

**What goes wrong:** Any article update invalidates ALL news cache. Cache hit ratio drops from 90% to 10%. Performance worse than no cache.

**Why it happens:** Invalidation too broad. "Just invalidate everything to be safe."

**Prevention:**
- Invalidate narrowly: Only affected keys
- Use cache tags for grouped invalidation
- Monitor cache hit ratio (should be >70% for effective caching)
- Balance: Over-invalidation vs stale data

**Detection:**
- Redis monitoring: Cache hit ratio dropping
- Load test: Compare with/without cache (should see improvement)

**Phase:** API Response Caching (tuning after initial implementation)

---

### MP-04: Missing Database Index Monitoring

**What goes wrong:** Add indexes during performance phase. Six months later, unused indexes waste 2GB disk space and slow writes. No one notices.

**Why it happens:** No monitoring of index usage.

**Prevention:**
- Query `pg_stat_user_indexes` monthly to find unused indexes:
  ```sql
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0 AND indexrelname NOT LIKE 'pg_toast%';
  ```
- Drop indexes with zero scans after 30 days
- Document why each index exists (query it optimizes)

**Detection:**
- Scheduled report of unused indexes
- Disk usage growth without corresponding data growth

**Phase:** Database Indexing (maintenance after implementation)

---

### MP-05: Bundle Splitting Without Preloading

**What goes wrong:** Split critical code into separate chunk. User navigates to page → waits for chunk download → sees blank screen. Feels slower despite smaller initial bundle.

**Why it happens:** Lazy loading without prefetching/preloading.

**Prevention:**
- Preload critical chunks:
  ```typescript
  // Prefetch likely next route
  <Link to="/analysis" onMouseEnter={() => import('./pages/Analysis')}>
  ```
- Use `<link rel="preload">` for critical chunks
- Prioritize: Main bundle → critical chunks → lazy chunks
- Test: Measure Time to Interactive (TTI) before/after splitting

**Detection:**
- Lighthouse: "Reduce render-blocking resources"
- User testing: Does navigation feel instant or laggy?

**Phase:** Bundle Splitting (implementation)

---

### MP-06: Image Lazy Loading Above the Fold

**What goes wrong:** Adding `loading="lazy"` to ALL images. Hero image doesn't load until user scrolls. Largest Contentful Paint (LCP) fails.

**Why it happens:** Lazy loading everything without considering viewport.

**Prevention:**
- **Only lazy load below-the-fold images**
- First 1-2 images: `loading="eager"` (or omit attribute)
- Rest: `loading="lazy"`
- Test on slow connection: Does hero image load immediately?

**Detection:**
- Lighthouse: "Largest Contentful Paint" metric
- Visual inspection: Hero image should load instantly

**Phase:** Image Optimization (implementation)

---

### MP-07: Query Result Caching Without Cache Warming

**What goes wrong:** Deploy with query caching. First user after cache clear waits 5 seconds for expensive cluster query. Poor first-user experience.

**Why it happens:** No cache warming strategy.

**Prevention:**
- Warm cache on deployment:
  ```typescript
  // After deploy, pre-populate common queries
  await fetchAndCacheStoryList();
  await fetchAndCacheSentimentStats();
  ```
- Cron job to refresh cache before expiry (if using long TTLs)
- Consider: Is query too slow even uncached? Optimize query first

**Detection:**
- Monitor: First request after deploy should be fast
- Alerting: Slow query threshold (>1 second)

**Phase:** Query Result Caching (deployment strategy)

---

### MP-08: TanStack Query Over-Invalidation

**What goes wrong:** User bookmarks article. Code invalidates all queries: `queryClient.invalidateQueries()`. Entire app refetches. News feed flashes, global stats reload. User sees loading spinners everywhere.

**Why it happens:** Invalidating too broadly for convenience.

**Prevention:**
- **Narrow invalidation**:
  ```typescript
  // BAD: Invalidates everything
  queryClient.invalidateQueries();

  // GOOD: Invalidates only related
  queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
  queryClient.invalidateQueries({ queryKey: ['news', 'article', id] });
  ```
- Use query key hierarchy for precise control
- Test: Verify only expected queries refetch

**Detection:**
- React Query DevTools: Watch refetch behavior
- User reports: "Page flashes on bookmark"

**Phase:** Query Result Caching (every mutation)

---

## Minor Pitfalls

Issues causing friction or minor bugs.

### mP-01: Cache Headers Misconfiguration

**What goes wrong:** Static assets served with `Cache-Control: no-cache`. Browser refetches on every page load. CDN cache useless.

**Prevention:**
- Hashed assets: `Cache-Control: public, max-age=31536000, immutable`
- HTML: `Cache-Control: public, max-age=300`
- API: `Cache-Control: private, max-age=60` or no cache

**Phase:** CDN Integration

---

### mP-02: Database Connection Pool Too Small

**What goes wrong:** Load test reveals connection errors under 100 concurrent users.

**Prevention:**
- Size pool based on load: `(core_count * 2) + effective_spindle_count`
- Monitor connection usage
- Use connection pooling (Prisma already does)

**Phase:** Database Indexing

---

### mP-03: Redis Eviction Policy Wrong

**What goes wrong:** JWT blacklist entries evicted before expiry, allowing revoked tokens.

**Prevention:**
- Set `maxmemory-policy noeviction` or `allkeys-lru` based on use case
- Critical data (JWT blacklist): Set generous TTL, don't rely on eviction

**Phase:** API Response Caching

---

### mP-04: Missing Compression for API Responses

**What goes wrong:** API returns 500KB JSON uncompressed. Slow on mobile.

**Prevention:**
- Enable gzip/brotli compression in Express
- Already in NewsHub via `compression` middleware

**Phase:** API Response Caching

---

### mP-05: Virtual Scrolling Jumpy Scroll Position

**What goes wrong:** Scroll up, virtual scroller unloads items, scroll position jumps.

**Prevention:**
- Use battle-tested library (react-window, react-virtuoso)
- Maintain scroll position on item unload
- Test: Scroll up/down rapidly → should feel smooth

**Phase:** Virtual Scrolling

---

### mP-06: Bundle Analyzer Not Run

**What goes wrong:** Deploy with 2MB bundle containing duplicate Recharts library.

**Prevention:**
- Run `vite-plugin-visualizer` before deploy
- Check for duplicate dependencies
- Set budget: Main bundle <500KB gzipped

**Phase:** Bundle Splitting

---

### mP-07: Image Alt Text Missing After Optimization

**What goes wrong:** Converting images breaks alt text. Accessibility regression.

**Prevention:**
- Preserve alt text in conversion pipeline
- Automated alt text audit

**Phase:** Image Optimization

---

### mP-08: Query Keys Not Documented

**What goes wrong:** Team doesn't know which keys to invalidate. Mutations miss invalidations.

**Prevention:**
- Document all query keys in QUERY-KEYS.md
- Show relationships between queries

**Phase:** Query Result Caching

---

## Phase-Specific Warnings

| Phase | Most Likely Pitfall | Mitigation |
|-------|---------------------|------------|
| API Response Caching | CP-01: Missing TTLs | Mandatory TTL code review |
| API Response Caching | CP-02: Invalidation cascade | Document cache dependencies FIRST |
| Query Result Caching | CP-03: TanStack Query invalidation | Invalidation checklist per mutation |
| Database Indexing | CP-04: Over-indexing | Benchmark writes before/after |
| Database Indexing | CP-05: N+1 queries | Enable query logging, use `include` |
| Bundle Splitting | CP-06: Loading waterfall | Split at route level only initially |
| Virtual Scrolling | CP-07: Accessibility | Use "Load More" button instead |
| CDN Integration | HP-01: Query string cache busting | Verify Vite generates hashed filenames |
| Image Optimization | HP-02: Format confusion | WebP primary, JPEG fallback |
| API Response Caching | HP-04: Real-time conflicts | Invalidate cache on WebSocket broadcast |
| Image Optimization | HP-05: Missing srcset | Generate multiple sizes |
| ALL | HP-06: Memory leaks | Cleanup function code review |
| ALL | MP-01: Premature optimization | Profile BEFORE optimizing |

---

## Pre-Implementation Checklist

Before starting each phase:

### API Response Caching
- [ ] Redis TTL policy documented (different TTLs per data type)
- [ ] Cache key format includes all parameters
- [ ] Invalidation strategy designed (tags vs TTL vs manual)
- [ ] WebSocket integration plan (cache invalidation on broadcast)
- [ ] Monitoring setup (hit ratio, memory usage, key count)

### Query Result Caching
- [ ] Query key hierarchy documented in QUERY-KEYS.md
- [ ] Invalidation checklist created for mutations
- [ ] React Query DevTools configured
- [ ] staleTime and cacheTime values justified
- [ ] Over-invalidation test plan (verify only expected queries refetch)

### Database Indexing
- [ ] Baseline query performance measured (EXPLAIN ANALYZE)
- [ ] Baseline write performance measured (INSERT/UPDATE timing)
- [ ] Index candidates identified from slow query log
- [ ] Composite index design documented
- [ ] Unused index monitoring scheduled

### Bundle Splitting
- [ ] Current bundle size measured (main chunk size)
- [ ] Route-level split boundaries identified
- [ ] Preload/prefetch strategy designed
- [ ] Bundle analyzer configured (vite-plugin-visualizer)
- [ ] TTI and FCP targets set

### Image Optimization
- [ ] Current image sizes audited
- [ ] Format strategy decided (WebP + JPEG fallback)
- [ ] Responsive image breakpoints defined (400/800/1200px)
- [ ] Lazy loading boundaries identified (above/below fold)
- [ ] Conversion pipeline tested

### Virtual Scrolling
- [ ] Accessibility strategy decided ("Load More" vs virtual scroll with ARIA)
- [ ] Library selected (react-window vs react-virtuoso)
- [ ] Footer access plan (pagination or skip link)
- [ ] Keyboard navigation tested
- [ ] Screen reader testing planned

### CDN Integration
- [ ] Build output verified (hashed filenames present)
- [ ] Cache headers configured (long for assets, short for HTML)
- [ ] CDN purge strategy documented
- [ ] Cache busting tested (deploy → verify new version loads)
- [ ] Monitoring setup (CDN hit ratio, cache freshness)

---

## Performance Monitoring Checklist

Track these metrics before/after each optimization:

### Frontend Metrics
- [ ] Lighthouse Performance Score (target: 90+)
- [ ] Time to Interactive (TTI) (target: <3.8s)
- [ ] Largest Contentful Paint (LCP) (target: <2.5s)
- [ ] First Contentful Paint (FCP) (target: <1.8s)
- [ ] Cumulative Layout Shift (CLS) (target: <0.1)
- [ ] Total Bundle Size (target: <500KB gzipped)
- [ ] Memory Usage Over Time (should stabilize, not grow)

### Backend Metrics
- [ ] API Response Time p50/p95/p99 (target: p95 <500ms)
- [ ] Database Query Time (target: <100ms for 95% of queries)
- [ ] Redis Hit Ratio (target: >70%)
- [ ] Cache Memory Usage (should not grow unbounded)
- [ ] Write Performance (INSERT/UPDATE timing)
- [ ] Connection Pool Utilization (target: <80% at peak)

### Real User Monitoring (RUM)
- [ ] Page Load Time by Geography
- [ ] Error Rate (target: <0.1%)
- [ ] Bounce Rate (watch for regressions)
- [ ] Session Duration (should improve with performance)

---

## Sources

### Redis & Caching
- [Redis Anti-Patterns: Common Mistakes Every Developer Should Avoid](https://redis.io/tutorials/redis-anti-patterns-every-developer-should-avoid/) - HIGH confidence
- [Three Ways to Maintain Cache Consistency | Redis](https://redis.io/blog/three-ways-to-maintain-cache-consistency/) - HIGH confidence
- [Redis Caching Pitfalls: Invalidation, Testing & Best Practices | Medium](https://medium.com/@QuarkAndCode/redis-caching-pitfalls-invalidation-testing-best-practices-3950a0660f1a) - HIGH confidence
- [Redis Caching & Cache Invalidation: A Complete Guide | Medium](https://medium.com/@rup.singh88/redis-caching-cache-invalidation-a-complete-guide-cc822b87aa4d) - MEDIUM confidence
- [How to Implement Cache Invalidation with Redis](https://oneuptime.com/blog/post/2026-01-25-redis-cache-invalidation/view) - MEDIUM confidence
- [Cache Invalidation Strategies 2026](https://oneuptime.com/blog/post/2026-01-30-cache-invalidation-strategies/view) - MEDIUM confidence

### PostgreSQL & Database
- [PostgreSQL Indexes Can Hurt Performance: Negative Effects and Costs](https://www.percona.com/blog/postgresql-indexes-can-hurt-you-negative-effects-and-the-costs-involved/) - HIGH confidence
- [Benchmarking PostgreSQL: The Hidden Cost of Over-Indexing](https://www.percona.com/blog/benchmarking-postgresql-the-hidden-cost-of-over-indexing/) - HIGH confidence
- [PostgreSQL Indexing Playbook — Practical Guide (Feb 12, 2026)](https://www.sachith.co.uk/postgresql-indexing-playbook-practical-guide-feb-12-2026/) - HIGH confidence
- [PostgreSQL Performance: Essential Indexing Guidelines](https://dev.to/shrsv/postgresql-performance-essential-indexing-guidelines-1i90) - MEDIUM confidence
- [The Postgres Performance Cliff: Why Your Queries Are Slowing Down](https://loke.dev/blog/postgres-performance-indexing-guide) - MEDIUM confidence

### Prisma ORM & N+1 Queries
- [Prisma N+1 in Production: Real Query Plans and Fixes](https://blog.pratikpatel.pro/prisma-query-optimization-guide) - HIGH confidence
- [Prisma ORM v7.4: Query Caching & Performance Boost](https://www.prisma.io/blog/prisma-orm-v7-4-query-caching-partial-indexes-and-major-performance-improvements) - HIGH confidence
- [Query optimization | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/advanced/query-optimization-performance) - HIGH confidence
- [N+1 Query Problem: The Database Killer | Medium](https://medium.com/@saad.minhas.codes/n-1-query-problem-the-database-killer-youre-creating-f68104b99a2d) - MEDIUM confidence

### React & TanStack Query
- [Query Invalidation | TanStack Query React Docs](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) - HIGH confidence
- [Struggling with query invalidation · TanStack/query Discussion](https://github.com/TanStack/query/discussions/2104) - HIGH confidence
- [useQuery + invalidateQueries intermittently stale UI](https://github.com/TanStack/query/discussions/6953) - MEDIUM confidence
- [Managing Query Keys for Cache Invalidation in React Query](https://www.wisp.blog/blog/managing-query-keys-for-cache-invalidation-in-react-query) - MEDIUM confidence

### Bundle Splitting & Code Splitting
- [Code-Splitting – React](https://legacy.reactjs.org/docs/code-splitting.html) - HIGH confidence
- [Automatic Code Splitting | React Router](https://reactrouter.com/explanation/code-splitting) - MEDIUM confidence
- [Code Splitting in React – Loadable Components to the Rescue](https://www.freecodecamp.org/news/code-splitting-in-react-loadable-components/) - MEDIUM confidence
- [Implementing Code Splitting and Lazy Loading in React](https://www.greatfrontend.com/blog/code-splitting-and-lazy-loading-in-react) - MEDIUM confidence

### Virtual Scrolling & Accessibility
- [Infinite Scrolling & Role=Feed Accessibility Issues - Deque](https://www.deque.com/blog/infinite-scrolling-rolefeed-accessibility-issues/) - HIGH confidence
- [Infinite Scroll & Accessibility! Is It Any Good? • DigitalA11Y](https://www.digitala11y.com/infinite-scroll-accessibility-is-it-any-good/) - HIGH confidence
- [Is Infinite Scrolling Accessible? - BOIA](https://www.boia.org/blog/is-infinite-scrolling-accessible) - MEDIUM confidence
- [Infinite Scrolling and Accessibility (It's Usually Bad)](https://www.webaxe.org/infinite-scrolling-and-accessibility/) - MEDIUM confidence
- [Scrolling Designs: 8 Patterns and When to Use Each (2026)](https://lovable.dev/guides/scrolling-designs-patterns-when-to-use) - MEDIUM confidence

### CDN & Cache Busting
- [What is Cache Busting? - KeyCDN Support](https://www.keycdn.com/support/what-is-cache-busting) - HIGH confidence
- [CDN JS Best Practices: Minification, Versioning & Cache-Bust Rules](https://blog.blazingcdn.com/en-us/cdn-js-best-practices-minification-versioning-cache-bust-rules) - MEDIUM confidence
- [How to Create CDN Caching Strategies 2026](https://oneuptime.com/blog/post/2026-01-30-cdn-caching-strategies/view) - MEDIUM confidence
- [CDN Cache Invalidation: Strategies for Delivering Fresh Content](https://enterno.io/en/articles/cdn-cache-invalidation) - MEDIUM confidence

### Image Optimization
- [AVIF vs WebP: Which Image Format Reigns Supreme in 2026?](https://elementor.com/blog/webp-vs-avif/) - HIGH confidence
- [Image Optimization in 2026: WebP/AVIF, DPR, and Lazy-Loading](https://tworowstudio.com/image-optimization-2026/) - HIGH confidence
- [Best Image Format for Web in 2026: JPG vs PNG vs WebP vs AVIF](https://www.thecssagency.com/blog/best-web-image-format) - MEDIUM confidence
- [AVIF vs WebP: Which Image Format is Best in 2026?](https://www.nextutils.com/blog/webp-vs-avif-image-formats) - MEDIUM confidence
- [Website Speed Optimization Guide 2026](https://www.neelnetworks.com/blog/website-speed-optimization-guide-2026/) - MEDIUM confidence

### React Memory Leaks
- [Frontend Memory Leaks: A 500-Repository Static Analysis](https://stackinsight.dev/blog/memory-leak-empirical-study/) - HIGH confidence
- [Preventing Memory Leaks in React with useEffect Hooks](https://www.c-sharpcorner.com/article/preventing-memory-leaks-in-react-with-useeffect-hooks/) - HIGH confidence
- [How to Fix Memory Leaks in React Applications](https://www.freecodecamp.org/news/fix-memory-leaks-in-react-apps/) - MEDIUM confidence
- [Understanding Memory Leaks in React: How to Find and Fix Them | Medium](https://medium.com/@ignatovich.dm/understanding-memory-leaks-in-react-how-to-find-and-fix-them-fc782cf182be) - MEDIUM confidence
- [Avoiding race conditions and memory leaks in React useEffect](https://www.wisdomgeek.com/development/web-development/react/avoiding-race-conditions-memory-leaks-react-useeffect/) - MEDIUM confidence

### API Caching & Real-Time
- [API Caching Strategies for Real-Time Data 2026](https://www.searchcans.com/blog/api-caching-strategies-real-time-data-performance-2026/) - MEDIUM confidence
- [How to Configure API Gateway Caching Strategies for Performance Optimization](https://oneuptime.com/blog/post/2026-02-09-api-gateway-caching-strategies/view) - MEDIUM confidence
- [How to Handle Caching in REST APIs 2026](https://oneuptime.com/blog/post/2026-02-02-rest-api-caching/view) - MEDIUM confidence
- [API Caching: Techniques for Better Performance](https://pieces.medium.com/api-caching-techniques-for-better-performance-6297ec1ac02c) - MEDIUM confidence

### Performance Optimization General
- [Why Premature Optimization Is the Root of All Evil - Stackify](https://stackify.com/premature-optimization-evil/) - HIGH confidence
- [Software Performance Optimization Tips for 2026: The Ultimate Guide](https://techlasi.com/savvy/software-performance-optimization-tips/) - MEDIUM confidence
- [Premature Optimization Is the Root of All Evil: 2026 Update](https://copyprogramming.com/howto/premature-optimization-is-the-root-of-all-evil) - MEDIUM confidence
