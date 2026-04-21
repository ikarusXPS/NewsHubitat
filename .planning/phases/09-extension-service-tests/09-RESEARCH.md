# Phase 9: Extension Service Tests - Research

**Researched:** 2026-04-21
**Domain:** Backend service unit testing (Vitest)
**Confidence:** HIGH

## Summary

Phase 9 targets five "extension" services that add specialized capabilities to NewsHub: persona management, content sharing, stealth web scraping, multi-provider translation, and real-time WebSocket communication. These services have diverse external dependencies (Puppeteer, DeepL, Anthropic, Socket.IO) requiring careful mocking strategies.

The established testing patterns from Phases 7-8 provide a solid foundation. All services follow the singleton pattern with `getInstance()`, use in-memory Maps for caching, and depend on logger and hash utilities. The test files should follow the D-xx directive patterns established in previous phases: D-01 (mock at file top), D-09 (reset singleton), D-13 (reset between tests).

**Primary recommendation:** Apply the proven Phase 7-8 test patterns to these five services, with service-specific attention to provider fallback chains (translationService), WebSocket lifecycle events (websocketService), and Puppeteer browser mocking (stealthScraper).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persona matching/suggestion | API/Backend | - | Business logic for AI persona selection |
| Share link generation | API/Backend | - | Server-side ID generation, URL encoding |
| Click tracking analytics | API/Backend | Database/Storage | Tracking data stored in-memory (Maps) |
| Stealth web scraping | API/Backend | - | Server-side Puppeteer browser automation |
| Multi-provider translation | API/Backend | - | External API orchestration with fallback |
| WebSocket connections | API/Backend | Browser/Client | Server manages, client consumes events |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UNIT-12 | personaService has unit tests with 80%+ coverage | Persona matching via keyword detection, AIService integration for analysis |
| UNIT-13 | sharingService has unit tests with 80%+ coverage | nanoid mocking, URL encoding, expiration logic, click tracking |
| UNIT-14 | stealthScraper has unit tests with 80%+ coverage | Puppeteer mocking, cheerio parsing (real), cache TTL, retry logic |
| UNIT-15 | translationService has unit tests with 80%+ coverage | Multi-provider fallback (DeepL -> Google -> LibreTranslate -> Claude), cache |
| UNIT-16 | websocketService has unit tests with 80%+ coverage | Socket.IO server mocking, room subscriptions, broadcast events |

## Standard Stack

### Core Testing
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.4 | Test runner | [VERIFIED: npm registry] Project standard |
| vi.mock | built-in | Module mocking | Hoisted mocks for ESM |
| vi.fn | built-in | Function spies | Track calls and returns |
| vi.useFakeTimers | built-in | Time control | Cache TTL, expiration testing |

### Service-Specific Mocks Required
| Service | External Deps | Mock Strategy |
|---------|---------------|---------------|
| personaService | AIService | `vi.mock('./aiService')` - mock callWithFallback |
| sharingService | nanoid | `vi.mock('nanoid')` - return predictable IDs |
| stealthScraper | puppeteer-extra, cheerio | Mock puppeteer entirely, use real cheerio |
| translationService | deepl-node, @anthropic-ai/sdk, fetch | Mock all provider clients + global fetch |
| websocketService | socket.io | Mock Server class and Socket events |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cheerio | 1.2.0 | HTML parsing | [VERIFIED: npm] Use real in stealthScraper tests |

**Installation:** No additional packages needed - all testing infrastructure exists.

## Architecture Patterns

### System Architecture Diagram

```
                         Test Runner (Vitest)
                                |
          +---------+-----------+-----------+---------+
          |         |           |           |         |
    personaService  sharingService  stealthScraper  translationService  websocketService
          |              |            |                   |                   |
    +-----+-----+   +----+----+   +---+---+        +-----+-----+       +-----+-----+
    |           |   |         |   |       |        |     |     |       |           |
  AIService  Personas  nanoid  Cache  Puppeteer  DeepL Google Claude  Socket.IO  Events
  (mocked)   (real)   (mock)  (real)  (mocked)  (mock) (mock) (mock)  (mocked)   (emit)
```

