# Roadmap: NewsHub

## Milestones

- [x] **v1.0 AI Analysis & User Features** - Phases 1-6 (shipped 2026-04-20)
- [x] **v1.1 Quality & Testing** - Phases 7-12 (completed 2026-04-22)
- [x] **v1.2 Performance & Scale** - Phases 13-17 (completed 2026-04-23)
- [x] **v1.3 Production Ready** - Phases 18-22 (completed 2026-04-23)
- [x] **v1.4 User & Community Features** - Phases 23-28 (completed 2026-04-25)
- [x] **v1.5 Performance Optimization** - Phases 29-34 (completed 2026-04-26)
- [ ] **v1.6 Infrastructure & Scale** - Phases 35-40 (current)

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

<details>
<summary>v1.5 Performance Optimization (Phases 29-34) - COMPLETED 2026-04-26</summary>

- [x] **Phase 29: Measurement Foundation** - Bundle analyzer, query logging, Lighthouse baseline (3/3 complete)
- [x] **Phase 30: Frontend Code Splitting** - Route-based splitting, lazy image loading, reduced initial bundle (4/4 complete)
- [x] **Phase 31: Virtual Scrolling** - Virtualized rendering for long article lists (3/3 complete)
- [x] **Phase 32: Image Pipeline** - WebP/AVIF conversion, responsive srcset, Cloudinary integration (4/4 complete)
- [x] **Phase 33: Caching Improvements** - Smart invalidation, HTTP cache headers, jitter-based TTL (3/3 complete)
- [x] **Phase 34: Database Optimization** - EXPLAIN ANALYZE audit, composite indexes, N+1 fixes, pool tuning (4/4 complete)

</details>

### v1.6 Infrastructure & Scale (Current)

**Milestone Goal:** Comprehensive expansion across infrastructure, AI capabilities, mobile platforms, monetization, and content types.

- [ ] **Phase 35: Infrastructure Foundation** - Monorepo setup and API gateway
- [ ] **Phase 36: Monetization Core** - Stripe integration and subscription tiers
- [ ] **Phase 37: Horizontal Scaling** - Docker Swarm and connection pooling
- [ ] **Phase 38: Advanced AI Features** - Credibility scoring, bias detection, fact-checking
- [ ] **Phase 39: Mobile Apps** - Capacitor wrapper and app store deployment
- [ ] **Phase 40: Content Expansion** - Video, podcast, and source expansion

## Phase Details

### Phase 35: Infrastructure Foundation
**Goal**: Developers can access NewsHub data via public API with code sharing infrastructure for mobile apps
**Depends on**: Phase 34 (v1.5 complete)
**Requirements**: INFRA-01 (partial - monorepo prep), PAY-08, PAY-09, PAY-10
**Success Criteria** (what must be TRUE):
  1. Monorepo structure with pnpm workspaces separates web app, shared packages (types, API client, state)
  2. Developer can register for API key through self-service portal
  3. API requests are rate-limited by tier (Free: 10/min, Pro: 100/min) enforced via Redis
  4. Public API endpoints (`/api/v1/public/*`) return versioned responses with OpenAPI documentation
  5. API usage is logged asynchronously without blocking request processing
**Plans**: 5 plans
n**Plans:**
- [x] 35-01-PLAN.md — Monorepo setup with pnpm workspaces and shared types package
- [ ] 35-02-PLAN.md — API key service with generation, validation, and storage
- [ ] 35-03-PLAN.md — Public API endpoints with OpenAPI docs and rate limiting
- [ ] 35-04-PLAN.md — Developer portal UI with Scalar docs and key management
- [ ] 35-05-PLAN.md — Integration tests for public API and developer workflows

### Phase 36: Monetization Core
**Goal**: Users can subscribe to Premium tier and access gated features with Stripe billing
**Depends on**: Phase 35 (API infrastructure)
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07
**Success Criteria** (what must be TRUE):
  1. User can view subscription tiers (Free, Premium $9/mo, Enterprise custom) with clear feature comparison
  2. User can subscribe to Premium via Stripe Checkout and manage subscription via Customer Portal
  3. Premium users experience ad-free interface with unlimited AI queries
  4. Premium users can access full reading history without 7-day limit
  5. Premium users can export data in JSON and CSV formats
  6. Stripe webhooks update subscription status idempotently without duplicate processing
