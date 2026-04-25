# Roadmap: NewsHub

## Milestones

- [x] **v1.0 AI Analysis & User Features** - Phases 1-6 (shipped 2026-04-20)
- [x] **v1.1 Quality & Testing** - Phases 7-12 (completed 2026-04-22)
- [x] **v1.2 Performance & Scale** - Phases 13-17 (completed 2026-04-23)
- [x] **v1.3 Production Ready** - Phases 18-22 (completed 2026-04-23)
- [x] **v1.4 User & Community Features** - Phases 23-28 (completed 2026-04-25)
- [ ] **v1.5 Performance Optimization** - Phases 29-34 (current)
- [ ] **v1.6 Infrastructure & Scale** - Kubernetes, Multi-Region, CDN (planned)
- [ ] **v1.7 Growth & Monetization** - A/B Testing, Subscriptions (planned)
- [ ] **v1.8 Advanced Features** - Native App, Video, Chat (demand-driven)

## Phases

<details>
<summary>v1.0 AI Analysis & User Features (Phases 1-6) - SHIPPED 2026-04-20</summary>

- [x] Phase 1: AI Analysis (1/1 plans) - completed 2026-04-18
- [x] Phase 2: Event System (5/5 plans) - completed 2026-04-18
- [x] Phase 3: Auth Completion (5/5 plans) - completed 2026-04-18
- [x] Phase 4: User Preferences (0/0 plans, pre-existing) - completed 2026-04-18
- [x] Phase 5: Bookmarks (0/0 plans, pre-existing) - completed 2026-04-18
- [x] Phase 6: Reading History (6/6 plans) - completed 2026-04-19

</details>

<details>
<summary>v1.1 Quality & Testing (Phases 7-12) - COMPLETED 2026-04-22</summary>

- [x] **Phase 7: Core Backend Service Tests** - aiService, authService, cacheService, cleanupService, emailService (4/4 complete)
- [x] **Phase 8: Data Pipeline Service Tests** - eventsService, focusSuggestionEngine, marketDataService, newsAggregator, newsCrawler, newsApiService (6/6 complete)
- [x] **Phase 9: Extension Service Tests** - personaService, sharingService, stealthScraper, translationService, websocketService (5/5 complete)
- [x] **Phase 10: Frontend Hook & Library Tests** - All hooks and utility libraries (10/10 complete)
- [x] **Phase 11: E2E Tests** - Critical user flow verification (8/8 complete, 62 tests)
- [x] **Phase 12: Bug Fixes & Code Quality** - B7 fix, linting, type coverage, dead code (4/4 complete)

</details>

<details>
<summary>v1.2 Performance & Scale (Phases 13-17) - COMPLETED 2026-04-23</summary>

- [x] **Phase 13: PostgreSQL Migration** - Docker Compose, Prisma adapter, JSONB, health endpoints (5/5 complete)
- [x] **Phase 14: Redis Caching** - JWT blacklist, rate limiting, AI cache (5/5 complete)
- [x] **Phase 15: Query Optimization** - Server-Timing, N+1 elimination, chunked saves (4/4 complete)
- [x] **Phase 16: PWA / Service Worker** - Offline fallback, background sync, install prompt (6/6 complete)
- [x] **Phase 17: Docker Deployment** - Multi-stage build, health checks, production serving (3/3 complete)

</details>

<details>
<summary>v1.3 Production Ready (Phases 18-22) - COMPLETED 2026-04-23</summary>

- [x] **Phase 18: CI/CD Pipeline** - GitHub Actions for build, test, deploy with staging and production environments (3/3 complete)
- [x] **Phase 19: Sentry Error Tracking** - Frontend and backend error capture with source maps and performance monitoring (3/3 complete)
- [x] **Phase 20: Monitoring & Alerting** - Health endpoints, Prometheus metrics, uptime checks, Grafana dashboards (3/3 complete)
- [x] **Phase 21: Load Testing** - k6 scripts, 10k user validation, CI integration, performance baselines (3/3 complete)
- [x] **Phase 22: SMTP Production** - Production email provider, delivery verification, bounce handling (3/3 complete)

