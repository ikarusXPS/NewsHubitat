import * as deepl from 'deepl-node';
import Anthropic from '@anthropic-ai/sdk';
import { hashString } from '../utils/hash';

type TargetLang = 'de' | 'en';
type Provider = 'deepl' | 'google' | 'libretranslate' | 'claude';

interface TranslationResult {
  text: string;
  detectedSourceLang?: string;
  provider: Provider;
  cached: boolean;
  quality: number; // 0-1 confidence score
}

interface CacheEntry {
  text: string;
  provider: Provider;
  timestamp: number;
}

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export class TranslationService {
  private static instance: TranslationService;
  private cache: Map<string, CacheEntry> = new Map();
  private monthlyCharCount = 0;
  private readonly MONTHLY_LIMIT = 500000; // DeepL Free tier

  // Clients
  private deeplClient: deepl.Translator | null = null;
  private anthropicClient: Anthropic | null = null;

  // API Keys (read at initialization time)
  private DEEPL_API_KEY: string | undefined;
  private GOOGLE_API_KEY: string | undefined;
  private LIBRETRANSLATE_URL: string;
  private ANTHROPIC_API_KEY: string | undefined;

  // Provider priority order
  private providers: Provider[] = [];

  private constructor() {
    // Read env vars at construction time (after dotenv.config())
    this.DEEPL_API_KEY = process.env.DEEPL_API_KEY;
    this.GOOGLE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
    this.LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com';
    this.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    this.initializeClients();
    this.loadCacheFromStorage();
  }

  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  private initializeClients(): void {
    // Initialize DeepL client
    if (this.DEEPL_API_KEY) {
      try {
        this.deeplClient = new deepl.Translator(this.DEEPL_API_KEY);
        this.providers.push('deepl');
        console.log('DeepL client initialized');
      } catch (err) {
        console.warn('Failed to initialize DeepL client:', err);
      }
    }

    // Initialize Anthropic client
    if (this.ANTHROPIC_API_KEY) {
      try {
        this.anthropicClient = new Anthropic({ apiKey: this.ANTHROPIC_API_KEY });
        this.providers.push('claude');
        console.log('Anthropic client initialized');
      } catch (err) {
        console.warn('Failed to initialize Anthropic client:', err);
      }
    }

    // Google Translate (uses REST API)
    if (this.GOOGLE_API_KEY) {
      this.providers.push('google');
    }

    // LibreTranslate always available as fallback
    this.providers.push('libretranslate');

    console.log('Translation providers:', this.providers);
  }

  private getCacheKey(text: string, targetLang: TargetLang): string {
    const textKey = text.length > 100 ? hashString(text) : text;
    return `${targetLang}:${textKey}`;
  }

  private loadCacheFromStorage(): void {
    console.log('Translation cache initialized (in-memory)');
  }

  async translate(
    text: string,
    targetLang: TargetLang,
    sourceLang?: string
  ): Promise<TranslationResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(text, targetLang);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return {
        text: cached.text,
        provider: cached.provider,
        cached: true,
        quality: 0.9,
      };
    }

    // Try providers in order until one succeeds
    for (const provider of this.providers) {
      try {
        const result = await this.translateWithProvider(text, targetLang, sourceLang, provider);
        if (result) {
          // Cache successful translation
          this.cache.set(cacheKey, {
            text: result.text,
            provider,
            timestamp: Date.now(),
          });
          return result;
        }
      } catch (err) {
        console.warn(`Translation failed with ${provider}:`, err);
        continue;
      }
    }

    // All providers failed, return original
    return {
      text,
      provider: 'libretranslate',
      cached: false,
      quality: 0,
    };
  }

  private async translateWithProvider(
    text: string,
    targetLang: TargetLang,
    sourceLang: string | undefined,
    provider: Provider
  ): Promise<TranslationResult | null> {
    switch (provider) {
      case 'deepl':
        return this.translateWithDeepL(text, targetLang, sourceLang);
      case 'google':
        return this.translateWithGoogle(text, targetLang, sourceLang);
      case 'libretranslate':
        return this.translateWithLibreTranslate(text, targetLang, sourceLang);
      case 'claude':
        return this.translateWithClaude(text, targetLang, sourceLang);
      default:
        return null;
    }
  }

  private async translateWithDeepL(
    text: string,
    targetLang: TargetLang,
    sourceLang?: string
  ): Promise<TranslationResult | null> {
    if (!this.deeplClient) return null;

    // Check rate limit
    if (this.monthlyCharCount + text.length > this.MONTHLY_LIMIT) {
      console.warn('DeepL monthly limit reached');
      return null;
    }

    try {
      // Map target language to DeepL format
      const deeplTargetLang = targetLang === 'en' ? 'en-GB' : 'de';

      const result = await this.deeplClient.translateText(
        text,
        sourceLang as deepl.SourceLanguageCode | null,
        deeplTargetLang as deepl.TargetLanguageCode
      );

      this.monthlyCharCount += text.length;

      return {
        text: result.text,
        detectedSourceLang: result.detectedSourceLang?.toLowerCase(),
        provider: 'deepl',
        cached: false,
        quality: 0.95,
      };
    } catch (err) {
      console.error('DeepL translation error:', err);
      return null;
    }
  }

  private async translateWithGoogle(
    text: string,
    targetLang: TargetLang,
    sourceLang?: string
  ): Promise<TranslationResult | null> {
    if (!this.GOOGLE_API_KEY) return null;

    const params = new URLSearchParams({
      key: this.GOOGLE_API_KEY,
      q: text,
      target: targetLang,
      format: 'text',
    });
    if (sourceLang) params.set('source', sourceLang);

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?${params}`
    );

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.data.translations[0].translatedText,
      detectedSourceLang: data.data.translations[0].detectedSourceLanguage,
      provider: 'google',
      cached: false,
      quality: 0.9,
    };
  }

  private async translateWithLibreTranslate(
    text: string,
    targetLang: TargetLang,
    sourceLang?: string
  ): Promise<TranslationResult | null> {
    try {
      const response = await fetch(`${this.LIBRETRANSLATE_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang || 'auto',
          target: targetLang,
          format: 'text',
        }),
      });

      if (!response.ok) {
        throw new Error(`LibreTranslate error: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.translatedText,
        detectedSourceLang: data.detectedLanguage?.language,
        provider: 'libretranslate',
        cached: false,
        quality: 0.75,
      };
    } catch {
      return null;
    }
  }

  private async translateWithClaude(
    text: string,
    targetLang: TargetLang,
    sourceLang?: string
  ): Promise<TranslationResult | null> {
    if (!this.anthropicClient) return null;

    const targetLangName = targetLang === 'de' ? 'German' : 'English';
    const sourceInfo = sourceLang ? `from ${sourceLang}` : '';

    try {
      const message = await this.anthropicClient.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Translate the following text ${sourceInfo} to ${targetLangName}. Only respond with the translation, no explanations:\n\n${text}`,
        }],
      });

      const content = message.content[0];
      if (content.type !== 'text') return null;

      return {
        text: content.text.trim(),
        provider: 'claude',
        cached: false,
        quality: 0.85,
      };
    } catch (err) {
      console.error('Claude translation error:', err);
      return null;
    }
  }

  async translateBatch(
    texts: string[],
    targetLang: TargetLang
  ): Promise<TranslationResult[]> {
    // Process in parallel with concurrency limit
    const BATCH_SIZE = 10;
    const results: TranslationResult[] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((text) => this.translate(text, targetLang))
      );
      results.push(...batchResults);
    }

    return results;
  }

  detectLanguage(text: string): string {
    // Simple heuristic detection based on character ranges
    const cyrillicPattern = /[\u0400-\u04FF]/;
    const arabicPattern = /[\u0600-\u06FF]/;
    const chinesePattern = /[\u4E00-\u9FFF]/;
    const turkishPattern = /[şŞğĞıİöÖüÜçÇ]/;
    const hebrewPattern = /[\u0590-\u05FF]/;

    if (cyrillicPattern.test(text)) return 'ru';
    if (arabicPattern.test(text)) return 'ar';
    if (chinesePattern.test(text)) return 'zh';
    if (hebrewPattern.test(text)) return 'he';
    if (turkishPattern.test(text)) return 'tr';

    return 'en';
  }

  getUsageStats(): { used: number; limit: number; percentage: number; providers: Provider[] } {
    return {
      used: this.monthlyCharCount,
      limit: this.MONTHLY_LIMIT,
      percentage: (this.monthlyCharCount / this.MONTHLY_LIMIT) * 100,
      providers: this.providers,
    };
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
