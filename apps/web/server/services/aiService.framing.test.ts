/**
 * Unit tests for AIService.generateFramingAnalysis — Phase 38-02 Task 6.
 *
 * Mocks LLM provider + cacheService + newsReadService.getArticles. Verifies:
 *   - Happy path: 6 articles across 3 regions; LLM returns 3 perspective entries; aiGenerated: true
 *   - Empty article list → aiGenerated: false, perspectives: {}
 *   - LLM null → aiGenerated: false, perspectives: {}
 *   - Invalid region key in LLM output → filtered out
 *   - Cache hit on second call → no extra LLM invocation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NewsArticle, PerspectiveRegion } from '../../src/types';

// Hoisted mocks — must match aiService.test.ts pattern.
const {
  mockCacheStore,
  mockCacheService,
  mockOpenAICreate,
  mockGeminiModel,
  mockAnthropicCreate,
  mockGetArticles,
} = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  const service = {
    getInstance: () => service,
    isAvailable: () => true,
    get: async (key: string) => (store.has(key) ? store.get(key) : null),
    set: async (key: string, value: unknown) => {
      store.set(key, value);
      return true;
    },
    setWithJitter: async (key: string, value: unknown) => {
      store.set(key, value);
      return true;
    },
    del: async () => true,
    getOrSet: async <T>(key: string, computeFn: () => Promise<T>): Promise<T> => {
      if (store.has(key)) return store.get(key) as T;
      const value = await computeFn();
      store.set(key, value);
      return value;
    },
  };
  return {
    mockCacheStore: store,
    mockCacheService: service,
    mockOpenAICreate: vi.fn(),
    mockGeminiModel: { generateContent: vi.fn() },
    mockAnthropicCreate: vi.fn(),
    mockGetArticles: vi.fn(),
  };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return { messages: { create: mockAnthropicCreate } };
  }),
}));
vi.mock('openai', () => ({
  default: vi.fn(function () {
    return { chat: { completions: { create: mockOpenAICreate } } };
  }),
}));
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function () {
    return { getGenerativeModel: () => mockGeminiModel };
  }),
}));
vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../utils/hash', () => ({
  hashString: vi.fn((str: string) => `hash-${str.slice(0, 10)}`),
}));
vi.mock('./cacheService', async () => {
  const actual = await vi.importActual<typeof import('./cacheService')>('./cacheService');
  return {
    ...actual,
    CacheService: mockCacheService,
  };
});
vi.mock('./newsReadService', () => ({
  getArticles: mockGetArticles,
}));

vi.mock('./factCheckReadService', () => ({
  searchClaimEvidence: vi.fn().mockResolvedValue([]),
  mergeAndDedup: vi.fn().mockReturnValue([]),
}));

vi.mock('./translationService', () => ({
  TranslationService: {
    getInstance: () => ({
      translate: vi.fn().mockImplementation(async (text: string) => ({
        text,
        provider: 'deepl',
        cached: false,
        quality: 0.9,
      })),
    }),
  },
}));

vi.mock('../db/prisma', () => ({
  prisma: {
    newsArticle: { findMany: vi.fn().mockResolvedValue([]) },
    factCheck: { create: vi.fn() },
  },
}));

import { AIService } from './aiService';

function makeArticle(id: string, region: PerspectiveRegion, title: string): NewsArticle {
  return {
    id,
    title,
    content: `Body content for ${title}`,
    summary: `Summary for ${title}`,
    source: {
      id: `src-${region}`,
      name: `Source ${region}`,
      country: 'XX',
      region,
      language: 'en',
      bias: { political: 0, reliability: 8, ownership: 'private' },
    },
    originalLanguage: 'en',
    publishedAt: new Date('2026-04-01').toISOString(),
    url: `https://example.com/${id}`,
    sentiment: 'neutral',
    sentimentScore: 0,
    perspective: region,
    topics: [],
    entities: [],
    cached: false,
  };
}

describe('aiService.generateFramingAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockCacheStore.clear();
    mockGeminiModel.generateContent.mockReset();
    mockOpenAICreate.mockReset();
    mockAnthropicCreate.mockReset();
    mockGetArticles.mockReset();
  });

  afterEach(() => {
    (AIService as unknown as { instance: AIService | null }).instance = null;
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mockCacheStore.clear();
  });

  it('happy path: 6 articles across 3 regions → aiGenerated: true with 3 perspective keys', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGetArticles.mockResolvedValue({
      articles: [
        makeArticle('a1', 'usa', 'US article 1'),
        makeArticle('a2', 'usa', 'US article 2'),
        makeArticle('a3', 'russland', 'RU article 1'),
        makeArticle('a4', 'russland', 'RU article 2'),
        makeArticle('a5', 'china', 'CN article 1'),
        makeArticle('a6', 'china', 'CN article 2'),
      ],
      total: 6,
    });
    mockGeminiModel.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            perspectives: {
              usa: {
                narrative: 'US framing',
                omissions: ['o1'],
                vocabulary: ['v1'],
                evidenceQuotes: ['q1'],
              },
              russland: {
                narrative: 'RU framing',
                omissions: ['o1'],
                vocabulary: ['v1'],
                evidenceQuotes: ['q1'],
              },
              china: {
                narrative: 'CN framing',
                omissions: ['o1'],
                vocabulary: ['v1'],
                evidenceQuotes: ['q1'],
              },
            },
          }),
      },
    });

    const service = AIService.getInstance();
    const result = await service.generateFramingAnalysis('israel-palestine', 'en');

    expect(result.aiGenerated).toBe(true);
    expect(Object.keys(result.perspectives).sort()).toEqual(['china', 'russland', 'usa']);
    expect(result.perspectives.usa?.narrative).toBe('US framing');
    expect(result.locale).toBe('en');
    expect(result.topic).toBe('israel-palestine');
  });

  it('empty article list → aiGenerated: false, perspectives: {}', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGetArticles.mockResolvedValue({ articles: [], total: 0 });

    const service = AIService.getInstance();
    const result = await service.generateFramingAnalysis('nonexistent-topic', 'en');

    expect(result.aiGenerated).toBe(false);
    expect(result.perspectives).toEqual({});
    expect(mockGeminiModel.generateContent).not.toHaveBeenCalled();
  });

  it('LLM null → aiGenerated: false, perspectives: {}', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGetArticles.mockResolvedValue({
      articles: [makeArticle('a1', 'usa', 'US 1'), makeArticle('a2', 'china', 'CN 1')],
      total: 2,
    });
    mockGeminiModel.generateContent.mockResolvedValue({
      response: { text: () => '' },
    });

    const service = AIService.getInstance();
    const result = await service.generateFramingAnalysis('topic', 'en');
    expect(result.aiGenerated).toBe(false);
    expect(result.perspectives).toEqual({});
  });

  it('invalid region key in LLM output → filtered out', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGetArticles.mockResolvedValue({
      articles: [makeArticle('a1', 'usa', 'US 1'), makeArticle('a2', 'china', 'CN 1')],
      total: 2,
    });
    mockGeminiModel.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            perspectives: {
              usa: {
                narrative: 'US framing',
                omissions: [],
                vocabulary: [],
                evidenceQuotes: [],
              },
              narnia: {
                narrative: 'fake region',
                omissions: [],
                vocabulary: [],
                evidenceQuotes: [],
              },
            },
          }),
      },
    });

    const service = AIService.getInstance();
    const result = await service.generateFramingAnalysis('topic-x', 'en');
    expect(result.aiGenerated).toBe(true);
    expect(result.perspectives.usa).toBeDefined();
    expect((result.perspectives as Record<string, unknown>).narnia).toBeUndefined();
  });

  it('cache hit: second call with same topic+locale → no second LLM invocation', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGetArticles.mockResolvedValue({
      articles: [makeArticle('a1', 'usa', 'US 1'), makeArticle('a2', 'china', 'CN 1')],
      total: 2,
    });
    mockGeminiModel.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            perspectives: {
              usa: { narrative: 'n', omissions: [], vocabulary: [], evidenceQuotes: [] },
            },
          }),
      },
    });

    const service = AIService.getInstance();
    await service.generateFramingAnalysis('cache-topic', 'en');
    expect(mockGeminiModel.generateContent).toHaveBeenCalledTimes(1);

    await service.generateFramingAnalysis('cache-topic', 'en');
    expect(mockGeminiModel.generateContent).toHaveBeenCalledTimes(1); // cache hit
  });

  it('LLM returns malformed JSON → aiGenerated: false', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGetArticles.mockResolvedValue({
      articles: [makeArticle('a1', 'usa', 'US 1')],
      total: 1,
    });
    mockGeminiModel.generateContent.mockResolvedValue({
      response: { text: () => 'not JSON at all' },
    });

    const service = AIService.getInstance();
    const result = await service.generateFramingAnalysis('topic', 'en');
    expect(result.aiGenerated).toBe(false);
    expect(result.perspectives).toEqual({});
  });
});
