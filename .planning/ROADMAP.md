# Roadmap: NewsHub

## Milestones

- [x] **v1.0 AI Analysis & User Features** - Phases 1-6 (shipped 2026-04-20)
- [x] **v1.1 Quality & Testing** - Phases 7-12 (completed 2026-04-22)
- [x] **v1.2 Performance & Scale** - Phases 13-17 (completed 2026-04-23)
- [ ] **v1.3 Production Ready** - Phases 18-22 (in progress)

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

### v1.3 Production Ready (In Progress)

**Milestone Goal:** Production-grade deployment infrastructure with CI/CD, error tracking, monitoring, and performance validation

- [ ] **Phase 18: CI/CD Pipeline** - GitHub Actions for build, test, deploy with staging and production environments
- [ ] **Phase 19: Sentry Error Tracking** - Frontend and backend error capture with source maps and performance monitoring
- [ ] **Phase 20: Monitoring & Alerting** - Health endpoints, Prometheus metrics, uptime checks, Grafana dashboards
- [ ] **Phase 21: Load Testing** - k6 scripts, 10k user validation, CI integration, performance baselines
- [ ] **Phase 22: SMTP Production** - Production email provider, delivery verification, bounce handling

## Phase Details

### Phase 18: CI/CD Pipeline
**Goal**: Automated build, test, and deployment pipeline with staging and production environments
**Depends on**: Phase 17 (Docker Deployment)
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04
**Success Criteria** (what must be TRUE):
  1. Pull requests trigger automated build and test runs with pass/fail status checks
  2. Successful builds push Docker images to container registry with semantic version tags
  3. Merges to main branch automatically deploy to staging environment
  4. Production deployments require manual approval before execution
  5. Deployment status visible in GitHub PR/commit interface
**Plans**: 3 plans

Plans:
- [ ] 18-01-PLAN.md — GitHub Actions workflow with quality gates and Docker build
- [ ] 18-02-PLAN.md — SSH deployment to staging (auto) and production (approval)
- [ ] 18-03-PLAN.md — End-to-end pipeline verification

### Phase 19: Sentry Error Tracking
**Goal**: Comprehensive error capture and performance monitoring across frontend and backend
**Depends on**: Phase 18 (CI/CD Pipeline)
**Requirements**: SNTR-01, SNTR-02, SNTR-03, SNTR-04
**Success Criteria** (what must be TRUE):
  1. Frontend runtime errors are captured via React Error Boundary with Sentry SDK integration
  2. Backend Express errors are captured via error handler middleware with Sentry SDK
  3. Source maps are uploaded to Sentry enabling readable stack traces in production
  4. Transaction traces show API latency and frontend performance metrics
  5. Error alerts notify team when new issues occur
**Plans**: 3 plans

Plans:
- [ ] 19-01-PLAN.md — SDK installation + frontend error capture and performance
- [ ] 19-02-PLAN.md — Backend error capture and ESM instrumentation
- [ ] 19-03-PLAN.md — CI source map upload and release configuration

### Phase 20: Monitoring & Alerting
**Goal**: Production observability with health checks, metrics, and alerting
**Depends on**: Phase 19 (Sentry Error Tracking)
**Requirements**: MNTR-01, MNTR-02, MNTR-03, MNTR-04
**Success Criteria** (what must be TRUE):
  1. Health endpoints respond with service status (/health, /health/db, /health/redis, /readiness)
  2. Prometheus-format metrics endpoint exposes request counts, latencies, and system stats
  3. External uptime monitoring alerts team when services are down or degraded
  4. Grafana dashboard visualizes all key metrics with historical trends
  5. Alert rules trigger notifications for error spikes and latency anomalies
**Plans**: TBD

### Phase 21: Load Testing
**Goal**: Validate system handles 10,000 concurrent users with documented performance baselines
**Depends on**: Phase 20 (Monitoring & Alerting)
**Requirements**: LOAD-01, LOAD-02, LOAD-03, LOAD-04
**Success Criteria** (what must be TRUE):
  1. k6 test scripts exist for critical endpoints (news, auth, AI, bookmarks)
  2. System maintains stability under 10,000 concurrent virtual users
  3. Load tests run automatically as part of CI pipeline on demand
  4. Performance baselines documented with p95 and p99 latency thresholds
  5. Bottlenecks identified and addressed or documented for future optimization
**Plans**: TBD

### Phase 22: SMTP Production
**Goal**: Production email delivery with verified flows and bounce handling
**Depends on**: Phase 21 (Load Testing)
**Requirements**: SMTP-01, SMTP-02, SMTP-03
**Success Criteria** (what must be TRUE):
  1. Production SMTP provider configured (SendGrid, SES, or equivalent)
  2. Email verification flow delivers emails and tokens work in production
  3. Password reset flow delivers emails and reset links work in production
  4. Bounce handling marks undeliverable addresses and prevents retry spam
**Plans**: TBD

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
| 18. CI/CD Pipeline | v1.3 | 0/3 | Planned | - |
| 19. Sentry Error Tracking | v1.3 | 0/3 | Planned | - |
| 20. Monitoring & Alerting | v1.3 | 0/? | Not started | - |
| 21. Load Testing | v1.3 | 0/? | Not started | - |
| 22. SMTP Production | v1.3 | 0/? | Not started | - |

---
*Roadmap created: 2026-04-18*
*Last updated: 2026-04-23 — Phase 19 planned (3 plans)*
