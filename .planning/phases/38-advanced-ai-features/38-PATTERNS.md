# Phase 38: Advanced AI Features - Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 28 (16 new, 12 modified)
**Analogs found:** 28 / 28

---

## File Classification

### NEW files

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `apps/web/server/services/credibilityService.ts` | service (pure-fn) | transform | `apps/web/src/components/MediaBiasBar.tsx` (bias thresholds) | role-match (deterministic util) |
| `apps/web/server/services/factCheckReadService.ts` | service (DB read) | DB read (raw FTS) | `apps/web/server/services/newsReadService.ts` `buildWhere`/`getArticles` | exact (Postgres read service) |
| `apps/web/server/prompts/credibilityPrompt.ts` | prompt template | pure render | `apps/web/server/services/aiService.ts:292-329` `buildPrompt` | role-match (prompt builder) |
| `apps/web/server/prompts/framingPrompt.ts` | prompt template | pure render | `apps/web/server/services/aiService.ts:292-329` `buildPrompt` | role-match |
| `apps/web/server/prompts/factCheckPrompt.ts` | prompt template | pure render | `apps/web/server/routes/ai.ts:228-260` propaganda system prompt | role-match |
| `apps/web/prisma/migrations/<ts>_add_news_article_fts/migration.sql` | Prisma migration | DDL | `apps/web/prisma/migrations/20260417073027_init/migration.sql` | role-match (raw SQL migration) |
| `apps/web/prisma/migrations/<ts>_add_factcheck/migration.sql` | Prisma migration | DDL | `apps/web/prisma/migrations/20260417073027_init/migration.sql` | role-match |
| `apps/web/src/components/credibility/CredibilityPill.tsx` | React component | pure render | `apps/web/src/components/feed-manager/SourceRow.tsx:56-69` reliability badge | exact (small status pill) |
| `apps/web/src/components/credibility/CredibilityDrawer.tsx` | React component | pure render | `apps/web/src/components/MediaBiasBar.tsx` | role-match (panel + methodology) |
| `apps/web/src/components/credibility/BiasBadge.tsx` | React component | pure render | `apps/web/src/components/feed-manager/SourceRow.tsx:73-87` left/center/right span | exact |
| `apps/web/src/components/factcheck/FactCheckButton.tsx` | React component | event-driven (selection) | `apps/web/src/components/NewsCard.tsx:54-82` `handleAnalyze` floating button | role-match |
| `apps/web/src/components/factcheck/FactCheckDrawer.tsx` | React component | request-response (TanStack mutation render) | `apps/web/src/components/MediaBiasBar.tsx` + `NewsCard.tsx` analysis drawer | role-match (verdict panel) |
| `apps/web/src/components/factcheck/VerdictPill.tsx` | React component | pure render | `apps/web/src/components/feed-manager/SourceRow.tsx:56-69` reliability badge | exact |
| `apps/web/src/components/factcheck/CitationCard.tsx` | React component | pure render | `apps/web/src/components/NewsCard.tsx` (perspective-badge card) | role-match |
| `apps/web/src/hooks/useCredibility.ts` | hook | request-response (TanStack Query) | `apps/web/src/hooks/useComments.ts:72-119` `useComments` | role-match |
| `apps/web/src/hooks/useFactCheck.ts` | hook | request-response (TanStack Mutation) | `apps/web/src/hooks/useComments.ts:125-173` `usePostComment` | exact (mutation hook) |
| `apps/web/public/locales/{de,en,fr}/credibility.json` | i18n locale | pure render | `apps/web/public/locales/en/common.json` | exact |
| `apps/web/public/locales/{de,en,fr}/factcheck.json` | i18n locale | pure render | `apps/web/public/locales/en/common.json` | exact |

### MODIFIED files

| File | Role | Data Flow | Closest Analog (in-file pattern to extend) | Match Quality |
|------|------|-----------|--------------------------------------------|---------------|
| `apps/web/server/services/aiService.ts` | service | LLM call + cache | self: `analyzeSentiment` (lines 420-451) + `classifyTopics` (lines 486-549) + `callWithFallback` (245-266) | exact (extend the singleton) |
| `apps/web/server/services/cacheService.ts` | service | n/a (key registry) | self: `CacheKeys` block (lines 387-419) | exact |
| `apps/web/server/routes/ai.ts` | route | request-response | self: `router.post('/propaganda', ...)` (lines 216-305) | exact |
| `apps/web/server/routes/analysis.ts` | route | request-response | self: `analysisRoutes.get('/framing', ...)` (lines 115-166) | exact (mutate existing handler) |
| `apps/web/server/openapi/schemas.ts` | Zod schema registry | n/a | self: `NewsArticleSchema`/`PerspectiveRegionSchema` (lines 21-91) | exact |
| `apps/web/server/openapi/generator.ts` | OpenAPI generator | n/a | self: `registry.registerPath(...)` (lines 46-106) | exact |
| `apps/web/prisma/schema.prisma` | Prisma model registry | DDL | self: `model Comment` (lines 375-400) + `model Bookmark` (169-178) | exact |
| `apps/web/src/components/FramingComparison.tsx` | React component | request-response (rewrite per-region render) | self: lines 1-94 (current `useQuery` + region grid shell stays; per-region body swaps) | exact |
| `apps/web/src/components/NewsCard.tsx` | React component | pure render | self: lines 1-13 imports + meta-info area | exact (insert pill into existing card) |
| `apps/web/src/components/feed-manager/SourceRow.tsx` | React component | pure render | self: lines 56-87 (existing reliability badge + bias text — replace with `<CredibilityPill/>` + `<BiasBadge/>`) | exact |
| `apps/web/src/pages/Article.tsx` | React page | event-driven (selection) | self: `<article data-testid="article-container">` at line 173 + meta-actions at lines 220-278 | exact |
| `apps/web/src/i18n/i18n.ts` | i18n config | n/a | self: `ns: ['common', 'share', 'teams', 'pricing']` at line 16 | exact |

---

## Pattern Assignments

