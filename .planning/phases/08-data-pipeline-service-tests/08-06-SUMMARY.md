---
phase: 08-data-pipeline-service-tests
plan: 06
subsystem: backend-services
tags: [testing, vitest, newsAggregator, rss, deduplication, confidence-scoring]
dependency_graph:
  requires:
    - 08-03 (cacheService test patterns)
    - 08-04 (aiService mock patterns)
  provides:
    - newsAggregator.test.ts (90 unit tests)
  affects:
    - test coverage metrics
tech_stack:
  added: []
  patterns:
    - RSS parser mocking with constructor function
    - Multi-service singleton dependency mocking
    - Article index testing for O(1) lookups
key_files:
  created:
    - server/services/newsAggregator.test.ts
  modified: []
decisions:
  - Mocked rss-parser as constructor function to support module-level initialization
  - Tested AI service fallback paths (classifyTopics, analyzeSentiment errors)
  - Used factory functions for diverse test article sets
metrics:
  duration_seconds: 394
  completed: 2026-04-21T09:22:35Z
  tasks_completed: 1
  tests_added: 90
  coverage_statements: 97.54%
  coverage_branches: 82.17%
  coverage_functions: 97.82%
  coverage_lines: 97.78%
---

# Phase 08 Plan 06: NewsAggregator Unit Tests Summary

Comprehensive unit tests for NewsAggregator achieving 82%+ branch coverage with 90 tests covering RSS aggregation, deduplication, confidence scoring, and multi-source integration.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 1b5b578 | test | add newsAggregator unit tests with 82% branch coverage |

## What Was Built

### Test Coverage by Feature

**Singleton Pattern (2 tests)**
- getInstance() returns same instance
- Creates new instance after singleton reset

**Article Filtering - getArticles() (14 tests)**
- Returns all articles with total count
- Filters by single/multiple regions
- Filters by topics array
- Search in title, content, source name, translated titles (de/en)
- Filters by sentiment, language
- Pagination with offset/limit
- Combined multi-filter queries

**Article Operations (8 tests)**
- getArticleById: found/not found
- getArticleCount: correct count, empty array
- getSources: returns NEWS_SOURCES
- getSentimentByRegion: groups, counts sentiment types per region

**Deduplication (5 tests)**
- Removes similar normalized titles
- Keeps first occurrence
- Normalizes: lowercase, alphanumeric only, first 50 chars
- Handles very long titles and empty arrays

**Sentiment Analysis (5 tests)**
- Negative when negative words > positive + 1
- Positive when positive words > negative + 1
- Neutral otherwise and on equal counts
- Score capping at max values

**Entity Extraction (5 tests)**
- Extracts known entities (Gaza, Israel, Hamas, UN, etc.)
- Case-sensitive matching
- Multiple entities from same text
- Empty array when none found

**Image URL Extraction (5 tests)**
- Extracts src from img tags
- Handles multiple attributes, multiple images
- Returns undefined for no img tag or empty content

**Confidence Scoring (6 tests)**
- Topic/entity indexes for O(1) lookup
- Source count factor (0-50 points)
- Perspective diversity factor (0-50 points)
- Reliability boost (0-10 points)
- Clamping to max 100

**Article Indexing (5 tests)**
- Creates topicIndex, entityIndex, articleMap
- Clears indexes before rebuilding
- updateConfidenceScores updates all articles

**RSS Fetching (5 tests)**
- Returns mock articles when no apiEndpoint
- Parses RSS feed successfully
- Falls back to mock on parse error
- Uses fallback topics when AI classifyTopics fails
- Uses keyword sentiment when AI analyzeSentiment fails

**Aggregation Lifecycle (8 tests)**
- startAggregation: syncs sources, loads articles, starts interval
- stopAggregation: clears interval, handles null gracefully
- fetchAllSources: RSS, API, crawler, stealth scraper paths
- syncSources/ensureSourceExists: database upsert

**Translation (11 tests)**
- translateArticle: null on not found, title/content translation
- Skips already translated, works for both de/en
- translateHeadlines: skips EN/DE originals, handles errors

**Prisma Conversion (5 tests)**
- toPrismaArticle: serializes JSON fields
- fromPrismaArticle: deserializes JSON fields
- Handles null translated fields

## Mocking Strategy

Per D-04 and D-05 context decisions:

```typescript
// 5 singleton service dependencies
vi.mock('./translationService')
vi.mock('./newsApiService')
vi.mock('./newsCrawler')
vi.mock('./stealthScraper')
vi.mock('./aiService')

// Prisma
vi.mock('../db/prisma')

// rss-parser (constructor pattern for module-level initialization)
vi.mock('rss-parser', () => {
  const MockParser = function(this: any) {
    this.parseURL = vi.fn().mockResolvedValue({ items: [...] });
  };
  return { default: MockParser };
});

// Singleton reset per D-13
afterEach(() => {
  (NewsAggregator as any).instance = null;
});
```

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] File exists: server/services/newsAggregator.test.ts
- [x] Contains: describe('NewsAggregator')
- [x] Contains: vi.mock('./translationService')
- [x] Contains: vi.mock('./newsApiService')
- [x] Contains: vi.mock('./newsCrawler')
- [x] Contains: vi.mock('./stealthScraper')
- [x] Contains: vi.mock('./aiService')
- [x] Contains: vi.mock('../db/prisma')
- [x] Contains: vi.mock('rss-parser')
- [x] Contains: (NewsAggregator as any).instance = null
- [x] 90 tests pass with 0 failures
- [x] Branch coverage 82.17% >= 80%
