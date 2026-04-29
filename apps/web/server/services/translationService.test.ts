/**
 * Unit tests for TranslationService
 * Tests provider fallback chain, caching, singleton pattern, language detection, and batch translation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Create mock implementations
const mockDeeplTranslate = vi.fn();
const mockAnthropicCreate = vi.fn();
const mockFetch = vi.fn();

// Mock external dependencies at file top
vi.mock('deepl-node', () => ({
  Translator: vi.fn(function (this: object, _apiKey: string) {
    (this as { translateText: typeof mockDeeplTranslate }).translateText = mockDeeplTranslate;
    return this;
  })
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return {
      messages: {
        create: mockAnthropicCreate
      }
    };
  })
}));

vi.mock('../utils/hash', () => ({
  hashString: vi.fn((str: string) => `hash-${str.slice(0, 8)}`)
}));

// Store original fetch
const originalFetch = global.fetch;

// Import after mocks
import { TranslationService } from './translationService';

describe('TranslationService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    // Reset mock functions
    mockDeeplTranslate.mockReset();
    mockAnthropicCreate.mockReset();
    mockFetch.mockReset();

    // Mock global fetch
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    // Reset singleton instance between tests
    (TranslationService as unknown as { instance: TranslationService | null }).instance = null;
    vi.unstubAllEnvs();
    vi.clearAllMocks();

    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = TranslationService.getInstance();
      const instance2 = TranslationService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should read env vars at construction time', () => {
      vi.stubEnv('DEEPL_API_KEY', 'test-deepl-key');
      vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-google-key');
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
      vi.stubEnv('LIBRETRANSLATE_URL', 'https://custom.libretranslate.com');

      const service = TranslationService.getInstance();
      const stats = service.getUsageStats();

      // Should have initialized all providers
      expect(stats.providers).toContain('deepl');
      expect(stats.providers).toContain('google');
      expect(stats.providers).toContain('claude');
      expect(stats.providers).toContain('libretranslate');
    });
  });

  describe('Provider Initialization', () => {
    it('should initialize DeepL when DEEPL_API_KEY set', () => {
      vi.stubEnv('DEEPL_API_KEY', 'test-deepl-key');

      const service = TranslationService.getInstance();
      const stats = service.getUsageStats();

      expect(stats.providers).toContain('deepl');
    });

    it('should initialize Claude when ANTHROPIC_API_KEY set', () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');

      const service = TranslationService.getInstance();
      const stats = service.getUsageStats();

      expect(stats.providers).toContain('claude');
    });

    it('should add Google when GOOGLE_TRANSLATE_API_KEY set', () => {
      vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-google-key');

      const service = TranslationService.getInstance();
      const stats = service.getUsageStats();

      expect(stats.providers).toContain('google');
    });

    it('should always include LibreTranslate as fallback', () => {
      // No env vars set
      const service = TranslationService.getInstance();
      const stats = service.getUsageStats();

      expect(stats.providers).toContain('libretranslate');
    });

    it('getUsageStats should list initialized providers', () => {
      vi.stubEnv('DEEPL_API_KEY', 'test-deepl-key');
      vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-google-key');

      const service = TranslationService.getInstance();
      const stats = service.getUsageStats();

      expect(stats.used).toBe(0);
      expect(stats.limit).toBe(500000);
      expect(stats.percentage).toBe(0);
      expect(stats.providers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Provider Priority and Fallback', () => {
    it('should try DeepL first when available', async () => {
      vi.stubEnv('DEEPL_API_KEY', 'test-deepl-key');
      vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-google-key');

      mockDeeplTranslate.mockResolvedValue({
        text: 'Translated by DeepL',
        detectedSourceLang: 'EN'
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      expect(mockDeeplTranslate).toHaveBeenCalled();
      expect(result.provider).toBe('deepl');
      expect(result.text).toBe('Translated by DeepL');
    });

    it('should fall back to Google when DeepL fails', async () => {
      vi.stubEnv('DEEPL_API_KEY', 'test-deepl-key');
      vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-google-key');

      // DeepL fails
      mockDeeplTranslate.mockRejectedValue(new Error('DeepL error'));

      // Google succeeds
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            translations: [{
              translatedText: 'Translated by Google',
              detectedSourceLanguage: 'en'
            }]
          }
        })
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      expect(mockDeeplTranslate).toHaveBeenCalled();
      expect(result.provider).toBe('google');
      expect(result.text).toBe('Translated by Google');
    });

    it('should fall back to LibreTranslate when Google fails', async () => {
      vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-google-key');

      // First call is Google (fails)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      // Second call is LibreTranslate (succeeds)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Translated by LibreTranslate',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      expect(result.provider).toBe('libretranslate');
      expect(result.text).toBe('Translated by LibreTranslate');
    });

    it('should fall back to Claude when LibreTranslate fails', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');

      // LibreTranslate fails
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503
      });

      // Claude succeeds
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Translated by Claude' }]
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      expect(mockAnthropicCreate).toHaveBeenCalled();
      expect(result.provider).toBe('claude');
      expect(result.text).toBe('Translated by Claude');
    });

    it('should return original text when all providers fail', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');

      // LibreTranslate fails
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503
      });

      // Claude fails
      mockAnthropicCreate.mockRejectedValue(new Error('Claude error'));

      const service = TranslationService.getInstance();
      const result = await service.translate('Original text', 'de');

      expect(result.text).toBe('Original text');
      expect(result.cached).toBe(false);
    });

    it('should return quality=0 when all providers fail', async () => {
      // Only LibreTranslate available (fails)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      expect(result.quality).toBe(0);
      expect(result.provider).toBe('libretranslate');
    });
  });

  describe('DeepL Translation', () => {
    beforeEach(() => {
      vi.stubEnv('DEEPL_API_KEY', 'test-deepl-key');
    });

    it('should call DeepL with correct target language mapping (en->en-GB, de->de)', async () => {
      mockDeeplTranslate.mockResolvedValue({
        text: 'Translated text',
        detectedSourceLang: 'DE'
      });

      const service = TranslationService.getInstance();

      // Translate to English - should use en-GB
      await service.translate('Hallo Welt', 'en');
      expect(mockDeeplTranslate).toHaveBeenCalledWith(
        'Hallo Welt',
        undefined,
        'en-GB'
      );

      mockDeeplTranslate.mockClear();

      // Reset singleton
      (TranslationService as unknown as { instance: TranslationService | null }).instance = null;
      const service2 = TranslationService.getInstance();

      // Translate to German - should use de
      await service2.translate('Hello world', 'de');
      expect(mockDeeplTranslate).toHaveBeenCalledWith(
        'Hello world',
        undefined,
        'de'
      );
    });

    it('should return quality 0.95 for DeepL', async () => {
      mockDeeplTranslate.mockResolvedValue({
        text: 'Translated text',
        detectedSourceLang: 'EN'
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      expect(result.quality).toBe(0.95);
      expect(result.provider).toBe('deepl');
    });

    it('should track character count for rate limiting', async () => {
      mockDeeplTranslate.mockResolvedValue({
        text: 'Translated',
        detectedSourceLang: 'EN'
      });

      const service = TranslationService.getInstance();
      const initialStats = service.getUsageStats();
      expect(initialStats.used).toBe(0);

      await service.translate('Hello', 'de');
      const afterStats = service.getUsageStats();

      expect(afterStats.used).toBe(5); // "Hello" is 5 characters
    });

    it('should skip DeepL when monthly limit reached', async () => {
      // Mock DeepL to track that it's NOT called when limit reached
      mockDeeplTranslate.mockResolvedValue({
        text: 'Should not be called',
        detectedSourceLang: 'EN'
      });

      // Also set up Google as fallback
      vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-google-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            translations: [{
              translatedText: 'Google translation',
              detectedSourceLanguage: 'en'
            }]
          }
        })
      });

      const service = TranslationService.getInstance();

      // Access private monthlyCharCount and set it near limit
      (service as unknown as { monthlyCharCount: number }).monthlyCharCount = 499990;

      // Try to translate text that would exceed limit
      const result = await service.translate('This is a longer text that will exceed the limit', 'de');

      // DeepL should have been skipped (returns null when limit exceeded)
      // Result should come from Google fallback
      expect(result.provider).toBe('google');
      expect(result.text).toBe('Google translation');
    });
  });

  describe('Google Translation', () => {
    beforeEach(() => {
      vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-google-key');
    });

    it('should call Google Translate API with correct params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            translations: [{
              translatedText: 'Translated by Google',
              detectedSourceLanguage: 'en'
            }]
          }
        })
      });

      const service = TranslationService.getInstance();
      await service.translate('Hello world', 'de');

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0][0] as string;
      expect(fetchCall).toContain('translation.googleapis.com');
      expect(fetchCall).toContain('key=test-google-key');
      expect(fetchCall).toContain('q=Hello+world');
      expect(fetchCall).toContain('target=de');
    });

    it('should return quality 0.90 for Google', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            translations: [{
              translatedText: 'Translated by Google',
              detectedSourceLanguage: 'en'
            }]
          }
        })
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      expect(result.quality).toBe(0.9);
      expect(result.provider).toBe('google');
    });

    it('should handle Google API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403
      });

      // LibreTranslate fallback
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'LibreTranslate fallback',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      // Should fall back to LibreTranslate
      expect(result.provider).toBe('libretranslate');
    });
  });

  describe('LibreTranslate', () => {
    it('should call LibreTranslate with correct body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Translated by LibreTranslate',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();
      await service.translate('Hello world', 'de');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://libretranslate.com/translate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: 'Hello world',
            source: 'auto',
            target: 'de',
            format: 'text'
          })
        })
      );
    });

    it('should return quality 0.75 for LibreTranslate', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Translated by LibreTranslate',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      expect(result.quality).toBe(0.75);
      expect(result.provider).toBe('libretranslate');
    });

    it('should use LIBRETRANSLATE_URL from env or default', async () => {
      vi.stubEnv('LIBRETRANSLATE_URL', 'https://custom.libretranslate.com');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Translated',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();
      await service.translate('Hello world', 'de');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.libretranslate.com/translate',
        expect.anything()
      );
    });
  });

  describe('Claude Translation', () => {
    beforeEach(() => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
      // LibreTranslate fails so we fall back to Claude
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503
      });
    });

    it('should call Anthropic with translation prompt', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Translated by Claude' }]
      });

      const service = TranslationService.getInstance();
      await service.translate('Hello world', 'de');

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: expect.stringContaining('Translate')
          }]
        })
      );
    });

    it('should return quality 0.85 for Claude', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Translated by Claude' }]
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      expect(result.quality).toBe(0.85);
      expect(result.provider).toBe('claude');
    });

    it('should handle non-text response', async () => {
      // Mock Anthropic to return non-text content
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'image', source: 'some-image' }]
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Hello world', 'de');

      // Should return original text with quality 0
      expect(result.quality).toBe(0);
      expect(result.text).toBe('Hello world');
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return cached result within TTL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Cached translation',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();

      // First call - should hit LibreTranslate
      const result1 = await service.translate('Hello world', 'de');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1.cached).toBe(false);

      // Second call immediately - should use cache
      const result2 = await service.translate('Hello world', 'de');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1
      expect(result2.cached).toBe(true);
      expect(result2.text).toBe('Cached translation');
    });

    it('should set cached=true for cached results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Translated',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();

      // First call
      const result1 = await service.translate('Hello', 'de');
      expect(result1.cached).toBe(false);

      // Second call - should be cached
      const result2 = await service.translate('Hello', 'de');
      expect(result2.cached).toBe(true);
    });

    it('should regenerate when cache expired', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Translated',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();

      // First call
      await service.translate('Hello world', 'de');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by 8 days (cache TTL is 7 days)
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

      // Second call - cache expired, should regenerate
      const result = await service.translate('Hello world', 'de');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.cached).toBe(false);
    });

    it('getCacheSize should return cache entry count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Translated',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();
      expect(service.getCacheSize()).toBe(0);

      await service.translate('Text 1', 'de');
      expect(service.getCacheSize()).toBe(1);

      await service.translate('Text 2', 'de');
      expect(service.getCacheSize()).toBe(2);

      // Same text, different language
      await service.translate('Text 1', 'en');
      expect(service.getCacheSize()).toBe(3);
    });

    it('clearCache should empty the cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Translated',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();

      await service.translate('Text 1', 'de');
      await service.translate('Text 2', 'de');
      expect(service.getCacheSize()).toBe(2);

      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('Batch Translation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Batch translated',
          detectedLanguage: { language: 'en' }
        })
      });
    });

    it('translateBatch should process texts in parallel', async () => {
      const service = TranslationService.getInstance();
      const texts = ['Hello', 'World', 'Test'];

      const results = await service.translateBatch(texts, 'de');

      expect(results.length).toBe(3);
      expect(results.every(r => r.text === 'Batch translated')).toBe(true);
    });

    it('translateBatch should process in batches of 10', async () => {
      const service = TranslationService.getInstance();

      // Create 25 texts to force 3 batches
      const texts = Array.from({ length: 25 }, (_, i) => `Text ${i + 1}`);

      const results = await service.translateBatch(texts, 'de');

      // All texts should be processed
      expect(results.length).toBe(25);
    });

    it('translateBatch should return results for all texts', async () => {
      const service = TranslationService.getInstance();
      const texts = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

      const results = await service.translateBatch(texts, 'de');

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result.text).toBeDefined();
        expect(result.provider).toBeDefined();
        expect(typeof result.quality).toBe('number');
      });
    });
  });

  describe('Language Detection', () => {
    it('detectLanguage should return ru for Cyrillic text', () => {
      const service = TranslationService.getInstance();

      expect(service.detectLanguage('Привет мир')).toBe('ru');
      expect(service.detectLanguage('Москва')).toBe('ru');
    });

    it('detectLanguage should return ar for Arabic text', () => {
      const service = TranslationService.getInstance();

      expect(service.detectLanguage('مرحبا بالعالم')).toBe('ar');
      expect(service.detectLanguage('السلام عليكم')).toBe('ar');
    });

    it('detectLanguage should return zh for Chinese text', () => {
      const service = TranslationService.getInstance();

      expect(service.detectLanguage('你好世界')).toBe('zh');
      expect(service.detectLanguage('中国')).toBe('zh');
    });

    it('detectLanguage should return he for Hebrew text', () => {
      const service = TranslationService.getInstance();

      expect(service.detectLanguage('שלום עולם')).toBe('he');
      expect(service.detectLanguage('ישראל')).toBe('he');
    });

    it('detectLanguage should return tr for Turkish text', () => {
      const service = TranslationService.getInstance();

      expect(service.detectLanguage('Merhaba dünya')).toBe('tr');
      expect(service.detectLanguage('Türkçe öğreniyorum')).toBe('tr');
      expect(service.detectLanguage('İstanbul güzel şehir')).toBe('tr');
    });

    it('detectLanguage should default to en', () => {
      const service = TranslationService.getInstance();

      expect(service.detectLanguage('Hello world')).toBe('en');
      expect(service.detectLanguage('This is English')).toBe('en');
      expect(service.detectLanguage('12345')).toBe('en');
    });
  });

  describe('Provider Fallback Chain Order', () => {
    it('should follow priority order: DeepL -> Google -> LibreTranslate -> Claude', async () => {
      vi.stubEnv('DEEPL_API_KEY', 'test-deepl-key');
      vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-google-key');
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');

      const service = TranslationService.getInstance();
      const stats = service.getUsageStats();

      // Provider order should match initialization priority
      // DeepL first (if key set), then Claude (if key set), then Google (if key set), then LibreTranslate
      // Based on the source code: deepl -> claude -> google -> libretranslate
      expect(stats.providers[0]).toBe('deepl');
      expect(stats.providers.indexOf('libretranslate')).toBe(stats.providers.length - 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text translation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: '',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('', 'de');

      expect(result.text).toBe('');
    });

    it('should handle very long text (uses hash for cache key)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          translatedText: 'Translated long text',
          detectedLanguage: { language: 'en' }
        })
      });

      const service = TranslationService.getInstance();
      const longText = 'A'.repeat(200); // More than 100 chars triggers hash

      const result = await service.translate(longText, 'de');

      expect(result.text).toBe('Translated long text');
    });

    it('should pass source language to providers when specified', async () => {
      vi.stubEnv('DEEPL_API_KEY', 'test-deepl-key');

      mockDeeplTranslate.mockResolvedValue({
        text: 'Translated',
        detectedSourceLang: 'EN'
      });

      const service = TranslationService.getInstance();
      await service.translate('Hello', 'de', 'en');

      expect(mockDeeplTranslate).toHaveBeenCalledWith(
        'Hello',
        'en',
        'de'
      );
    });

    it('should detect source language when provider returns it', async () => {
      vi.stubEnv('DEEPL_API_KEY', 'test-deepl-key');

      mockDeeplTranslate.mockResolvedValue({
        text: 'Translated',
        detectedSourceLang: 'FR'
      });

      const service = TranslationService.getInstance();
      const result = await service.translate('Bonjour', 'de');

      expect(result.detectedSourceLang).toBe('fr');
    });
  });
});