### `apps/web/server/services/credibilityService.ts` (NEW — service, pure-fn transform)

**Analog:** thresholds in `apps/web/src/components/MediaBiasBar.tsx:24-31` (single source of truth for left/center/right) + `apps/web/src/components/feed-manager/SourceRow.tsx:56-87` (R: reliability badge + Left/Center/Right span — both are the two halves the new score collapses).

**Bias bucket pattern to copy** (`MediaBiasBar.tsx:24-31`):

```typescript
const bias = article.source.bias.political;
// Classify bias: left (-1 to -0.2), center (-0.2 to 0.2), right (0.2 to 1)
if (bias < -0.2) {
  leftCount++;
} else if (bias > 0.2) {
  rightCount++;
} else {
  centerCount++;
}
```

**D-04 LOCKED:** the new `deriveBiasBucket` MUST use these exact thresholds verbatim. This is a single-source-of-truth constraint — do not invent new constants.

**Service signature** (per RESEARCH.md §"Concrete TypeScript Signatures" lines 793-812):

```typescript
import type { NewsSource } from '../../src/types';

export function deriveCredibilityScore(source: NewsSource): number {
  const reliabilityComponent = source.bias.reliability * 7;        // 0-70
  const biasPenalty = Math.abs(source.bias.political) * 30;        // 0-30
  return Math.max(0, Math.min(100, Math.round(reliabilityComponent - biasPenalty)));
}

export function deriveBiasBucket(politicalBias: number): 'left' | 'center' | 'right' {
  if (politicalBias < -0.2) return 'left';
  if (politicalBias > 0.2) return 'right';
  return 'center';
}

export function bucketConfidence(rawConfidence: number): 'low' | 'medium' | 'high' {
  if (rawConfidence < 60) return 'low';
  if (rawConfidence < 80) return 'medium';
  return 'high';
}
```

**No LLM, no cache, no I/O in this file** (pure deterministic — D-01).

---

### `apps/web/server/services/factCheckReadService.ts` (NEW — service, DB read via FTS)

**Analog:** `apps/web/server/services/newsReadService.ts:140-180` `getArticles` (Prisma read service singleton-style; uses `prisma` from `db/prisma.ts`; returns plain array; logs failures; falls back to empty result on error).

**Imports + DB pattern to copy** (`newsReadService.ts` style):

```typescript
import { prisma } from '../db/prisma';
import logger from '../utils/logger';
```

**FTS query pattern** — RESEARCH.md §"Postgres `websearch_to_tsquery` via Prisma" (lines 463-480) is the verbatim template. Critical detail: `$queryRaw` template literal binds `${claim}` as a parameterized value (SQL-injection safe per Prisma docs); do NOT switch to `$queryRawUnsafe`:

```typescript
export async function searchClaimEvidence(claim: string, limit = 10) {
  return prisma.$queryRaw<{ id: string; title: string; rank: number }[]>`
    SELECT id, title,
           ts_rank(search_tsv, websearch_to_tsquery('simple', ${claim})) AS rank
    FROM "NewsArticle"
    WHERE search_tsv @@ websearch_to_tsquery('simple', ${claim})
      AND "publishedAt" > NOW() - INTERVAL '90 days'
    ORDER BY rank DESC
    LIMIT ${limit}
  `;
}
```

**Error handling** — match `newsReadService.getArticles` lines 175-178: catch + `logger.error` + return empty array (never throw):

```typescript
try { /* ... */ }
catch (err) {
  logger.error('factCheckReadService.searchClaimEvidence failed:', err);
  return [];
}
```

**Critical:** the column name `search_tsv` matches the migration SQL (RESEARCH.md Pitfall 2, lines 326-330). Use `'simple'` Postgres FTS config — NOT `'english'`/`'german'`/`'french'` (D-12 multi-language merge requires uniform stemming behavior).

---

### `apps/web/server/services/aiService.ts` (MODIFY — add 3 methods)

**Analog (in-file):** existing `analyzeSentiment` (lines 420-451) and `classifyTopics` (lines 486-549). Both are the canonical "LLM + cache + parse + fallback" combo to copy.

**Cache + LLM pattern to extend** (`classifyTopics` lines 487-544):

```typescript
async classifyTopics(title: string, content: string): Promise<string[]> {
  const cacheKey = CacheKeys.aiTopics(hashString(title + content));

  const cached = await this.cacheService.get<string[]>(cacheKey);
  if (cached) return cached;

  if (!this.isAvailable()) {
    return this.extractTopicsKeyword(title, content);
  }

  try {
    const prompt = `...`;
    const responseText = await this.callWithFallback(prompt);
    if (!responseText) return this.extractTopicsKeyword(title, content);

    const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return this.extractTopicsKeyword(title, content);

    const topics: string[] = JSON.parse(jsonMatch[0]);
    // ... validate ...
    await this.cacheService.set(cacheKey, result, AI_CONFIG.cache.topicTTLSeconds);
    return result;
  } catch {
    return this.extractTopicsKeyword(title, content);
  }
}
```

**Per RESEARCH.md Pitfall 1 (lines 302-313):** new methods MUST use the same `match(/\{[\s\S]*\}/)` regex-extract pattern (lines 334, 438, 518 already in file). Free OpenRouter / Gemini Gemma models do NOT honor `response_format: json_object`.

**Defensive parse + Zod validation** — RESEARCH.md §Pattern 2 (lines 232-253). Add a helper used by all three new methods:

```typescript
function safeParseJson<T>(raw: string, schema: z.ZodSchema<T>): T | null {
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
```

**Cache integration** — use `cacheService.getOrSet` (cacheService.ts:259-272), NOT `get` + `set` (the `getOrSet` path adds jitter via `setWithJitter`):

```typescript
async getSourceCredibility(sourceId: string, locale: 'de'|'en'|'fr'): Promise<CredibilityResult> {
  return this.cacheService.getOrSet(
    CacheKeys.credibility(sourceId, locale),
    () => this.computeCredibility(sourceId, locale),
    CACHE_TTL.DAY  // 24h per D-03
  );
}
```

