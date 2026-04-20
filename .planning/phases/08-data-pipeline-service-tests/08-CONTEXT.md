# Phase 8: Data Pipeline Service Tests - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Unit test coverage for 6 data pipeline services: eventsService, focusSuggestionEngine, marketDataService, newsAggregator, newsCrawler, newsApiService. Each service must reach 80%+ coverage with specific edge cases tested per ROADMAP.md success criteria.

</domain>

<decisions>
## Implementation Decisions

### External Dependency Mocking
- **D-01:** Use `vi.mock()` at module level for external SDKs (yahoo-finance2, rss-parser, axios) - matches Phase 7 pattern
- **D-02:** Mock global `fetch` for newsApiService's 3 API providers (GNews, NewsAPI, MediaStack)
- **D-03:** For cheerio (newsCrawler): Use real cheerio with minimal HTML fixture strings inline - tests actual parsing without fixture file maintenance

### Service Interaction Mocking
- **D-04:** Mock all singleton service dependencies in newsAggregator (TranslationService, NewsApiService, NewsCrawler, StealthScraper, AIService) - pure unit test isolation
- **D-05:** Mock Prisma directly (`vi.mock('../db/prisma')`) - consistent with Phase 7
- **D-06:** For focusSuggestionEngine: Mock NewsAggregator.getInstance() to return controlled article sets

### Cache & Timing Patterns
- **D-07:** Use `vi.useFakeTimers()` with `vi.advanceTimersByTime()` for all TTL cache testing - matches Phase 7 pattern (D-07)
- **D-08:** Test fallback data paths for marketDataService (API failure → expired cache → fallback data) - critical for production resilience
- **D-09:** Test rate limiting delay in newsCrawler using fake timers

### Test Scope
- **D-10:** Focus on public API methods; private methods tested indirectly through public API coverage
- **D-11:** eventsService location patterns: Sample-based testing (5-10 representative locations across regions)
- **D-12:** Duplicate utility methods (analyzeSentiment, extractTopics, extractEntities): Test thoroughly in newsApiService, verify basic coverage in newsCrawler

### Test Isolation (carried from Phase 7)
- **D-13:** Reset singleton instance between tests using `(Service as any).instance = null` in afterEach
- **D-14:** Co-located test files: `server/services/{service}.test.ts` next to source

### Claude's Discretion
- Specific mock data structures for articles, events, market quotes
- Test grouping and describe block organization
- Balance between exhaustive edge cases vs representative sampling
- Choice of HTTP mocking approach per service (vi.mock vs MSW if needed)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Testing Patterns
- `.planning/codebase/TESTING.md` - Vitest/Playwright patterns, factory pattern, mock utilities
- `.planning/codebase/CONVENTIONS.md` - Naming conventions, error handling patterns
- `.planning/phases/07-core-backend-service-tests/07-CONTEXT.md` - Phase 7 decisions (mocking strategy, singleton reset pattern)

### Service Code (to be tested)
- `server/services/eventsService.ts` - Event extraction from articles, location patterns, severity calculation
- `server/services/focusSuggestionEngine.ts` - Tension spikes, breaking news, coverage gaps analysis
- `server/services/marketDataService.ts` - Yahoo Finance API, TTL cache, fallback data
- `server/services/newsAggregator.ts` - RSS aggregation, deduplication, confidence scoring
- `server/services/newsCrawler.ts` - HTML crawling with cheerio, rate limiting
- `server/services/newsApiService.ts` - GNews, NewsAPI, MediaStack integration

### Existing Test Examples
- `server/services/aiService.test.ts` - Provider fallback chain testing pattern
- `server/services/cacheService.test.ts` - TTL expiration testing with fake timers
- `server/services/cleanupService.test.ts` - Date-based logic with vi.setSystemTime()

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/test/factories.ts` - Mock data factory pattern (getMockNewsArticle, getMockNewsSource, getMockGeoEvent)
- Phase 7 test files - Patterns for singleton mocking, Prisma mocking, fake timers

### Established Patterns
- All 6 target services use `getInstance()` singleton pattern
- Winston logger used - may need to be silenced in tests
- External dependencies vary: yahoo-finance2, axios, cheerio, rss-parser, fetch API

### Integration Points
- newsAggregator imports 5 other services (TranslationService, NewsApiService, NewsCrawler, StealthScraper, AIService)
- focusSuggestionEngine imports NewsAggregator and FOCUS_PRESETS config
- All services import from `../../src/types` for type definitions

### Service Complexity Summary
| Service | Lines | Key Test Focus |
|---------|-------|----------------|
| eventsService | 442 | Location extraction, severity calculation, cache TTL |
| focusSuggestionEngine | 339 | Tension spike detection, topic frequency analysis |
| marketDataService | 163 | Yahoo API mock, fallback data path, cache expiration |
| newsAggregator | 640 | RSS parsing, deduplication, confidence scoring |
| newsCrawler | 410 | HTML parsing, rate limiting, cache per source |
| newsApiService | 367 | 3 API providers, perspective detection, data normalization |

</code_context>

<specifics>
## Specific Ideas

No specific requirements - open to standard testing approaches within the decisions captured above. User deferred all specific choices to Claude's discretion.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 08-data-pipeline-service-tests*
*Context gathered: 2026-04-20*
