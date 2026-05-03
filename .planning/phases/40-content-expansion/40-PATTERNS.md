# Phase 40: Content Expansion — Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 38 new + 11 modified = 49
**Analogs found:** 47 / 49 (2 with no direct analog — `LiteVimeo`, `LiteYouTube` web-component wrapper)

> Anti-pattern reminder (CC-03 / `.planning/.continue-here.md`): every path below MUST live under `apps/web/...`, `packages/...`, `.github/...`, or `.planning/...`. Zero writes to root `server/`, `prisma/`, `src/`. Plan-checker rejects on violation.

> Note on a stale CONTEXT reference: `40-CONTEXT.md` line 94 says i18n files live at `apps/web/src/i18n/locales/...`. The actual on-disk location is `apps/web/public/locales/{de,en,fr}/`. RESEARCH.md noted this on line 258. All file paths in this document use the correct on-disk location.

> Note on shared-types path: CONTEXT.md says `packages/types/src/index.ts`. The actual file is `packages/types/index.ts` (no `src/` subdir). Verified via `ls packages/types/`.

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `apps/web/prisma/schema.prisma` (extend) | Prisma model addition | schema | Phase 38 `NewsArticle.searchTsv` block (`schema.prisma:14-50`) | exact |
| `apps/web/prisma/migrations/20260504_40_content_models/migration.sql` | Prisma migration (raw) | schema | `prisma/migrations/20260417073027_init/` | role-match |
| `apps/web/prisma/migrations/20260504_40_video_fts/migration.sql` | Prisma migration (raw FTS) | schema | `prisma/migrations/20260429120000_38_news_article_fts/migration.sql` | exact |
| `apps/web/prisma/migrations/20260504_40_transcript_fts/migration.sql` | Prisma migration (raw FTS) | schema | same as above | exact |
| `packages/types/index.ts` (extend) | Shared TS type | type-only | self (lines 5-18 already declares the union) | exact |
| `apps/web/src/types/index.ts` (extend) | App TS type | type-only | self (lines 1-14 already declares the union) | exact |
| `apps/web/src/types/podcasts.ts` | Domain type module | type-only | `apps/web/src/types/focus.ts` (existing isolated type module) | role-match |
| `apps/web/src/types/videos.ts` | Domain type module | type-only | same | role-match |
| `apps/web/server/services/podcastService.ts` | Service singleton (orchestrator) | request-response + multi-provider fan-out | `apps/web/server/services/aiService.ts` (multi-provider fallback) | role-match |
| `apps/web/server/services/podcastIndexService.ts` | Service (3rd-party API wrapper) | HTTP fetch | `apps/web/server/services/translationService.ts` (single-provider fetch wrapper section) — see also research code excerpt | role-match |
| `apps/web/server/services/itunesPodcastService.ts` | Service (3rd-party API wrapper) | HTTP fetch | same | role-match |
| `apps/web/server/services/podcastMatcherService.ts` | Service (in-process scoring) | transform | `apps/web/server/services/credibilityService.ts` (`deriveBiasBucket`, deterministic transform) | role-match |
| `apps/web/server/services/videoIndexService.ts` | Service (DB read + external fallback) | request-response | `apps/web/server/services/newsReadService.ts` (Prisma + cache) — used by `routes/news.ts:3` | role-match |
| `apps/web/server/services/youtubeService.ts` | Service (RSS + Data API) | RSS poll + HTTP fetch | `apps/web/server/services/newsAggregator.ts` (rss-parser + custom fields) | role-match |
| `apps/web/server/services/transcriptService.ts` | Service singleton (orchestrator) | streaming + cache | `apps/web/server/services/aiService.ts` (multi-provider fallback) | role-match |
| `apps/web/server/services/whisperService.ts` | Service (3rd-party API wrapper + ffmpeg) | streaming | `apps/web/server/services/aiService.ts` (OpenAI client init) | role-match |
| `apps/web/server/routes/podcasts.ts` | Express router | request-response | `apps/web/server/routes/news.ts` | exact |
| `apps/web/server/routes/videos.ts` | Express router | request-response | same | exact |
| `apps/web/server/routes/transcripts.ts` | Express router (Premium-gated) | request-response | `apps/web/server/routes/ai.ts` (uses `requireTier` / `aiTierLimiter`) | exact |
| `apps/web/server/middleware/youtubeQuota.ts` | Middleware (Redis counter) | request-response | `apps/web/server/middleware/rateLimiter.ts` `aiTierLimiter` (lines 115-174) | exact |
| `apps/web/server/jobs/podcastTranscribeJob.ts` | Worker job (singleton service) | batch | `apps/web/server/services/cleanupService.ts` (start/stop/runCleanup pattern) | exact |
| `apps/web/server/jobs/videoChannelPollJob.ts` | Worker job | batch + RSS | same | exact |
| `apps/web/server/jobs/podcastFeedPollJob.ts` | Worker job | batch + RSS | same | exact |
| `apps/web/server/config/podcasts.ts` | Config table | static data | `apps/web/server/config/sources.ts` | exact |
| `apps/web/server/config/video-channels.ts` | Config table | static data | same | exact |
| `apps/web/scripts/check-source-bias-coverage.ts` | Build/CI script | transform + exit-code | `apps/web/scripts/check_feeds.ts` (reads `NEWS_SOURCES`, exits 0/1) | exact |
| `apps/web/scripts/proposed-sources/70-sources-proposed.md` | Human-review artifact | doc | (no analog — new artifact type) | none |
| `apps/web/scripts/resolve-youtube-handles.ts` | One-shot script | transform | `apps/web/scripts/check_feeds.ts` | role-match |
| `apps/web/src/lib/platform.ts` (create if missing) | Platform-detection utility | sync helper | `apps/web/src/lib/utils.ts` (region helpers) | role-match |
| `apps/web/src/lib/utils.ts` (extend) | Utility functions | sync helpers | self (`getRegionColor`/`getRegionLabel` lines 50-86) | exact |
| `apps/web/src/config/regionMetadata.ts` (extend) | Static config map | type-only | self (`REGION_GEO_METADATA` lines 8-87) | exact |
| `apps/web/src/components/podcasts/RelatedPodcasts.tsx` | React component (lazy section) | client query | `apps/web/src/components/NewsCard.tsx` (uses `useCredibility` hook lazily) | role-match |
| `apps/web/src/components/podcasts/PodcastEpisodeCard.tsx` | React component (card) | display-only | `apps/web/src/components/NewsCard.tsx` | role-match |
| `apps/web/src/components/podcasts/PodcastPlayer.tsx` | React component (audio + seek) | client state | `apps/web/src/components/NewsCard.tsx` (modal-style local state) | partial |
| `apps/web/src/components/podcasts/TranscriptDrawer.tsx` | React component (Premium-gated drawer) | client query | `apps/web/src/components/subscription/UpgradePrompt.tsx` | exact |
| `apps/web/src/components/videos/RelatedVideos.tsx` | React component (lazy section) | client query | `apps/web/src/components/NewsCard.tsx` | role-match |
| `apps/web/src/components/videos/EmbeddedVideo.tsx` | React component (dispatcher) | conditional render | `apps/web/src/components/ResponsiveImage.tsx` | role-match |
| `apps/web/src/components/videos/LiteYouTube.tsx` | React component (web-component wrapper) | side-effect import | (no analog — first web-component in codebase) | none |
| `apps/web/src/components/videos/LiteVimeo.tsx` | React component (custom click-to-load) | client state + oEmbed fetch | (no analog — bespoke) | none |
| `apps/web/src/pages/PodcastsPage.tsx` | Page component | client query + browse | `apps/web/src/pages/Bookmarks.tsx` | exact |
| `apps/web/src/App.tsx` (extend) | Root router | routing | self (lines 113-149) | exact |
| `apps/web/src/routes.ts` (extend) | Lazy-route registry | dynamic import | self (lines 11-80) | exact |
| `apps/web/src/components/Sidebar.tsx` (extend) | Layout component | nav config | self (lines 80-89, navItems array) | exact |
| `apps/web/src/hooks/useRelatedPodcasts.ts` | TanStack Query hook | useQuery wrapper | `apps/web/src/hooks/useCredibility.ts` | exact |
| `apps/web/src/hooks/useRelatedVideos.ts` | TanStack Query hook | useQuery wrapper | same | exact |
| `apps/web/src/hooks/useTranscript.ts` | TanStack Query hook (Premium-aware) | useQuery wrapper | same | exact |
| `apps/web/public/locales/{de,en,fr}/podcasts.json` | i18n bundle | static data | `apps/web/public/locales/en/common.json` | exact |
| `apps/web/public/locales/{de,en,fr}/videos.json` | i18n bundle | static data | same | exact |
| `apps/web/public/locales/{de,en,fr}/regions.json` (extend) | i18n bundle | static data | `apps/web/public/locales/en/common.json` regions block (lines 53-67) | exact |
| `apps/web/public/locales/{de,en,fr}/common.json` (extend, navigation.podcasts) | i18n bundle | static data | self (lines 35-48) | exact |

