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

// =============================================================================
// PHASE 38 — ADVANCED AI FEATURES (FactCheck / Credibility / Framing)
// =============================================================================
// JWT-gated endpoints (BearerAuth, NOT ApiKeyAuth). The schemas below are the
// single source of truth for runtime validation in the route handlers AND for
// OpenAPI doc generation in `openapi/generator.ts`.

export const VerdictSchema = z.enum(['true', 'mostly-true', 'mixed', 'unverified', 'false'])
  .openapi({ description: '5-bucket fact-check verdict (D-08)' });

export const ConfidenceBucketSchema = z.enum(['low', 'medium', 'high'])
  .openapi({ description: 'Categorical confidence pill (D-05)' });

export const BiasBucketSchema = z.enum(['left', 'center', 'right'])
  .openapi({ description: 'Bias indicator (D-04)' });

export const LocaleSchema = z.enum(['de', 'en', 'fr'])
  .openapi({ description: 'Supported UI/content locale' });

export const CredibilitySubDimensionsSchema = z.object({
  accuracy: z.number().int().min(0).max(100),
  transparency: z.number().int().min(0).max(100),
  corrections: z.number().int().min(0).max(100),
}).openapi('CredibilitySubDimensions');

export const CredibilityResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    sourceId: z.string(),
    score: z.number().int().min(0).max(100),
    bias: BiasBucketSchema,
    subDimensions: CredibilitySubDimensionsSchema,
    methodologyMd: z.string(),
    confidence: ConfidenceBucketSchema,
    generatedAt: z.string().datetime(),
    locale: LocaleSchema,
  }),
}).openapi('CredibilityResponse');

export const FramingPerspectiveSchema = z.object({
  narrative: z.string(),
  omissions: z.array(z.string()).max(3),
  vocabulary: z.array(z.string()).max(5),
  evidenceQuotes: z.array(z.string()).max(3),
}).openapi('FramingPerspective');

// `z.record` requires a string-keyed shape; the existing PerspectiveRegionSchema
// is a `z.enum` of string literals so it is compatible. We pass the enum so the
// generated OpenAPI spec narrows the keyset to the 13 valid PerspectiveRegion
// values.
export const FramingResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    topic: z.string(),
    locale: LocaleSchema,
    perspectives: z.record(PerspectiveRegionSchema, FramingPerspectiveSchema),
    aiGenerated: z.literal(true),
  }),
}).openapi('FramingResponse');

export const FactCheckRequestSchema = z.object({
  claim: z.string().min(10).max(500),
  articleId: z.string().optional(),
  language: LocaleSchema.optional(),
}).openapi('FactCheckRequest');

export const FactCheckCitationSchema = z.object({
  articleId: z.string(),
  title: z.string(),
  sourceName: z.string(),
  region: PerspectiveRegionSchema,
  url: z.string().url(),
}).openapi('FactCheckCitation');

export const FactCheckResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    factCheckId: z.string(),
    verdict: VerdictSchema,
    confidence: z.number().int().min(0).max(100),
    confidenceBucket: ConfidenceBucketSchema,
    methodologyMd: z.string(),
    citations: z.array(FactCheckCitationSchema).max(5),
    locale: LocaleSchema,
    generatedAt: z.string().datetime(),
    cached: z.boolean(),
  }),
}).openapi('FactCheckResponse');