</details>

<details>
<summary>v1.4 User & Community Features (Phases 23-28) - COMPLETED 2026-04-25</summary>

- [x] **Phase 23: i18n Foundation** - Multi-language UI with react-i18next, string extraction, browser detection (4/4 complete)
- [x] **Phase 24: Mobile Responsive** - Responsive layouts, touch navigation, optimized images (5/5 complete)
- [x] **Phase 25: Social Sharing** - Share buttons, Open Graph meta tags, share analytics (3/3 complete)
- [x] **Phase 26: OAuth Integration** - Google and GitHub OAuth with account linking (5/5 complete)
- [x] **Phase 27: Comments System** - Article comments with threaded replies and real-time updates (4/4 complete)
- [x] **Phase 28: Team Collaboration** - Team workspaces, shared bookmarks, role-based permissions (5/5 complete)

</details>

### v1.5 Performance Optimization (Current)

**Milestone Goal:** Comprehensive performance optimization using measurement-first approach. Reduce bundle size, optimize database queries, improve image delivery, and enhance caching for faster page loads and API responses.

- [ ] **Phase 29: Measurement Foundation** - Bundle analyzer, query logging, Lighthouse baseline
- [ ] **Phase 30: Frontend Code Splitting** - Route-based splitting, lazy image loading, reduced initial bundle
- [ ] **Phase 31: Virtual Scrolling** - Virtualized rendering for long article lists
- [ ] **Phase 32: Image Pipeline** - WebP/AVIF conversion, responsive srcset, Cloudinary integration
- [ ] **Phase 33: Caching Improvements** - Smart invalidation, HTTP cache headers, jitter-based TTL
- [ ] **Phase 34: Database Optimization** - EXPLAIN ANALYZE audit, composite indexes, N+1 fixes, pool tuning

## Phase Details

### Phase 29: Measurement Foundation
**Goal**: Establish performance baselines and tooling before any optimization work
**Depends on**: Phase 28 (v1.4 complete)
**Requirements**: MEAS-01, MEAS-02, MEAS-03
**Success Criteria** (what must be TRUE):
  1. Bundle analysis report shows exact sizes of all chunks with rollup-plugin-visualizer
  2. Prisma query logs capture all database queries with timing information
  3. Lighthouse CI baseline captures LCP, INP, CLS metrics for Dashboard, NewsFeed, Analysis pages
  4. Performance baseline document records current metrics for before/after comparison
  5. All optimization decisions can reference actual profiling data
**Plans**: 3 plans

### Phase 30: Frontend Code Splitting
**Goal**: Users experience faster initial page loads through reduced JavaScript bundle
**Depends on**: Phase 29 (Measurement Foundation)
**Requirements**: FRON-01, FRON-03, FRON-04
**Success Criteria** (what must be TRUE):
  1. Dashboard, Analysis, Monitor, Timeline, EventMap pages load as separate chunks
  2. Article thumbnails use native lazy loading (loading="lazy" attribute)
  3. Initial JavaScript bundle is under 250KB (measured by Lighthouse)
  4. Heavy dependencies (globe.gl, Recharts) load only when route is accessed
  5. Lighthouse Performance score improves by at least 10 points
**Plans**: 4 plans
**UI hint**: yes

### Phase 31: Virtual Scrolling
**Goal**: Users can scroll through hundreds of articles without performance degradation
**Depends on**: Phase 30 (Frontend Code Splitting)
**Requirements**: FRON-02
**Success Criteria** (what must be TRUE):
  1. NewsFeed with 500+ articles renders only visible items (10-15 DOM nodes)
  2. Scrolling maintains 60fps with 1000+ articles loaded
  3. Keyboard navigation and screen reader accessibility preserved
  4. "Load More" button available as accessible fallback
  5. Memory usage remains stable over extended scrolling sessions
