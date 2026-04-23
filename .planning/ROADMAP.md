# Roadmap: NewsHub

## Milestones

- [x] **v1.0 AI Analysis & User Features** - Phases 1-6 (shipped 2026-04-20)
- [x] **v1.1 Quality & Testing** - Phases 7-12 (completed 2026-04-22)
- [x] **v1.2 Performance & Scale** - Phases 13-17 (completed 2026-04-23)
- [x] **v1.3 Production Ready** - Phases 18-22 (completed 2026-04-23)
- [ ] **v1.4 User & Community Features** - Phases 23-28 (in progress)
- [ ] **v1.5 Scale & Infrastructure** - Kubernetes, Multi-Region, Log Aggregation (planned)
- [ ] **v1.6 Growth & Monetization** - A/B Testing, Subscriptions (planned)
- [ ] **v1.7 Advanced Features** - Native App, Video, Chat (demand-driven)

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

### v1.4 User & Community Features (In Progress)

**Milestone Goal:** Reduce onboarding friction, expand target audience, and increase user engagement through OAuth login, internationalization, mobile optimization, social sharing, comments, and team collaboration.

- [ ] **Phase 23: i18n Foundation** - Multi-language UI with react-i18next, string extraction, browser detection
- [ ] **Phase 24: Mobile Responsive** - Responsive layouts, touch navigation, optimized images
- [ ] **Phase 25: Social Sharing** - Share buttons, Open Graph meta tags, share analytics
- [ ] **Phase 26: OAuth Integration** - Google and GitHub OAuth with account linking
- [ ] **Phase 27: Comments System** - Article comments with threaded replies and real-time updates
- [ ] **Phase 28: Team Collaboration** - Team workspaces, shared bookmarks, role-based permissions

## Phase Details

### Phase 23: i18n Foundation
**Goal**: Users can switch UI language and experience fully localized interface
**Depends on**: Phase 22 (v1.3 complete)
**Requirements**: I18N-01, I18N-02, I18N-03
**Success Criteria** (what must be TRUE):
  1. User can change UI language via language switcher in navigation
  2. All user-facing text displays in selected language (DE, EN initially)
  3. Browser language is automatically detected and applied on first visit
  4. Date formats, number formats adapt to selected locale
  5. Adding new languages requires only translation JSON files (no code changes)
**Plans**: 4 plans
Plans:
- [ ] 23-01-PLAN.md - Install i18n dependencies and create core infrastructure
- [ ] 23-02-PLAN.md - Create translation JSON files (namespaces for EN/DE)
- [ ] 23-03-PLAN.md - Create locale-aware formatters and Zustand sync
- [ ] 23-04-PLAN.md - Refactor components to use i18n translations
**UI hint**: yes

### Phase 24: Mobile Responsive
**Goal**: Users have optimized experience on mobile devices with touch-friendly navigation
**Depends on**: Phase 23 (i18n Foundation)
**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03
**Success Criteria** (what must be TRUE):
  1. All pages display correctly on mobile screens (320px-768px viewport)
  2. Touch navigation works via bottom nav bar, hamburger menu, and swipe gestures
  3. Images load responsively with appropriate sizes and lazy loading
  4. No horizontal scrolling required on any page
  5. Interactive elements have touch-friendly tap targets (min 44px)
**Plans**: TBD
**UI hint**: yes

### Phase 25: Social Sharing
**Goal**: Users can share articles to social platforms with rich previews
**Depends on**: Phase 24 (Mobile Responsive)
**Requirements**: SHARE-01, SHARE-02, SHARE-03
**Success Criteria** (what must be TRUE):
  1. Share buttons (Twitter, LinkedIn, WhatsApp, Facebook) appear on article views
  2. Shared links display rich previews with title, description, and image on social platforms
  3. Share click events are tracked and visible in analytics
  4. Mobile users can use native share sheet via Web Share API
**Plans**: TBD
**UI hint**: yes

### Phase 26: OAuth Integration
**Goal**: Users can sign up and log in with Google or GitHub accounts
**Depends on**: Phase 25 (Social Sharing)
**Requirements**: OAUTH-01, OAUTH-02, OAUTH-03
**Success Criteria** (what must be TRUE):
  1. User can create account by clicking "Sign in with Google" button
  2. User can create account by clicking "Sign in with GitHub" button
  3. Existing email account user can link Google or GitHub after re-authentication
  4. OAuth login preserves existing user data (bookmarks, reading history, badges)
  5. User can unlink OAuth provider and still log in with email/password