---

## Pattern Assignments

### `apps/web/prisma/schema.prisma` (Prisma model addition)

**Analog:** self — `apps/web/prisma/schema.prisma:14-51` (`NewsArticle` with raw-migration `searchTsv`).

**Imports / model header pattern** (none — Prisma DSL):

**FTS-aware model pattern (mirror for `Video` and `Transcript`)** (`schema.prisma:14-51`):
```prisma
model NewsArticle {
  id                 String   @id
  title              String
  // ... fields ...
  source   NewsSource @relation(fields: [sourceId], references: [id])
  sourceId String

  searchTsv  Unsupported("tsvector")? @map("search_tsv") // managed by raw migration 20260429120000_38_news_article_fts; do not edit via Prisma
  factChecks FactCheck[]

  @@index([publishedAt])
  @@index([sourceId])
  @@index([topics(ops: JsonbPathOps)], type: Gin) // D-14: GIN for topics
  @@index([entities(ops: JsonbPathOps)], type: Gin) // D-14: GIN for entities
  @@index([searchTsv], type: Gin) // Phase 38: FTS GIN index (managed via raw migration)
}
```

**Optional-string field pattern (mirror for `NewsSource.biasDiversityNote`)** (`schema.prisma:53-68`):
```prisma
model NewsSource {
  id            String        @id
  name          String
  // ...
  rateLimit     Int
  lastFetched   DateTime?
  articles      NewsArticle[]

  @@index([region])
}
```

**What's new vs analog:**
- Add `biasDiversityNote String?` (optional, only `'limited'` populated for `russland`/`china` per D-A3)
- Add 4 new models: `Podcast`, `PodcastEpisode`, `Video`, `Transcript`
- `Video.searchTsv Unsupported("tsvector")? @map("search_tsv")` + `@@index([searchTsv], type: Gin)` (mirrors line 50)
- `Transcript.segments Json` (timestamped chunks per CC-05) + `Transcript.searchTsv Unsupported("tsvector")? @map("search_tsv")` for Q-05 transcript-excerpt search (denormalised `fullText` column or generated column over `segments`)
- `PodcastEpisode @@unique([podcastGuid])` for dedupe (per Open Question 4 in RESEARCH.md)
- `perspective String` (NOT enum) — preserves the existing convention (Prisma `perspective` is `String`, not enum), so 4 new region values need NO Prisma migration, only data + TS-type changes

---

### `apps/web/prisma/migrations/20260504_40_video_fts/migration.sql` (raw FTS migration)

**Analog:** `apps/web/prisma/migrations/20260429120000_38_news_article_fts/migration.sql`

**Full file pattern**:
```sql
-- Phase 38: Postgres FTS for fact-check corpus retrieval (D-11 + RESEARCH.md Pitfall 2)
-- Closes the gap CONTEXT.md D-11 wrongly assumed: GIN indexes existed only on JSONB topics/entities,
-- never on title/content tsvector. This is the migration the missing index actually needs.
-- Use 'simple' config (NOT 'english'/'german'/'french') because D-12 multi-language merge
-- requires uniform tokenization without language-specific stemming.

ALTER TABLE "NewsArticle"
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;

CREATE INDEX news_article_search_tsv_idx
  ON "NewsArticle" USING GIN (search_tsv);
```

