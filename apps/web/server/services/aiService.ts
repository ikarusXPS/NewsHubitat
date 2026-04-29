import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import * as crypto from 'crypto';
import type { NewsArticle, PerspectiveRegion, Sentiment } from '../../src/types';
import logger from '../utils/logger';
import { hashString } from '../utils/hash';
import { AI_CONFIG } from '../config/aiProviders';
import { CacheService, CacheKeys, CACHE_TTL } from './cacheService';
import {
  deriveCredibilityScore,
  deriveBiasBucket,
  bucketConfidence,
} from './credibilityService';
import { buildCredibilityPrompt } from '../prompts/credibilityPrompt';
import { buildFramingPrompt } from '../prompts/framingPrompt';
import { NEWS_SOURCES } from '../config/sources';
import * as newsReadService from './newsReadService';

/**
 * Defensive JSON-extract from LLM responses. Free OpenRouter / Gemma models
 * do not honor `response_format: json_object`, so we extract the first {...}
 * block from the response text and validate it against a Zod schema. Returns
 * `null` on any failure (the caller is expected to provide a typed fallback).
 *
 * Per RESEARCH.md Pitfall 1 + Pattern 2.
 */
export function safeParseJson<T>(raw: string, schema: z.ZodType<T>): T | null {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// ---- Phase 38 service-layer types ----

export type Locale = 'de' | 'en' | 'fr';

export interface CredibilitySubDimensions {
  accuracy: number;
  transparency: number;
  corrections: number;
}

export interface CredibilityResult {
  sourceId: string;
  score: number; // 0-100, deterministic
  bias: 'left' | 'center' | 'right';
  subDimensions: CredibilitySubDimensions; // LLM-attributed
  methodologyMd: string;
  confidence: 'low' | 'medium' | 'high';
  generatedAt: string; // ISO
  locale: Locale;
}

const credibilityLlmSchema = z.object({
  subDimensions: z.object({
    accuracy: z.number().int().min(0).max(100),
    transparency: z.number().int().min(0).max(100),
    corrections: z.number().int().min(0).max(100),
  }),
  methodologyMd: z.string().min(1),
});

export interface FramingPerspective {
  narrative: string;
  omissions: string[];
  vocabulary: string[];
  evidenceQuotes: string[];
}

export interface FramingAnalysis {
  topic: string;
  locale: Locale;
  perspectives: Partial<Record<PerspectiveRegion, FramingPerspective>>;
  aiGenerated: boolean;
}

const framingLlmSchema = z.object({
  perspectives: z.record(
    z.string(),
    z.object({
      narrative: z.string(),
      omissions: z.array(z.string()).max(5),
      vocabulary: z.array(z.string()).max(10),
      evidenceQuotes: z.array(z.string()).max(5),
    }),
  ),
});

const VALID_PERSPECTIVE_REGIONS: PerspectiveRegion[] = [
  'usa',
  'europa',
  'deutschland',
  'nahost',
  'tuerkei',
  'russland',
  'china',
  'asien',
  'afrika',
  'lateinamerika',
  'ozeanien',
  'kanada',
  'alternative',
];

interface ClusterSummary {
  topic: string;
  summary: string;
  perspectives: {
    region: PerspectiveRegion;
    stance: string;
    keyPoints: string[];
  }[];
  commonGround: string[];
  divergences: string[];
  generatedAt: Date;
}

interface ArticleCluster {
  topic: string;
  articles: NewsArticle[];
}

type AIProvider = 'openrouter' | 'gemini' | 'anthropic' | 'none';

export class AIService {
  private static instance: AIService;
  private anthropicClient: Anthropic | null = null;
  private openrouterClient: OpenAI | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;
  private activeProvider: AIProvider = 'none';
  private readonly cacheService = CacheService.getInstance();

  private constructor() {
    // Priority: Gemini (free) → OpenRouter (cheap) → Anthropic (premium)
    // Initialize ALL available providers for fallback support
    const geminiKey = process.env.GEMINI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Initialize all available clients
    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
      logger.info('✓ Gemini client initialized (Free Tier)');
    }
    if (openrouterKey) {
      this.openrouterClient = new OpenAI({
        apiKey: openrouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      logger.info('✓ OpenRouter client initialized (Paid)');
    }
    if (anthropicKey) {
      this.anthropicClient = new Anthropic({ apiKey: anthropicKey });
      logger.info('✓ Anthropic client initialized (Premium)');
    }

    // Set primary provider (priority: OpenRouter → Gemini → Anthropic)
    if (openrouterKey) {
      this.activeProvider = 'openrouter';
      logger.info('→ Primary AI provider: OpenRouter');
    } else if (geminiKey) {
      this.activeProvider = 'gemini';
      logger.info('→ Primary AI provider: Gemini');
    } else if (anthropicKey) {
      this.activeProvider = 'anthropic';
      logger.info('→ Primary AI provider: Anthropic');
    } else {
      logger.warn('⚠ AI Service: No API key found. Set OPENROUTER_API_KEY, GEMINI_API_KEY (free), or ANTHROPIC_API_KEY');
      logger.warn('  Fallback: Keyword-based analysis only');
    }

  }

  /**
   * Shutdown the service (no cleanup needed - Redis handles cache expiration)
   */
  shutdown(): void {
    logger.info('AI Service shutdown complete');
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  isAvailable(): boolean {
    return this.activeProvider !== 'none';
  }

  getProvider(): AIProvider {
    return this.activeProvider;
  }

  clusterArticles(articles: NewsArticle[]): ArticleCluster[] {
    // Group articles by shared entities or topics
    const clusters = new Map<string, NewsArticle[]>();

    for (const article of articles) {
      // Find the most prominent entity or topic
      const key = this.getClusterKey(article);
      if (!clusters.has(key)) {
        clusters.set(key, []);
      }
      clusters.get(key)!.push(article);
    }

    // Filter to clusters with articles from multiple regions
    return Array.from(clusters.entries())
      .filter(([, arts]) => {
        const regions = new Set(arts.map((a) => a.perspective));
        return arts.length >= 3 && regions.size >= 2;
      })
      .map(([topic, arts]) => ({ topic, articles: arts }))
      .sort((a, b) => b.articles.length - a.articles.length)
      .slice(0, 5); // Top 5 clusters
  }

  private getClusterKey(article: NewsArticle): string {
    // Prioritize known conflict-related entities
    const priorityEntities = ['Gaza', 'Israel', 'Hamas', 'Hezbollah', 'Iran', 'Ukraine', 'Russia'];
    for (const entity of priorityEntities) {
      if (article.entities.includes(entity)) {
        return entity;
      }
    }
    // Fall back to first entity or topic
    if (article.entities.length > 0) {
      return article.entities[0];
    }
    if (article.topics.length > 0) {
      return article.topics[0];
    }
    return 'general';
  }

  async generateClusterSummary(cluster: ArticleCluster): Promise<ClusterSummary | null> {
    if (!this.isAvailable()) {
      return this.generateMockSummary(cluster);
    }

    // Check Redis cache (D-07)
    const cacheKey = CacheKeys.aiSummary(this.getCacheKey(cluster));
    const cached = await this.cacheService.get<ClusterSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildPrompt(cluster);
      const responseText = await this.callWithFallback(prompt);

      if (!responseText) {
        return this.generateMockSummary(cluster);
      }

      const summary = this.parseResponse(responseText, cluster);

      // Cache in Redis with 30-minute TTL (D-07)
      await this.cacheService.set(cacheKey, summary, AI_CONFIG.cache.summaryTTLSeconds);

      return summary;
    } catch (err) {
      logger.error('AI summary generation failed:', err);
      return this.generateMockSummary(cluster);
    }
  }

  // OpenRouter free models fallback chain (from config)
  private readonly OPENROUTER_MODELS = AI_CONFIG.openrouter.models;

  private async callOpenRouter(prompt: string): Promise<string | null> {
    if (!this.openrouterClient) return null;

    // Try each model in the fallback chain
    for (const model of this.OPENROUTER_MODELS) {
      try {
        const response = await this.openrouterClient.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: AI_CONFIG.openrouter.maxTokens,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          return content;
        }
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string };
        // Handle errors gracefully and try next model
        if (error.status && AI_CONFIG.fallbackErrorCodes.includes(error.status)) {
          logger.debug(`OpenRouter ${model} unavailable, trying next model`);
          continue;
        }
        // For other errors, log and try next model
        logger.debug(`OpenRouter ${model} failed: ${error.message}`);
        continue;
      }
    }

    // All OpenRouter models failed
    logger.warn('All OpenRouter models failed, trying next provider');
    return null;
  }

  private async callGemini(prompt: string): Promise<string | null> {
    return this.callGeminiWithModel(prompt, AI_CONFIG.gemini.models.primary);
  }

  private async callAnthropic(prompt: string): Promise<string | null> {
    if (!this.anthropicClient) return null;

    try {
      const message = await this.anthropicClient.messages.create({
        model: AI_CONFIG.anthropic.model,
        max_tokens: AI_CONFIG.anthropic.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== 'text') return null;

      return content.text;
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error.status === 429) {
        logger.warn('Anthropic rate limit reached');
      } else {
        logger.error('Anthropic call failed:', err);
      }
      return null;
    }
  }

  /**
   * Try all available providers in priority order until one succeeds
   * Priority: OpenRouter → Gemini (gemma-4) → Gemini (gemma-3) → Anthropic
   */
  async callWithFallback(prompt: string): Promise<string | null> {
    // Define provider order: OpenRouter → Gemini primary → Gemini fallback → Anthropic
    const providers: Array<{ name: string; call: () => Promise<string | null> }> = [
      { name: 'openrouter', call: () => this.callOpenRouter(prompt) },
      { name: 'gemini-primary', call: () => this.callGeminiWithModel(prompt, AI_CONFIG.gemini.models.primary) },
      { name: 'gemini-fallback', call: () => this.callGeminiWithModel(prompt, AI_CONFIG.gemini.models.fallback) },
      { name: 'anthropic', call: () => this.callAnthropic(prompt) },
    ];

    // Try each provider in order
    for (const provider of providers) {
      const result = await provider.call();
      if (result) {
        return result;
      }
      // Provider failed, try next
    }

    // All providers failed
    logger.warn('All AI providers failed, using keyword-based fallback');
    return null;
  }

  private async callGeminiWithModel(prompt: string, modelName: string): Promise<string | null> {
    if (!this.geminiClient) return null;

    try {
      const model = this.geminiClient.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error.status === 429) {
        logger.warn(`Gemini ${modelName} rate limit reached, will try fallback`);
      } else {
        logger.debug(`Gemini ${modelName} failed, trying next provider`);
      }
      return null;
    }
  }

  private getCacheKey(cluster: ArticleCluster): string {
    const articleIds = cluster.articles.map((a) => a.id).sort().join(',');
    return `${cluster.topic}:${articleIds.slice(0, 100)}`;
  }

  private buildPrompt(cluster: ArticleCluster): string {
    const regionArticles = new Map<PerspectiveRegion, NewsArticle[]>();

    for (const article of cluster.articles) {
      if (!regionArticles.has(article.perspective)) {
        regionArticles.set(article.perspective, []);
      }
      regionArticles.get(article.perspective)!.push(article);
    }

    let articlesText = '';
    for (const [region, articles] of regionArticles) {
      articlesText += `\n## ${region.toUpperCase()} PERSPECTIVE:\n`;
      for (const article of articles.slice(0, 3)) {
        articlesText += `- [${article.source.name}] ${article.title}\n  ${article.summary || article.content.slice(0, 200)}\n`;
      }
    }

    return `Analyze the following news articles about "${cluster.topic}" from different regional perspectives. Provide a balanced analysis in JSON format.

${articlesText}

Respond with a JSON object containing:
{
  "summary": "A 2-3 sentence neutral overview of the topic",
  "perspectives": [
    {
      "region": "region-name",
      "stance": "Brief description of this region's framing",
      "keyPoints": ["point1", "point2"]
    }
  ],
  "commonGround": ["What all sources agree on"],
  "divergences": ["Where sources differ significantly"]
}

Be objective and highlight differences in framing, not just facts. Response must be valid JSON only.`;
  }

  private parseResponse(text: string, cluster: ArticleCluster): ClusterSummary {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        topic: cluster.topic,
        summary: parsed.summary || 'Summary unavailable',
        perspectives: parsed.perspectives || [],
        commonGround: parsed.commonGround || [],
        divergences: parsed.divergences || [],
        generatedAt: new Date(),
      };
    } catch {
      return this.generateMockSummary(cluster);
    }
  }

  private generateMockSummary(cluster: ArticleCluster): ClusterSummary {
    const regions = [...new Set(cluster.articles.map((a) => a.perspective))];

    return {
      topic: cluster.topic,
      summary: `Aktuelle Berichterstattung zu ${cluster.topic} aus ${regions.length} verschiedenen regionalen Perspektiven mit ${cluster.articles.length} Artikeln.`,
      perspectives: regions.map((region) => ({
        region,
        stance: `${region} Medien berichten uber ${cluster.topic}`,
        keyPoints: ['Punkt 1', 'Punkt 2'],
      })),
      commonGround: ['Alle Quellen bestatigen die Grundfakten'],
      divergences: ['Unterschiedliche Interpretationen der Ursachen und Folgen'],
      generatedAt: new Date(),
    };
  }

  async generateComparison(articles: NewsArticle[]): Promise<{
    framing: Record<PerspectiveRegion, string>;
    bias: Record<PerspectiveRegion, number>;
  } | null> {
    if (!this.isAvailable() || articles.length < 2) {
      return null;
    }

    // Group by region
    const byRegion = new Map<PerspectiveRegion, NewsArticle[]>();
    for (const article of articles) {
      if (!byRegion.has(article.perspective)) {
        byRegion.set(article.perspective, []);
      }
      byRegion.get(article.perspective)!.push(article);
    }

    const framing: Record<string, string> = {};
    const bias: Record<string, number> = {};

    for (const [region, arts] of byRegion) {
      // Calculate average sentiment as bias indicator
      const avgSentiment = arts.reduce((sum, a) => sum + a.sentimentScore, 0) / arts.length;
      bias[region] = avgSentiment;

      // Simple framing description based on sentiment
      if (avgSentiment < -0.3) {
        framing[region] = 'Kritische und negative Berichterstattung';
      } else if (avgSentiment > 0.3) {
        framing[region] = 'Positive und unterstutzende Berichterstattung';
      } else {
        framing[region] = 'Neutrale und sachliche Berichterstattung';
      }
    }

    return {
      framing: framing as Record<PerspectiveRegion, string>,
      bias: bias as Record<PerspectiveRegion, number>,
    };
  }
