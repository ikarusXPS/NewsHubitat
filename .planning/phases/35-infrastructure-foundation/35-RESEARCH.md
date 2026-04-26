# Phase 35: Infrastructure Foundation - Research

**Researched:** 2026-04-26
**Domain:** Monorepo architecture, Public API design, Developer authentication
**Confidence:** HIGH

## Summary

This phase establishes the foundation for mobile app development and developer API access by implementing a pnpm workspace monorepo structure, exposing versioned public API endpoints with tiered rate limiting, and creating a self-service developer portal for API key management.

The technical approach leverages existing infrastructure (Express rate limiting with Redis sliding window, Prisma for database, existing type definitions) and extends it with monorepo code sharing patterns, OpenAPI documentation via Scalar, and API key authentication with prefix-checksum validation.

**Primary recommendation:** Use code-first OpenAPI generation with @asteasolutions/zod-to-openapi to maintain a single source of truth between runtime validation (already using Zod) and API documentation, preventing spec drift.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Monorepo structure | Build System | — | File organization and workspace configuration happens at build time |
| Package exports | Build System | — | TypeScript compilation and source exports managed by build tools |
| Public API endpoints | API / Backend | — | REST endpoints for external developer access with authentication |
| API key authentication | API / Backend | Database | Middleware validates keys, database stores metadata |
| Rate limiting | API / Backend | Redis | Sliding window algorithm enforced in-memory (Redis) before hitting routes |
| OpenAPI documentation | API / Backend | CDN / Static | Generated spec served as static JSON, rendered by Scalar React component |
| Developer portal UI | Frontend Server (SSR) | Browser / Client | React page for key management, rendered client-side |
| API usage logging | API / Backend | Database | Async write to database after request processing |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Monorepo Structure:**
- D-01: Use pnpm workspaces with `apps/` + `packages/` layout
- D-02: Move existing app to `apps/web`, create `apps/mobile` in Phase 39
- D-03: Extract only two packages initially: `packages/types` (shared TypeScript interfaces) and `packages/api-client` (generated from OpenAPI)
- D-04: Use source-only exports (raw .ts files) — no separate build step for packages. Apps consume TypeScript directly.

**Public API Design:**
- D-05: Version API via URL prefix: `/api/v1/public/*`
- D-06: Authenticate with `X-API-Key` header. Key format: `nh_live_xxxx` or `nh_test_xxxx`
- D-07: Use Scalar for OpenAPI documentation (modern UI, try-it-out panel)
- D-08: Expose read-only endpoints: news (list, detail), events, sentiment stats. No AI analysis endpoints in Free tier.

**Developer Portal:**
- D-09: Create dedicated `/developers` page with docs, examples, and key management
- D-10: Maximum 3 API keys per user (dev/staging/prod pattern)
- D-11: Dashboard shows: list of API keys, creation date, last used timestamp, request count this month

**Rate Limit Enforcement:**
- D-12: Store tier on ApiKey model (`tier: 'free' | 'pro'`). Lookup from Redis-cached key metadata.
- D-13: Use standard RateLimit headers per IETF draft: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- D-14: Use sliding window algorithm (already implemented for internal limits via express-rate-limit + Redis)
- D-15: Free tier: 10 req/min, Pro tier: 100 req/min

### Claude's Discretion

