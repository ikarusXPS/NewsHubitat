# Phase 8: Data Pipeline Service Tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 08-data-pipeline-service-tests
**Areas discussed:** External dependency mocking, Service interaction mocking, Cache & timing patterns, Test scope per service

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| External dependency mocking | How to mock rss-parser, cheerio/axios, yahoo-finance2, fetch APIs | ✓ |
| Service interaction mocking | newsAggregator depends on 4 other services. Mock them all or test integration? | ✓ |
| Cache & timing patterns | TTL caches in eventsService, marketDataService, newsCrawler | ✓ |
| Test scope per service | Which edge cases matter most for large services? | ✓ |

**User's choice:** All four areas selected for discussion

---

## External Dependency Mocking

### HTTP/SDK Mocking Approach

| Option | Description | Selected |
|--------|-------------|----------|
| vi.mock() each SDK (Recommended) | Mock yahoo-finance2, axios, rss-parser at module level. Matches Phase 7 pattern. | |
| Use MSW (Mock Service Worker) | Intercept fetch/axios at network layer. More realistic but heavier setup. | |
| You decide | Claude picks the approach that best fits each service. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion to choose mocking approach per service.

### Cheerio Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Mock cheerio.load (Recommended) | Mock the cheerio module to return controlled $ selectors. | |
| Use real cheerio with fixture HTML | Create HTML fixture files that represent real crawled pages. | |
| You decide | Claude picks based on test coverage needs. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion.

---

## Service Interaction Mocking

### newsAggregator Dependencies

| Option | Description | Selected |
|--------|-------------|----------|
| Mock all service singletons (Recommended) | vi.mock() each service. Test newsAggregator logic in isolation. | |
| Use spy/partial mocks | Let some services run real code, spy on others. | |
| You decide | Claude chooses based on what each test needs. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion.

### focusSuggestionEngine Dependency

| Option | Description | Selected |
|--------|-------------|----------|
| Mock NewsAggregator entirely | vi.mock() newsAggregator and return controlled article sets. | |
| Inject mock articles via spy | Let NewsAggregator instantiate but spy on getArticles(). | |
| You decide | Claude picks based on test maintainability. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion.

---

## Cache & Timing Patterns

### TTL Testing Approach

| Option | Description | Selected |
|--------|-------------|----------|
| vi.useFakeTimers() for all (Recommended) | Matches Phase 7 pattern. Fast, deterministic. | |
| Real timers with short TTL override | Set TTL to 10ms for tests, actually wait. | |
| You decide | Claude picks based on service complexity. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion.

### Fallback Data Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Test all fallback paths (Recommended) | Mock API errors, verify fallback returns correct shape. | |
| Test happy path only | Focus on successful API calls. | |
| You decide | Claude balances coverage vs effort. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion.

---

## Test Scope Per Service

### Private Methods

| Option | Description | Selected |
|--------|-------------|----------|
| Public API only (Recommended) | Test getInstance(), getArticles(), etc. Private methods tested indirectly. | |
| Test key private methods too | Also test deduplicateArticles(), analyzeSentiment() directly. | |
| You decide | Claude balances coverage needs per service. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion.

### Location Pattern Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Sample-based testing (Recommended) | Test 5-10 representative locations. | |
| Test all 100+ locations | Comprehensive but tedious. | |
| You decide | Claude picks based on risk assessment. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion.

### Duplicate Utility Methods

| Option | Description | Selected |
|--------|-------------|----------|
| Test in one service, skip in other (Recommended) | Avoid duplication of test effort. | |
| Test both independently | Each service's tests are self-contained. | |
| You decide | Claude handles based on actual differences. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion.

---

## Claude's Discretion

All specific implementation choices deferred to Claude:
- External dependency mocking approach per service
- Cheerio testing approach
- Service interaction mocking strategy
- Cache TTL testing approach
- Fallback data testing priority
- Private method testing scope
- Location pattern testing coverage
- Duplicate utility method testing

## Deferred Ideas

None - discussion stayed within phase scope
