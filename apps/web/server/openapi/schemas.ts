/**
 * OpenAPI Zod Schemas (Phase 35, Plan 03)
 *
 * Defines Zod schemas with OpenAPI metadata for public API endpoints.
 * These schemas are the single source of truth for:
 * 1. Runtime validation (Zod)
 * 2. OpenAPI spec generation (zod-to-openapi)
 *
 * D-10: Code-first OpenAPI generation
 */
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Extend Zod with OpenAPI metadata support
extendZodWithOpenApi(z);

// =============================================================================
// ENUMS
// =============================================================================

export const PerspectiveRegionSchema = z.enum([
  'usa', 'europa', 'deutschland', 'nahost', 'tuerkei', 'russland',
  'china', 'asien', 'afrika', 'lateinamerika', 'ozeanien', 'kanada', 'alternative'
]).openapi({ description: 'Geographic region perspective' });

export const SentimentSchema = z.enum(['positive', 'negative', 'neutral'])
  .openapi({ description: 'Article sentiment classification' });

export const EventCategorySchema = z.enum(['conflict', 'humanitarian', 'political', 'economic', 'military', 'protest'])
  .openapi({ description: 'Event category classification' });

export const EventSeveritySchema = z.enum(['critical', 'high', 'medium', 'low'])
  .openapi({ description: 'Event severity level' });

// =============================================================================
// DOMAIN MODELS
// =============================================================================

export const NewsSourceSchema = z.object({
  id: z.string().openapi({ example: 'cnn-usa' }),
  name: z.string().openapi({ example: 'CNN' }),
  country: z.string().openapi({ example: 'US' }),
  region: PerspectiveRegionSchema,
  language: z.string().openapi({ example: 'en' }),
}).openapi('NewsSource');

export const NewsArticleSchema = z.object({
  id: z.string().openapi({ example: 'article-abc123' }),
  title: z.string().openapi({ example: 'Breaking News: Major Event Unfolds' }),
  content: z.string().openapi({ example: 'Article content describing the event...' }),
  summary: z.string().optional().openapi({ example: 'Brief summary of the article' }),
  url: z.string().url().openapi({ example: 'https://example.com/news/article-123' }),
  imageUrl: z.string().url().optional().openapi({ example: 'https://example.com/images/article-123.jpg' }),
  sourceId: z.string().openapi({ example: 'cnn-usa' }),
  source: NewsSourceSchema.optional(),
  perspective: PerspectiveRegionSchema,
  topics: z.array(z.string()).openapi({ example: ['politics', 'international'] }),
  sentiment: SentimentSchema,
  sentimentScore: z.number().min(-1).max(1).optional().openapi({ example: 0.65 }),
  publishedAt: z.string().datetime().openapi({ example: '2026-04-26T12:00:00Z' }),
  originalLanguage: z.string().openapi({ example: 'en' }),
}).openapi('NewsArticle');

export const GeoLocationSchema = z.object({
  lat: z.number().openapi({ example: 40.7128 }),
  lng: z.number().openapi({ example: -74.0060 }),
  name: z.string().optional().openapi({ example: 'New York' }),
  country: z.string().optional().openapi({ example: 'US' }),
}).openapi('GeoLocation');

export const GeoEventSchema = z.object({
  id: z.string().openapi({ example: 'event-xyz789' }),
  title: z.string().openapi({ example: 'Political Crisis in Region X' }),
  description: z.string().openapi({ example: 'Detailed description of the event...' }),
  category: EventCategorySchema,
  severity: EventSeveritySchema,
  location: GeoLocationSchema,
  timestamp: z.string().datetime().openapi({ example: '2026-04-26T14:30:00Z' }),
  sourceArticles: z.array(z.string()).openapi({ example: ['article-1', 'article-2'] }),
  aiExtracted: z.boolean().openapi({ example: true }),
  confidence: z.number().min(0).max(1).openapi({ example: 0.85 }),
  perspectives: z.array(PerspectiveRegionSchema).openapi({ example: ['usa', 'europa'] }),
}).openapi('GeoEvent');

export const SentimentStatsSchema = z.object({
  region: PerspectiveRegionSchema,
  positive: z.number().int().openapi({ example: 45 }),
  negative: z.number().int().openapi({ example: 30 }),
  neutral: z.number().int().openapi({ example: 25 }),
  total: z.number().int().openapi({ example: 100 }),
}).openapi('SentimentStats');

// =============================================================================
// RESPONSE WRAPPERS
// =============================================================================

export const PaginationMetaSchema = z.object({
  total: z.number().int().openapi({ example: 1523 }),
  page: z.number().int().openapi({ example: 1 }),
  limit: z.number().int().openapi({ example: 20 }),
  hasMore: z.boolean().openapi({ example: true }),
}).openapi('PaginationMeta');

export const NewsListResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  data: z.array(NewsArticleSchema),
  meta: PaginationMetaSchema,
}).openapi('NewsListResponse');

export const NewsDetailResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  data: NewsArticleSchema,
}).openapi('NewsDetailResponse');

export const GeoEventsResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  data: z.array(GeoEventSchema),
  meta: z.object({
    total: z.number().int().openapi({ example: 42 }),
  }),
}).openapi('GeoEventsResponse');

export const SentimentStatsResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  data: z.array(SentimentStatsSchema),
}).openapi('SentimentStatsResponse');

// =============================================================================
// ERROR RESPONSES
// =============================================================================

export const ErrorResponseSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  error: z.string().openapi({ example: 'Invalid API key' }),
}).openapi('ErrorResponse');

export const RateLimitErrorResponseSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  error: z.string().openapi({ example: 'Rate limit exceeded' }),
  tier: z.string().openapi({ example: 'free' }),
  limit: z.number().int().openapi({ example: 10 }),
  window: z.string().openapi({ example: '1 minute' }),
  upgradeUrl: z.string().openapi({ example: '/pricing' }),
}).openapi('RateLimitErrorResponse');

// =============================================================================
// QUERY PARAMETERS
// =============================================================================

export const NewsQuerySchema = z.object({
  regions: z.string().optional().openapi({
    description: 'Comma-separated regions filter (e.g., "usa,europa,deutschland")',
    example: 'usa,europa',
  }),
  topics: z.string().optional().openapi({
    description: 'Comma-separated topics filter',
    example: 'politics,economy',
  }),
  sentiment: SentimentSchema.optional(),
  search: z.string().optional().openapi({
    description: 'Search term for title/content matching',
    example: 'election',
  }),
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
});