**What's new vs analog:**
- Same `'simple'` config (per Q-02 recommendation: multilingual channel set)
- Concatenate `title || ' ' || description` instead of `title || ' ' || content`
- Index name `video_search_tsv_idx`
- Apply same shape to `Transcript` table in `20260504_40_transcript_fts/migration.sql` (concatenate denormalised `fullText` column for Q-05 transcript-excerpt search)

---

### `packages/types/index.ts` AND `apps/web/src/types/index.ts` (PerspectiveRegion extension)

**Analog:** self.

**Current pattern** (`packages/types/index.ts:5-18` and `apps/web/src/types/index.ts:1-14`):
```typescript
export type PerspectiveRegion =
  | 'usa'
  | 'europa'
  | 'deutschland'
  | 'nahost'
  | 'tuerkei'
  | 'russland'
  | 'china'
  | 'asien'
  | 'afrika'
  | 'lateinamerika'
  | 'ozeanien'
  | 'kanada'
  | 'alternative';
```

**What's new vs analog:**
- Add 4 new union members: `'sudostasien' | 'nordeuropa' | 'sub-saharan-africa' | 'indien'`
- MUST update BOTH files in the same plan (Pitfall 1) — TypeScript will surface every consumer because `Record<PerspectiveRegion, T>` types in `regionMetadata.ts`, `getRegionColor`, `getRegionLabel`, `aiService.ts:103-117` (`VALID_PERSPECTIVE_REGIONS`) will fail until updated
- The `aiService.ts:103-117` `VALID_PERSPECTIVE_REGIONS` array MUST also receive the 4 new entries (gap-noticeable: it's a runtime array, not just a type, so TS won't catch the omission directly)

---

### `apps/web/server/services/podcastService.ts` (singleton orchestrator)

**Analog:** `apps/web/server/services/newsAggregator.ts` (singleton + multi-source orchestration); `apps/web/server/services/aiService.ts` (multi-provider fallback chain).

**Singleton + getInstance pattern** (`newsAggregator.ts:30-65, 102-107`):
```typescript
export class NewsAggregator {
  private static instance: NewsAggregator;
  private prisma = prisma;
  private translationService: TranslationService;
  // ...
  private constructor() {
    this.translationService = TranslationService.getInstance();
    this.newsApiService = NewsApiService.getInstance();
    // ...
  }

  static getInstance(): NewsAggregator {
    if (!NewsAggregator.instance) {
      NewsAggregator.instance = new NewsAggregator();
    }
    return NewsAggregator.instance;
  }
}
```

**rss-parser instantiation pattern** (`newsAggregator.ts:22-28`):
```typescript
const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'NewsHub/2.0 (https://newshub.com; contact@newshub.com)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  },
});
```

**What's new vs analog:**
- Constructor calls `PodcastIndexService.getInstance()`, `ItunesPodcastService.getInstance()`, `CacheService.getInstance()`
- Add `customFields` to the rss-parser instance for `<podcast:transcript>`, `<podcast:guid>` namespace tags (Pitfall 4: `customFields: { item: [['podcast:transcript', 'transcripts', { keepArray: true }], ['podcast:guid', 'podcastGuid']] }`)
- Match method `findRelatedEpisodes(article: NewsArticle): Promise<MatchedEpisode[]>` — fan out to Podcast Index + iTunes search in parallel using `Promise.all`, dedupe by `podcastGuid` then `hash(podcastTitle + episodeTitle + publishedAt)`, cache key `podcast:related:{articleId}` for 24h
- Zero AI calls (D-B2) — pure entity+topic keyword query

---

### `apps/web/server/services/podcastIndexService.ts` (HMAC SHA-1 wrapper)

**Analog:** No exact analog — closest is `apps/web/server/services/aiService.ts:1-25` for OpenAI client init pattern; the HMAC body is in RESEARCH.md "Code Examples" section.

**Imports + env-key pattern** (mirror `aiService.ts:1-25`):
```typescript
import OpenAI from 'openai';
// ...
import { CacheService, CacheKeys, CACHE_TTL } from './cacheService';
```

**Singleton + getInstance** — same as `podcastService.ts` above.