**Reuse `callWithFallback`** (lines 245-266) — never re-instantiate provider clients. RESEARCH.md anti-pattern (lines 273-279) explicitly forbids it.

**Three new methods to add** (signatures from RESEARCH.md lines 814-824):
- `getSourceCredibility(sourceId, locale): Promise<CredibilityResult>` — wraps `credibilityService.deriveCredibilityScore` + LLM methodology, cached at `CacheKeys.credibility(sourceId, locale)`.
- `generateFramingAnalysis(topic, locale): Promise<FramingAnalysis>` — replaces existing `generateComparison` (line 369). Cached at `CacheKeys.framing(topicHash, locale)`.
- `factCheckClaim({ claim, articleId?, userId, locale }): Promise<FactCheckResult>` — calls `factCheckReadService.searchClaimEvidence`, then LLM. Cached at `CacheKeys.factCheck(claimHash)` (locale-independent — D-18).

**Imports already present** (line 8): `import { CacheService, CacheKeys } from './cacheService';` — reuse, don't re-import.

---

### `apps/web/server/services/cacheService.ts` (MODIFY — extend `CacheKeys`)

**Analog (in-file):** existing `CacheKeys` block (lines 387-419). Add three new entries at the end of the AI section (after line 418):

```typescript
// AI cache (D-07, +Phase 38 D-18)
aiSummary: (clusterKey: string) => `ai:summary:${clusterKey}`,
aiTopics: (contentHash: string) => `ai:topics:${contentHash}`,
credibility: (sourceId: string, locale: string) => `ai:credibility:${sourceId}:${locale}`,
framing:     (topicHash: string, locale: string) => `ai:framing:${topicHash}:${locale}`,
factCheck:   (claimHash: string) => `ai:factcheck:${claimHash}`,
```

**Critical:** `factCheck` key is locale-independent (D-18 — verdict + citation IDs do not vary by language). The methodology text variation is handled by storing `locale` on the `FactCheck` DB row + on-render translation via `translationService` (RESEARCH.md Q-05 line 1117).

**Note:** there is already a `framing` key on line 396 (`framing: (topic: string) => \`analysis:framing:${topic}\``). The new entry uses prefix `ai:framing:` (per D-18 lines 99-101). Two options for the planner: (a) replace the existing entry — only `analysisRoutes.get('/framing')` uses it, and that route is being mutated this phase anyway, OR (b) rename the existing one. Recommend (a) — single namespace, less drift.

---

### `apps/web/server/routes/ai.ts` (MODIFY — add 2 new endpoints)

**Analog (in-file):** existing `router.post('/propaganda', ...)` (lines 216-305) is the closest match: same auth/tier inheritance, same Zod-less validation pattern.

**Anti-pattern warning (RESEARCH.md lines 273-279 + State of the Art line 525):** the legacy provider client instantiation at the top of `ai.ts` (lines 1-29) is technical debt; new routes MUST call `AIService.getInstance()` and the singleton's `factCheckClaim`/`getSourceCredibility` methods. Do NOT extend the route-local `callAIWithFallback` helper (lines 32-100).

**Reference pattern: comments.ts route** (`apps/web/server/routes/comments.ts:44-90`) — Zod schema validation + `safeParse` + `formatZodError` + `req.user!.userId`:

```typescript
import { z } from 'zod';
import { authMiddleware } from '../services/authService';
import { FactCheckRequestSchema } from '../openapi/schemas';
import { AIService } from '../services/aiService';

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

router.post('/fact-check', async (req: AuthRequest, res: Response) => {
  try {
    const result = FactCheckRequestSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error.issues.map(e => e.message).join(', '),
      });
      return;
    }

    const userId = req.user!.userId;
    const { claim, articleId, language } = result.data;
    const locale = language ?? 'en';

    const aiService = AIService.getInstance();
    const verdict = await aiService.factCheckClaim({ claim, articleId, userId, locale });

    res.json({ success: true, data: verdict });
  } catch (err) {
    logger.error('Fact-check error:', err);
    res.status(500).json({ success: false, error: 'Failed to fact-check claim' });
  }
});
```

**No `authMiddleware` per-route** (per `index.ts:167` `app.use('/api/ai', authMiddleware, aiTierLimiter, aiRoutes)` — already mounted upstream). Adding it again is the anti-pattern in RESEARCH.md line 277.

**Tier gating:** automatic via `aiTierLimiter` (D-09 LOCKED). The 11th request from a FREE user returns 429 with `upgradeUrl: '/pricing'` — no new code needed.

**Second endpoint:**

```typescript
router.get('/source-credibility/:sourceId', async (req: AuthRequest, res: Response) => {
  const { sourceId } = req.params;
  const locale = (req.query.locale as 'de' | 'en' | 'fr') ?? 'en';
  // ... call AIService.getInstance().getSourceCredibility(sourceId, locale)
});
```

---

### `apps/web/server/routes/analysis.ts` (MODIFY — mutate `/framing` handler)

**Analog (in-file):** existing `analysisRoutes.get('/framing', ...)` (lines 115-166) — same handler signature stays; the body swaps from heuristic `byRegion`/`avgSentiment` (lines 124-135) + old `aiService.generateComparison` (line 138) to new `aiService.generateFramingAnalysis(topic, locale)`.

**Pattern to copy** (existing handler shell, lines 115-166):

```typescript
analysisRoutes.get('/framing', async (req: Request, res: Response) => {
  const topic = req.query.topic as string | undefined;
  const locale = (req.query.locale as 'de' | 'en' | 'fr') ?? 'en';

  if (!topic) {
    res.status(400).json({ success: false, error: 'Topic is required' });
    return;
  }

  const data = await aiService.generateFramingAnalysis(topic, locale);

  res.set('Cache-Control', 'public, max-age=600');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: {
      topic,
      locale,
      perspectives: data.perspectives,
      aiGenerated: true,
    },
  });
});
```

