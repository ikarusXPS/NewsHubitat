# Roadmap: NewsHub

## Milestones

- [x] **v1.0 AI Analysis & User Features** - Phases 1-6 (shipped 2026-04-20)
- [ ] **v1.1 Quality & Testing** - Phases 7-12 (in progress)

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

### v1.1 Quality & Testing (In Progress)

**Milestone Goal:** Establish comprehensive test coverage (80%+) and code quality baseline

- [x] **Phase 7: Core Backend Service Tests** - aiService, authService, cacheService, cleanupService, emailService (4/4 complete)
- [x] **Phase 8: Data Pipeline Service Tests** - eventsService, focusSuggestionEngine, marketDataService, newsAggregator, newsCrawler, newsApiService (6/6 complete)
- [x] **Phase 9: Extension Service Tests** - personaService, sharingService, stealthScraper, translationService, websocketService (5/5 complete)
- [x] **Phase 10: Frontend Hook & Library Tests** - All hooks and utility libraries (10/10 complete)
- [ ] **Phase 11: E2E Tests** - Critical user flow verification
- [ ] **Phase 12: Bug Fixes & Code Quality** - B7 fix, linting, type coverage, dead code

## Phase Details

### Phase 7: Core Backend Service Tests
**Goal**: Core infrastructure services have reliable test coverage
**Depends on**: v1.0 milestone complete
**Requirements**: UNIT-01, UNIT-02, UNIT-03, UNIT-04, UNIT-05
**Success Criteria** (what must be TRUE):
  1. aiService tests pass with 80%+ coverage including fallback chain scenarios
  2. authService tests pass with 80%+ coverage including token validation edge cases
  3. cacheService tests pass with 80%+ coverage including TTL expiration
  4. cleanupService tests pass with 80%+ coverage including deletion grace period
  5. emailService tests pass with 80%+ coverage including template rendering
**Plans:** 4 plans
Plans:
- [x] 07-01-PLAN.md — aiService unit tests with provider fallback chain
- [x] 07-02-PLAN.md — authService unit tests with JWT edge cases
- [x] 07-03-PLAN.md — cacheService + emailService unit tests
- [x] 07-04-PLAN.md — cleanupService unit tests with grace period (96% coverage, 18 tests)

### Phase 8: Data Pipeline Service Tests
**Goal**: News data pipeline services have reliable test coverage
**Depends on**: Phase 7
**Requirements**: UNIT-06, UNIT-07, UNIT-08, UNIT-09, UNIT-10, UNIT-11
**Success Criteria** (what must be TRUE):
  1. eventsService tests pass with 80%+ coverage including timeline queries
  2. focusSuggestionEngine tests pass with 80%+ coverage including recency weighting
  3. marketDataService tests pass with 80%+ coverage including fallback data
  4. newsAggregator tests pass with 80%+ coverage including deduplication
  5. newsCrawler tests pass with 80%+ coverage including RSS parsing errors
  6. newsApiService tests pass with 80%+ coverage including 3 API providers (GNews, NewsAPI, MediaStack)
**Plans:** 6 plans
Plans:
- [ ] 08-01-PLAN.md — eventsService unit tests with location patterns and cache TTL
- [ ] 08-02-PLAN.md — marketDataService unit tests with Yahoo Finance mock and fallback paths
- [ ] 08-03-PLAN.md — newsApiService unit tests with 3 API providers and utility methods
- [ ] 08-04-PLAN.md — newsCrawler unit tests with real cheerio and rate limiting
- [ ] 08-05-PLAN.md — focusSuggestionEngine unit tests with tension/breaking/gap detection
- [ ] 08-06-PLAN.md — newsAggregator unit tests with deduplication and confidence scoring

### Phase 9: Extension Service Tests
**Goal**: Feature extension services have reliable test coverage
**Depends on**: Phase 8
**Requirements**: UNIT-12, UNIT-13, UNIT-14, UNIT-15, UNIT-16
**Success Criteria** (what must be TRUE):
  1. personaService tests pass with 80%+ coverage including persona matching
  2. sharingService tests pass with 80%+ coverage including click tracking
  3. stealthScraper tests pass with 80%+ coverage including rate limiting
  4. translationService tests pass with 80%+ coverage including provider fallback chain
  5. websocketService tests pass with 80%+ coverage including connection lifecycle
**Plans:** 5 plans
Plans:
- [x] 09-01-PLAN.md — personaService unit tests with keyword matching and AI integration (100% coverage, 38 tests)
- [x] 09-02-PLAN.md — sharingService unit tests with click tracking and analytics (100% coverage, 37 tests)
- [x] 09-03-PLAN.md — stealthScraper unit tests with Puppeteer mocking and cheerio parsing (93% coverage, 44 tests)
- [x] 09-04-PLAN.md — translationService unit tests with provider fallback chain (94% coverage, 45 tests)
- [x] 09-05-PLAN.md — websocketService unit tests with connection lifecycle and broadcasts (97% coverage, 52 tests)