**What's new vs analog:**
- New env vars: `PODCAST_INDEX_API_KEY`, `PODCAST_INDEX_API_SECRET` (declared in `.env.example` updates)
- Use `crypto.createHash('sha1').update(KEY + SECRET + apiHeaderTime).digest('hex')` (Node's built-in `crypto`, already imported in `aiService.ts:5`)
- Headers: `X-Auth-Date`, `X-Auth-Key`, `Authorization` (lowercase hex SHA-1)
- Graceful degradation: if env vars missing, methods return empty array + warn-log (same pattern as `cacheService.isAvailable()` skip behavior)
- Optional: use `podcast-api` 2.0.4 npm package if maintenance check passes at plan time; otherwise hand-roll per RESEARCH.md "Code Examples" Podcast Index HMAC auth section

---

### `apps/web/server/services/transcriptService.ts` (Whisper + YouTube captions orchestrator)

**Analog:** `apps/web/server/services/aiService.ts` (multi-provider fallback chain — primary → secondary → fallback).

**Multi-provider fallback header pattern** (`aiService.ts:1-25`):
```typescript
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
```

**Cache-first read pattern** (`aiService.ts` — see `getSourceCredibility` pattern; mirror by reading `transcript:{contentType}:{id}` first, falling through to provider on miss):
```typescript
const cacheKey = `transcript:${contentType}:${id}`;
const cached = await this.cacheService.get<TranscriptResult>(cacheKey);
if (cached) return cached;
// ... provider chain ...
await this.cacheService.set(cacheKey, result, 30 * CACHE_TTL.DAY); // 30-day Redis cache (D-C1)
```

**What's new vs analog:**
- Provider chain: YouTube auto-captions (free, via `youtube-caption-extractor`) → OpenAI Whisper (`whisper-1`)
- Whisper response_format MUST be `'verbose_json'` + `timestamp_granularities: ['segment']` (CC-05 + RESEARCH.md anti-pattern)
- For audio >25MB: invoke `whisperService.chunkAudio()` (ffmpeg-static `-f segment -segment_time 600 -c copy`); transcribe each chunk; merge segments with chunk-offset
- Cache layer: 30-day Redis cache per RESEARCH.md D-C1 + permanent Postgres `Transcript` table write
- Sentinel cache for "no captions" path: 7-day cache `{ provider: 'youtube-captions-unavailable' }` to avoid YouTube re-hits (Pitfall 5)
- Empty array from `youtube-caption-extractor` MUST trigger Whisper fallback (Pitfall 5) — never return empty Transcript

---

### `apps/web/server/middleware/youtubeQuota.ts` (Redis daily counter)

**Analog:** `apps/web/server/middleware/rateLimiter.ts` `aiTierLimiter` (lines 115-174).

**Full pattern excerpt** (`rateLimiter.ts:115-174`):
```typescript
export const aiTierLimiter = (() => {
  const cacheService = CacheService.getInstance();
  const redisClient = cacheService.getClient();

  let store: RedisStore | undefined;
  if (redisClient) {
    store = new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        redisClient.call(command, ...args) as Promise<RedisReply>,
      prefix: 'rl:ai-tier:',
    });
  }

  return rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours for daily limit
    max: 10, // FREE tier limit per CONTEXT.md
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.userId || req.ip || 'anonymous';
    },
    skip: async (req: Request) => {
      // Skip rate limiting if Redis unavailable (graceful degradation)
      if (!cacheService.isAvailable()) {
        logger.debug('AI tier rate limiting skipped: Redis unavailable');
        return true;
      }
      // Skip rate limiting for Premium/Enterprise users
      // ...
    },
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: 'Daily AI query limit reached (10/day for free tier)',
        upgradeUrl: '/pricing',
        limit: 10,
      });
    },
    store,
  });
})();
```

**What's new vs analog:**
- Not a `rateLimit()` wrapper — exposes a function `checkAndConsumeQuota(): Promise<boolean>` called by `youtubeService.ts` BEFORE invoking the YouTube Data API. Express middleware shape is wrong here because the quota check is internal to the service path, not a route gate. Use the Redis-store init pattern from `aiTierLimiter` but expose a plain async function (mirrors RESEARCH.md "Pattern 4" sketch lines 322-344)
- Key namespace: `youtube:quota:{YYYY-MM-DD}` (date-bucket, not sliding window)
- Cap: 50 (D-D1)
- Implementation: `INCR youtube:quota:{date}` then `EXPIREAT` to next-day-midnight UTC on the first call (count === 1)
- Graceful degradation: if Redis unavailable, return `true` (allow request) — consistent with `cacheService.isAvailable()` skip behaviour at line 137-141
- Quota exhausted → caller falls back to local-index-only result; `logger.warn` for observability (no exception thrown — never bubble to user)

---

### `apps/web/server/middleware/requireTier` consumption (no new middleware file)

**Analog:** `apps/web/server/middleware/requireTier.ts:31-110` (full export already exists; transcripts route just imports it).

**Use pattern (in new `routes/transcripts.ts`)** — mirror `requireTier.ts:31-39`:
```typescript
import { requireTier, attachUserTier } from '../middleware/requireTier';

transcriptRoutes.get('/:contentType/:id',
  authenticate,           // existing JWT middleware
  requireTier('PREMIUM'), // hard gate — returns 403 with upgradeUrl: '/pricing' for non-Premium
  async (req, res) => { /* ... */ }
);
```

**What's new vs analog:** None — Phase 40 reuses `requireTier('PREMIUM')` and `attachUserTier` verbatim per CC-02. Do NOT re-implement.

---

### `apps/web/server/jobs/podcastTranscribeJob.ts` (worker job)

**Analog:** `apps/web/server/services/cleanupService.ts` (start/stop/runOnce singleton job pattern).

**Full lifecycle pattern** (`cleanupService.ts:20-72`):
```typescript
export class CleanupService {
  private static instance: CleanupService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {
    logger.info('Cleanup service initialized');
  }

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Cleanup service already running');
      return;
    }
    this.isRunning = true;
    // Run immediately on startup (D-18)
    this.runCleanup().catch(err => {
      logger.error('Initial cleanup failed:', err);
    });
    // Schedule daily cleanup (D-18)
    this.intervalId = setInterval(() => {
      this.runCleanup().catch(err => {
        logger.error('Scheduled cleanup failed:', err);
      });
    }, CLEANUP_INTERVAL_MS);
    logger.info('Cleanup service started - runs daily');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Cleanup service stopped');
  }
}
```

**What's new vs analog:**
- Different `runOnce()` body: iterate curated `PODCAST_FEEDS` (from `apps/web/server/config/podcasts.ts`), `await podcastService.pollFeed(feed)`, for each new episode check `<podcast:transcript>` tag first (skip Whisper if present per Pitfall 4), else enqueue Whisper transcription via `transcriptService.transcribePodcastEpisode(episodeId)`
- Cadence: `setInterval(..., 24 * 60 * 60 * 1000)` matches Q-01 (nightly batch)
- Gated by `RUN_JOBS=true` (per `apps/web/server/index.ts:73`) — start in `runBootLifecycle()` only when `RUN_JOBS` is true
- Emits `transcript:ready` cross-replica via `workerEmitter` once each transcription finishes (mirror `emitNewArticle` shape in `workerEmitter.ts:63-73`)
- Apply identical structure to `videoChannelPollJob.ts` and `podcastFeedPollJob.ts` — only `runOnce()` body differs

---

### `apps/web/server/routes/podcasts.ts` (Express router)

**Analog:** `apps/web/server/routes/news.ts:1-92`.

**Imports + Router pattern** (`news.ts:1-8`):
```typescript
import { Router, Request, Response } from 'express';
import type { PerspectiveRegion, Sentiment } from '../../src/types';
import * as newsReadService from '../services/newsReadService';
import { TranslationService } from '../services/translationService';
import { CacheService, CacheKeys } from '../services/cacheService';
import { prisma } from '../db/prisma';

export const newsRoutes = Router();
```

**GET handler with query parsing + Cache-Control + standard JSON envelope** (`news.ts:10-45`):
```typescript
newsRoutes.get('/', async (req: Request, res: Response) => {
  const regions = req.query.regions
    ? (req.query.regions as string).split(',') as PerspectiveRegion[]
    : undefined;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  // ...
  const { articles, total } = await newsReadService.getArticles({ regions, limit, offset });
  res.set('Cache-Control', 'public, max-age=300');
  res.set('Vary', 'Accept-Encoding');
  res.json({
    success: true,
    data: articles,
    meta: { total, page: Math.floor(offset / limit) + 1, limit, hasMore: offset + limit < total },
  });
});
```

**404 not-found pattern** (`news.ts:73-82`):
```typescript
newsRoutes.get('/:id', async (req: Request, res: Response) => {
  const article = await newsReadService.getArticleById(req.params.id);
  if (!article) {
    res.status(404).json({ success: false, error: 'Article not found' });
    return;
  }
  res.set('Cache-Control', 'public, max-age=600');
  res.json({ success: true, data: article });
});
```

**What's new vs analog:**
- Add `zod` schema validation per request body (CLAUDE.md: validate at boundaries) — none of the news routes do this currently because they use only query params. New podcast/video/transcript endpoints MUST use zod schemas in any POST body or path param that can fail (e.g. `episodeId.uuid()`)
- Endpoints (D-B3): `GET /api/podcasts` (browse curated, FREE), `GET /api/podcasts/:id/episodes`, `GET /api/podcasts/episodes/:id`, `GET /api/podcasts/related/:articleId` (24h cache key `podcast:related:{articleId}`)
- Apply identical structure to `routes/videos.ts` (`/api/videos/related/:articleId`, `/api/videos/channels`) and `routes/transcripts.ts` (`/api/transcripts/:contentType/:id` — gated by `requireTier('PREMIUM')`)
- Mount in `apps/web/server/index.ts` after the existing news routes (~ line 159)

---

### `apps/web/server/config/podcasts.ts` AND `apps/web/server/config/video-channels.ts` (config tables)

**Analog:** `apps/web/server/config/sources.ts:1-50`.

**Header + array shape pattern** (`sources.ts:1-13`):
```typescript
import type { NewsSource } from '../../src/types';

export const NEWS_SOURCES: NewsSource[] = [
  // ===== USA (10 sources) =====
  {
    id: 'ap',
    name: 'Associated Press',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: 0, reliability: 9, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:Associated+Press+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
```

**What's new vs analog:**
- New types `PodcastFeed` and `VideoChannel` in `apps/web/src/types/podcasts.ts` and `apps/web/src/types/videos.ts` respectively
- `PodcastFeed` shape: `{ id, title, rssUrl, region, language, category, transcriptCheckHint? }`
- `VideoChannel` shape: `{ id, handle, channelId, name, region, language }` — `channelId` baked at build time via `apps/web/scripts/resolve-youtube-handles.ts` (one-shot resolution, NOT runtime per RESEARCH.md anti-pattern)
- Region-grouped comments same shape as `// ===== USA (10 sources) =====` blocks

---

### `apps/web/scripts/check-source-bias-coverage.ts` (CI gate script)

**Analog:** `apps/web/scripts/check_feeds.ts:1-80`.

**Imports + array iteration + grouping pattern** (`check_feeds.ts:1-25`):
```typescript
import Parser from 'rss-parser';
import { NEWS_SOURCES } from '../server/config/sources';

// ...
async function testAllFeeds() {
  console.log('--- News Feed Diagnostic ---');

  const regions = [...new Set(NEWS_SOURCES.map(s => s.region))];
  const resultsByRegion: Record<string, { /* ... */ }> = {};

  for (const region of regions) {
    resultsByRegion[region] = { total: 0, functional: 0, failing: 0, noEndpoint: 0, details: [] };
  }
  // ...
}
```

**Exit-code pattern** (`check_feeds.ts:79`): `process.exit(0)` (extend to `process.exit(failures > 0 ? 1 : 0)`).

**What's new vs analog:**
- Body matches RESEARCH.md "Code Examples" `check-source-bias-coverage.ts` excerpt: bucket sources by `politicalBias < -0.33` / `between` / `> 0.33`; flag any region missing a bucket; honour `biasDiversityNote === 'limited'` exception per Pitfall 8
- Wire into `package.json` scripts as `check:bias` and add to CI `.github/workflows/ci.yml` after `pnpm typecheck` (per RESEARCH.md `## Code Examples` recommendation: pre-commit + CI)
- Same `import { NEWS_SOURCES } from '../server/config/sources'` pattern (relative path from `apps/web/scripts/`)

---

### `apps/web/src/components/podcasts/RelatedPodcasts.tsx` (lazy section in NewsCard)

**Analog:** `apps/web/src/components/NewsCard.tsx:38-90` (state-driven lazy fetch via `useCredibility` hook).

**Local-state + hook pattern** (`NewsCard.tsx:38-60`):
```typescript
export function NewsCard({ article, priority = false, onTranslate }: NewsCardProps) {
  const { language, toggleBookmark, isBookmarked, addToReadingHistory } = useAppStore();
  const bookmarked = isBookmarked(article.id);
  const isMobile = useIsMobile();

  const [showOriginal, setShowOriginal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  // ...

  // Phase 38 D-04 / D-05: per-source credibility + bias surfaces (24h cached
  // by both server Redis and client TanStack Query)
  const { data: credibility } = useCredibility(article.source.id);
```

**Imports** (`NewsCard.tsx:1-16`):
```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Globe, Languages, Loader2, Shield, Search, AlertTriangle, X, CheckCircle, Info, Share2, MessageSquare } from 'lucide-react';
import { cn, getRegionColor, getSentimentColor, truncate } from '../lib/utils';
import { useAppStore } from '../store';
import type { NewsArticle } from '../types';
```

**What's new vs analog:**
- Component takes `articleId: string` prop (not full `NewsArticle`) — only the ID is needed for the related-podcasts query
- Internal state `const [isExpanded, setIsExpanded] = useState(false)` (collapsed by default per D-B3)
- Use new hook `useRelatedPodcasts(articleId, { enabled: isExpanded })` so the network call happens only on user click — TanStack Query `enabled` gate
- Mount inside `NewsCard.tsx` near the metadata section (immediately after the existing `useCredibility` hook block); wrap in collapsed accordion-style toggle
- Render `PodcastEpisodeCard` per match
- i18n via `useTranslation('podcasts')` — reads from new `apps/web/public/locales/{de,en,fr}/podcasts.json` namespace
- Apply identical pattern to `RelatedVideos.tsx` (uses `useRelatedVideos`)

---

### `apps/web/src/components/podcasts/TranscriptDrawer.tsx` (Premium-gated drawer)

**Analog:** `apps/web/src/components/subscription/UpgradePrompt.tsx` (full file).

**Premium-gate UI pattern** (`UpgradePrompt.tsx:20-74`):
```tsx
export function UpgradePrompt({
  feature,
  requiredTier = 'PREMIUM',
  children,
  className,
  inline = false,
}: UpgradePromptProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  if (inline) {
    return (
      <button
        onClick={() => navigate('/pricing')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
          'bg-[#00f0ff]/10 border border-[#00f0ff]/30',
          'text-[#00f0ff] text-sm font-mono',
          'hover:bg-[#00f0ff]/20 transition-colors',
          className
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t('upgrade.unlockFeature', { feature })}
      </button>
    );
  }

  return (
    <div className={cn('relative group', className)}>
      <div className="pointer-events-none opacity-50 blur-[1px]">
        {children}
      </div>
      <div onClick={() => navigate('/pricing')}
        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-lg cursor-pointer transition-all group-hover:bg-black/70">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <Lock className="h-8 w-8 text-[#00f0ff]" />
          <div className="text-sm font-mono">
            <p className="text-gray-300">{t('upgrade.required', { tier: requiredTier })}</p>
            <p className="text-[#00f0ff] mt-1 font-medium">{t('upgrade.clickToUnlock')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**What's new vs analog (CC-01 — reader-app exemption is the load-bearing diff):**
- Branch on `isNativeApp()` (from `apps/web/src/lib/platform.ts`):
  - `false` (web) → reuse `<UpgradePrompt feature={t('transcripts.feature')}>` exactly as above (drives user to `/pricing`)
  - `true` (mobile) → render plain text "This feature is not available on your current plan. Visit newshub.example from your browser to learn more." with `newshub.example` as `<span className="font-mono">` — NEVER an `<a>` tag (App Review risk per Apple Rule 3.1.1(a) per CC-01)
- For Premium users: render the actual transcript with timestamp segments — each `<button onClick={() => onSeek(segment.startSec)}>` to seek the audio/video player (CC-05)
- Search input filters segments client-side; clicking a segment seeks to `startSec`
- Use `useTranscript(contentType, id)` hook gated on `isPremium` — the hook should only fire when `enabled: isPremium`
- Mirror RESEARCH.md "Pattern 5: Premium Gate with Mobile Exemption" sketch (lines 350-376)

---

### `apps/web/src/pages/PodcastsPage.tsx` (dedicated /podcasts page)

**Analog:** `apps/web/src/pages/Bookmarks.tsx:1-80`.

**Hook + i18n + list-render pattern** (`Bookmarks.tsx:1-80`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bookmark, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { NewsCard } from '../components/NewsCard';
import type { NewsArticle } from '../types';

async function fetchArticleById(id: string): Promise<NewsArticle | null> {
  const response = await fetch(`/api/news/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch article');
  }
  const result = await response.json();
  return result.data;
}