**Critical:** the existing route already inherits `aiTierLimiter` via `index.ts:168`. New behavior is gated for FREE users automatically.

---

### `apps/web/server/openapi/schemas.ts` (MODIFY — add 4 enums + 3 endpoint schema groups)

**Analog (in-file):** existing pattern at lines 21-33 for enums + lines 39-91 for object schemas + lines 104-126 for response wrappers.

**Pattern to copy** (lines 21-33):

```typescript
export const PerspectiveRegionSchema = z.enum([
  'usa', 'europa', 'deutschland', 'nahost', 'tuerkei', 'russland',
  'china', 'asien', 'afrika', 'lateinamerika', 'ozeanien', 'kanada', 'alternative'
]).openapi({ description: 'Geographic region perspective' });

export const SentimentSchema = z.enum(['positive', 'negative', 'neutral'])
  .openapi({ description: 'Article sentiment classification' });
```

**Schemas to add** — RESEARCH.md §"Concrete Zod Schemas" (lines 866-948) is the verbatim template. Append after the existing `NewsQuerySchema` (line 167):

- `VerdictSchema`, `ConfidenceBucketSchema`, `BiasBucketSchema`, `LocaleSchema` (4 enums)
- `CredibilitySubDimensionsSchema`, `CredibilityResponseSchema`
- `FramingPerspectiveSchema`, `FramingResponseSchema`
- `FactCheckRequestSchema`, `FactCheckCitationSchema`, `FactCheckResponseSchema`

**Response wrapper convention** (line 104-108) — every response schema wraps `{ success: z.literal(true), data: <inner> }`:

```typescript
export const NewsListResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  data: z.array(NewsArticleSchema),
  meta: PaginationMetaSchema,
}).openapi('NewsListResponse');
```

---

### `apps/web/server/openapi/generator.ts` (MODIFY — register 3 new endpoint paths)

**Analog (in-file):** existing `registry.registerPath(...)` block at lines 46-106 for `GET /api/v1/public/news`. RESEARCH.md §"Code-first OpenAPI registration" (lines 487-510) gives the verbatim template adjusted for `BearerAuth` (JWT) instead of `ApiKeyAuth`.

**Note:** the existing routes use `security: [{ ApiKeyAuth: [] }]` because public API uses X-API-Key. Phase 38 routes are JWT-protected (mounted under `/api/ai/*` and `/api/analysis/*` — both behind `authMiddleware`). The OpenAPI security scheme for these is `BearerAuth`, which doesn't currently exist in `generator.ts:34-39` — the planner should register a second component:

```typescript
registry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});
```

**Per-route registration** — copy the structure from lines 46-106 verbatim, swap the security block:

```typescript
registry.registerPath({
  method: 'post',
  path: '/api/ai/fact-check',
  summary: 'Fact-check a claim against the NewsHub corpus',
  tags: ['AI'],
  security: [{ BearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: FactCheckRequestSchema } } },
  },
  responses: {
    200: { description: 'Verdict + citations', content: { 'application/json': { schema: FactCheckResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: RateLimitErrorResponseSchema } } },
  },
});
```

Three paths total: `POST /api/ai/fact-check`, `GET /api/ai/source-credibility/{sourceId}`, `GET /api/analysis/framing`.

---

### `apps/web/prisma/schema.prisma` (MODIFY — add `FactCheck` model + `searchTsv` column)

**Analog (in-file):** `model Comment` at lines 375-400 is the closest existing pattern — user-owned table, multiple indexes, `onDelete: Cascade` on `User`.

**Pattern to copy** (lines 375-400):

```prisma
model Comment {
  id        String @id @default(cuid())
  text      String @db.VarChar(5000)
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  articleId String

  parentComment Comment? @relation("Replies", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  parentId      String?
  replies       Comment[] @relation("Replies")

  isDeleted   Boolean  @default(false)
  // ...
  createdAt   DateTime @default(now())

  @@index([articleId])
  @@index([userId])
  @@index([parentId])
  @@index([isFlagged])
  @@index([createdAt])
}
```

**`onDelete: Cascade` decision** — RESEARCH.md Q-04 (line 1116) and Concrete TypeScript Signatures note (line 863) lock this in: every other user-owned table in the schema (`Bookmark` line 171, `ReadingHistory`, `Comment` 378, `TeamMember` 425, `UserBadge`, `UserPersona`, `EmailSubscription`, `EmailDigest`, `ApiKey`) uses `onDelete: Cascade` on the `userId` FK. Match this pattern.

**FactCheck model** (RESEARCH.md lines 838-861 — verbatim):

```prisma
model FactCheck {
  id                  String   @id @default(cuid())
  userId              String
  articleId           String?
  claimText           String   @db.Text
  claimHash           String   // sha256(claimText)
  claimLanguage       String
  verdict             String   // 'true'|'mostly-true'|'mixed'|'unverified'|'false'
  confidence          Int      // 0-100
  methodologyMd       String   @db.Text
  citationArticleIds  String[]
  modelUsed           String
  locale              String   // 'de'|'en'|'fr' (Q-05 recommendation)
  createdAt           DateTime @default(now())

  user                User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  article             NewsArticle? @relation(fields: [articleId], references: [id], onDelete: SetNull)

  @@index([claimHash])
  @@index([userId])
  @@index([articleId])
  @@index([createdAt])
}
```

**`searchTsv` extension on `NewsArticle`** — RESEARCH.md Pitfall 2 (lines 315-352). Append two lines to the existing `model NewsArticle` block (around line 14-46):

```prisma
searchTsv  Unsupported("tsvector")?  // managed by raw migration; do not edit via Prisma
@@index([searchTsv], type: Gin)
```

**Critical:** Prisma does NOT auto-generate the migration for `Unsupported("tsvector")` — the planner MUST hand-write the migration SQL (next file).

---

### `apps/web/prisma/migrations/<ts>_add_news_article_fts/migration.sql` (NEW — raw SQL migration)

**Analog:** `apps/web/prisma/migrations/20260417073027_init/migration.sql` (the `init` migration is the only existing one) — confirms raw SQL DDL is how this codebase ships schema changes.