### Phase 10: Frontend Hook & Library Tests
**Goal**: Frontend utilities and hooks have reliable test coverage
**Depends on**: Phase 9
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05, HOOK-06, HOOK-07, LIB-01, LIB-02, LIB-03
**Success Criteria** (what must be TRUE):
  1. All 7 hook test suites pass with 80%+ coverage
  2. articleRelevance.ts tests pass with 80%+ coverage including scoring edge cases
  3. historySummarizer.ts tests pass with 80%+ coverage including empty history
  4. personalization.ts tests pass with 80%+ coverage including cold start scenarios
**Plans:** 10 plans
Plans:
- [x] 10-01-PLAN.md — articleRelevance unit tests with keyword extraction and scoring (LIB-01) - 88% coverage, 24 tests
- [x] 10-02-PLAN.md — historySummarizer unit tests with topic extraction and compression (LIB-02) - 100% coverage, 27 tests
- [x] 10-03-PLAN.md — personalization unit tests with interest extraction and recommendations (LIB-03) - 100% coverage, 38 tests
- [x] 10-04-PLAN.md — useMapCenter unit tests with preset priority and region calculation (HOOK-06) - 100% coverage, 10 tests
- [x] 10-05-PLAN.md — useBackendStatus unit tests with health check and polling (HOOK-02) - 100% coverage, 18 tests
- [x] 10-06-PLAN.md — useKeyboardShortcuts unit tests with navigation and input bypass (HOOK-05) - 97% coverage, 43 tests
- [x] 10-07-PLAN.md — useEventSocket unit tests with connection lifecycle and events (HOOK-04) - 96% coverage, 27 tests
- [x] 10-08-PLAN.md — useCachedQuery unit tests with network/cache fallback (HOOK-03) - 100% coverage, 18 tests
- [x] 10-09-PLAN.md — useAchievements unit tests with milestone detection and persistence (HOOK-01) - 100% coverage, 24 tests
- [x] 10-10-PLAN.md — usePersonalization unit tests with eligibility and cold start (HOOK-07) - 100% coverage, 15 tests
**UI hint**: yes

### Phase 11: E2E Tests
**Goal**: Critical user flows verified end-to-end
**Depends on**: Phase 10
**Requirements**: E2E-01, E2E-02, E2E-03, E2E-04, E2E-05, E2E-06, E2E-07, E2E-08, E2E-09, E2E-10
**Success Criteria** (what must be TRUE):
  1. Dashboard page E2E tests verify news feed loading and filtering
  2. Analysis page E2E tests verify AI Q&A and cluster interactions
  3. Monitor and Timeline pages E2E tests verify real-time data display
  4. EventMap and Community pages E2E tests verify map interactions and social features
  5. User account pages E2E tests verify bookmarks, settings, history flows
**Plans:** 8 plans
Plans:
- [ ] 11-01-PLAN.md — Auth setup with storageState for authenticated tests
- [ ] 11-02-PLAN.md — Dashboard E2E tests (news feed, view toggle, trend filters)
- [ ] 11-03-PLAN.md — Analysis E2E tests (clusters, compare mode, charts)
- [ ] 11-04-PLAN.md — Community E2E tests (tabs, contribution types, leaderboard)
- [ ] 11-05-PLAN.md — Profile E2E tests (stats, quick actions, password change) [auth required]
- [ ] 11-06-PLAN.md — Bookmarks E2E tests (empty state, article grid, clear all) [auth required]
- [ ] 11-07-PLAN.md — Settings E2E tests (theme, language, export/import) [auth required]
- [ ] 11-08-PLAN.md — ReadingHistory E2E tests (timeline groups, filters, clear) [auth required]
**Note:** E2E-03 (Monitor), E2E-04 (Timeline), E2E-05 (EventMap) already covered by existing tests per D-02
**UI hint**: yes

### Phase 12: Bug Fixes & Code Quality
**Goal**: Codebase meets quality standards and known bugs resolved
**Depends on**: Phase 11
**Requirements**: BUG-01, QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. B7 Article thumbnail fallback system shows placeholder when image fails
  2. ESLint passes with zero errors across entire codebase
  3. TypeScript strict mode enabled and compiles with zero errors
  4. Dead code identified by static analysis and removed
  5. Overall unit test coverage reaches 80%+ threshold
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
| 11. E2E Tests | v1.1 | 0/8 | Planning complete | - |
| 12. Bug Fixes & Code Quality | v1.1 | 0/? | Not started | - |

---
*Roadmap created: 2026-04-18*
*Last updated: 2026-04-22 after Phase 11 planning complete (8 plans)*
