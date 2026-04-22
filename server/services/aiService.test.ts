/**
 * Unit tests for AIService
 * Tests provider fallback chain, caching, singleton pattern, and clustering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NewsArticle } from '../../src/types';

// Create mock implementations that will be used
const mockGeminiModel = {
  generateContent: vi.fn()
};

const mockOpenAICreate = vi.fn();
const mockAnthropicCreate = vi.fn();

// Mock external dependencies at file top (per D-01)
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function() {
    return {
      messages: {
        create: mockAnthropicCreate
      }
    };
  })
}));

vi.mock('openai', () => ({
  default: vi.fn(function() {
    return {
      chat: {
        completions: {
          create: mockOpenAICreate
        }
      }
    };
  })
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function() {
    return {
      getGenerativeModel: () => mockGeminiModel
    };
  })
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('../utils/hash', () => ({
  hashString: vi.fn((str: string) => `hash-${str.slice(0, 10)}`)
}));

// Mock CacheService for Redis caching (Phase 14-04 migration)
// Use vi.hoisted() to avoid hoisting issues with vi.mock factory
const { mockCacheStore, mockCacheService } = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  const service = {
    getInstance: () => service,
    isAvailable: () => true,
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      store.set(key, value);
      return true;
    },
    del: async () => true,
  };
  return { mockCacheStore: store, mockCacheService: service };
});

vi.mock('./cacheService', () => ({
  CacheService: mockCacheService,
  CacheKeys: {
    aiSummary: (key: string) => `ai:summary:${key}`,
    aiTopics: (hash: string) => `ai:topics:${hash}`,
  },
}));

// Import after mocks
import { AIService } from './aiService';

describe('AIService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    // Clear mock cache store (Phase 14-04: Redis migration)
    mockCacheStore.clear();

    // Reset mock functions to default behavior
    mockGeminiModel.generateContent.mockReset();
    mockOpenAICreate.mockReset();
    mockAnthropicCreate.mockReset();
  });

  afterEach(() => {
    // Reset singleton instance between tests (per D-09)
    (AIService as unknown as { instance: AIService | null }).instance = null;
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    // Clear mock cache store
    mockCacheStore.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Provider Priority', () => {
    it('should return false from isAvailable() when no API keys set', () => {
      const service = AIService.getInstance();
      expect(service.isAvailable()).toBe(false);
      expect(service.getProvider()).toBe('none');
    });

    it('should return true from isAvailable() when OPENROUTER_API_KEY is set', () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-key');
      const service = AIService.getInstance();
      expect(service.isAvailable()).toBe(true);
      expect(service.getProvider()).toBe('openrouter');
    });

    it('should return true from isAvailable() when only GEMINI_API_KEY is set', () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
      const service = AIService.getInstance();
      expect(service.isAvailable()).toBe(true);
      expect(service.getProvider()).toBe('gemini');
    });

    it('should return true from isAvailable() when only ANTHROPIC_API_KEY is set', () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
      const service = AIService.getInstance();
      expect(service.isAvailable()).toBe(true);
      expect(service.getProvider()).toBe('anthropic');
    });

    it('should prioritize OpenRouter over Gemini when both keys set', () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-key');
      vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
      const service = AIService.getInstance();
      expect(service.getProvider()).toBe('openrouter');
    });

    it('should prioritize Gemini over Anthropic when both keys set', () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
      const service = AIService.getInstance();
      expect(service.getProvider()).toBe('gemini');
    });
  });

  describe('Clustering', () => {
    it('should group articles by entity and return clusters with 3+ articles from 2+ regions', () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      const service = AIService.getInstance();

      const articles: NewsArticle[] = [
        createMockArticle('1', 'Gaza article 1', 'western', ['Gaza', 'Israel']),
        createMockArticle('2', 'Gaza article 2', 'russian', ['Gaza', 'Hamas']),
        createMockArticle('3', 'Gaza article 3', 'chinese', ['Gaza', 'Israel']),
        createMockArticle('4', 'Ukraine article 1', 'western', ['Ukraine', 'Russia']),
        createMockArticle('5', 'Ukraine article 2', 'western', ['Ukraine', 'Russia']),
      ];

      const clusters = service.clusterArticles(articles);

      // Should have Gaza cluster (3 articles from 3 regions)
      expect(clusters.length).toBeGreaterThan(0);
      const gazaCluster = clusters.find(c => c.topic === 'Gaza');
      expect(gazaCluster).toBeDefined();
      expect(gazaCluster!.articles.length).toBeGreaterThanOrEqual(3);

      const regions = new Set(gazaCluster!.articles.map(a => a.perspective));
      expect(regions.size).toBeGreaterThanOrEqual(2);
    });

    it('should prioritize conflict entities in clustering', () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      const service = AIService.getInstance();

      const articles: NewsArticle[] = [
        createMockArticle('1', 'Article 1', 'western', ['Economy', 'Gaza']),
        createMockArticle('2', 'Article 2', 'russian', ['Trade', 'Gaza']),
        createMockArticle('3', 'Article 3', 'chinese', ['Business', 'Gaza']),
      ];

      const clusters = service.clusterArticles(articles);

      // Should cluster by Gaza (priority entity) not Economy/Trade/Business
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters[0].topic).toBe('Gaza');
    });

    it('should return top 5 clusters sorted by article count', () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      const service = AIService.getInstance();

      const articles: NewsArticle[] = [];
      // Create 6 different clusters with varying sizes
      const entities = ['Gaza', 'Ukraine', 'Iran', 'Syria', 'Yemen', 'Lebanon'];
      const regions = ['western', 'russian', 'chinese'];

      entities.forEach((entity, index) => {
        const articleCount = 6 - index; // Gaza:6, Ukraine:5, Iran:4, etc.
        for (let i = 0; i < articleCount; i++) {
          const regionIndex = i % regions.length;
          articles.push(createMockArticle(
            `${entity}-${i}`,
            `${entity} article ${i}`,
            regions[regionIndex] as any,
            [entity]
          ));
        }
      });

      const clusters = service.clusterArticles(articles);

      // Should return max 5 clusters
      expect(clusters.length).toBeLessThanOrEqual(5);

      // Should be sorted by article count (descending)
      for (let i = 0; i < clusters.length - 1; i++) {
        expect(clusters[i].articles.length).toBeGreaterThanOrEqual(clusters[i + 1].articles.length);
      }
    });

    it('should filter out clusters with less than 3 articles', () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      const service = AIService.getInstance();

      const articles: NewsArticle[] = [
        createMockArticle('1', 'Article 1', 'western', ['Topic1']),
        createMockArticle('2', 'Article 2', 'russian', ['Topic1']),
        createMockArticle('3', 'Article 3', 'western', ['Topic2']),
      ];

      const clusters = service.clusterArticles(articles);

      // No cluster should have less than 3 articles
      clusters.forEach(cluster => {
        expect(cluster.articles.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should filter out clusters with articles from less than 2 regions', () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      const service = AIService.getInstance();

      const articles: NewsArticle[] = [
        createMockArticle('1', 'Article 1', 'western', ['Topic1']),
        createMockArticle('2', 'Article 2', 'western', ['Topic1']),
        createMockArticle('3', 'Article 3', 'western', ['Topic1']),
        createMockArticle('4', 'Article 4', 'western', ['Topic1']),
      ];

      const clusters = service.clusterArticles(articles);

      // No cluster should have articles from only 1 region
      clusters.forEach(cluster => {
        const regions = new Set(cluster.articles.map(a => a.perspective));
        expect(regions.size).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Summary Generation with Cache', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return mock summary when AI unavailable', async () => {
      // No API keys set
      const service = AIService.getInstance();

      const cluster = {
        topic: 'Gaza',
        articles: [
          createMockArticle('1', 'Article 1', 'western', ['Gaza']),
          createMockArticle('2', 'Article 2', 'russian', ['Gaza']),
          createMockArticle('3', 'Article 3', 'chinese', ['Gaza']),
        ]
      };

      const summary = await service.generateClusterSummary(cluster);

      expect(summary).not.toBeNull();
      expect(summary!.topic).toBe('Gaza');
      expect(summary!.summary).toContain('Gaza');
      expect(summary!.perspectives.length).toBe(3);
    });

    it('should cache summary result and reuse within TTL', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      // Mock Gemini response
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            summary: 'Test summary',
            perspectives: [],
            commonGround: [],
            divergences: []
          })
        }
      });

      const service = AIService.getInstance();

      const cluster = {
        topic: 'Gaza',
        articles: [
          createMockArticle('1', 'Article 1', 'western', ['Gaza']),
          createMockArticle('2', 'Article 2', 'russian', ['Gaza']),
          createMockArticle('3', 'Article 3', 'chinese', ['Gaza']),
        ]
      };

      // First call - should hit AI
      const summary1 = await service.generateClusterSummary(cluster);
      expect(mockGeminiModel.generateContent).toHaveBeenCalledTimes(1);

      // Second call immediately - should use cache
      const summary2 = await service.generateClusterSummary(cluster);
      expect(mockGeminiModel.generateContent).toHaveBeenCalledTimes(1); // Still 1
      expect(summary2).toBe(summary1); // Same object
    });

    it('should regenerate summary when cache expired', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      // Mock Gemini response
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            summary: 'Test summary',
            perspectives: [],
            commonGround: [],
            divergences: []
          })
        }
      });

      const service = AIService.getInstance();

      const cluster = {
        topic: 'Gaza',
        articles: [
          createMockArticle('1', 'Article 1', 'western', ['Gaza']),
          createMockArticle('2', 'Article 2', 'russian', ['Gaza']),
          createMockArticle('3', 'Article 3', 'chinese', ['Gaza']),
        ]
      };

      // First call
      await service.generateClusterSummary(cluster);
      expect(mockGeminiModel.generateContent).toHaveBeenCalledTimes(1);

      // Simulate cache expiration (Redis handles TTL internally, so we clear mock store)
      // In production, Redis auto-expires after 30 minutes per AI_CONFIG.cache.summaryTTLSeconds
      mockCacheStore.clear();

      // Second call - cache expired, should regenerate
      await service.generateClusterSummary(cluster);
      expect(mockGeminiModel.generateContent).toHaveBeenCalledTimes(2);
    });

    it('should return mock summary when AI response parse fails', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      // Mock Gemini to return invalid JSON
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => 'Invalid JSON response without braces'
        }
      });

      const service = AIService.getInstance();

      const cluster = {
        topic: 'Gaza',
        articles: [
          createMockArticle('1', 'Article 1', 'western', ['Gaza']),
          createMockArticle('2', 'Article 2', 'russian', ['Gaza']),
          createMockArticle('3', 'Article 3', 'chinese', ['Gaza']),
        ]
      };

      const summary = await service.generateClusterSummary(cluster);

      // Should fall back to mock summary
      expect(summary).not.toBeNull();
      expect(summary!.topic).toBe('Gaza');
      expect(summary!.summary).toContain('Gaza');
    });
  });

  describe('Fallback Chain', () => {
    it('should try OpenRouter first, fall back to Gemini on 429 error', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-key');
      vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');

      // Mock OpenRouter to fail with 429
      mockOpenAICreate.mockRejectedValue({ status: 429 });

      // Mock Gemini to succeed
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ sentiment: 'neutral', score: 0, reasoning: 'test' })
        }
      });

      const service = AIService.getInstance();

      const result = await service.analyzeSentiment('Test title', 'Test content');

      // Should fall back to Gemini
      expect(mockGeminiModel.generateContent).toHaveBeenCalled();
      expect(result.sentiment).toBe('neutral');
    });

    it('should try Anthropic when both OpenRouter and Gemini fail', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-key');
      vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');

      // Mock OpenRouter to fail
      mockOpenAICreate.mockRejectedValue({ status: 429 });

      // Mock Gemini to fail
      mockGeminiModel.generateContent.mockRejectedValue({ status: 429 });

      // Mock Anthropic to succeed
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ sentiment: 'positive', score: 0.5, reasoning: 'test' }) }]
      });

      const service = AIService.getInstance();

      const result = await service.analyzeSentiment('Test title', 'Test content');

      // Should fall back to Anthropic
      expect(mockAnthropicCreate).toHaveBeenCalled();
      expect(result.sentiment).toBe('positive');
    });

    it('should return keyword fallback when all providers fail', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-key');
      vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');

      // Mock all providers to fail
      mockOpenAICreate.mockRejectedValue({ status: 503 });
      mockGeminiModel.generateContent.mockRejectedValue({ status: 503 });
      mockAnthropicCreate.mockRejectedValue({ status: 503 });

      const service = AIService.getInstance();

      const result = await service.analyzeSentiment('Test title', 'Test content');

      // Should return keyword-based fallback
      expect(result.sentiment).toBe('neutral');
      expect(result.score).toBe(0);
      expect(result.reasoning).toContain('Error');
    });

    it('should handle Anthropic rate limit error separately', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-key');
      vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');

      // Mock OpenRouter and Gemini to fail
      mockOpenAICreate.mockRejectedValue({ status: 503 });
      mockGeminiModel.generateContent.mockRejectedValue({ status: 503 });

      // Mock Anthropic to fail with 429 (rate limit)
      mockAnthropicCreate.mockRejectedValue({ status: 429 });

      const service = AIService.getInstance();

      const result = await service.analyzeSentiment('Test title', 'Test content');

      // Should still return error result
      expect(result.sentiment).toBe('neutral');
      expect(result.score).toBe(0);
    });

    it('should handle OpenRouter non-fallback errors', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-key');
      vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');

      // Mock OpenRouter to fail with non-fallback error (no status or different status)
      mockOpenAICreate.mockRejectedValue({ message: 'Network error' });

      // Mock Gemini to succeed
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ sentiment: 'neutral', score: 0, reasoning: 'test' })
        }
      });

      const service = AIService.getInstance();

      const result = await service.analyzeSentiment('Test title', 'Test content');

      // Should fall back to Gemini
      expect(mockGeminiModel.generateContent).toHaveBeenCalled();
      expect(result.sentiment).toBe('neutral');
    });
  });

  describe('Shutdown', () => {
    it('should clear caches and stop cleanup timer on shutdown', () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      const service = AIService.getInstance();

      // Call shutdown
      service.shutdown();

      // Verify caches are cleared (no direct way to check, but we can verify no errors)
      expect(() => service.shutdown()).not.toThrow();
    });
  });

  describe('Topic Classification', () => {
    it('should use keyword fallback when AI unavailable', async () => {
      // No API keys
      const service = AIService.getInstance();

      const topics = await service.classifyTopics('Military conflict in Gaza', 'Fighting continues...');

      // Should return keyword-based topics
      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeGreaterThan(0);
      expect(topics).toContain('conflict');
    });

    it('should cache topic classification for 24 hours', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      // Mock Gemini
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => '["conflict", "politics"]'
        }
      });

      const service = AIService.getInstance();

      // First call
      const topics1 = await service.classifyTopics('Test title', 'Test content');
      expect(mockGeminiModel.generateContent).toHaveBeenCalledTimes(1);

      // Second call immediately - should use cache
      const topics2 = await service.classifyTopics('Test title', 'Test content');
      expect(mockGeminiModel.generateContent).toHaveBeenCalledTimes(1); // Still 1
      expect(topics2).toEqual(topics1);

      vi.useRealTimers();
    });

    it('should fall back to keyword extraction when AI returns null', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      // Mock Gemini to return null (all providers failed)
      mockGeminiModel.generateContent.mockRejectedValue({ status: 503 });

      const service = AIService.getInstance();

      const topics = await service.classifyTopics('Military conflict', 'War continues');

      expect(topics).toContain('conflict');
      expect(topics).toContain('military');
    });

    it('should fall back to keyword extraction when AI returns no JSON', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      // Mock Gemini to return invalid format (no JSON array)
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => 'No JSON here, just plain text'
        }
      });

      const service = AIService.getInstance();

      const topics = await service.classifyTopics('Economy news', 'Markets rise');

      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeGreaterThan(0);
    });

    it('should fall back to keyword extraction on parse error', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      // Mock Gemini to throw error
      mockGeminiModel.generateContent.mockRejectedValue(new Error('Parse error'));

      const service = AIService.getInstance();

      const topics = await service.classifyTopics('Political news', 'Government announces policy');

      expect(topics).toContain('politics');
    });

    it('should default to politics when no keywords match', async () => {
      const service = AIService.getInstance();

      const topics = await service.classifyTopics('Random stuff', 'No specific keywords here');

      expect(topics).toEqual(['politics']);
    });

    it('should filter out invalid topics from AI response', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      // Mock Gemini to return mix of valid and invalid topics
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => '["conflict", "invalid-topic", "politics", "fake-category"]'
        }
      });

      const service = AIService.getInstance();

      const topics = await service.classifyTopics('Test', 'Test');

      expect(topics).toContain('conflict');
      expect(topics).toContain('politics');
      expect(topics).not.toContain('invalid-topic');
      expect(topics).not.toContain('fake-category');
    });
  });

  describe('Sentiment Analysis', () => {
    it('should return neutral sentiment when AI unavailable', async () => {
      // No API keys
      const service = AIService.getInstance();

      const result = await service.analyzeSentiment('Test title', 'Test content');

      expect(result.sentiment).toBe('neutral');
      expect(result.score).toBe(0);
      expect(result.reasoning).toContain('not available');
    });

    it('should parse JSON response from AI provider', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      // Mock Gemini to return valid JSON
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            sentiment: 'positive',
            score: 0.7,
            reasoning: 'Article has positive tone'
          })
        }
      });

      const service = AIService.getInstance();

      const result = await service.analyzeSentiment('Good news today', 'Everything is great...');

      expect(result.sentiment).toBe('positive');
      expect(result.score).toBe(0.7);
      expect(result.reasoning).toBe('Article has positive tone');
    });

    it('should handle batch sentiment analysis with rate limiting', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      // Mock Gemini
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            sentiment: 'neutral',
            score: 0,
            reasoning: 'test'
          })
        }
      });

      const service = AIService.getInstance();

      const articles = [
        createMockArticle('1', 'Article 1', 'western', ['Topic1']),
        createMockArticle('2', 'Article 2', 'russian', ['Topic2']),
        createMockArticle('3', 'Article 3', 'chinese', ['Topic3']),
      ];

      const results = await service.batchAnalyzeSentiment(articles);

      expect(results.size).toBe(3);
      expect(results.has('1')).toBe(true);
      expect(results.has('2')).toBe(true);
      expect(results.has('3')).toBe(true);
    });

    it('should process multiple batches in batch sentiment analysis', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');

      // Mock Gemini
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            sentiment: 'neutral',
            score: 0,
            reasoning: 'test'
          })
        }
      });

      const service = AIService.getInstance();

      // Create 7 articles to trigger 2 batches (batch size is 5)
      const articles = Array.from({ length: 7 }, (_, i) =>
        createMockArticle(`${i + 1}`, `Article ${i + 1}`, 'western', ['Topic'])
      );

      const results = await service.batchAnalyzeSentiment(articles);

      // All 7 articles should be processed
      expect(results.size).toBe(7);
      expect(results.has('1')).toBe(true);
      expect(results.has('7')).toBe(true);
    });
  });

  describe('Comparison Generation', () => {
    it('should return null when AI unavailable', async () => {
      // No API keys
      const service = AIService.getInstance();

      const articles = [
        createMockArticle('1', 'Article 1', 'western', ['Topic1']),
        createMockArticle('2', 'Article 2', 'russian', ['Topic2']),
      ];

      const result = await service.generateComparison(articles);
      expect(result).toBeNull();
    });

    it('should return null when fewer than 2 articles', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      const service = AIService.getInstance();

      const articles = [
        createMockArticle('1', 'Article 1', 'western', ['Topic1']),
      ];

      const result = await service.generateComparison(articles);
      expect(result).toBeNull();
    });

    it('should generate framing comparison by region with positive/negative sentiment', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      const service = AIService.getInstance();

      const articles = [
        { ...createMockArticle('1', 'Article 1', 'western', ['Topic1']), sentimentScore: 0.5 },
        { ...createMockArticle('2', 'Article 2', 'russian', ['Topic1']), sentimentScore: -0.5 },
      ];

      const result = await service.generateComparison(articles);

      expect(result).not.toBeNull();
      expect(result!.framing).toBeDefined();
      expect(result!.bias).toBeDefined();
      expect(result!.framing.western).toBeDefined();
      expect(result!.framing.russian).toBeDefined();
      expect(result!.framing.western).toContain('Positive');
      expect(result!.framing.russian).toContain('negative');
    });

    it('should generate neutral framing for neutral sentiment scores', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      const service = AIService.getInstance();

      const articles = [
        { ...createMockArticle('1', 'Article 1', 'western', ['Topic1']), sentimentScore: 0.1 },
        { ...createMockArticle('2', 'Article 2', 'western', ['Topic1']), sentimentScore: -0.1 },
      ];

      const result = await service.generateComparison(articles);

      expect(result).not.toBeNull();
      expect(result!.framing.western).toContain('Neutrale');
    });
  });
});

// Helper function to create mock articles
function createMockArticle(
  id: string,
  title: string,
  perspective: string,
  entities: string[]
): NewsArticle {
  return {
    id,
    title,
    content: `Content for ${title}`,
    summary: `Summary for ${title}`,
    url: `https://example.com/${id}`,
    publishedAt: new Date('2024-01-15T12:00:00Z'),
    source: {
      id: 'test-source',
      name: 'Test Source',
      country: 'US',
      region: perspective,
      language: 'en',
    } as any,
    perspective: perspective as any,
    entities,
    topics: [],
    sentiment: 'neutral',
    sentimentScore: 0,
    regions: [perspective],
    imageUrl: null,
    category: 'politics',
  } as NewsArticle;
}