**SQL to write** (RESEARCH.md Pitfall 2, lines 326-334 — verbatim):

```sql
ALTER TABLE "NewsArticle"
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;

CREATE INDEX news_article_search_tsv_idx
  ON "NewsArticle" USING GIN (search_tsv);
```

**Critical:** the column name `search_tsv` (snake_case in SQL) maps to `searchTsv` (camelCase in Prisma) via Prisma's default mapping. RESEARCH.md item 5 (line 1098) and Pitfall 2 confirm this is the supported pattern. The `'simple'` config is locked (D-12 cross-language merging requires uniform tokenization).

---

### `apps/web/prisma/migrations/<ts>_add_factcheck/migration.sql` (NEW)

**Analog:** the `init` migration. Prisma will auto-generate the SQL for the `FactCheck` model when the planner runs `npx prisma migrate dev` after editing `schema.prisma`. **The planner does NOT hand-write this file** — only the FTS migration above is hand-written; this one is generated.

---

### `apps/web/server/prompts/credibilityPrompt.ts` (NEW — prompt template)

**Analog:** `aiService.ts:292-329` `buildPrompt(cluster)` (existing in-file prompt builder) and `routes/ai.ts:228-260` propaganda system prompt. Both are pure-template string functions that embed structured input + return a single string passed to `callWithFallback`.

**Pattern to copy** (`aiService.ts:310-328`):

```typescript
return `Analyze the following news articles about "${cluster.topic}" from different regional perspectives. Provide a balanced analysis in JSON format.

${articlesText}

Respond with a JSON object containing:
{
  "summary": "...",
  ...
}

Be objective and highlight differences in framing, not just facts. Response must be valid JSON only.`;
```

**Phase 38 specifics** (RESEARCH.md §"Concrete Prompt Templates" lines 654-789, also CONTEXT.md "Specifics" lines 200-208):
- The credibility methodology MUST disclose LLM-attribution status: "These dimensions are AI-attributed estimates based on the source's reputation and bias profile, not measured signals from this platform."
- The fact-check prompt MUST instruct the LLM to return `'unverified'` when fewer than ~3 distinct sources are retrieved.
- All three prompts MUST request strict JSON output and note "Response must be valid JSON only" — but defensive parsing in the service still handles prose-wrapped output (Pitfall 1).

**Function signature:**

```typescript
export function buildCredibilityPrompt(args: {
  sourceName: string;
  reliability: number;
  politicalBias: number;
  locale: 'de' | 'en' | 'fr';
}): string;
```

---

### `apps/web/server/prompts/framingPrompt.ts` and `apps/web/server/prompts/factCheckPrompt.ts` (NEW)

Same template pattern as `credibilityPrompt.ts`. Templates are in RESEARCH.md lines 693-789. Each is a pure function returning a string; no I/O, no service singleton.

---

### `apps/web/src/components/credibility/CredibilityPill.tsx` (NEW — small status pill)

**Analog:** `apps/web/src/components/feed-manager/SourceRow.tsx:56-69` reliability badge. This is the closest existing pill-with-color-coding pattern.

**Pattern to copy** (`SourceRow.tsx:56-69`):

```tsx
<span
  className={cn(
    'text-[9px] font-mono px-1.5 py-0.5 rounded',
    source.bias.reliability >= 8
      ? 'bg-[#00ff88]/10 text-[#00ff88]'
      : source.bias.reliability >= 6
        ? 'bg-[#ffee00]/10 text-[#ffee00]'
        : 'bg-[#ff0044]/10 text-[#ff0044]'
  )}
>
  R:{source.bias.reliability}
</span>
```

**For Credibility 0-100 score:** use 3 thresholds (e.g., `>=70` cyan, `>=40` yellow, `<40` red — matches the design-system colors at `CLAUDE.md` "UI Design System").

**Confidence pill:** D-05 LOCKED — `low | medium | high` color-coded `gray | #ffee00 | #00f0ff`.

**i18n:** import `useTranslation` from `react-i18next`, scope to `'credibility'` namespace:

```tsx
const { t } = useTranslation('credibility');
// t('confidence.low') | t('confidence.medium') | t('confidence.high')
```

---

### `apps/web/src/components/credibility/CredibilityDrawer.tsx` (NEW — methodology panel)

**Analog:** `apps/web/src/components/MediaBiasBar.tsx` whole-component structure (panel + inline-tooltip + balance indicator section).

**Pattern to copy** (`MediaBiasBar.tsx:46-61`):

```tsx
<div className={cn('glass-panel rounded-xl p-4', className)}>
  <div className="flex items-center justify-between mb-3">
    <h3 className="signal-label flex items-center gap-2">
      <span>Media Bias Distribution</span>
      <div className="group relative">
        <Info className="h-3 w-3 text-gray-500 cursor-help" />
        <div className="absolute left-0 top-6 hidden group-hover:block z-50 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300 shadow-xl">
          [methodology text — i18n key 'credibility:methodology.body']
        </div>
      </div>
    </h3>
  </div>
  ...
</div>
```

**Per CONTEXT.md "Specifics" line 203:** the methodology paragraph must say something like "These dimensions are AI-attributed estimates based on the source's reputation and bias profile, not measured signals from this platform." This text comes from the LLM (per-locale) at render time — render the `methodologyMd` field of the `CredibilityResult` from the hook.

---

### `apps/web/src/components/credibility/BiasBadge.tsx` (NEW — left/center/right badge)

**Analog:** `SourceRow.tsx:73-87`. Verbatim copy of the bias bucket logic — D-04 LOCKED.

```tsx
<span
  className={cn(
    source.bias.political < -0.2
      ? 'text-blue-400'
      : source.bias.political > 0.2
        ? 'text-red-400'
        : 'text-gray-400'
  )}
>
  {source.bias.political < -0.2
    ? 'Left'
    : source.bias.political > 0.2
      ? 'Right'
      : 'Center'}
</span>
```