### Recommended Test File Structure
```
server/services/
├── personaService.test.ts      # ~150 lines - persona matching, AI integration
├── sharingService.test.ts      # ~200 lines - share creation, URL generation, analytics
├── stealthScraper.test.ts      # ~250 lines - scraping, caching, sentiment, entities
├── translationService.test.ts  # ~300 lines - fallback chain, cache, rate limits
└── websocketService.test.ts    # ~200 lines - connection lifecycle, broadcasts, rooms
```

### Pattern 1: Singleton Reset Between Tests
**What:** Reset singleton instance to ensure test isolation
**When to use:** Every service test file
**Example:**
```typescript
// Source: established pattern from Phase 7-8 tests
afterEach(() => {
  (PersonaService as unknown as { instance: PersonaService | null }).instance = null;
  vi.clearAllMocks();
});
```

### Pattern 2: External Service Mocking (File Top)
**What:** Mock all external dependencies at file top before imports
**When to use:** Every test file with external deps
**Example:**
```typescript
// Source: established pattern D-01 from Phase 7
vi.mock('deepl-node', () => ({
  Translator: vi.fn(function() {
    return {
      translateText: vi.fn().mockResolvedValue({ text: 'translated', detectedSourceLang: 'en' })
    };
  })
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Import AFTER mocks
import { TranslationService } from './translationService';
```

### Pattern 3: Provider Fallback Chain Testing
**What:** Test each provider in isolation, then test fallback behavior
**When to use:** translationService, similar to aiService fallback tests
**Example:**
```typescript
// Source: adapted from aiService.test.ts fallback tests
it('should try DeepL first, fall back to Google on error', async () => {
  vi.stubEnv('DEEPL_API_KEY', 'test-key');
  vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-google-key');

  // Mock DeepL to fail
  mockDeeplTranslate.mockRejectedValue(new Error('Rate limited'));

  // Mock Google to succeed
  mockFetch.mockResolvedValue({ ok: true, json: () => ({ data: { translations: [{ translatedText: 'test' }] } }) });

  const service = TranslationService.getInstance();
  const result = await service.translate('hello', 'de');

  expect(result.provider).toBe('google');
});
```

### Pattern 4: WebSocket Event Testing
**What:** Mock Socket.IO Server and test event emissions
**When to use:** websocketService tests
**Example:**
```typescript
// Source: Socket.IO testing documentation [CITED: socket.io/docs/v4/testing]
const mockSocket = {
  id: 'test-socket-id',
  data: { subscribedRegions: new Set(), subscribedTopics: new Set() },
  emit: vi.fn(),
  join: vi.fn(),
  leave: vi.fn(),
  on: vi.fn(),
};

const mockIo = {
  on: vi.fn((event, handler) => {
    if (event === 'connection') handler(mockSocket);
  }),
  emit: vi.fn(),
  to: vi.fn().mockReturnThis(),
  sockets: { adapter: { rooms: new Map() } },
  close: vi.fn(),
};

vi.mock('socket.io', () => ({
  Server: vi.fn(() => mockIo),
}));
```

### Pattern 5: Puppeteer Browser Mocking
**What:** Mock entire browser lifecycle without launching real browser
**When to use:** stealthScraper tests
**Example:**
```typescript
// Source: puppeteer testing patterns [ASSUMED]
const mockPage = {
  setViewport: vi.fn(),
  setUserAgent: vi.fn(),
  setExtraHTTPHeaders: vi.fn(),
  setRequestInterception: vi.fn(),
  on: vi.fn(),
  goto: vi.fn().mockResolvedValue(undefined),
  waitForSelector: vi.fn().mockResolvedValue(undefined),
  content: vi.fn().mockResolvedValue('<html><body></body></html>'),
  evaluate: vi.fn(),
  close: vi.fn(),
};

const mockBrowser = {
  newPage: vi.fn().mockResolvedValue(mockPage),
  on: vi.fn(),
  close: vi.fn(),
};

vi.mock('puppeteer-extra', () => ({
  default: {
    use: vi.fn(),
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}));

vi.mock('puppeteer-extra-plugin-stealth', () => ({
  default: vi.fn(),
}));

vi.mock('puppeteer-extra-plugin-adblocker', () => ({
  default: vi.fn(),
}));
```