**Plans**: TBD
**UI hint**: yes

### Phase 27: Comments System
**Goal**: Users can engage in article discussions with threaded comments
**Depends on**: Phase 26 (OAuth Integration)
**Requirements**: COMM-01, COMM-02, COMM-03
**Success Criteria** (what must be TRUE):
  1. Authenticated user can post a comment on any article
  2. User can reply to existing comments creating threaded discussions
  3. New comments and replies appear in real-time without page refresh
  4. Comments show author name, avatar, and timestamp
  5. Comment author can delete their own comments
**Plans**: TBD
**UI hint**: yes

### Phase 28: Team Collaboration
**Goal**: Users can collaborate in team workspaces with shared resources
**Depends on**: Phase 27 (Comments System)
**Requirements**: COLLAB-01, COLLAB-02, COLLAB-03
**Success Criteria** (what must be TRUE):
  1. User can create a team and invite members via email
  2. Team has shared bookmark collection visible to all members
  3. Team roles (Owner, Admin, Member) control who can invite, remove, or manage settings
  4. Team members can see each other's activity in team context
  5. User can be a member of multiple teams
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
| 23. i18n Foundation | v1.4 | 0/4 | Planned | - |
| 24. Mobile Responsive | v1.4 | 0/? | Not started | - |
| 25. Social Sharing | v1.4 | 0/? | Not started | - |
| 26. OAuth Integration | v1.4 | 0/? | Not started | - |
| 27. Comments System | v1.4 | 0/? | Not started | - |
| 28. Team Collaboration | v1.4 | 0/? | Not started | - |

---

## Future Milestones

### v1.5 Scale & Infrastructure (Planned)

**Goal:** Prepare for growth and ensure reliability at scale

| Requirement | Feature | Rationale |
|-------------|---------|-----------|
| SCALE-01 | Kubernetes Deployment | Horizontal scaling, auto-healing |
| SCALE-02 | Horizontal Pod Autoscaling | Dynamic resource management |
| SCALE-03 | Multi-Region Deployment | Latency optimization, redundancy |
| SCALE-04 | Database Read Replicas | Geo-routing for read performance |
| LOG-01 | Log Aggregation (Loki/ELK) | Debugging at scale |
| LOG-02 | Structured Logging | Correlation IDs for tracing |
| CDN-01 | CDN for Static Assets | Global performance |

### v1.6 Growth & Monetization (Planned)

**Goal:** Enable data-driven decisions and generate revenue

| Requirement | Feature | Rationale |
|-------------|---------|-----------|
| AB-01 | A/B Testing Framework | Data-driven decisions |
| AB-02 | Feature Flags | Gradual rollouts |
| ANALYTICS-01 | Analytics Dashboard | User behavior insights |
| PAID-01 | Subscription Tiers | Revenue stream |
| PAID-02 | Stripe Integration | Payment processing |
| PAID-03 | Premium Export Features | Paid user value |

### v1.7 Advanced Features (Demand-Driven)

**Goal:** Expand capabilities based on validated user demand

| Requirement | Feature | Rationale |
|-------------|---------|-----------|
| NATIVE-01 | iOS/Android App | Only if PWA insufficient |
| NATIVE-02 | Push Notifications | Breaking news alerts |
| VIDEO-01 | Video Content | Only if validated |
| CHAT-01 | Real-time Chat | Only if community demands |

### Milestone Sequence Logic

```
v1.4 User & Community  -> Nutzer gewinnen + engagieren (OAuth, i18n, Mobile, Share, Comments, Teams)
         |
v1.5 Scale             -> Infrastruktur skalieren (K8s, Multi-Region)
         |
v1.6 Monetization      -> Revenue generieren (Subscriptions, A/B)
         |
v1.7 Advanced          -> Bedarfsabhangig erweitern
```

---
*Roadmap created: 2026-04-18*
*Last updated: 2026-04-23 — Phase 23 i18n Foundation planned (4 plans)*
