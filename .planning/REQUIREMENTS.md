# Requirements: NewsHub

**Defined:** 2026-04-20
**Core Value:** Users can see how the same story is covered by different regional perspectives

## v1.1 Requirements

Requirements for Quality & Testing milestone. Each maps to roadmap phases.

### Unit Testing — Backend Services

- [ ] **UNIT-01**: aiService has unit tests with 80%+ coverage
- [ ] **UNIT-02**: authService has unit tests with 80%+ coverage
- [ ] **UNIT-03**: cacheService has unit tests with 80%+ coverage
- [x] **UNIT-04**: cleanupService has unit tests with 80%+ coverage
- [ ] **UNIT-05**: emailService has unit tests with 80%+ coverage
- [ ] **UNIT-06**: eventsService has unit tests with 80%+ coverage
- [ ] **UNIT-07**: focusSuggestionEngine has unit tests with 80%+ coverage
- [ ] **UNIT-08**: marketDataService has unit tests with 80%+ coverage
- [ ] **UNIT-09**: newsAggregator has unit tests with 80%+ coverage
- [ ] **UNIT-10**: newsCrawler has unit tests with 80%+ coverage
- [ ] **UNIT-11**: newsApiService has unit tests with 80%+ coverage
- [ ] **UNIT-12**: personaService has unit tests with 80%+ coverage
- [x] **UNIT-13**: sharingService has unit tests with 80%+ coverage
- [ ] **UNIT-14**: stealthScraper has unit tests with 80%+ coverage
- [ ] **UNIT-15**: translationService has unit tests with 80%+ coverage
- [x] **UNIT-16**: websocketService has unit tests with 80%+ coverage

### Unit Testing — Frontend Hooks

- [ ] **HOOK-01**: useAchievements has unit tests with 80%+ coverage
- [ ] **HOOK-02**: useBackendStatus has unit tests with 80%+ coverage
- [ ] **HOOK-03**: useCachedQuery has unit tests with 80%+ coverage
- [ ] **HOOK-04**: useEventSocket has unit tests with 80%+ coverage
- [ ] **HOOK-05**: useKeyboardShortcuts has unit tests with 80%+ coverage
- [ ] **HOOK-06**: useMapCenter has unit tests with 80%+ coverage
- [ ] **HOOK-07**: usePersonalization has unit tests with 80%+ coverage

### Unit Testing — Libraries

- [ ] **LIB-01**: articleRelevance.ts has unit tests with 80%+ coverage
- [ ] **LIB-02**: historySummarizer.ts has unit tests with 80%+ coverage
- [ ] **LIB-03**: personalization.ts has unit tests with 80%+ coverage

### E2E Testing

- [ ] **E2E-01**: Dashboard page has E2E tests for core interactions
- [ ] **E2E-02**: Analysis page has E2E tests for core interactions
- [ ] **E2E-03**: Monitor page has E2E tests for core interactions
- [ ] **E2E-04**: Timeline page has E2E tests for core interactions
- [ ] **E2E-05**: EventMap page has E2E tests for core interactions
- [ ] **E2E-06**: Community page has E2E tests for core interactions
- [ ] **E2E-07**: UserProfile page has E2E tests for core interactions
- [ ] **E2E-08**: BookmarksPage has E2E tests for core interactions
- [ ] **E2E-09**: SettingsPage has E2E tests for core interactions
- [ ] **E2E-10**: ReadingHistory page has E2E tests for core interactions

### Bug Fixes

- [x] **BUG-01**: B7 Article thumbnail fallback system implemented

### Code Quality

- [ ] **QUAL-01**: ESLint passes with zero errors
- [ ] **QUAL-02**: TypeScript strict mode enabled with zero errors
- [ ] **QUAL-03**: Dead code identified and removed
- [ ] **QUAL-04**: Overall unit test coverage reaches 80%+

## Future Requirements

Deferred to future milestones.

### Performance

- **PERF-01**: PostgreSQL migration for production scale
- **PERF-02**: Redis caching for high-traffic endpoints
- **PERF-03**: Service Worker for offline support

### Deployment

- **DEPLOY-01**: CI/CD pipeline with GitHub Actions
- **DEPLOY-02**: Docker containerization
- **DEPLOY-03**: Sentry error tracking integration

## Out of Scope

Explicitly excluded from v1.1.

| Feature | Reason |
|---------|--------|
| Load testing (10k users) | Requires infrastructure, defer to deployment milestone |
| OAuth integration | Feature, not QA focus |
| i18n multi-language UI | Feature, not QA focus |
| Mobile native app | Web-first approach |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UNIT-01 | Phase 7 | Pending |
| UNIT-02 | Phase 7 | Pending |
| UNIT-03 | Phase 7 | Pending |
| UNIT-04 | Phase 7 | Complete |
| UNIT-05 | Phase 7 | Pending |
| UNIT-06 | Phase 8 | Pending |
| UNIT-07 | Phase 8 | Pending |
| UNIT-08 | Phase 8 | Pending |
| UNIT-09 | Phase 8 | Pending |
| UNIT-10 | Phase 8 | Pending |
| UNIT-11 | Phase 8 | Pending |
| UNIT-12 | Phase 9 | Pending |
| UNIT-13 | Phase 9 | Complete |
| UNIT-14 | Phase 9 | Pending |
| UNIT-15 | Phase 9 | Pending |
| UNIT-16 | Phase 9 | Complete |
| HOOK-01 | Phase 10 | Pending |
| HOOK-02 | Phase 10 | Pending |
| HOOK-03 | Phase 10 | Pending |
| HOOK-04 | Phase 10 | Pending |
| HOOK-05 | Phase 10 | Pending |
| HOOK-06 | Phase 10 | Pending |
| HOOK-07 | Phase 10 | Pending |
| LIB-01 | Phase 10 | Pending |
| LIB-02 | Phase 10 | Pending |
| LIB-03 | Phase 10 | Pending |
| E2E-01 | Phase 11 | Pending |
| E2E-02 | Phase 11 | Pending |
| E2E-03 | Phase 11 | Pending |
| E2E-04 | Phase 11 | Pending |
| E2E-05 | Phase 11 | Pending |
| E2E-06 | Phase 11 | Pending |
| E2E-07 | Phase 11 | Pending |
| E2E-08 | Phase 11 | Pending |
| E2E-09 | Phase 11 | Pending |
| E2E-10 | Phase 11 | Pending |
| BUG-01 | Phase 12 | Complete |
| QUAL-01 | Phase 12 | Pending |
| QUAL-02 | Phase 12 | Pending |
| QUAL-03 | Phase 12 | Pending |
| QUAL-04 | Phase 12 | Pending |

**Coverage:**
- v1.1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

---
*Requirements defined: 2026-04-20*
*Last updated: 2026-04-20 after roadmap traceability added*