### Anti-Patterns to Avoid
- **Launching real Puppeteer browsers in tests:** Slow, flaky, requires Chrome installation
- **Making real HTTP requests in translation tests:** Use mocked fetch
- **Not resetting singleton instances:** Causes test pollution
- **Mocking after imports:** Vitest requires mocks before the import statement

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Random ID generation | Custom random | `vi.mock('nanoid')` with predictable returns | Deterministic test assertions |
| HTTP request mocking | Manual fetch override | `vi.fn()` on mock fetch | Cleaner, type-safe |
| Time control | setTimeout manipulation | `vi.useFakeTimers()` | Built-in Vitest support |
| Socket event testing | Manual event emitter | Mock Socket.IO Server class | Matches production API |

## Common Pitfalls

### Pitfall 1: Singleton State Leakage
**What goes wrong:** Tests pass individually but fail when run together
**Why it happens:** Singleton services retain state from previous tests
**How to avoid:** Reset singleton in afterEach: `(Service as any).instance = null`
**Warning signs:** "works in isolation, fails in suite" pattern

### Pitfall 2: Missing Environment Variable Setup
**What goes wrong:** Service initializes with wrong provider or no providers
**Why it happens:** translationService reads env vars at construction time
**How to avoid:** Use `vi.stubEnv()` BEFORE calling `getInstance()`
**Warning signs:** "provider is 'none'" or wrong provider in tests

### Pitfall 3: Async Cache Timing
**What goes wrong:** Cache tests pass inconsistently
**Why it happens:** Real timers cause race conditions
**How to avoid:** Use `vi.useFakeTimers()` + `vi.advanceTimersByTime()`
**Warning signs:** Flaky tests involving TTL expiration

### Pitfall 4: WebSocket Handler Registration
**What goes wrong:** Event handlers not called in tests
**Why it happens:** Mock doesn't capture the 'connection' callback properly
**How to avoid:** Capture handler in mock's `on()` and call it manually
**Warning signs:** "socket.emit was not called" assertions failing

### Pitfall 5: Puppeteer Stealth Plugin Import Side Effects
**What goes wrong:** Tests crash with "Cannot use import statement outside module"
**Why it happens:** puppeteer-extra plugins have ESM/CJS issues
**How to avoid:** Mock entire puppeteer-extra and plugin modules
**Warning signs:** Import errors at test startup

## Code Examples

### personaService Test Setup
```typescript
// Source: established patterns from aiService.test.ts
vi.mock('./aiService', () => ({
  AIService: {
    getInstance: vi.fn(() => ({
      analyzeText: vi.fn().mockResolvedValue('Analysis result'),
    })),
  },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { PersonaService, DEFAULT_PERSONAS } from './personaService';

describe('PersonaService', () => {
  afterEach(() => {
    (PersonaService as unknown as { instance: PersonaService | null }).instance = null;
    vi.clearAllMocks();
  });

  describe('suggestPersona', () => {
    it('suggests economist for economic keywords', () => {
      const service = PersonaService.getInstance();
      const result = service.suggestPersona('Was sind die wirtschaftlichen Folgen?');
      expect(result.id).toBe('economist');
    });
  });
});
```