**Plans**: TBD
**UI hint**: yes

### Phase 37: Horizontal Scaling
**Goal**: System handles 30k concurrent users through horizontal scaling and connection pooling
**Depends on**: Phase 36 (subscription tiers defined)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Application scales to N replicas via Docker Swarm with `deploy.replicas` configuration
  2. Traefik load balancer distributes traffic across replicas with health check validation
  3. PgBouncer connection pooler handles 100+ concurrent connections without exhaustion
  4. WebSocket connections maintain sticky sessions across replicas using Traefik configuration
  5. Multi-region deployment patterns documented for future horizontal expansion
**Plans**: TBD

### Phase 38: Advanced AI Features
**Goal**: Users see source credibility scores and can fact-check claims with AI assistance
**Depends on**: Phase 36 (Premium tier gating)
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07
**Success Criteria** (what must be TRUE):
  1. User sees credibility score (0-100) on each news source with confidence indicator
  2. Credibility score reflects multiple signals (accuracy, transparency, correction history)
  3. User sees political bias indicator (left/center/right) per source with methodology explanation
  4. User can compare framing analysis showing how different sources cover same topic
  5. User can request fact-check on specific claims with confidence level and source citations
  6. AI analysis results are cached in Redis with 24h TTL to minimize inference costs
**Plans**: TBD
**UI hint**: yes

### Phase 39: Mobile Apps
**Goal**: Users can install native iOS and Android apps from app stores with push notifications
**Depends on**: Phase 35 (monorepo code sharing)
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05, MOB-06, MOB-07, MOB-08
**Success Criteria** (what must be TRUE):
  1. User can download app from iOS App Store via Capacitor wrapper
  2. User can download app from Google Play Store via Capacitor wrapper
  3. User receives push notifications for breaking news matching their region preferences
  4. User receives personalized alerts based on reading history patterns
  5. User can authenticate via biometric (Face ID/Touch ID/fingerprint)
  6. App displays cached articles offline in read-only mode
  7. Mobile apps share 60%+ business logic with web through monorepo packages
**Plans**: TBD
**UI hint**: yes

### Phase 40: Content Expansion
**Goal**: Users can access video and podcast content with transcription for Premium subscribers
**Depends on**: Phase 36 (Premium tier for transcription gating)
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07
**Success Criteria** (what must be TRUE):
  1. System aggregates from 200+ news sources across existing and new regions
  2. User can browse podcast episodes related to news topics with embedded player
  3. Premium users see podcast transcription with timestamp navigation
  4. User can view embedded video content from YouTube and Vimeo sources
  5. Premium users see auto-generated video transcription with searchable text
  6. Media pipeline handles video/audio transcoding with Cloudinary integration
  7. Storage costs remain predictable through embed-first strategy and upload quotas
**Plans**: TBD
**UI hint**: yes

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
| 29. Measurement Foundation | v1.5 | 3/3 | Complete | 2026-04-25 |
| 30. Frontend Code Splitting | v1.5 | 4/4 | Complete | 2026-04-25 |
| 31. Virtual Scrolling | v1.5 | 3/3 | Complete | 2026-04-25 |
| 32. Image Pipeline | v1.5 | 4/4 | Complete | 2026-04-26 |
| 33. Caching Improvements | v1.5 | 3/3 | Complete | 2026-04-25 |
| 34. Database Optimization | v1.5 | 4/4 | Complete | 2026-04-26 |
| 35. Infrastructure Foundation | v1.6 | 1/5 | In Progress | - |
| 36. Monetization Core | v1.6 | 0/? | Not started | - |
| 37. Horizontal Scaling | v1.6 | 0/? | Not started | - |
| 38. Advanced AI Features | v1.6 | 0/? | Not started | - |
| 39. Mobile Apps | v1.6 | 0/? | Not started | - |
| 40. Content Expansion | v1.6 | 0/? | Not started | - |

---

*Roadmap created: 2026-04-18*
*Last updated: 2026-04-26 — Plan 35-01 complete (monorepo workspace setup)*