export function Bookmarks() {
  const { t } = useTranslation(['bookmarks', 'common']);
  const { bookmarkedArticles, toggleBookmark } = useAppStore();
  const queryClient = useQueryClient();

  const { data: articles, isLoading, error } = useQuery({
    queryKey: ['bookmarked-articles', bookmarkedArticles],
    queryFn: () => fetchBookmarkedArticles(bookmarkedArticles),
    enabled: bookmarkedArticles.length > 0,
    staleTime: 2 * 60 * 1000,
  });
  // ...
}
```

**What's new vs analog:**
- Two-tier search input (Q-05): episode-title + podcast-name search FREE; transcript-excerpt search Premium-only (`requireTier` checked server-side; UI shows `<UpgradePrompt inline>` for the transcript-search toggle when user is FREE)
- Browse view of all curated podcasts from `/api/podcasts`
- Use `i18n` namespace `podcasts` (`useTranslation(['podcasts', 'common'])`)
- FREE-tier accessible on web AND mobile (per RESEARCH.md "risk concentrations" #3 — only transcripts are gated)
- Reader-app exemption via `isNativeApp()`: hide the upgrade-CTA path on the transcript-search toggle when on mobile (CC-01)

---

### `apps/web/src/App.tsx` (route registration) AND `apps/web/src/routes.ts` (lazy import)

**Analog:** self.

**Lazy registration pattern** (`routes.ts:11-14`):
```typescript
export const Dashboard = lazyWithRetry(() =>
  import('./pages/Dashboard').then(m => ({ default: m.Dashboard }))
);
```

**Route mount pattern** (`App.tsx:113-148`):
```tsx
<Routes location={routeLocation}>
  <Route path="/" element={<Dashboard />} />
  <Route path="/monitor" element={<Monitor />} />
  // ...
  <Route path="/bookmarks" element={<Bookmarks />} />
  // ...