### sharingService Test with nanoid Mock
```typescript
// Source: adapted from existing service test patterns
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id-123'),
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { SharingService } from './sharingService';

describe('SharingService', () => {
  afterEach(() => {
    (SharingService as unknown as { instance: SharingService | null }).instance = null;
    vi.clearAllMocks();
  });

  describe('createShare', () => {
    it('generates share with predictable code', async () => {
      const service = SharingService.getInstance();
      const share = await service.createShare('article', 'art-1', 'Test Title');

      expect(share.shareCode).toBe('test-id-123');
      expect(share.contentType).toBe('article');
    });
  });
});
```

### translationService Fallback Chain Test
```typescript
// Source: adapted from aiService.test.ts fallback patterns
const mockDeeplTranslate = vi.fn();
const mockAnthropicCreate = vi.fn();

vi.mock('deepl-node', () => ({
  Translator: vi.fn(function() {
    return { translateText: mockDeeplTranslate };
  })
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function() {
    return { messages: { create: mockAnthropicCreate } };
  })
}));

// Mock global fetch for Google/LibreTranslate
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { TranslationService } from './translationService';

describe('TranslationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockDeeplTranslate.mockReset();
    mockAnthropicCreate.mockReset();
    mockFetch.mockReset();
  });

  afterEach(() => {
    (TranslationService as unknown as { instance: TranslationService | null }).instance = null;
  });

  it('returns cached result within TTL', async () => {
    vi.useFakeTimers();
    vi.stubEnv('DEEPL_API_KEY', 'test-key');

    mockDeeplTranslate.mockResolvedValue({ text: 'cached', detectedSourceLang: 'en' });

    const service = TranslationService.getInstance();
    const result1 = await service.translate('hello', 'de');
    const result2 = await service.translate('hello', 'de');

    expect(mockDeeplTranslate).toHaveBeenCalledTimes(1);
    expect(result2.cached).toBe(true);

    vi.useRealTimers();
  });
});
```

### websocketService Connection Lifecycle Test
```typescript
// Source: Socket.IO testing patterns [CITED: socket.io/docs/v4/testing]
import { Server as HttpServer } from 'http';

let connectionHandler: ((socket: any) => void) | null = null;
const mockSocket = {
  id: 'socket-1',
  data: {} as any,
  emit: vi.fn(),
  join: vi.fn(),
  leave: vi.fn(),
  on: vi.fn(),
};

const mockIo = {
  on: vi.fn((event, handler) => {
    if (event === 'connection') connectionHandler = handler;
  }),
  emit: vi.fn(),
  to: vi.fn().mockReturnThis(),
  sockets: { adapter: { rooms: new Map() } },
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock('socket.io', () => ({
  Server: vi.fn(() => mockIo),
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { WebSocketService } from './websocketService';

describe('WebSocketService', () => {
  let httpServer: HttpServer;

  beforeEach(() => {
    httpServer = {} as HttpServer;
    connectionHandler = null;
    mockSocket.data = {};
  });

  afterEach(() => {
    (WebSocketService as unknown as { instance: WebSocketService | null }).instance = null;
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('sets up connection handler', () => {
      const service = WebSocketService.getInstance();
      service.initialize(httpServer);

      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('emits connected event on new connection', () => {
      const service = WebSocketService.getInstance();
      service.initialize(httpServer);

      // Trigger connection
      connectionHandler!(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
        clientId: 'socket-1',
        serverTime: expect.any(Number),
      }));
    });
  });
});
```