**Plans**: 3 plans
**UI hint**: yes

### Phase 32: Image Pipeline
**Goal**: Users experience faster image loading with modern formats and responsive delivery
**Depends on**: Phase 30 (Frontend Code Splitting)
**Requirements**: IMG-01, IMG-02, IMG-03
**Success Criteria** (what must be TRUE):
  1. Article thumbnails served as WebP with JPEG fallback via picture element
  2. Responsive srcset provides 320w, 640w, 960w, 1280w variants
  3. Cloudinary fetch mode handles format conversion and resizing
  4. Above-fold images load eagerly, below-fold images lazy load
  5. Total image payload per page reduced by at least 50%
**Plans**: 4 plans

### Phase 33: Caching Improvements
**Goal**: API responses served from cache with smart invalidation maintaining data freshness
**Depends on**: Phase 29 (Measurement Foundation)
**Requirements**: CACHE-01, CACHE-02, CACHE-03
**Success Criteria** (what must be TRUE):
  1. WebSocket events trigger cache invalidation for affected API responses
  2. Static assets have immutable cache headers (max-age=31536000)
  3. API responses include appropriate Cache-Control and ETag headers
  4. Jitter-based TTL prevents thundering herd on cache expiration
  5. Redis cache hit ratio exceeds 90% for news list endpoints
**Plans**: 3 plans

### Phase 34: Database Optimization
**Goal**: Database queries execute efficiently with proper indexing and connection management
**Depends on**: Phase 29 (Measurement Foundation)
**Requirements**: DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):
  1. EXPLAIN ANALYZE audit documents all major query patterns and their costs
  2. Composite indexes added for identified slow queries (perspective, sentiment, publishedAt)
  3. N+1 query patterns identified in Prisma logs are fixed with proper includes
  4. Connection pool size tuned based on workload analysis
  5. 95th percentile database query time under 50ms
**Plans**: 4 plans

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. AI Analysis | v1.0 | 1/1 | Complete | 2026-04-18 |
| 2. Event System | v1.0 | 5/5 | Complete | 2026-04-18 |
| 3. Auth Completion | v1.0 | 5/5 | Complete | 2026-04-18 |
| 4. User Preferences | v1.0 | 0/0 | Complete | 2026-04-18 |
| 5. Bookmarks | v1.0 | 0/0 | Complete | 2026-04-18 |
| 6. Reading History | v1.0 | 6/6 | Complete | 2026-04-19 |
| 7. Core Backend Service Tests | v1.1 | 4/4 | Complete | 2026-04-20 |
| 8. Data Pipeline Service Tests | v1.1 | 6/6 | Complete | 2026-04-21 |
| 9. Extension Service Tests | v1.1 | 5/5 | Complete | 2026-04-21 |
| 10. Frontend Hook & Library Tests | v1.1 | 10/10 | Complete | 2026-04-21 |
| 11. E2E Tests | v1.1 | 8/8 | Complete | 2026-04-22 |
| 12. Bug Fixes & Code Quality | v1.1 | 4/4 | Complete | 2026-04-22 |
| 13. PostgreSQL Migration | v1.2 | 5/5 | Complete | 2026-04-22 |
| 14. Redis Caching | v1.2 | 5/5 | Complete | 2026-04-22 |
| 15. Query Optimization | v1.2 | 4/4 | Complete | 2026-04-22 |
| 16. PWA / Service Worker | v1.2 | 6/6 | Complete | 2026-04-22 |
| 17. Docker Deployment | v1.2 | 3/3 | Complete | 2026-04-23 |
| 18. CI/CD Pipeline | v1.3 | 3/3 | Complete | 2026-04-23 |
| 19. Sentry Error Tracking | v1.3 | 3/3 | Complete | 2026-04-23 |
| 20. Monitoring & Alerting | v1.3 | 3/3 | Complete | 2026-04-23 |
| 21. Load Testing | v1.3 | 3/3 | Complete | 2026-04-23 |
| 22. SMTP Production | v1.3 | 3/3 | Complete | 2026-04-23 |
| 23. i18n Foundation | v1.4 | 4/4 | Complete | 2026-04-24 |
| 24. Mobile Responsive | v1.4 | 5/5 | Complete | 2026-04-24 |
| 25. Social Sharing | v1.4 | 3/3 | Complete | 2026-04-24 |
| 26. OAuth Integration | v1.4 | 5/5 | Complete | 2026-04-24 |
| 27. Comments System | v1.4 | 4/4 | Complete | 2026-04-25 |
| 28. Team Collaboration | v1.4 | 5/5 | Complete | 2026-04-25 |
| 29. Measurement Foundation | v1.5 | 0/3 | Not started | - |
| 30. Frontend Code Splitting | v1.5 | 0/4 | Not started | - |
| 31. Virtual Scrolling | v1.5 | 0/3 | Not started | - |
| 32. Image Pipeline | v1.5 | 0/4 | Not started | - |
| 33. Caching Improvements | v1.5 | 0/3 | Not started | - |
| 34. Database Optimization | v1.5 | 0/4 | Not started | - |