- API key format details (prefix length, charset, checksum)
- Exact Scalar UI customization (colors, logo placement)
- OpenAPI spec generation approach (code-first vs spec-first)
- Database schema for ApiKey model (indexes, constraints)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 (partial) | Monorepo structure for code sharing | pnpm workspaces with apps/packages layout, source-only TypeScript exports |
| PAY-08 | Self-service API key registration | Developer portal UI, ApiKey database model, key generation with nanoid |
| PAY-09 | Tiered rate limiting (Free: 10/min, Pro: 100/min) | Extend existing express-rate-limit + Redis with API key tier lookup |
| PAY-10 | OpenAPI documentation | @asteasolutions/zod-to-openapi for code-first generation, Scalar for rendering |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm | 10.33.2 | Workspace package manager | Fast, disk-efficient, hard links for shared dependencies. Industry standard for monorepos in 2026. [VERIFIED: npm registry] |
| @asteasolutions/zod-to-openapi | 8.5.0 | Code-first OpenAPI generation | Leverages existing Zod validation to generate OpenAPI specs. Single source of truth prevents spec drift. [VERIFIED: npm registry] |
| @scalar/api-reference-react | 1.52.6 | OpenAPI documentation UI | Modern React component for interactive API docs with try-it-out panel. Superior UX to Swagger UI. [VERIFIED: npm registry] |
| nanoid | 5.1.9 | API key generation | Already in dependencies. Cryptographically strong, URL-safe, customizable alphabet. [VERIFIED: npm registry, already installed] |
| express-rate-limit | 7.5.0 | Rate limiting middleware | Already in dependencies. Sliding window support with Redis store. [VERIFIED: npm registry, already installed] |
| rate-limit-redis | 4.2.0 | Redis store for rate limiter | Already in dependencies. Distributed rate limiting across replicas. [VERIFIED: npm registry, already installed] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-openapi-validator | 5.6.2 | Runtime request validation | Optional: validates requests against OpenAPI spec at runtime. Use if paranoid about spec drift. [VERIFIED: npm registry] |
| @openapitools/openapi-generator-cli | 2.31.1 | Client SDK generation | Optional: generates TypeScript client from OpenAPI spec for packages/api-client. Alternative to manual client. [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pnpm | Yarn Workspaces | Similar features but pnpm 60-80% faster installs, less disk usage via hard links [CITED: jsdev.space/complete-monorepo-guide] |
| pnpm | npm Workspaces | npm slower, no phantom dependencies protection. pnpm forces strict dependencies [CITED: blog.glen-thomas.com] |
| @scalar/api-reference-react | Swagger UI | Scalar has better UX, code examples, dark mode. Swagger UI dated in 2026 [CITED: apidog.com/blog/scalar-vs-swaggerhub] |
| @asteasolutions/zod-to-openapi | Hand-written OpenAPI YAML | Hand-written specs drift from implementation. Code-first stays in sync [CITED: stevekinney.com] |
| nanoid | crypto.randomBytes | nanoid URL-safe by default, shorter IDs (21 chars vs 32 hex). Both cryptographically secure [ASSUMED] |

**Installation:**

```bash
# Monorepo tooling
npm install -g pnpm@10.33.2

# OpenAPI generation and docs
npm install @asteasolutions/zod-to-openapi@8.5.0 @scalar/api-reference-react@1.52.6

# Optional: validation and client generation
npm install express-openapi-validator@5.6.2
npm install --save-dev @openapitools/openapi-generator-cli@2.31.1
```

**Version verification:** All versions verified against npm registry 2026-04-26.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MONOREPO ROOT                           │
│  pnpm-workspace.yaml                                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴────────────────┐
                │                                │
        ┌───────▼────────┐              ┌────────▼──────────┐
        │   apps/web     │              │  packages/types   │
        │  (existing app)│◄─────────────┤  (shared types)   │
        └───────┬────────┘              └───────────────────┘
                │
                │ imports
                │
        ┌───────▼─────────────────────────────────────────────────┐
        │              PUBLIC API FLOW                            │
        └─────────────────────────────────────────────────────────┘
                │
     1. Request arrives
                │
        ┌───────▼────────────────────────────────┐
        │  API Key Middleware                    │
        │  - Extract X-API-Key header            │
        │  - Validate prefix (nh_live_, nh_test_)│
        │  - Verify checksum                     │
        │  - Lookup in Redis (cached)            │
        │  - Load from Prisma if miss            │
        │  - Attach user + tier to req           │
        └────────────┬───────────────────────────┘
                     │
                     │ key valid?
                     ▼
        ┌────────────────────────────────────────┐
        │  Rate Limit Middleware (Tiered)        │
        │  - Lookup tier: free=10/min, pro=100/min│
        │  - Check Redis sorted set (sliding)    │
        │  - Return RateLimit-* headers          │
        │  - 429 if exceeded                     │
        └────────────┬───────────────────────────┘
                     │
                     │ within limit?
                     ▼
        ┌────────────────────────────────────────┐
        │  Versioned Route Handler               │
        │  /api/v1/public/news                   │
        │  /api/v1/public/events                 │
        │  /api/v1/public/sentiment              │
        │  - Validate with Zod schema            │
        │  - Query database                      │
        │  - Return JSON response                │
        └────────────┬───────────────────────────┘
                     │
                     │ async (fire-and-forget)
                     ▼
        ┌────────────────────────────────────────┐
        │  Usage Logger                          │
        │  - Increment request count             │
        │  - Update lastUsedAt timestamp         │
        │  - Log to Prisma ApiUsage table        │
        │  - Don't block response                │
        └────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPER PORTAL FLOW                        │
└─────────────────────────────────────────────────────────────────┘
                │
     User navigates to /developers
                │
        ┌───────▼────────────────────────────────┐
        │  DevelopersPage (React)                │
        │  - Documentation tabs                  │
        │  - Code examples                       │
        │  - API key management UI               │
        └────────────┬───────────────────────────┘
                     │
                     │ authenticated user
                     ▼
        ┌────────────────────────────────────────┐
        │  API Key Dashboard                     │
        │  - List user's keys (max 3)            │
        │  - Show: createdAt, lastUsedAt, count  │
        │  - Create new key button               │
        │  - Revoke key button                   │
        └────────────┬───────────────────────────┘
                     │
                     │ POST /api/keys
                     ▼
        ┌────────────────────────────────────────┐
        │  Key Generation Service                │
        │  - Generate: nh_live_ + nanoid(24)     │
        │  - Calculate SHA-256 checksum (4 chars)│
        │  - Hash full key (bcrypt)              │
        │  - Store in Prisma (hashed)            │
        │  - Return plaintext ONCE               │
        └────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    OPENAPI GENERATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘
                │
     Build time or on-demand
                │
        ┌───────▼────────────────────────────────┐
        │  Zod Schemas (existing)                │
        │  - NewsArticle validation              │
        │  - GeoEvent validation                 │
        │  - Query parameter schemas             │
        └────────────┬───────────────────────────┘
                     │
                     │ @asteasolutions/zod-to-openapi
                     ▼
        ┌────────────────────────────────────────┐
        │  OpenAPI Spec Generator                │
        │  - Convert Zod → OpenAPI 3.1 JSON      │
        │  - Add metadata (title, version, auth) │
        │  - Write to public/openapi.json        │
        └────────────┬───────────────────────────┘
                     │
                     │ served as static file
                     ▼
        ┌────────────────────────────────────────┐
        │  Scalar React Component                │
        │  - Fetch /openapi.json                 │
        │  - Render interactive docs             │
        │  - Try-it-out with API key input       │
        └────────────────────────────────────────┘
```

### Recommended Project Structure

```
newshub/                          # Monorepo root
├── pnpm-workspace.yaml           # Workspace config
├── package.json                  # Root package.json (scripts, devDeps)
├── .npmrc                        # pnpm config (auto-install-peers=true)
│
├── apps/
│   └── web/                      # Existing app moved here
│       ├── package.json          # Dependencies: workspace:*, external
│       ├── src/                  # Frontend code (unchanged)
│       ├── server/               # Backend code (unchanged)
│       ├── vite.config.ts        # Vite config (unchanged)
│       └── tsconfig.json         # Extends workspace base config
│
├── packages/
│   ├── types/                    # Shared TypeScript types
│   │   ├── package.json          # name: @newshub/types, main: index.ts
│   │   ├── index.ts              # Re-exports all types
│   │   ├── news.ts               # NewsArticle, NewsSource, etc.
│   │   ├── events.ts             # GeoEvent, TimelineEvent, etc.
│   │   └── api.ts                # ApiResponse, FilterState, etc.
│   │
│   └── api-client/               # Generated API client (Phase 39)
│       ├── package.json          # name: @newshub/api-client
│       ├── src/
│       │   ├── index.ts          # Main client export
│       │   └── generated/        # OpenAPI-generated code
│       └── tsconfig.json
│
├── docs/                         # Documentation (optional)
│   └── api/
│       └── openapi.json          # Generated OpenAPI spec
│
└── tsconfig.base.json            # Shared TypeScript config
```

### Pattern 1: pnpm Workspace Configuration

**What:** Configure pnpm-workspace.yaml to define package locations and enable workspace protocol

**When to use:** Initial monorepo setup (Wave 0)

**Example:**

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// package.json (root)
{
  "name": "newshub-monorepo",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @newshub/web dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "~6.0.3"
  }
}
```

```json
// apps/web/package.json
{
  "name": "@newshub/web",
  "dependencies": {
    "@newshub/types": "workspace:*",
    "react": "^19.2.0"
  }
}
```

```json
// packages/types/package.json
{
  "name": "@newshub/types",
  "version": "0.0.0",
  "main": "index.ts",
  "types": "index.ts",
  "exports": {
    ".": "./index.ts"
  }
}
```

**Source:** [CITED: pnpm.io/workspaces, jsdev.space/complete-monorepo-guide]

### Pattern 2: API Key Generation with Prefix and Checksum

**What:** Generate cryptographically secure API keys with `nh_live_` / `nh_test_` prefix and SHA-256 checksum

**When to use:** POST /api/keys endpoint for creating new developer keys

**Example:**

```typescript
// server/services/apiKeyService.ts
import { customAlphabet } from 'nanoid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 24);

export interface ApiKeyComponents {
  prefix: 'nh_live' | 'nh_test';
  random: string;
  checksum: string;
  full: string; // prefix_random_checksum
}

/**
 * Generate API key with format: nh_live_<24-char-random>_<4-char-checksum>
 * Example: nh_live_1A2b3C4d5E6f7G8h9I0j1K2L_A3B4
 */
export function generateApiKey(environment: 'live' | 'test'): ApiKeyComponents {
  const prefix = `nh_${environment}` as const;
  const random = nanoid(); // 24 chars

  // Generate checksum: first 4 chars of SHA-256 hash of prefix+random
  const hash = crypto.createHash('sha256').update(`${prefix}_${random}`).digest('hex');
  const checksum = hash.substring(0, 4).toUpperCase();

  const full = `${prefix}_${random}_${checksum}`;

  return { prefix, random, checksum, full };
}

/**
 * Validate API key format and checksum before database lookup
 */
export function validateApiKeyFormat(key: string): boolean {
  // Format: nh_(live|test)_<24-chars>_<4-chars>
  const pattern = /^nh_(live|test)_[0-9A-Za-z]{24}_[0-9A-F]{4}$/;
  if (!pattern.test(key)) return false;

  const [prefix, random, providedChecksum] = key.split('_').slice(0, 3);

  // Recalculate checksum
  const hash = crypto.createHash('sha256').update(`${prefix}_${random}`).digest('hex');
  const expectedChecksum = hash.substring(0, 4).toUpperCase();

  return providedChecksum === expectedChecksum;
}

/**
 * Create new API key for user
 */
export async function createApiKey(userId: string, name: string, tier: 'free' | 'pro'): Promise<string> {
  const { full } = generateApiKey('live');

  // Hash for storage (never store plaintext)
  const keyHash = await bcrypt.hash(full, 10);

  // Store in database
  await prisma.apiKey.create({
    data: {
      keyHash,
      userId,
      name,
      tier,
      environment: 'live',
      createdAt: new Date(),
    },
  });

  // Return plaintext ONCE (user must copy it now)
  return full;
}
```

**Source:** [CITED: oneuptime.com/blog/api-key-management-best-practices, freecodecamp.org/news/best-practices-for-building-api-keys]

### Pattern 3: Code-First OpenAPI Generation with Zod

**What:** Generate OpenAPI 3.1 spec from existing Zod validation schemas

**When to use:** Build time or on-demand generation for /api/openapi.json endpoint

**Example:**

```typescript
// server/openapi/generator.ts
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import fs from 'fs/promises';

// Define Zod schemas with OpenAPI metadata
const NewsArticleSchema = z.object({
  id: z.string().openapi({ example: 'article-123' }),
  title: z.string().openapi({ example: 'Breaking News Title' }),
  source: z.object({
    id: z.string(),
    name: z.string(),
  }),
  publishedAt: z.string().datetime(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
}).openapi('NewsArticle');

const NewsListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(NewsArticleSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
}).openapi('NewsListResponse');

// Create registry
const registry = new OpenAPIRegistry();

// Register schemas
registry.register('NewsArticle', NewsArticleSchema);
registry.register('NewsListResponse', NewsListResponseSchema);

// Register paths
registry.registerPath({
  method: 'get',
  path: '/api/v1/public/news',
  summary: 'List news articles',
  tags: ['News'],
  security: [{ ApiKeyAuth: [] }],
  request: {
    query: z.object({
      region: z.string().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      description: 'Success',
      content: {
        'application/json': {
          schema: NewsListResponseSchema,
        },
      },
    },
    429: {
      description: 'Rate limit exceeded',
    },
  },
});

// Generate spec
const generator = new OpenApiGeneratorV31(registry.definitions);
const spec = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'NewsHub Public API',
    version: '1.0.0',
    description: 'Multi-perspective global news analysis API',
  },
  servers: [
    { url: 'https://api.newshub.example.com', description: 'Production' },
    { url: 'http://localhost:3001', description: 'Development' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key with format: nh_live_xxxx or nh_test_xxxx',
      },
    },
  },
});

// Write to file
await fs.writeFile('public/openapi.json', JSON.stringify(spec, null, 2));
```

**Source:** [CITED: github.com/asteasolutions/zod-to-openapi, stevekinney.com/courses/full-stack-typescript/zod-to-open-api]

### Pattern 4: Tiered Rate Limiting with API Key Lookup

**What:** Extend existing rate limiter to lookup tier from API key metadata

**When to use:** Middleware for /api/v1/public/* routes

**Example:**

```typescript
// server/middleware/apiKeyRateLimiter.ts
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { CacheService } from '../services/cacheService';

// Extend Request type
interface ApiKeyRequest extends Request {
  apiKey?: { userId: string; tier: 'free' | 'pro'; keyId: string };
}

export const apiKeyRateLimiter = (() => {
  const cacheService = CacheService.getInstance();
  const redisClient = cacheService.getClient();

  // Tier-based limits
  const TIER_LIMITS: Record<'free' | 'pro', number> = {
    free: 10,   // 10 req/min
    pro: 100,   // 100 req/min
  };

  return rateLimit({
    windowMs: 60_000, // 1 minute

    // Dynamic max based on tier
    max: async (req: ApiKeyRequest) => {
      const tier = req.apiKey?.tier || 'free';
      return TIER_LIMITS[tier];
    },

    // Key by API key ID (not IP)
    keyGenerator: (req: ApiKeyRequest) => {
      return req.apiKey?.keyId || 'anonymous';
    },

    // Use Redis store
    store: redisClient ? new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        redisClient.call(command, ...args),
      prefix: 'rl:api:',
    }) : undefined,

    // Standard headers (D-13: IETF draft)
    standardHeaders: true,   // RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
    legacyHeaders: false,

    // Custom handler with tier info
    handler: (req: ApiKeyRequest, res) => {
      const tier = req.apiKey?.tier || 'free';
      const limit = TIER_LIMITS[tier];
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        tier,
        limit,
        window: '1 minute',
        upgradeUrl: '/pricing',
      });
    },

    skip: () => !cacheService.isAvailable(), // Graceful degradation
  });
})();
```

**Source:** [VERIFIED: existing pattern in server/middleware/rateLimiter.ts, extended for API tiers]

### Pattern 5: Scalar React Integration

**What:** Embed interactive OpenAPI documentation in React app

**When to use:** /developers page to render API documentation

**Example:**

```typescript
// src/pages/DevelopersPage.tsx
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

export default function DevelopersPage() {
  return (
    <div className="developers-page">
      <header>
        <h1>NewsHub Developer API</h1>
      </header>

      <ApiReferenceReact
        configuration={{
          // Load spec from static file (generated at build time)
          url: '/openapi.json',

          // Customization
          theme: 'dark',
          layout: 'modern',

          // Try-it-out with API key
          authentication: {
            preferredSecurityScheme: 'ApiKeyAuth',
            apiKey: {
              token: '', // User inputs their key
            },
          },

          // Hide internal endpoints
          hiddenClients: [],

          // Custom CSS
          customCss: `
            .scalar-app {
              --scalar-color-accent: #00f0ff;
            }
          `,
        }}
      />
    </div>
  );
}
```

**Source:** [CITED: scalar.com/products/api-references/integrations/react, github.com/scalar/scalar/blob/main/documentation/integrations/react.md]

### Anti-Patterns to Avoid

- **Storing plaintext API keys:** Always hash keys with bcrypt before storage. Return plaintext only once at creation. [CITED: docs.cloud.google.com/docs/authentication/api-keys-best-practices]

- **Building packages in monorepo:** Don't run tsc for packages. Use source-only exports with TypeScript's project references for type checking. Build time overhead kills monorepo benefits. [CITED: hsb.horse/en/blog/typescript-monorepo-best-practice-2026]

- **Hand-writing OpenAPI specs:** Specs drift from implementation. Use code-first generation from Zod schemas to maintain single source of truth. [CITED: stevekinney.com/courses/full-stack-typescript/generating-zod-openapi]

- **Fixed window rate limiting:** Causes burst issues at window boundaries. Use sliding window (already implemented via express-rate-limit + Redis). [CITED: redis.io/tutorials/howtos/ratelimiting, oneuptime.com/blog/redis-sliding-window-rate-limiting]

- **IP-based rate limiting for API keys:** Rate limit by API key ID, not IP. Multiple users may share IPs (corporate NAT, VPN). [ASSUMED]

- **Blocking request on usage logging:** Log usage async (fire-and-forget) to avoid adding latency to API responses. Use void prefix or .catch() on Prisma write. [VERIFIED: existing pattern in cacheService.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API key generation | Custom random + checksum | nanoid + crypto.createHash | nanoid is URL-safe, customizable alphabet, 2.5x faster than uuid. SHA-256 for checksum is industry standard. Edge cases: collision resistance, bias in randomness. [CITED: oneuptime.com/blog/api-key-management-best-practices] |
| Rate limiting | In-memory counter | express-rate-limit + RedisStore | Sliding window algorithm prevents burst issues. Redis ensures distributed enforcement across replicas. Edge cases: clock skew, race conditions. [CITED: redis.io/tutorials/howtos/ratelimiting] |
| OpenAPI spec generation | Hand-written YAML | @asteasolutions/zod-to-openapi | Code-first prevents spec drift. Zod schemas already used for validation. Edge cases: keeping examples in sync, versioning. [CITED: github.com/asteasolutions/zod-to-openapi] |
| API documentation UI | Custom React components | Scalar React component | Handles try-it-out, code examples, authentication flows. Edge cases: CORS, authentication UX, response formatting. [CITED: scalar.com] |
| TypeScript monorepo compilation | Custom build scripts | pnpm workspace + TypeScript project references | TypeScript's composite projects handle incremental builds, dependency order. Edge cases: circular dependencies, build caching. [CITED: hsb.horse/en/blog/typescript-monorepo-best-practice-2026] |

**Key insight:** API infrastructure has well-solved patterns. Hand-rolling key generation, rate limiting, or spec generation introduces security risks (weak randomness, race conditions) and maintenance burden (spec drift, build complexity). Use battle-tested libraries.

## Runtime State Inventory

> Omitted — this is a greenfield phase (new infrastructure), not a rename/refactor/migration.

## Common Pitfalls

### Pitfall 1: Phantom Dependencies in Monorepo

**What goes wrong:** App imports package without declaring it in package.json. Works locally due to hoisting but fails in CI/production.

**Why it happens:** pnpm hoists dependencies to node_modules/.pnpm by default. App can accidentally access peer's dependencies.

**How to avoid:** Enable strict mode in .npmrc: `node-linker=isolated` or use `pnpm install --frozen-lockfile` in CI. Run `pnpm-check` to detect phantom deps.

**Warning signs:** "Cannot find module" errors in CI but not locally. Dependencies appear in node_modules but not in package.json.

**Source:** [CITED: pnpm.io/workspaces, blog.glen-thomas.com]

### Pitfall 2: API Key Leaked in Git History

**What goes wrong:** Developer commits .env file with API key. Key is permanently exposed even after deletion.

**Why it happens:** Git stores full history. Deleting file in later commit doesn't remove from history.

**How to avoid:**
1. Add .env to .gitignore immediately
2. Use .env.example with placeholder values
3. Run git-secrets or GitHub secret scanning
4. Implement key rotation policy (30-90 days)

**Warning signs:** .env in git log. GitHub security alerts. Unusual API usage from unknown IPs.

**Source:** [CITED: help.openai.com/en/articles/5112595-best-practices-for-api-key-safety]

### Pitfall 3: Rate Limit Bypass via Multiple Keys

**What goes wrong:** User creates 3 API keys (max allowed) and rotates through them to bypass rate limits.

**Why it happens:** Rate limiting by keyId instead of userId.

**How to avoid:** Implement dual-layer rate limiting:
1. Per-key limit (10/min free, 100/min pro)
2. Per-user aggregate limit (30/min free, 300/min pro)

Store per-user limits in Redis with key `rl:user:{userId}:aggregate`.

**Warning signs:** Single user with exactly 3 keys all hitting max rate. Unusual traffic patterns (rotating requests).

**Source:** [ASSUMED — inferred from security best practices]

### Pitfall 4: OpenAPI Spec Drift

**What goes wrong:** Hand-written OpenAPI spec doesn't match actual API implementation. Documentation lies.

**Why it happens:** Developers update code but forget to update spec. No automation enforces sync.

**How to avoid:**
1. Use code-first generation (zod-to-openapi)
2. Run spec generation in CI pipeline
3. Optional: validate requests with express-openapi-validator
4. Version spec alongside API version (v1/openapi.json)

**Warning signs:** API returns fields not in spec. Try-it-out fails with valid input. Client SDK generation errors.

**Source:** [CITED: stevekinney.com/courses/full-stack-typescript/generating-zod-openapi]

### Pitfall 5: Unbounded API Usage Logging

**What goes wrong:** Async usage logging fills database with millions of rows. Queries slow down. Disk fills up.

**Why it happens:** Fire-and-forget logging without retention policy or aggregation.

**How to avoid:**
1. Implement daily aggregation: store count per key per day, not individual requests
2. Retention policy: delete raw logs after 7 days, aggregates after 90 days
3. Add cleanup job to cleanupService.ts
4. Use time-series database (InfluxDB, TimescaleDB) for high-volume logging

**Warning signs:** ApiUsage table growing > 1M rows/day. Slow queries on lastUsedAt lookup. Disk usage alerts.

**Source:** [ASSUMED — inferred from database performance patterns]

## Code Examples

Verified patterns from official sources:

### Example 1: pnpm Workspace Root Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// .npmrc
# Prevent phantom dependencies
auto-install-peers=true
strict-peer-dependencies=false

# Use hard links for speed
node-linker=isolated
```

**Source:** [CITED: pnpm.io/workspaces]

### Example 2: Package.json with Workspace Protocol

```json
// apps/web/package.json
{
  "name": "@newshub/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@newshub/types": "workspace:*",
    "react": "^19.2.0",
    "express": "^5.2.1"
  },
  "devDependencies": {
    "@types/react": "^19.2.7",
    "typescript": "~6.0.3",
    "vite": "^8.0.8"
  }
}
```

**Source:** [CITED: pnpm.io/workspaces]

### Example 3: API Key Middleware with Redis Cache

```typescript
// server/middleware/apiKeyAuth.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { CacheService } from '../services/cacheService';
import { validateApiKeyFormat } from '../services/apiKeyService';
import prisma from '../config/prisma';

interface ApiKeyRequest extends Request {
  apiKey?: {
    keyId: string;
    userId: string;
    tier: 'free' | 'pro';
    environment: 'live' | 'test';
  };
}

export async function apiKeyAuth(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) {
  const key = req.headers['x-api-key'] as string;

  if (!key) {
    return res.status(401).json({
      success: false,
      error: 'Missing X-API-Key header',
    });
  }

  // Validate format and checksum before DB lookup
  if (!validateApiKeyFormat(key)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key format',
    });
  }

  try {
    const cacheService = CacheService.getInstance();
    const cacheKey = `apikey:${key.substring(0, 15)}...`; // Don't cache full key

    // Try Redis cache first
    let keyData = await cacheService.get(cacheKey);

    if (!keyData) {
      // Lookup in database
      const apiKeys = await prisma.apiKey.findMany({
        where: { revokedAt: null },
        select: {
          id: true,
          keyHash: true,
          userId: true,
          tier: true,
          environment: true,
        },
      });

      // Find matching key by hash comparison
      for (const record of apiKeys) {
        const match = await bcrypt.compare(key, record.keyHash);
        if (match) {
          keyData = {
            keyId: record.id,
            userId: record.userId,
            tier: record.tier,
            environment: record.environment,
          };

          // Cache for 5 minutes
          await cacheService.set(cacheKey, keyData, 300);
          break;
        }
      }
    }

    if (!keyData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
    }

    // Attach to request
    req.apiKey = keyData as any;

    // Async update lastUsedAt (fire-and-forget)
    void prisma.apiKey.update({
      where: { id: keyData.keyId },
      data: { lastUsedAt: new Date() },
    }).catch(err => {
      console.error('Failed to update lastUsedAt:', err);
    });

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
```

**Source:** [VERIFIED: Pattern adapted from server/middleware/rateLimiter.ts + API key best practices]

### Example 4: IETF RateLimit Headers

```typescript
// express-rate-limit automatically adds these headers when standardHeaders: true

// Response headers on success (within limit):
RateLimit-Limit: 10          // Max requests in window
RateLimit-Remaining: 7       // Requests left
RateLimit-Reset: 45          // Seconds until window resets

// Response headers on 429 (rate limited):
RateLimit-Limit: 10
RateLimit-Remaining: 0
RateLimit-Reset: 12
Retry-After: 12              // Seconds to wait before retry
```

**Source:** [CITED: datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers, github.com/ietf-wg-httpapi/ratelimit-headers]

### Example 5: Scalar Configuration with Custom Theme

```typescript
// src/pages/DevelopersPage.tsx
<ApiReferenceReact
  configuration={{
    url: '/openapi.json',
    theme: 'dark',
    layout: 'modern',

    // Custom CSS to match NewsHub branding
    customCss: `
      .scalar-app {
        --scalar-color-accent: #00f0ff;
        --scalar-background-1: #0a0e14;
        --scalar-background-2: #131920;
        --scalar-font: 'Inter', sans-serif;
        --scalar-font-code: 'JetBrains Mono', monospace;
      }
    `,

    // Default try-it-out server
    servers: [
      { url: 'https://api.newshub.example.com', description: 'Production' },
      { url: 'http://localhost:3001', description: 'Development' },
    ],

    // Show code examples
    showClientExamples: true,
    defaultHttpClient: {
      targetKey: 'javascript',
      clientKey: 'fetch',
    },
  }}
/>
```

**Source:** [CITED: github.com/scalar/scalar/blob/main/documentation/configuration.md]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| npm/Yarn Workspaces | pnpm Workspaces | 2024-2025 | 60-80% faster installs, phantom dependency detection, hard links save disk space [CITED: jsdev.space/complete-monorepo-guide] |
| Swagger UI | Scalar | 2024-2026 | Better UX, modern design, React integration, dark mode first [CITED: apidog.com/blog/scalar-vs-swaggerhub] |
| Fixed window rate limiting | Sliding window | 2023-2024 | Prevents burst issues at window boundaries, smoother enforcement [CITED: redis.io/tutorials/howtos/ratelimiting] |
| X-RateLimit-* headers (legacy) | RateLimit-* headers (IETF draft) | 2025 | Standardized format, expires March 2026, widely adopted [CITED: datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers] |
| Hand-written OpenAPI YAML | Code-first generation (zod-to-openapi) | 2024-2025 | Single source of truth, prevents spec drift, type safety [CITED: stevekinney.com] |
| crypto.randomBytes for API keys | nanoid | 2023-2024 | URL-safe by default, shorter IDs, customizable alphabet [ASSUMED] |

**Deprecated/outdated:**
- **Lerna for monorepos:** Maintenance mode since 2022. pnpm/Turborepo are current standards. [CITED: nx.dev/blog/setup-a-monorepo-with-pnpm-workspaces]
- **X-RateLimit-Limit/Remaining/Reset headers:** Legacy format. IETF draft uses `RateLimit-*` without X- prefix. [CITED: datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers]
- **swagger-jsdoc for spec generation:** Manual JSDoc comments. Code-first with Zod is current approach. [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | nanoid is cryptographically secure for API keys | Standard Stack | Keys may be predictable if nanoid uses weak randomness |
| A2 | Rate limiting by keyId prevents bypass | Common Pitfalls | Users could still bypass by creating multiple accounts |
| A3 | Source-only TypeScript exports work without build step | Architecture Patterns | May need tsc for type checking or compilation in some scenarios |
| A4 | Scalar React component works with SSR | Standard Stack | May require client-side only rendering if SSR breaks |
| A5 | 3 keys per user is sufficient limit | User Constraints | Power users may need more keys for complex deployments |
| A6 | Free tier 10 req/min is enough for testing | User Constraints | Developers may need higher limits for integration testing |

## Open Questions

1. **API key rotation policy**
   - What we know: Industry recommends 30-90 day rotation for security
   - What's unclear: Should rotation be forced (expire old keys) or suggested (warning emails)?
   - Recommendation: Start with suggested rotation (email at 60 days), add forced rotation in Phase 36 with payment tiers

2. **API versioning strategy beyond URL prefix**
   - What we know: Using /api/v1/public/* for versioning
   - What's unclear: How to deprecate v1 when v2 launches? Sunset period? Dual support?
   - Recommendation: Document versioning policy in OpenAPI spec, plan 6-month overlap for v1→v2 migration

3. **API usage limits for Pro tier**
   - What we know: Pro tier gets 100 req/min
   - What's unclear: Is there a daily/monthly cap? Unlimited calls could cost spike.
   - Recommendation: Add daily cap (e.g., 100k req/day for Pro) to prevent abuse, document in pricing

4. **Client SDK generation vs manual client**
   - What we know: Could use @openapitools/openapi-generator-cli for packages/api-client
   - What's unclear: Generated code quality? Maintenance burden? Better to hand-write?
   - Recommendation: Defer to Phase 39 (mobile apps). Start with generated client, hand-write if quality issues.

5. **API key hashing algorithm**
   - What we know: Using bcrypt for hashing (already used for passwords)
   - What's unclear: Is bcrypt overkill for API keys? Could use faster hash (SHA-256)?
   - Recommendation: Use bcrypt for consistency with existing codebase. Cost factor 10 is fast enough for API auth.

## Environment Availability

> Phase has external dependencies that require verification.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pnpm | Monorepo workspace management | ✓ | 10.33.2 | — |
| Node.js | Runtime for build/dev | ✓ | Assumed 22+ | — |
| Redis | Rate limit store + API key cache | ✓ | Existing CacheService | In-memory (graceful degradation) |
| PostgreSQL | ApiKey/ApiUsage storage | ✓ | Existing Prisma setup | — |

**Missing dependencies with no fallback:**
- None — all required tools are verified available or already in use

**Missing dependencies with fallback:**
- Redis: If unavailable, rate limiting is skipped (existing pattern), API key lookup goes straight to database

## Validation Architecture

> Skipped — workflow.nyquist_validation is explicitly set to false in .planning/config.json

## Security Domain

> Required — security_enforcement is enabled by default (not explicitly disabled in config)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | API key authentication with bcrypt hashing, checksum validation |
| V3 Session Management | no | Stateless API, no sessions (JWT for web app only) |
| V4 Access Control | yes | Rate limit tiers (free/pro), per-user key limits (max 3) |
| V5 Input Validation | yes | Zod schemas for all API requests, OpenAPI validation (optional) |
| V6 Cryptography | yes | bcrypt for key hashing (factor 10), SHA-256 for checksum, nanoid for random generation |

### Known Threat Patterns for Express + Public API

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key leakage in logs | Information Disclosure | Never log full keys. Use `key.substring(0,15)...` in logs. Redact in Sentry. |
| Rate limit bypass via multiple accounts | Denial of Service | Dual-layer rate limiting (per-key + per-user aggregate). Email verification required. |
| Brute force key guessing | Tampering | 32-char random keys (nanoid 24 + checksum 4). 2^192 keyspace. Checksum prevents invalid attempts. |
| Man-in-the-middle key interception | Information Disclosure | HTTPS only in production. HSTS headers. No fallback to HTTP. |
| Replay attacks | Tampering | Not applicable (stateless API, idempotent GET requests). POST endpoints use standard CSRF if needed. |
| SQL injection via query params | Tampering | Parameterized queries (Prisma ORM). Zod validation before DB access. |
| CSRF on key creation/revocation | Tampering | Web app endpoints use existing CSRF middleware. Public API is read-only (no mutations). |

## Sources

### Primary (HIGH confidence)

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces) - Official workspace configuration
- [Complete Monorepo Guide: pnpm + Workspace + Changesets (2025)](https://jsdev.space/complete-monorepo-guide/) - 2026-ready patterns
- [Mastering pnpm Workspaces: Complete Guide to Monorepo Management](https://blog.glen-thomas.com/software%20engineering/2025/10/02/mastering-pnpm-workspaces-complete-guide-to-monorepo-management.html) - Best practices
- [TypeScript Monorepo Best Practice 2026](https://hsb.horse/en/blog/typescript-monorepo-best-practice-2026/) - Source-only exports pattern
- [API Key Management Best Practices (OneUpTime)](https://oneuptime.com/blog/post/2026-02-20-api-key-management-best-practices/view) - Security patterns
- [Best Practices for Building API Keys](https://www.freecodecamp.org/news/best-practices-for-building-api-keys) - Prefix and checksum design
- [Scalar API Reference for React](https://scalar.com/products/api-references/integrations/react) - React integration docs
- [Scalar GitHub Repository](https://github.com/scalar/scalar) - Official source and examples
- [asteasolutions/zod-to-openapi GitHub](https://github.com/asteasolutions/zod-to-openapi) - Code-first OpenAPI generation
- [Generating OpenAPI Contracts from Zod Schemas](https://stevekinney.com/courses/full-stack-typescript/zod-to-open-api) - Tutorial
- [IETF RateLimit Headers Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/) - Standard headers spec
- [IETF RateLimit Headers GitHub](https://github.com/ietf-wg-httpapi/ratelimit-headers) - Spec repository
- [Build 5 Rate Limiters with Redis](https://redis.io/tutorials/howtos/ratelimiting/) - Sliding window algorithm
- [How to Implement Sliding Window Rate Limiting with Redis](https://oneuptime.com/blog/post/2026-01-25-redis-sliding-window-rate-limiting/view) - 2026 implementation guide

### Secondary (MEDIUM confidence)

- [Nx Blog: Setup Monorepo with pnpm](https://nx.dev/blog/setup-a-monorepo-with-pnpm-workspaces-and-speed-it-up-with-nx) - Tooling comparison
- [Scalar vs SwaggerHub vs Apidog (2026)](https://apidog.com/blog/scalar-vs-swaggerhub-vs-apidog-api-docs-2/) - Feature comparison
- [Building Type-Safe REST API with Zod (2026)](https://dev.to/young_gao/building-a-type-safe-rest-api-with-zod-express-and-typescript-from-validation-to-openapi-docs-3agj) - Full example
- [Rate Limiting in .NET with Redis](https://redis.io/tutorials/rate-limiting-in-dotnet-with-redis/) - Cross-platform patterns
- [Node.js Rate Limiting Complete Guide](https://reintech.io/blog/nodejs-rate-limiting-protecting-apis-from-abuse) - Express integration

### Tertiary (LOW confidence)

- npm registry queries for version verification (marked [VERIFIED: npm registry])
- Existing codebase patterns (marked [VERIFIED: existing pattern in ...])
- General security principles not specific to 2026 (marked [ASSUMED])

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified in npm registry, versions confirmed current for 2026
- Architecture: HIGH - Patterns verified in official pnpm docs, TypeScript docs, Redis tutorials
- Pitfalls: MEDIUM - Some inferred from general best practices (phantom deps, key leakage) vs verified issues
- Security: HIGH - IETF spec for headers, official docs for bcrypt/SHA-256, multiple sources on API key security

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days - stable ecosystem, no fast-moving changes expected)
