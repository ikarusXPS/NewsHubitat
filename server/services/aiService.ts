import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NewsArticle, PerspectiveRegion, Sentiment } from '../../src/types';
import logger from '../utils/logger';
import { hashString } from '../utils/hash';
import { AI_CONFIG } from '../config/aiProviders';

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
  private cache: Map<string, { summary: ClusterSummary; timestamp: number }> = new Map();
  private topicCache: Map<string, { topics: string[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = AI_CONFIG.cache.summaryTTL;
  private readonly TOPIC_CACHE_TTL = AI_CONFIG.cache.topicTTL;
  private readonly CLEANUP_INTERVAL = AI_CONFIG.cache.cleanupInterval;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

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

    // Start periodic cache cleanup to prevent memory leaks
    this.startCacheCleanup();
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCaches();
    }, this.CLEANUP_INTERVAL);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Remove expired entries from all caches
   */
  private cleanupCaches(): void {
    const now = Date.now();
    let cleanedSummaries = 0;
    let cleanedTopics = 0;

    // Cleanup summary cache
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
        cleanedSummaries++;
      }
    }

    // Cleanup topic cache
    for (const [key, value] of this.topicCache) {
      if (now - value.timestamp > this.TOPIC_CACHE_TTL) {
        this.topicCache.delete(key);
        cleanedTopics++;
      }
    }

    if (cleanedSummaries > 0 || cleanedTopics > 0) {
      logger.debug(`Cache cleanup: removed ${cleanedSummaries} summaries, ${cleanedTopics} topics`);
    }
  }

  /**
   * Shutdown the service and cleanup resources
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
    this.topicCache.clear();
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

    // Check cache
    const cacheKey = this.getCacheKey(cluster);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.summary;
    }

    try {
      const prompt = this.buildPrompt(cluster);
      const responseText = await this.callWithFallback(prompt);

      if (!responseText) {
        return this.generateMockSummary(cluster);
      }

      const summary = this.parseResponse(responseText, cluster);

      // Cache the result
      this.cache.set(cacheKey, { summary, timestamp: Date.now() });

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
  private async callWithFallback(prompt: string): Promise<string | null> {
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
    const cacheKey = hashString(title + content);
    const cached = this.topicCache.get(cacheKey);

    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.TOPIC_CACHE_TTL) {
      return cached.topics;
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

      // Cache result
      const result = filtered.length > 0 ? filtered : ['politics']; // Default to politics if empty
      this.topicCache.set(cacheKey, { topics: result, timestamp: Date.now() });

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

}