</Routes>
```

**What's new vs analog:**
- Add to `apps/web/src/routes.ts`: `export const PodcastsPage = lazyWithRetry(() => import('./pages/PodcastsPage').then(m => ({ default: m.PodcastsPage })));`
- Add to `apps/web/src/App.tsx` import block (lines 19-42) and to `<Routes>` block (line 127 ish): `<Route path="/podcasts" element={<PodcastsPage />} />`
- No /videos page (per RESEARCH.md project-structure note: videos render inline in `NewsCard`)

---

### `apps/web/src/components/Sidebar.tsx` (extend navItems)

**Analog:** self — `Sidebar.tsx:80-89`.

**Pattern**:
```typescript
const navItems = useMemo(() => [
  { to: '/', icon: Activity, label: t('navigation.dashboard'), badge: 'live' as const },
  { to: '/monitor', icon: Globe2, label: t('navigation.monitor'), badge: null },
  { to: '/events', icon: MapPin, label: t('navigation.events'), badge: 'events' as const },
  { to: '/community', icon: Users, label: t('navigation.community'), badge: 'new' as const },
  { to: '/analysis', icon: BarChart3, label: t('navigation.analysis') },
  { to: '/timeline', icon: Clock, label: t('navigation.timeline') },
  { to: '/history', icon: History, label: t('navigation.history') },
  { to: '/bookmarks', icon: Bookmark, label: t('navigation.bookmarks') },
], [t]);
```

**What's new vs analog:**
- Add `{ to: '/podcasts', icon: Podcast /* lucide icon */, label: t('navigation.podcasts') }` (alphabetical position per CONTEXT.md `<specifics>`: between "Monitor" and "Settings"; current array is not strictly alphabetical so insert after Bookmarks works visually)
- Import `Podcast` from `lucide-react` (line 6-21)
- Add `navigation.podcasts` key to all 3 locale `common.json` files (CC-04)

---

### `apps/web/src/hooks/useRelatedPodcasts.ts` (TanStack Query hook)

**Analog:** `apps/web/src/hooks/useCredibility.ts` (full file).

**Hook + auth + JSON-envelope unwrap pattern** (`useCredibility.ts:30-71`):
```typescript
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('newshub-auth-token') ?? '';
}

