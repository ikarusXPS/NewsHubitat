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