**i18n:** wrap labels with `t('bias.left')` / `t('bias.center')` / `t('bias.right')` (namespace `'credibility'`).

---

### `apps/web/src/components/factcheck/FactCheckButton.tsx` (NEW — floating selection button)

**Analog:** `apps/web/src/components/NewsCard.tsx:54-82` `handleAnalyze` (existing AI propaganda detection trigger — same async-mutation + error/loading state pattern, just with browser-native fetch). Plus the in-page `<article>` location at `Article.tsx:173`.

**Pattern to copy** (`NewsCard.tsx:54-82`):

```tsx
const [isAnalyzing, setIsAnalyzing] = useState(false);

const handleAnalyze = async () => {
  if (isAnalyzing) return;
  setIsAnalyzing(true);
  try {
    const response = await fetch('/api/ai/propaganda', { /*...*/ });
    if (!response.ok) throw new Error('Failed to analyze article');
    const data = await response.json();
    // ... show drawer
  } catch {
    setError('Analysis failed.');
  } finally {
    setIsAnalyzing(false);
  }
};
```

**For fact-check, swap fetch for `useFactCheck` mutation hook + position the button via `getBoundingClientRect()`** (RESEARCH.md Pitfall 5 lines 403-413 — fire on `mouseup`/`touchend`, NOT `selectionchange`):

```tsx
useEffect(() => {
  const onMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text.length >= 10 && text.length <= 500) {
      const rect = sel!.getRangeAt(0).getBoundingClientRect();
      setBubble({ x: rect.left, y: rect.top - 40, text });
    } else {
      setBubble(null);
    }
  };
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('touchend', onMouseUp);
  return () => {
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchend', onMouseUp);
  };
}, []);
```

**Mount location** — RESEARCH.md item 14 (lines 1106-1107): listen on the `<article data-testid="article-container">` at `Article.tsx:173`. Coexists with existing share/translate floating actions because those are toolbar-level (lines 220-278), not selection-anchored.

---

### `apps/web/src/components/factcheck/FactCheckDrawer.tsx` (NEW — verdict + citations)

**Analog:** `MediaBiasBar.tsx` panel structure + `NewsCard.tsx` (perspective-badge usage).

**Verdict pill:** delegate to `<VerdictPill verdict={...} />`.

**Citations** — D-13 LOCKED: up to 5 cited articles render as compact perspective-badge cards. Reuse the `getRegionColor` helper from `apps/web/src/lib/utils.ts` (already imported by `NewsCard.tsx:9`).

```tsx
<div className="space-y-2">
  {citations.slice(0, 5).map((c) => (
    <CitationCard key={c.articleId} citation={c} />
  ))}
</div>
```

---

### `apps/web/src/components/factcheck/VerdictPill.tsx` (NEW)

**Analog:** `SourceRow.tsx:56-69` reliability badge — verbatim color-coded pill pattern.

**5 buckets per D-08 LOCKED:** `true | mostly-true | mixed | unverified | false`. Color coding: `#00ff88 (green) | #84cc16 (lime) | #ffee00 (yellow) | #6b7280 (gray) | #ff0044 (red)`. i18n labels via `t('verdicts.<bucket>')`.

---

### `apps/web/src/components/factcheck/CitationCard.tsx` (NEW)

**Analog:** the meta-info block at `NewsCard.tsx` (perspective region color badge + source name + headline + link). The visual goal (CONTEXT.md "Specifics" line 204): make multi-region diversity visible.

```tsx
<a
  href={`/article/${citation.articleId}`}
  className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800"
>
  <span className={cn('rounded px-2 py-0.5 text-[10px] font-mono text-white', getRegionColor(citation.region))}>
    {citation.region.toUpperCase()}
  </span>
  <span className="text-sm text-gray-200 truncate flex-1">{citation.title}</span>
  <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
</a>
```

---

### `apps/web/src/hooks/useCredibility.ts` (NEW — TanStack Query)

**Analog:** `apps/web/src/hooks/useComments.ts:72-119` `useComments`.

**Pattern to copy** (`useComments.ts:72-80`):

```typescript
export function useComments(articleId: string) {
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', articleId],
    queryFn: () => fetchComments(articleId),
    staleTime: 60_000,
  });
  // ...
}
```

**Phase 38 application:**

```typescript
async function fetchCredibility(sourceId: string, locale: string): Promise<CredibilityResult> {
  const r = await fetch(`/api/ai/source-credibility/${sourceId}?locale=${locale}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) throw new Error('Failed to fetch credibility');
  return (await r.json()).data;
}