### stealthScraper with Cheerio (Real)
```typescript
// Source: adapted from newsCrawler test patterns
const mockPage = {
  setViewport: vi.fn(),
  setUserAgent: vi.fn(),
  setExtraHTTPHeaders: vi.fn(),
  setRequestInterception: vi.fn(),
  on: vi.fn(),
  goto: vi.fn().mockResolvedValue(undefined),
  waitForSelector: vi.fn().mockResolvedValue(undefined),
  content: vi.fn(),
  evaluate: vi.fn(),
  close: vi.fn(),
};

const mockBrowser = {
  newPage: vi.fn().mockResolvedValue(mockPage),
  on: vi.fn(),
  close: vi.fn(),
};

vi.mock('puppeteer-extra', () => ({
  default: {
    use: vi.fn(),
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}));

vi.mock('puppeteer-extra-plugin-stealth', () => ({ default: vi.fn() }));
vi.mock('puppeteer-extra-plugin-adblocker', () => ({ default: vi.fn() }));

// Use real cheerio - it's fast and deterministic
import { StealthScraper } from './stealthScraper';

describe('StealthScraper', () => {
  afterEach(() => {
    (StealthScraper as unknown as { instance: StealthScraper | null }).instance = null;
    vi.clearAllMocks();
  });

  describe('parseArticles (via scrapeSource)', () => {
    it('extracts articles from HTML using cheerio', async () => {
      const html = `
        <article>
          <h3><a href="/article/1">Test Article</a></h3>
          <p>Article content here</p>
        </article>
      `;
      mockPage.content.mockResolvedValue(html);

      const service = StealthScraper.getInstance();
      const config = service.getConfigs()[0]; // Use first config

      const articles = await service.scrapeSource(config);

      expect(articles).toBeInstanceOf(Array);
    });
  });

  describe('analyzeSentiment', () => {
    it('returns negative for conflict keywords', () => {
      const service = StealthScraper.getInstance();
      const result = (service as any).analyzeSentiment('War breaks out', 'People killed in attack');

      expect(result.type).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual singleton reset | Pattern D-09 afterEach reset | Phase 7 | Consistent test isolation |
| Real HTTP in tests | Mock all external calls | Phase 7 | 10x faster, no network flakes |
| console.log mocking | logger mock at file top | Phase 7 | Clean test output |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Puppeteer-extra plugins can be fully mocked without ESM issues | Code Examples | Medium - may need different mock strategy |
| A2 | Socket.IO Server mock structure matches actual API | Code Examples | Low - well-documented API |
| A3 | Real cheerio is fast enough for unit tests | Standard Stack | Low - cheerio is synchronous and fast |

## Open Questions

1. **Puppeteer ESM Compatibility**
   - What we know: puppeteer-extra uses plugins that may have CJS/ESM issues
   - What's unclear: Exact mock structure needed for TypeScript/ESM
   - Recommendation: Test mock structure in first stealthScraper test, adjust if import errors occur

2. **TranslationService Rate Limit Testing**
   - What we know: DeepL has monthlyCharCount tracking
   - What's unclear: Whether to test rate limit enforcement as separate test
   - Recommendation: Include rate limit test showing provider skip when limit reached

## Project Constraints (from CLAUDE.md)

- **Test commands:** `npm run test` (watch), `npm run test:run` (CI), `npm run test:coverage` (80% threshold)
- **Coverage threshold:** 80% for statements, branches, functions, lines
- **Singleton pattern:** All services use `getInstance()` - must reset between tests
- **Test location:** `server/services/*.test.ts` matches `vitest.config.ts` include pattern
- **Test timeout:** 10000ms configured in vitest.config.ts

## Sources

### Primary (HIGH confidence)
- Existing test files: cleanupService.test.ts, aiService.test.ts, newsAggregator.test.ts [VERIFIED: local files]
- Vitest documentation [VERIFIED: npm registry shows 4.1.4]
- Project vitest.config.ts [VERIFIED: local file]

### Secondary (MEDIUM confidence)
- Socket.IO testing documentation [CITED: socket.io/docs/v4/testing]
- Package versions from npm registry [VERIFIED: deepl-node 1.26.0, socket.io 4.8.3, puppeteer 24.42.0]

### Tertiary (LOW confidence)
- Puppeteer-extra mocking patterns [ASSUMED: based on general mocking practices]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all patterns from existing Phase 7-8 tests
- Architecture: HIGH - services are well-documented singletons
- Pitfalls: HIGH - observed from existing test patterns
- Provider fallback chain: MEDIUM - based on aiService pattern, needs adaptation

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days - stable testing patterns)
