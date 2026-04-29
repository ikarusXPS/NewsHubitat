/**
 * Unit tests for AIService.getSourceCredibility + safeParseJson — Phase 38-02 Task 5.
 *
 * Mocks LLM provider + cacheService + sources lookup. Verifies:
 *   - safeParseJson handles prose-prefixed JSON, malformed JSON, schema mismatch
 *   - getSourceCredibility computes deterministic score before LLM call
 *   - Unknown sourceId → typed-safe fallback (never throws)
 *   - LLM null → deterministic-only fallback
 *   - Cache hit on second call (no second LLM invocation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Hoisted shared mock state — see aiService.test.ts pattern
const { mockCacheStore, mockCacheService, mockOpenAICreate, mockGeminiModel, mockAnthropicCreate } =
  vi.hoisted(() => {
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

// Use a known source id from the real config; "ap" (Associated Press) has reliability=9, political=0
import { AIService, safeParseJson } from './aiService';

describe('aiService.safeParseJson', () => {
  const numSchema = z.object({ foo: z.number() });

  it('parses well-formed JSON', () => {
    expect(safeParseJson('{"foo":1}', numSchema)).toEqual({ foo: 1 });
  });

  it('extracts JSON from prose-prefixed text', () => {
    expect(safeParseJson('Here is the JSON: {"foo":1} bye', numSchema)).toEqual({ foo: 1 });
  });

  it('returns null when JSON fails Zod schema', () => {
    expect(safeParseJson('{"foo":"not-a-number"}', numSchema)).toBeNull();
  });

  it('returns null on non-JSON input', () => {
    expect(safeParseJson('not json at all', numSchema)).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(safeParseJson('', numSchema)).toBeNull();
  });
});

describe('aiService.getSourceCredibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockCacheStore.clear();
    mockGeminiModel.generateContent.mockReset();
    mockOpenAICreate.mockReset();
    mockAnthropicCreate.mockReset();
  });

  afterEach(() => {
    (AIService as unknown as { instance: AIService | null }).instance = null;
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mockCacheStore.clear();
  });

  it('happy path: returns deterministic score + LLM-derived sub-dimensions and methodology', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGeminiModel.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            subDimensions: { accuracy: 85, transparency: 80, corrections: 75 },
            methodologyMd: 'AP is a wire service with a strong reputation. AI-attributed estimates...',
          }),
      },
    });

    const service = AIService.getInstance();
    const result = await service.getSourceCredibility('ap', 'en');

    // AP: reliability=9, political=0 → 9*7 - 0 = 63
    expect(result.score).toBe(63);
    expect(result.bias).toBe('center'); // political=0 → center
    expect(result.subDimensions).toEqual({ accuracy: 85, transparency: 80, corrections: 75 });
    expect(result.methodologyMd).toContain('AP is a wire service');
    // average = (85+80+75)/3 = 80 → 'high'
    expect(result.confidence).toBe('high');
    expect(result.locale).toBe('en');
    expect(typeof result.generatedAt).toBe('string');
  });

  it('unknown sourceId returns score=0 fallback (never throws)', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const service = AIService.getInstance();
    const result = await service.getSourceCredibility('nonexistent-source-id', 'en');

    expect(result.score).toBe(0);
    expect(result.confidence).toBe('low');
    expect(result.methodologyMd).toContain('not found');
  });

  it('LLM null → deterministic-only fallback (subDimensions == score)', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGeminiModel.generateContent.mockResolvedValue({
      response: { text: () => '' }, // empty → callWithFallback returns null
    });

    const service = AIService.getInstance();
    const result = await service.getSourceCredibility('ap', 'en');

    // AP score = 63
    expect(result.score).toBe(63);
    expect(result.subDimensions.accuracy).toBe(63);
    expect(result.subDimensions.transparency).toBe(63);
    expect(result.subDimensions.corrections).toBe(63);
    // English methodology fallback
    expect(result.methodologyMd).toMatch(/AI-attributed estimates|AI analysis/);
  });

  it('prose-prefixed JSON in LLM response is extracted via safeParseJson', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGeminiModel.generateContent.mockResolvedValue({
      response: {
        text: () =>
          'Here is the response:\n```json\n{"subDimensions":{"accuracy":70,"transparency":70,"corrections":70},"methodologyMd":"text"}\n```',
      },
    });

    const service = AIService.getInstance();
    const result = await service.getSourceCredibility('ap', 'en');
    expect(result.subDimensions).toEqual({ accuracy: 70, transparency: 70, corrections: 70 });
  });

  it('cache hit: second call does NOT invoke callWithFallback', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGeminiModel.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            subDimensions: { accuracy: 50, transparency: 50, corrections: 50 },
            methodologyMd: 'test',
          }),
      },
    });

    const service = AIService.getInstance();
    const r1 = await service.getSourceCredibility('ap', 'en');
    expect(mockGeminiModel.generateContent).toHaveBeenCalledTimes(1);

    const r2 = await service.getSourceCredibility('ap', 'en');
    expect(mockGeminiModel.generateContent).toHaveBeenCalledTimes(1); // still 1
    expect(r2).toEqual(r1);
  });

  it('locale=de returns German methodology in deterministic fallback', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGeminiModel.generateContent.mockResolvedValue({
      response: { text: () => '' },
    });

    const service = AIService.getInstance();
    const result = await service.getSourceCredibility('ap', 'de');
    expect(result.methodologyMd).toMatch(/Glaubwürdigkeit|KI-attribuierte/);
  });

  it('LLM returns invalid JSON → deterministic-only fallback', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGeminiModel.generateContent.mockResolvedValue({
      response: { text: () => 'not even close to JSON' },
    });

    const service = AIService.getInstance();
    const result = await service.getSourceCredibility('ap', 'en');
    expect(result.score).toBe(63);
    expect(result.subDimensions.accuracy).toBe(63);
  });
});