export function useCredibility(sourceId: string) {
  const { language } = useAppStore();
  return useQuery({
    queryKey: ['credibility', sourceId, language],
    queryFn: () => fetchCredibility(sourceId, language),
    staleTime: 24 * 60 * 60 * 1000, // 24h matches server cache TTL
  });
}
```

---

### `apps/web/src/hooks/useFactCheck.ts` (NEW — TanStack Mutation)

**Analog:** `apps/web/src/hooks/useComments.ts:125-173` `usePostComment`.

**Pattern to copy** (`useComments.ts:125-148`):

```typescript
export function usePostComment(articleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { text: string; parentId?: string; token: string }) =>
      postComment({ articleId, ...data }),

    onMutate: async ({ text, parentId }) => { /* optimistic */ },
    onError: (_err, _vars, context) => { /* rollback */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
    },
  });
}
```

**For fact-check, no optimistic update needed** (LLM call takes 2-5s; user sees a loading state):

```typescript
export function useFactCheck() {
  return useMutation({
    mutationFn: async (args: { claim: string; articleId?: string }) => {
      const r = await fetch('/api/ai/fact-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(args),
      });
      if (r.status === 429) {
        const data = await r.json();
        throw new Error(`RATE_LIMIT:${data.upgradeUrl}`);
      }
      if (!r.ok) throw new Error('Fact-check failed');
      return (await r.json()).data;
    },
  });
}
```

**429 handling** — D-09 LOCKED: the `aiTierLimiter` returns `{error, upgradeUrl: '/pricing', limit: 10}`. Component layer reads the rejection and shows an upgrade prompt.

---

### `apps/web/public/locales/{de,en,fr}/credibility.json` and `factcheck.json` (NEW)

**Analog:** `apps/web/public/locales/en/common.json` lines 1-50 (existing namespace shape).

**Pattern to copy** (`common.json:1-30`):

```json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "time": {
    "minutesAgo": "{count, plural, one {# minute ago} other {# minutes ago}}"
  }
}
```

**Phase 38 string inventory** (RESEARCH.md §"i18n String Inventory" lines 950-1000) lists every key the planner needs. Critical D-08 verdict labels:

```json
// factcheck.json (en)
{
  "verdicts": {
    "true": "True",
    "mostly-true": "Mostly true",
    "mixed": "Mixed",
    "unverified": "Unverified",
    "false": "False"
  },
  "confidence": { "low": "Low confidence", "medium": "Medium confidence", "high": "High confidence" },
  "ui": { "buttonLabel": "Fact-check this", ... }
}
```

**Filesystem location:** `apps/web/public/locales/{de,en,fr}/` (NOT `apps/web/src/i18n/locales/`). Confirmed by `i18n.ts:20-21`: `loadPath: '/locales/{{lng}}/{{ns}}.json'` — Vite serves `public/locales` at `/locales`. The `de/` and `en/` directories already exist with files; `fr/` only has `pricing.json` so will need fresh `credibility.json` + `factcheck.json` in all three locales.

---

### `apps/web/src/i18n/i18n.ts` (MODIFY — add 2 namespaces)

**Analog (in-file):** line 16. Single-line edit.

**Pattern to copy** (line 16):

```typescript
ns: ['common', 'share', 'teams', 'pricing'],
```

**New value:**

```typescript
ns: ['common', 'share', 'teams', 'pricing', 'credibility', 'factcheck'],
```

---

### `apps/web/src/components/FramingComparison.tsx` (MODIFY — swap heuristic for LLM output)

**Analog (in-file):** the existing component itself. Lines 1-94 (imports + topic input + `useQuery`) stay; the per-region rendering body changes from heuristic sentiment-class output to structured LLM `{ narrative, omissions, vocabulary[], evidenceQuotes[] }`.

**Existing data shape to remove** (lines 28-39):

```typescript
interface FramingData {
  topic: string;
  regions: Record<string, { count: number; avgSentiment: number }>;
  framing?: Record<PerspectiveRegion, string>;
  bias?: Record<PerspectiveRegion, number>;
  aiGenerated: boolean;
}
```

**New data shape to use** (matches `FramingResponseSchema` — RESEARCH.md lines 909-917):

```typescript
interface FramingPerspective {
  narrative: string;
  omissions: string[];
  vocabulary: string[];
  evidenceQuotes: string[];
}
interface FramingData {
  topic: string;
  locale: string;
  perspectives: Record<PerspectiveRegion, FramingPerspective>;
  aiGenerated: true;
}
```

**Existing `useQuery` (lines 90-94) stays unchanged**; the query function now hits the same endpoint but the response shape is new. Per-region grid layout (the visual shell) is preserved.

---

### `apps/web/src/components/NewsCard.tsx` (MODIFY — add credibility pill + bias badge)

**Analog (in-file):** existing source + perspective metadata block. Insert `<CredibilityPill sourceId={article.source.id} />` and `<BiasBadge politicalBias={article.source.bias.political} />` next to existing badges.

**Imports to add:**

```typescript
import { CredibilityPill } from './credibility/CredibilityPill';
import { BiasBadge } from './credibility/BiasBadge';
```

**Per CONTEXT.md "Integration Points" line 192:** ensure the new pill doesn't crowd the existing perspective region color badge, sentiment indicator, or confidence-from-source-count.

---

### `apps/web/src/components/feed-manager/SourceRow.tsx` (MODIFY — replace inline reliability badge)

**Analog (in-file):** lines 56-87 (the existing inline R: reliability badge + Left/Center/Right span). Replace BOTH with `<CredibilityPill sourceId={source.id} />` + `<BiasBadge politicalBias={source.bias.political} />`.

This is the cleanest reuse — the new components ARE distillations of these exact two inline blocks.

---

### `apps/web/src/pages/Article.tsx` (MODIFY — wire selection handler)

**Analog (in-file):** the existing `<article data-testid="article-container">` at line 173 + meta-action buttons at lines 220-278. RESEARCH.md item 14 (lines 1106-1107) anchors the integration point precisely.

**Pattern to add:**

```tsx
import { FactCheckButton } from '../components/factcheck/FactCheckButton';
import { FactCheckDrawer } from '../components/factcheck/FactCheckDrawer';