---

## Future Milestones

### v1.6 Infrastructure & Scale (Planned)

**Goal:** CDN integration and infrastructure scaling for global reach

| Requirement | Feature | Rationale |
|-------------|---------|-----------|
| INFRA-01 | CDN for Static Assets | Global performance via edge caching |
| INFRA-02 | Predictive Prefetch | Preload likely-next routes |
| INFRA-03 | PgBouncer Pooling | Connection pooling if metrics warrant |
| SCALE-01 | Kubernetes Deployment | Horizontal scaling, auto-healing |
| SCALE-02 | Horizontal Pod Autoscaling | Dynamic resource management |
| SCALE-03 | Multi-Region Deployment | Latency optimization, redundancy |
| SCALE-04 | Database Read Replicas | Geo-routing for read performance |
| LOG-01 | Log Aggregation (Loki/ELK) | Debugging at scale |
| LOG-02 | Structured Logging | Correlation IDs for tracing |

### v1.7 Growth & Monetization (Planned)

**Goal:** Enable data-driven decisions and generate revenue

| Requirement | Feature | Rationale |
|-------------|---------|-----------|
| AB-01 | A/B Testing Framework | Data-driven decisions |
| AB-02 | Feature Flags | Gradual rollouts |
| ANALYTICS-01 | Analytics Dashboard | User behavior insights |
| PAID-01 | Subscription Tiers | Revenue stream |
| PAID-02 | Stripe Integration | Payment processing |
| PAID-03 | Premium Export Features | Paid user value |

### v1.8 Advanced Features (Demand-Driven)

**Goal:** Expand capabilities based on validated user demand

| Requirement | Feature | Rationale |
|-------------|---------|-----------|
| NATIVE-01 | iOS/Android App | Only if PWA insufficient |
| NATIVE-02 | Push Notifications | Breaking news alerts |
| VIDEO-01 | Video Content | Only if validated |
| CHAT-01 | Real-time Chat | Only if community demands |

### Milestone Sequence Logic

```
v1.4 User & Community  -> User acquisition + engagement (OAuth, i18n, Mobile, Share, Comments, Teams)
         |
v1.5 Performance       -> Optimize speed + efficiency (Measurement, Bundle, Images, Cache, DB)
         |
v1.6 Infrastructure    -> Scale globally (K8s, Multi-Region, CDN)
         |
v1.7 Monetization      -> Generate revenue (Subscriptions, A/B)
         |
v1.8 Advanced          -> Demand-driven expansion
```

---
*Roadmap created: 2026-04-18*
*Last updated: 2026-04-25 — v1.5 Performance Optimization phases added (29-34)*