/**
 * Analyze sentiment of a news article using AI
 */
async analyzeSentiment(title: string, content: string): Promise<{
  sentiment: Sentiment;
  score: number;
  reasoning: string;
}> {
  if (!this.isAvailable()) {
    return { sentiment: 'neutral', score: 0, reasoning: 'AI Service not available' };
  }

  try {
    const text = `${title}\n\n${content.slice(0, 500)}`;
    const prompt = `Analyze the sentiment of this news article. Respond with ONLY a JSON object.
{
"sentiment": "positive" | "negative" | "neutral",
"score": -1.0 to 1.0,
"reasoning": "1-sentence explanation"
}

Article:
${text}`;

    // Use fallback chain for reliability
    const responseText = await this.callWithFallback(prompt);

    if (!responseText) throw new Error('Empty AI response');

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');

    const result = JSON.parse(jsonMatch[0]);
    return {
      sentiment: result.sentiment || 'neutral',
      score: result.score ?? 0,
      reasoning: result.reasoning || 'No reasoning provided',
    };
  } catch (err) {
    logger.error('Sentiment analysis failed:', err);
    return { sentiment: 'neutral', score: 0, reasoning: 'Error during analysis' };
  }
}

async batchAnalyzeSentiment(articles: NewsArticle[]): Promise<Map<string, {
  sentiment: Sentiment;
  score: number;
  reasoning: string;
}>> {
  const results = new Map();

  // Process in small batches to respect rate limits
  const batchSize = 5;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const promises = batch.map(async (art) => {
      const result = await this.analyzeSentiment(art.title, art.content);
      results.set(art.id, result);
    });

    await Promise.all(promises);

    // Delay between batches
    if (i + batchSize < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Classify article topics using AI
...
   * Returns array of topics: conflict, diplomacy, economy, humanitarian, politics, society, military, protest, energy, climate
   * Results are cached for 24h to reduce API calls
   */
  async classifyTopics(title: string, content: string): Promise<string[]> {
    // Generate cache key from title + content
    const cacheKey = CacheKeys.aiTopics(hashString(title + content));

    // Check Redis cache
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fallback to keyword matching if AI not available
    if (!this.isAvailable()) {
      return this.extractTopicsKeyword(title, content);
    }

    try {
      const text = `${title}\n\n${content.slice(0, 500)}`;
      const prompt = `Classify this news article into relevant topics. Return ONLY a JSON array of topic strings from this list: conflict, diplomacy, economy, humanitarian, politics, society, military, protest, energy, climate.

Article:
${text}

Response format: ["topic1", "topic2", ...]`;

      // Use fallback chain for reliability
      const responseText = await this.callWithFallback(prompt);

      if (!responseText) {
        return this.extractTopicsKeyword(title, content);
      }

      // Parse JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        return this.extractTopicsKeyword(title, content);
      }

      const topics: string[] = JSON.parse(jsonMatch[0]);

      // Validate topics against allowed list
      const validTopics = [
        'conflict',
        'diplomacy',
        'economy',
        'humanitarian',
        'politics',
        'society',
        'military',
        'protest',
        'energy',
        'climate',
      ];
      const filtered = topics.filter((t) => validTopics.includes(t));
      const result = filtered.length > 0 ? filtered : ['politics']; // Default to politics if empty

      // Cache in Redis with 5-minute TTL (D-07, Claude's discretion)
      await this.cacheService.set(cacheKey, result, AI_CONFIG.cache.topicTTLSeconds);

      return result;
    } catch {
      // Silently fall back to keyword-based classification (don't spam console)
      return this.extractTopicsKeyword(title, content);
    }
  }

  /**
   * Fallback keyword-based topic extraction
   */
  private extractTopicsKeyword(title: string, content: string): string[] {
    const text = `${title} ${content}`.toLowerCase();
    const topics: string[] = [];

    const topicKeywords: Record<string, string[]> = {
      conflict: ['conflict', 'war', 'attack', 'violence', 'battle'],
      military: ['military', 'army', 'strike', 'operation', 'forces', 'weapon'],
      diplomacy: ['diplomat', 'negotiat', 'talks', 'agreement', 'summit', 'treaty'],
      humanitarian: ['humanitarian', 'aid', 'refugee', 'civilian', 'hospital', 'crisis'],
      protest: ['protest', 'demonstrat', 'rally', 'march', 'uprising'],
      economy: ['economy', 'economic', 'trade', 'market', 'financial', 'business'],
      politics: ['politics', 'political', 'government', 'election', 'parliament', 'minister'],
      society: ['society', 'social', 'culture', 'education', 'healthcare'],
      energy: ['energy', 'oil', 'gas', 'power', 'electricity', 'fuel'],
      climate: ['climate', 'environmental', 'carbon', 'emission', 'warming'],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((kw) => text.includes(kw))) {
        topics.push(topic);
      }
    }

    return topics.length > 0 ? topics : ['politics'];
  }

  // ===========================================================================
  // Phase 38 — Source credibility (Plan 38-02 Task 5)
  //
  // Returns a 0-100 deterministic credibility score (computed via
  // credibilityService) plus an LLM-attributed methodology paragraph + sub-
  // dimensions. The result is cached for 24h at CacheKeys.credibility per
  // CONTEXT.md D-03 + D-18.
  //
  // Falls back gracefully on three error paths:
  //   1. Unknown source → score=0 + "Source not found" methodology
  //   2. LLM all-providers-failed → deterministic-only result with
  //      sub-dimensions == score and a localized fallback methodology
  //   3. LLM JSON malformed → same as (2)
  //
  // Per CONTEXT.md D-01/D-02/D-03/D-15 + D-18.
  // ===========================================================================

  async getSourceCredibility(sourceId: string, locale: Locale): Promise<CredibilityResult> {
    return this.cacheService.getOrSet(
      CacheKeys.credibility(sourceId, locale),
      () => this.computeCredibility(sourceId, locale),
      CACHE_TTL.DAY,
    );
  }

  private async computeCredibility(
    sourceId: string,
    locale: Locale,
  ): Promise<CredibilityResult> {
    const source = NEWS_SOURCES.find((s) => s.id === sourceId);
    if (!source) {
      return this.fallbackCredibility(
        sourceId,
        locale,
        0,
        { accuracy: 0, transparency: 0, corrections: 0 },
        this.sourceNotFoundMessage(locale),
      );
    }

    const score = deriveCredibilityScore(source);
    const bias = deriveBiasBucket(source.bias.political);

    // The LLM is asked to fill in sub-dimensions and a localized methodology.
    const prompt = buildCredibilityPrompt({
      sourceName: source.name,
      reliability: source.bias.reliability,
      politicalBias: source.bias.political,
      derivedScore: score,
      locale,
    });

    let responseText: string | null = null;
    try {
      responseText = await this.callWithFallback(prompt);
    } catch (err) {
      logger.error('aiService.computeCredibility callWithFallback failed:', err);
      responseText = null;
    }

    if (!responseText) {
      // Deterministic-only fallback when no LLM provider responded.
      return {
        sourceId,
        score,
        bias,
        subDimensions: { accuracy: score, transparency: score, corrections: score },
        methodologyMd: this.deterministicMethodology(source.name, score, locale),
        confidence: 'low',
        generatedAt: new Date().toISOString(),
        locale,
      };
    }

    const parsed = safeParseJson(responseText, credibilityLlmSchema);
    if (!parsed) {
      return {
        sourceId,
        score,
        bias,
        subDimensions: { accuracy: score, transparency: score, corrections: score },
        methodologyMd: this.deterministicMethodology(source.name, score, locale),
        confidence: 'low',
        generatedAt: new Date().toISOString(),
        locale,
      };
    }

    const rawConfidence = Math.round(
      (parsed.subDimensions.accuracy +
        parsed.subDimensions.transparency +
        parsed.subDimensions.corrections) /
        3,
    );

    return {
      sourceId,
      score,
      bias,
      subDimensions: parsed.subDimensions,
      methodologyMd: parsed.methodologyMd,
      confidence: bucketConfidence(rawConfidence),
      generatedAt: new Date().toISOString(),
      locale,
    };
  }

  private fallbackCredibility(
    sourceId: string,
    locale: Locale,
    score: number,
    subDimensions: CredibilitySubDimensions,
    methodologyMd: string,
  ): CredibilityResult {
    return {
      sourceId,
      score,
      bias: 'center',
      subDimensions,
      methodologyMd,
      confidence: 'low',
      generatedAt: new Date().toISOString(),
      locale,
    };
  }

  private sourceNotFoundMessage(locale: Locale): string {
    if (locale === 'de') return 'Quelle nicht gefunden.';
    if (locale === 'fr') return 'Source not found.'; // French falls through; UI re-translates
    return 'Source not found.';
  }

  private deterministicMethodology(
    sourceName: string,
    score: number,
    locale: Locale,
  ): string {
    const en = `${sourceName} has a derived credibility score of ${score}/100 based on its curated reliability and political-bias profile. AI-attributed sub-dimensions are unavailable; values shown reflect the deterministic score only. These scores are AI-attributed estimates based on the source's reputation profile, not measured signals from this platform. Verify with primary sources for any consequential decision.`;
    const de = `${sourceName} hat eine abgeleitete Glaubwürdigkeitsbewertung von ${score}/100 basierend auf der kuratierten Zuverlässigkeit und dem politischen Bias-Profil. KI-attribuierte Unterdimensionen sind nicht verfügbar; angezeigte Werte basieren ausschließlich auf der deterministischen Bewertung. Diese Werte sind KI-attribuierte Schätzungen basierend auf dem Reputationsprofil der Quelle, keine gemessenen Signale dieser Plattform. Überprüfen Sie mit Primärquellen für wichtige Entscheidungen.`;
    const fr = `${sourceName} a une note de crédibilité dérivée de ${score}/100 basée sur sa fiabilité curated et son profil de biais politique. Les sous-dimensions attribuées par IA sont indisponibles; les valeurs affichées reflètent uniquement le score déterministe. Ces valeurs sont des estimations attribuées par IA basées sur le profil de réputation de la source, pas des signaux mesurés sur cette plateforme. Vérifiez avec des sources primaires pour toute décision importante.`;
    return locale === 'de' ? de : locale === 'fr' ? fr : en;
  }

  // ===========================================================================
  // Phase 38 — Framing analysis (Plan 38-02 Task 6)
  //
  // Replaces the heuristic generateComparison with an LLM-driven framing
  // analyzer. Fetches recent articles for the topic, groups by region (cap 3
  // per region), passes through buildFramingPrompt + callWithFallback, and
  // filters output keys against the 13 valid PerspectiveRegion values.
  //
  // Cache key: ai:framing:<sha256(topic).slice(0,16)>:<locale> (D-18).
  // Falls back gracefully when articles=[], LLM null, or JSON malformed.
  //
  // Per CONTEXT.md D-14 + D-17.
  // ===========================================================================

  async generateFramingAnalysis(topic: string, locale: Locale): Promise<FramingAnalysis> {
    const topicHash = crypto
      .createHash('sha256')
      .update(topic.toLowerCase().trim())
      .digest('hex')
      .slice(0, 16);

    return this.cacheService.getOrSet(
      CacheKeys.framing(topicHash, locale),
      () => this.computeFraming(topic, locale),
      CACHE_TTL.DAY,
    );
  }

  private async computeFraming(topic: string, locale: Locale): Promise<FramingAnalysis> {
    const articles = await this.fetchArticlesForTopic(topic);

    if (articles.length === 0) {
      return { topic, locale, perspectives: {}, aiGenerated: false };
    }

    // Group by region (cap 3 per region for prompt budget).
    const articlesByRegion = new Map<PerspectiveRegion, NewsArticle[]>();
    for (const a of articles) {
      const region = a.perspective;
      const arr = articlesByRegion.get(region) ?? [];
      if (arr.length < 3) arr.push(a);
      articlesByRegion.set(region, arr);
    }

    const prompt = buildFramingPrompt({ topic, articlesByRegion, locale });

    let responseText: string | null = null;
    try {
      responseText = await this.callWithFallback(prompt);
    } catch (err) {
      logger.error('aiService.computeFraming callWithFallback failed:', err);
      responseText = null;
    }

    if (!responseText) {
      return { topic, locale, perspectives: {}, aiGenerated: false };
    }

    const parsed = safeParseJson(responseText, framingLlmSchema);
    if (!parsed) {
      return { topic, locale, perspectives: {}, aiGenerated: false };
    }

    // Filter out unknown region keys; the LLM was instructed to use only the
    // 13 valid PerspectiveRegion values, but defensive filtering protects
    // against drift.
    const perspectives: Partial<Record<PerspectiveRegion, FramingPerspective>> = {};
    for (const [region, body] of Object.entries(parsed.perspectives)) {
      if (VALID_PERSPECTIVE_REGIONS.includes(region as PerspectiveRegion)) {
        perspectives[region as PerspectiveRegion] = body;
      }
    }

    return { topic, locale, perspectives, aiGenerated: true };
  }

  private async fetchArticlesForTopic(topic: string): Promise<NewsArticle[]> {
    try {
      const result = await newsReadService.getArticles({ search: topic, limit: 50 });
      return result.articles ?? [];
    } catch (err) {
      logger.error('aiService.fetchArticlesForTopic failed:', err);
      return [];
    }
  }

}