// Inside <article>, sibling to the article body div:
<FactCheckButton articleId={article.id} />
<FactCheckDrawer articleId={article.id} />
```

`FactCheckButton` listens on the article-content `<div>` (line 297) for selection events and renders the floating bubble; `FactCheckDrawer` consumes the same context to render the verdict.

---

## Shared Patterns

### Singleton service + Redis cache + multi-provider LLM
**Source:** `apps/web/server/services/aiService.ts:30-91, 245-266`
**Apply to:** `aiService.ts` extension (all 3 new methods)

```typescript
export class AIService {
  private static instance: AIService;
  private readonly cacheService = CacheService.getInstance();
  private constructor() { /* init providers */ }
  static getInstance(): AIService {
    if (!AIService.instance) AIService.instance = new AIService();
    return AIService.instance;
  }
  async callWithFallback(prompt: string): Promise<string | null> { /* OpenRouter -> Gemini -> Anthropic */ }
}
```

### Read-through cache via `getOrSet`
**Source:** `apps/web/server/services/cacheService.ts:259-272`
**Apply to:** all 3 new AI methods + framing route

```typescript
return cache.getOrSet(
  CacheKeys.credibility(sourceId, locale),
  () => computeIt(sourceId, locale),
  CACHE_TTL.DAY  // 24h per D-03/D-17/D-18
);
```

### Defensive JSON-extract from LLM responses
**Source:** `apps/web/server/services/aiService.ts:331-350` (`parseResponse`) and lines 437-441 (`analyzeSentiment`)
**Apply to:** all 3 new LLM-call sites

```typescript
const jsonMatch = responseText.match(/\{[\s\S]*\}/);
if (!jsonMatch) throw new Error('No JSON found');
const parsed = JSON.parse(jsonMatch[0]);
```

Combined with Zod `safeParse` (RESEARCH.md Pattern 2) for defensive validation.

### Server-side tier gating (auto-applied)
**Source:** `apps/web/server/index.ts:167-168` + `apps/web/server/middleware/rateLimiter.ts` (`aiTierLimiter`)
**Apply to:** all new `/api/ai/*` and `/api/analysis/*` routes

```typescript
app.use('/api/ai', authMiddleware, aiTierLimiter, aiRoutes);
app.use('/api/analysis', authMiddleware, aiTierLimiter, analysisRoutes);
```

**Anti-pattern (do not repeat):** adding `authMiddleware` per-route inside `ai.ts`/`analysis.ts`. The chain at `index.ts:167-168` already covers the new routes.

### Zod schema as single source of truth (runtime + OpenAPI)
**Source:** `apps/web/server/openapi/schemas.ts:21-91` + `apps/web/server/openapi/generator.ts:46-106`
**Apply to:** all 3 new endpoints

```typescript
// Define once in schemas.ts
export const FactCheckRequestSchema = z.object({ ... }).openapi('FactCheckRequest');
// Use for runtime validation in route
const result = FactCheckRequestSchema.safeParse(req.body);
// Use for OpenAPI in generator.ts
registry.registerPath({ ..., request: { body: { content: { 'application/json': { schema: FactCheckRequestSchema } } } } });
```

### Zod validation + standardized error response
**Source:** `apps/web/server/routes/comments.ts:36-54`

```typescript
function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}
const result = createCommentSchema.safeParse(req.body);
if (!result.success) {
  res.status(400).json({ success: false, error: formatZodError(result.error) });
  return;
}
```

**Apply to:** all new POST routes (`/api/ai/fact-check`).

### `prisma` import + raw query parameterization
**Source:** `apps/web/server/db/prisma.ts:86` + `apps/web/server/services/newsReadService.ts`
**Apply to:** `factCheckReadService.ts`

```typescript
import { prisma } from '../db/prisma';
// $queryRaw template literal — Prisma binds ${var} as parameterized SQL
prisma.$queryRaw`SELECT ... WHERE search_tsv @@ websearch_to_tsquery('simple', ${claim})`
```

### `onDelete: Cascade` on user FK
**Source:** `apps/web/prisma/schema.prisma:171, 182, 214, 233, 274, 348, 378, 425` (every user-owned table)
**Apply to:** `FactCheck.userId` per RESEARCH.md Q-04

```prisma
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

### TanStack Query / Mutation hook pattern
**Source:** `apps/web/src/hooks/useComments.ts:72-119, 125-173`
**Apply to:** `useCredibility`, `useFactCheck`

### Pill / badge styling with cn + design-system colors
**Source:** `apps/web/src/components/feed-manager/SourceRow.tsx:56-87`
**Apply to:** `CredibilityPill`, `BiasBadge`, `VerdictPill`

```tsx
className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded',
  score >= 70 ? 'bg-[#00ff88]/10 text-[#00ff88]'
  : score >= 40 ? 'bg-[#ffee00]/10 text-[#ffee00]'
  : 'bg-[#ff0044]/10 text-[#ff0044]')}
```

### i18n via `useTranslation` with namespace
**Source:** `apps/web/src/i18n/i18n.ts:13-21` config + `useTranslation('common')` usage across components

```typescript
const { t } = useTranslation('credibility');
return <span>{t('verdicts.true')}</span>;
```

### Selection-driven floating button (browser-native)
**Source:** RESEARCH.md "Don't Hand-Roll" line 292 — `Selection API` + `getBoundingClientRect()`
**Apply to:** `FactCheckButton`

Listen on `mouseup` / `touchend` (NOT `selectionchange` — Pitfall 5 lines 403-413).

---

## No Analog Found

Files where the codebase has no exact analog (planner uses RESEARCH.md patterns):

| File | Role | Why no analog |
|------|------|---------------|
| `apps/web/server/prompts/*.ts` | prompt template files | The codebase currently inlines prompt strings inside `aiService.ts` (lines 310-328) and `routes/ai.ts` (lines 228-260, 164-170). There is no `prompts/` directory. The pattern itself (pure template function returning a string) is well-established; the planner is creating a NEW directory. Reference RESEARCH.md §"Concrete Prompt Templates" (lines 654-789) for the verbatim prompt contents. |

All other 27 files have direct or close analogs.

---

## Metadata

**Analog search scope:**
- `apps/web/server/services/`
- `apps/web/server/routes/`
- `apps/web/server/openapi/`
- `apps/web/server/middleware/`
- `apps/web/server/db/`
- `apps/web/server/utils/`
- `apps/web/prisma/`
- `apps/web/src/components/`
- `apps/web/src/components/feed-manager/`
- `apps/web/src/hooks/`
- `apps/web/src/pages/`
- `apps/web/src/i18n/`
- `apps/web/public/locales/`

**Files scanned:** ~80
**Pattern extraction date:** 2026-04-29

**Critical constraint enforced:** Every analog path begins with `apps/web/...`. No root `server/`, `prisma/`, `src/` references (per `.planning/.continue-here.md`).

---

## PATTERN MAPPING COMPLETE

28 / 28 files have concrete analogs grounded in actual code. Phase 38 is dominantly an integration exercise — every primitive (multi-provider AI, Redis cache, tier limiter, Zod-to-OpenAPI, Prisma raw queries, i18n namespaces, TanStack Query hooks, pill components) has an existing exact-match pattern in `apps/web/`; only the `prompts/` directory is greenfield.
