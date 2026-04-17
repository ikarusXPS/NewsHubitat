/**
 * AI Provider Configuration
 * Centralized config for all AI providers and their models
 */

export const AI_CONFIG = {
  /**
   * OpenRouter - Primary provider with free model fallback chain
   * All models are free tier with automatic failover
   */
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    models: [
      'google/gemma-4-31b-it:free',     // Primary: Gemma 4 31B
      'google/gemma-4-26b-a4b-it:free', // Fallback 1: Gemma 4 26B
      'openai/gpt-oss-120b:free',       // Fallback 2: GPT OSS 120B
      'z-ai/glm-4.5-air:free',          // Fallback 3: GLM 4.5 Air
      'minimax/minimax-m2.5:free',      // Fallback 4: MiniMax M2.5
    ],
    maxTokens: 1500,
  },

  /**
   * Gemini - Google's free tier (1500 requests/day)
   * Uses Gemma models via Google AI Studio
   */
  gemini: {
    models: {
      primary: 'gemma-3-27b-it',   // Gemma 4 (naming is confusing)
      fallback: 'gemma-2-27b-it',  // Gemma 3
    },
    maxTokens: 1500,
  },

  /**
   * Anthropic - Premium fallback (paid)
   * Only used when all free options fail
   */
  anthropic: {
    model: 'claude-3-haiku-20240307',
    maxTokens: 1500,
  },

  /**
   * Cache settings
   */
  cache: {
    summaryTTL: 30 * 60 * 1000,       // 30 minutes
    topicTTL: 24 * 60 * 60 * 1000,    // 24 hours
    cleanupInterval: 10 * 60 * 1000,  // 10 minutes
  },

  /**
   * Rate limit error codes that trigger fallback
   */
  fallbackErrorCodes: [402, 429, 503],
} as const;

export type OpenRouterModel = (typeof AI_CONFIG.openrouter.models)[number];
export type GeminiModel = typeof AI_CONFIG.gemini.models.primary | typeof AI_CONFIG.gemini.models.fallback;
