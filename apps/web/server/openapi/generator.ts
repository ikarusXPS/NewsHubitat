/**
 * OpenAPI Spec Generator (Phase 35, Plan 03)
 *
 * Generates OpenAPI 3.1 spec from Zod schemas using @asteasolutions/zod-to-openapi.
 * Single source of truth: Zod schemas define both runtime validation and API docs.
 *
 * D-07: Use Scalar for OpenAPI documentation
 * D-10: Code-first OpenAPI generation
 */
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import {
  NewsListResponseSchema,
  NewsDetailResponseSchema,
  GeoEventsResponseSchema,
  SentimentStatsResponseSchema,
  ErrorResponseSchema,
  RateLimitErrorResponseSchema,
  NewsQuerySchema,
  // Phase 38 — Advanced AI Features (JWT-gated)
  FactCheckRequestSchema,
  FactCheckResponseSchema,
  CredibilityResponseSchema,
  FramingResponseSchema,
  LocaleSchema,
} from './schemas';

/**
 * Generate OpenAPI 3.1 specification document.
 * Outputs JSON file to specified path.
 */
export async function generateOpenApiSpec(outputPath: string): Promise<void> {
  const registry = new OpenAPIRegistry();

  // =========================================================================
  // SECURITY SCHEMES (D-06: X-API-Key header)
  // =========================================================================
  registry.registerComponent('securitySchemes', 'ApiKeyAuth', {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
    description: 'API key for authentication. Format: nh_live_xxxx or nh_test_xxxx. Obtain from /developers page.',
  });

  // Phase 38 — JWT bearer authentication for /api/ai and /api/analysis routes
  // (mounted via authMiddleware + aiTierLimiter chain in server/index.ts).
  registry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  // =========================================================================
  // NEWS ENDPOINTS
  // =========================================================================

  // GET /api/v1/public/news - List news articles
  registry.registerPath({
    method: 'get',
    path: '/api/v1/public/news',
    summary: 'List news articles',
    description: 'Retrieve paginated list of news articles from 130+ sources across 13 global regions. Supports filtering by region, topics, sentiment, and full-text search.',
    tags: ['News'],
    security: [{ ApiKeyAuth: [] }],
    request: {
      query: NewsQuerySchema,
    },
    responses: {
      200: {
        description: 'Success - Returns paginated list of articles',
        content: {
          'application/json': {
            schema: NewsListResponseSchema,
          },
        },
        headers: {
          'Cache-Control': {
            description: 'Cache directive for response',
            schema: { type: 'string', example: 'public, max-age=300' },
          },
        },
      },
      401: {
        description: 'Unauthorized - Invalid or missing API key',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
      429: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: RateLimitErrorResponseSchema,
          },
        },
        headers: {
          'RateLimit-Limit': {
            description: 'Maximum requests allowed per window',
            schema: { type: 'integer', example: 10 },
          },
          'RateLimit-Remaining': {
            description: 'Remaining requests in current window',
            schema: { type: 'integer', example: 0 },
          },
          'RateLimit-Reset': {
            description: 'Seconds until window resets',
            schema: { type: 'integer', example: 45 },
          },
          'Retry-After': {
            description: 'Seconds to wait before retry',
            schema: { type: 'integer', example: 45 },
          },
        },
      },
    },
  });

  // GET /api/v1/public/news/:id - Get single article
  registry.registerPath({
    method: 'get',
    path: '/api/v1/public/news/{id}',
    summary: 'Get single news article',
    description: 'Retrieve detailed information for a specific article by ID.',
    tags: ['News'],
    security: [{ ApiKeyAuth: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Article ID', example: 'article-abc123' }),
      }),
    },
    responses: {
      200: {
        description: 'Success - Returns article details',
        content: {
          'application/json': {
            schema: NewsDetailResponseSchema,
          },
        },
        headers: {
          'Cache-Control': {
            description: 'Cache directive for response',
            schema: { type: 'string', example: 'public, max-age=3600' },
          },
        },
      },
      401: {
        description: 'Unauthorized - Invalid or missing API key',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Article not found',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
      429: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: RateLimitErrorResponseSchema,
          },
        },
      },
    },
  });

  // =========================================================================
  // EVENTS ENDPOINTS
  // =========================================================================

  // GET /api/v1/public/events - List geo-located events
  registry.registerPath({
    method: 'get',
    path: '/api/v1/public/events',
    summary: 'List geo-located events',
    description: 'Retrieve all geo-located events extracted from news articles. Events include location coordinates, severity classification, and source article references.',
    tags: ['Events'],
    security: [{ ApiKeyAuth: [] }],
    responses: {
      200: {
        description: 'Success - Returns list of geo-located events',
        content: {
          'application/json': {
            schema: GeoEventsResponseSchema,
          },
        },
        headers: {
          'Cache-Control': {
            description: 'Cache directive for response',
            schema: { type: 'string', example: 'public, max-age=900' },
          },
        },
      },
      401: {
        description: 'Unauthorized - Invalid or missing API key',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
      429: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: RateLimitErrorResponseSchema,
          },
        },
      },
    },
  });

  // =========================================================================
  // ANALYTICS ENDPOINTS
  // =========================================================================

  // GET /api/v1/public/sentiment - Get sentiment statistics
  registry.registerPath({
    method: 'get',
    path: '/api/v1/public/sentiment',
    summary: 'Get sentiment statistics',
    description: 'Retrieve sentiment distribution (positive/negative/neutral) by geographic region.',
    tags: ['Analytics'],
    security: [{ ApiKeyAuth: [] }],
    responses: {
      200: {
        description: 'Success - Returns sentiment statistics per region',
        content: {
          'application/json': {
            schema: SentimentStatsResponseSchema,
          },
        },
        headers: {
          'Cache-Control': {
            description: 'Cache directive for response',
            schema: { type: 'string', example: 'public, max-age=600' },
          },
        },
      },
      401: {
        description: 'Unauthorized - Invalid or missing API key',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
      429: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: RateLimitErrorResponseSchema,
          },
        },
      },
    },
  });

  // =========================================================================
  // Phase 38 — Advanced AI Features (JWT-gated)
  // =========================================================================

  // POST /api/ai/fact-check
  registry.registerPath({
    method: 'post',
    path: '/api/ai/fact-check',
    summary: 'Fact-check a user-highlighted claim against the NewsHub corpus',
    description:
      'Returns a 5-bucket verdict (true/mostly-true/mixed/unverified/false), confidence percentage, methodology paragraph, and up to 5 internal-corpus citations. Verdict + citations are language-agnostic; methodology text is generated in the requested locale. Cached 24h on (sha256(claim)).',
    tags: ['AI'],
    security: [{ BearerAuth: [] }],
    request: {
      body: { content: { 'application/json': { schema: FactCheckRequestSchema } } },
    },
    responses: {
      200: {
        description: 'Verdict + citations',
        content: { 'application/json': { schema: FactCheckResponseSchema } },
      },
      400: {
        description: 'Invalid claim (length, content, or pattern rejected)',
        content: { 'application/json': { schema: ErrorResponseSchema } },
      },
      401: {
        description: 'Unauthenticated',
        content: { 'application/json': { schema: ErrorResponseSchema } },
      },
      429: {
        description: 'Daily AI query limit reached (FREE tier)',
        content: { 'application/json': { schema: RateLimitErrorResponseSchema } },
      },
    },
  });

  // GET /api/ai/source-credibility/{sourceId}
  registry.registerPath({
    method: 'get',
    path: '/api/ai/source-credibility/{sourceId}',
    summary: 'Get a 0-100 credibility score + AI-attributed methodology for a news source',
    description:
      'Returns deterministic 0-100 score (anchored on curated reliability + bias), bias bucket (left/center/right per MediaBiasBar thresholds), three AI-attributed sub-dimensions (accuracy/transparency/corrections), and a locale-tagged methodology paragraph. Cached 24h per (sourceId, locale). The methodology explicitly discloses sub-dimensions are AI-attributed estimates, not measured signals.',
    tags: ['AI'],
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({ sourceId: z.string() }),
      query: z.object({ locale: LocaleSchema.optional() }),
    },
    responses: {
      200: {
        description: 'Credibility + methodology',
        content: { 'application/json': { schema: CredibilityResponseSchema } },
      },
      401: {
        description: 'Unauthenticated',
        content: { 'application/json': { schema: ErrorResponseSchema } },
      },
      404: {
        description: 'Unknown sourceId',
        content: { 'application/json': { schema: ErrorResponseSchema } },
      },
      429: {
        description: 'Daily AI query limit reached (FREE tier)',
        content: { 'application/json': { schema: RateLimitErrorResponseSchema } },
      },
    },
  });

  // GET /api/analysis/framing
  registry.registerPath({
    method: 'get',
    path: '/api/analysis/framing',
    summary: 'Get LLM-driven framing analysis comparing how regions cover the same topic',
    description:
      'Replaces the legacy sentiment heuristic with structured per-region narrative, omissions, vocabulary, and evidence-quote output. Cached 24h per (sha256(topic), locale).',
    tags: ['Analysis'],
    security: [{ BearerAuth: [] }],
    request: {
      query: z.object({
        topic: z.string().min(2),
        locale: LocaleSchema.optional(),
      }),
    },
    responses: {
      200: {
        description: 'Per-region framing analysis',
        content: { 'application/json': { schema: FramingResponseSchema } },
      },
      400: {
        description: 'Missing or invalid topic',
        content: { 'application/json': { schema: ErrorResponseSchema } },
      },
      401: {
        description: 'Unauthenticated',
        content: { 'application/json': { schema: ErrorResponseSchema } },
      },
      429: {
        description: 'Daily AI query limit reached (FREE tier)',
        content: { 'application/json': { schema: RateLimitErrorResponseSchema } },
      },
    },
  });

  // =========================================================================
  // GENERATE DOCUMENT
  // =========================================================================
  const generator = new OpenApiGeneratorV31(registry.definitions);
  const spec = generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'NewsHub Public API',
      version: '1.0.0',
      description: `
Multi-perspective global news analysis API.

NewsHub aggregates news from 130+ sources across 13 global regions, providing:
- Real-time news articles with sentiment analysis
- Geo-located events extracted from news
- Regional sentiment statistics

## Authentication

All endpoints require an API key passed in the \`X-API-Key\` header:

\`\`\`bash
curl -H "X-API-Key: nh_live_your_key_here" https://api.newshub.example.com/api/v1/public/news
\`\`\`

Obtain your API key from the [Developer Portal](/developers).

## Rate Limits

| Tier | Requests | Window |
|------|----------|--------|
| Free | 10 | per minute |
| Pro | 100 | per minute |

Rate limit headers are included in all responses:
- \`RateLimit-Limit\`: Maximum requests per window
- \`RateLimit-Remaining\`: Requests remaining
- \`RateLimit-Reset\`: Seconds until window resets

## Caching

Responses include \`Cache-Control\` headers. Honor these for optimal performance:
- News list: 5 minutes
- Single article: 1 hour
- Events: 15 minutes
- Sentiment: 10 minutes
      `.trim(),
      contact: {
        name: 'NewsHub API Support',
        url: 'https://newshub.example.com/developers',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      { url: 'https://api.newshub.example.com', description: 'Production' },
      { url: 'http://localhost:3001', description: 'Development' },
    ],
    tags: [
      { name: 'News', description: 'News article endpoints - access articles from 130+ global sources' },
      { name: 'Events', description: 'Geo-located event endpoints - events extracted from news articles' },
      { name: 'Analytics', description: 'Statistics and analytics - sentiment and trend data' },
      { name: 'AI', description: 'AI-powered fact-check and source credibility (Phase 38, JWT-gated)' },
      { name: 'Analysis', description: 'AI-driven framing analysis across regional perspectives (Phase 38, JWT-gated)' },
    ],
  });

  // Write spec to file
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(spec, null, 2));
  console.log(`OpenAPI spec generated: ${outputPath}`);
}

// CLI execution support: tsx server/openapi/generator.ts [output-path]
// Note: Using process.argv check for CLI mode detection
const isMainModule = process.argv[1] && process.argv[1].includes('generator');
if (isMainModule) {
  const outputPath = process.argv[2] || 'public/openapi.json';
  generateOpenApiSpec(outputPath).catch((err) => {
    console.error('Failed to generate OpenAPI spec:', err);
    process.exit(1);
  });
}