async function fetchCredibility(sourceId: string, locale: string): Promise<CredibilityResult> {
  const url = `/api/ai/source-credibility/${encodeURIComponent(sourceId)}?locale=${encodeURIComponent(locale)}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) throw new Error(`Failed to fetch credibility: ${r.status}`);
  const body = await r.json();
  return body.data as CredibilityResult;
}

export function useCredibility(sourceId: string, enabled = true) {
  const language = useAppStore((s) => s.language);
  return useQuery({
    queryKey: ['credibility', sourceId, language],
    queryFn: () => fetchCredibility(sourceId, language),
    staleTime: 24 * 60 * 60 * 1000, // 24h matches server cache TTL per D-03
    enabled: enabled && !!sourceId,
    retry: 1,
  });
}
```

**What's new vs analog:**
- `useRelatedPodcasts(articleId, { enabled = true } = {})` — `enabled` flag drives lazy fetch from `RelatedPodcasts.tsx`
- queryKey `['related-podcasts', articleId]` — language NOT included (podcast match is language-neutral by entity name)
- staleTime `24 * 60 * 60 * 1000` — matches server-side `podcast:related:{articleId}` Redis 24h TTL (D-B2)
- No auth header required for FREE-tier endpoint (omit `getToken()` block) — but DO include it anyway for `useTranscript` (Premium-gated)
- For `useTranscript(contentType, id, isPremium)`: include `Authorization: Bearer ${getToken()}` and `enabled: isPremium && !!id`
- Apply identical structure to `useRelatedVideos.ts`

---

### `apps/web/src/lib/platform.ts` (create if Phase 39 not yet complete — RESEARCH Open Question 1)

**Analog:** `apps/web/src/lib/utils.ts:50-86` (sync helpers, single export).

**Existing utility pattern** (`utils.ts:50-67`):
```typescript
export function getRegionColor(region: string): string {
  const colors: Record<string, string> = {
    usa: 'bg-blue-500',
    // ...
  };
  return colors[region] || 'bg-gray-500';
}
```

**What's new vs analog:**
- Single sync function `isNativeApp(): boolean`
- Implementation per CC-01 + RESEARCH A6: `return typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform?.() === 'ios' || (window as any).Capacitor?.getPlatform?.() === 'android'`
- Plan-checker MUST verify file exists at execution time; if Phase 39 has shipped, just import the existing seam — do NOT create a duplicate
- If Phase 39 is incomplete at Phase 40 start, create the stub (returns `false` always until Capacitor is wired) and add a note in the plan: "TODO: replace with the Phase 39 implementation when it lands"

---

### `apps/web/public/locales/{de,en,fr}/regions.json` (extend) AND new `podcasts.json` / `videos.json`

**Analog:** `apps/web/public/locales/en/common.json:53-67` (existing regions block).

**Pattern**:
```json
{
  "regions": {
    "usa": "USA",
    "europa": "Europe",
    "deutschland": "Germany",
    "nahost": "Middle East",
    "tuerkei": "Turkey",
    "russland": "Russia",
    "china": "China",
    "...": "..."
  }
}
```

**What's new vs analog:**
- Either extend existing `regions` block in `common.json` OR carve a new `regions.json` namespace (CONTEXT.md CC-04 says "extend `regions.json`" — verify whether the file exists; if not, the pattern is to add a key under `common.json` `regions` block at lines 53-67)
- Add 4 new keys: `sudostasien`, `nordeuropa`, `sub-saharan-africa`, `indien`
- Translations per RESEARCH.md `<specifics>`: e.g. EN `Southeast Asia`, DE `Südostasien`, FR `Asie du Sud-Est`; etc.
- `podcasts.json` and `videos.json` are new namespaces — create with shape mirroring existing namespace files (e.g. `apps/web/public/locales/en/bookmarks.json`)
- Translation file MUST exist for all 3 locales (DE/EN/FR) per CC-04 — missing-locale check is part of CI

---

## Shared Patterns

### Authentication / Authorization

**Source:** `apps/web/server/middleware/requireTier.ts:31-110`
**Apply to:** `apps/web/server/routes/transcripts.ts` (hard `requireTier('PREMIUM')` gate)
**Apply to (soft):** `apps/web/server/routes/podcasts.ts` `GET /podcasts/episodes/:id` (uses `attachUserTier` so the response can include a `transcriptAvailable` boolean without 403'ing FREE users)

**Pattern excerpt** (`requireTier.ts:31-50`):
```typescript
export function requireTier(minTier: SubscriptionTier) {
  return async (req: TierRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const cacheService = CacheService.getInstance();
    const cacheKey = `user:tier:${req.user.userId}`;
    let cached = await cacheService.get<{ tier: SubscriptionTier; status: SubscriptionStatus; }>(cacheKey);
    if (!cached) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { subscriptionTier: true, subscriptionStatus: true },
      });
      // ... cache and gate
```

**Critical:** Phase 40 reuses these middleware exports verbatim per CC-02. Do NOT re-implement.

---

### Singleton Service Lifecycle

**Source:** `apps/web/server/services/cleanupService.ts:20-72`
**Apply to:** All new worker jobs (`podcastTranscribeJob.ts`, `videoChannelPollJob.ts`, `podcastFeedPollJob.ts`)

**Critical**: register `start()` calls in `apps/web/server/index.ts` `runBootLifecycle` block (around lines 70-73 where `RUN_JOBS` is checked) so worker-only Swarm replicas start the jobs but web replicas do not.

**Cross-replica emit pattern (when transcription completes):** `apps/web/server/jobs/workerEmitter.ts:31-86` — extend with:
```typescript
export function emitTranscriptReady(transcriptId: string, contentType: 'podcast' | 'video', contentId: string): void {
  const e = getWorkerEmitter();
  e.emit('transcript:ready', { transcriptId, contentType, contentId });
}
```
Mirrors `emitNewArticle` (lines 63-73).

---

### Redis Cache Wrapper

**Source:** `apps/web/server/services/cacheService.ts:1-100` + `apps/web/server/services/aiService.ts` cache-key conventions
**Apply to:** Every new service that calls a third-party API (podcastService, podcastIndexService, itunesPodcastService, transcriptService, videoIndexService, youtubeService)

**TTL constants** (`cacheService.ts:27-34`):
```typescript
export const CACHE_TTL = {
  SHORT: 60,              // 1 minute
  MEDIUM: 300,            // 5 minutes
  LONG: 1800,             // 30 minutes
  HOUR: 3600,             // 1 hour
  DAY: 86400,             // 24 hours
  WEEK: 604800,           // 7 days
} as const;
```

**Key namespaces (Phase 40 additions)**:
| Key | TTL | Owner |
|-----|-----|-------|
| `transcript:podcast:{episodeId}` | 30 × `CACHE_TTL.DAY` (D-C1) | `transcriptService` |
| `transcript:video:{youtubeId}` | 30 × `CACHE_TTL.DAY` (D-C1) | `transcriptService` |
| `transcript:youtube-captions-unavailable:{youtubeId}` | 7 × `CACHE_TTL.DAY` (Pitfall 5) | `transcriptService` |
| `podcast:related:{articleId}` | `CACHE_TTL.DAY` (D-B2) | `podcastService` |
| `video:related:{articleId}` | `CACHE_TTL.DAY` | `videoIndexService` |
| `youtube:quota:{YYYY-MM-DD}` | next-midnight UTC (Q-03) | `youtubeQuota` |

**Graceful-degradation rule** (mirror `aiTierLimiter` skip logic at `rateLimiter.ts:137-141`): every new service MUST handle `cacheService.isAvailable() === false` by skipping the cache layer (still serve from origin), never throwing.

---

### Validation at Boundaries (zod)

**Source:** `apps/web/server/services/aiService.ts:34-45` (`safeParseJson`); `apps/web/server/services/aiService.ts:68-101` (zod schemas)
**Apply to:** Every new POST body and uncertain path param in `routes/podcasts.ts`, `routes/videos.ts`, `routes/transcripts.ts`

**Schema declaration pattern** (`aiService.ts:68-75`):
```typescript
const credibilityLlmSchema = z.object({
  subDimensions: z.object({
    accuracy: z.number().int().min(0).max(100),
    transparency: z.number().int().min(0).max(100),
    corrections: z.number().int().min(0).max(100),
  }),
  methodologyMd: z.string().min(1),
});
```

**Phase 40 additions:**
- `episodeIdSchema = z.string().uuid()` — for `/api/podcasts/episodes/:id`
- `transcriptParamsSchema = z.object({ contentType: z.enum(['podcast', 'video']), id: z.string().min(1) })` — for `/api/transcripts/:contentType/:id`
- `searchSchema = z.object({ q: z.string().min(1).max(200), country: z.string().length(2).optional() })` — for `/api/podcasts/search` (Pitfall 6)

---

### i18n (DE/EN/FR triple-write)

**Source:** existing namespace files in `apps/web/public/locales/{de,en,fr}/` (one file per namespace)
**Apply to:** Every new user-facing string per CC-04

**Triple-write rule (Pitfall not in RESEARCH but flagged here):** Adding a key to `en/podcasts.json` without adding the same key to `de/podcasts.json` and `fr/podcasts.json` results in `t('podcasts.foo')` returning the literal `'podcasts.foo'` for non-EN users. Plan-checker should grep for orphan keys.

**Useful existing namespaces to mirror:** `bookmarks.json` (page-level), `common.json:35-67` (navigation + regions).

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md "Code Examples" patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/web/src/components/videos/LiteYouTube.tsx` | React component (web-component wrapper) | side-effect import | First Web-Component–based component in repo. Use RESEARCH.md "lite-youtube-embed React wrapper" excerpt (lines 633-661) verbatim. |
| `apps/web/src/components/videos/LiteVimeo.tsx` | React component (custom click-to-load) | client state + oEmbed fetch | First click-to-load-thumbnail player in repo. Use RESEARCH.md "Vimeo lite component" excerpt (lines 666-714) verbatim. |
| `apps/web/scripts/proposed-sources/70-sources-proposed.md` | Human-review artifact (markdown table grouped by region) | doc | New artefact type per D-A4 — no precedent. Author by listing per-region tables: `\| Source name \| URL \| Region \| Bias \| Reliability \| Rationale \|`. Sign-off step is part of the plan flow, not a code review. |

---

## Metadata

**Analog search scope:**
- `apps/web/server/services/` (newsAggregator.ts, aiService.ts, cleanupService.ts, cacheService.ts, translationService.ts)
- `apps/web/server/middleware/` (rateLimiter.ts, requireTier.ts)
- `apps/web/server/routes/` (news.ts)
- `apps/web/server/jobs/` (workerEmitter.ts)
- `apps/web/server/config/` (sources.ts)
- `apps/web/server/index.ts` (boot lifecycle)
- `apps/web/prisma/schema.prisma` + migrations dir
- `apps/web/scripts/` (check_feeds.ts)
- `apps/web/src/components/` (NewsCard.tsx, Sidebar.tsx, subscription/UpgradePrompt.tsx)
- `apps/web/src/pages/` (Bookmarks.tsx)
- `apps/web/src/hooks/` (useCredibility.ts)
- `apps/web/src/lib/utils.ts`
- `apps/web/src/config/regionMetadata.ts`
- `apps/web/src/types/index.ts`, `packages/types/index.ts`
- `apps/web/src/App.tsx`, `apps/web/src/routes.ts`
- `apps/web/public/locales/en/common.json`

**Files scanned:** ~30 (all read-only)
**Pattern extraction date:** 2026-05-03
