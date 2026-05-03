# Phase 40: Content Expansion — Research

**Researched:** 2026-05-03
**Domain:** Content aggregation (news / podcasts / video) + transcription + Premium-tier gating
**Confidence:** HIGH (codebase patterns + locked decisions); MEDIUM (third-party API stability)

---

## Summary

Phase 40 layers three new content axes onto the existing `apps/web` Express + Prisma + Redis stack. The work is bounded by 11 locked decisions in `40-CONTEXT.md` and five cross-cutting constraints, so research focuses on **operationalizing** those decisions rather than evaluating alternatives. All locked libraries (`rss-parser` 3.13, `openai` 6.35, `lite-youtube-embed` 0.3.4) and patterns (`requireTier` middleware, FTS GIN migration, `app-worker` Swarm service) already exist in the codebase or in npm — verified.

The three risk concentrations the planner must internalize:

1. **`PerspectiveRegion` is duplicated in TWO source-of-truth files** (`packages/types/index.ts:5-18` and `apps/web/src/types/index.ts:1-14`). Both must be extended together with the 4 new sub-regions, plus 8 downstream consumers. Skipping any one breaks framing analysis, region colors, i18n, or filters at runtime.
2. **`apps/web/src/lib/platform.ts::isNativeApp()` does not exist yet** — Phase 39 creates it. Phase 40 plans must declare a hard dependency on Phase 39 completion or fall back to inline `Capacitor.getPlatform()` checks (only acceptable if Phase 39 ships first).
3. **The `/podcasts` page itself is FREE-tier on web AND on mobile** — only transcripts are Premium-gated. The reader-app exemption (CC-01) hides the upgrade CTA on mobile but the page stays accessible. Easy to misread the rule and over-gate.

**Primary recommendation:** Treat Phase 40 as **3 parallel sub-phases (A=sources, B=podcasts, C=video) sharing 1 cross-cutting prep plan** (PerspectiveRegion extension + `Transcript` model + `Video` model + `Podcast` model migrations + worker hooks). Sub-phase order: prep → A in parallel with B-prep+C-prep → B and C complete in parallel. CONT-04 / CONT-06 transcription rides on top of B and C.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Area A — Source curation (CONT-01, CONT-02)**
- **D-A1** Source allocation = mixed strategy (deepen 13 + carve 4 sub-regions + diversity uplift)
- **D-A2** Carve 4 new sub-regions: `sudostasien`, `nordeuropa`, `sub-saharan-africa`, `indien` — extend `PerspectiveRegion` type, add region color, i18n in DE/EN/FR, framing-grid cells; NO backfill
- **D-A3** Hard bias-balance per region (17 total): each region has ≥1 source per left/center/right bucket; honest exception via `biasDiversityNote: 'limited'` for `russland`/`china`. Curation script blocks merge.
- **D-A4** Human curation review before merge: planner produces `apps/web/scripts/proposed-sources/70-sources-proposed.md` for user sign-off, THEN diff to `sources.ts`.

**Area B — Podcast discovery + linking (CONT-03)**
- **D-B1** Multi-source: Podcast Index (HMAC SHA-1) + curated `apps/web/server/config/podcasts.ts` + iTunes Search API (no auth)
- **D-B2** Match strategy = entity + topic keyword search; cache `podcast:related:{articleId}` in Redis 24h; zero AI calls for matching
- **D-B3** Two UI surfaces: inline lazy "Related podcast episodes" in `NewsCard` + dedicated `/podcasts` page

**Area C — Transcription (CONT-04, CONT-06)**
- **D-C1** Transcription source = YouTube auto-captions (free) + OpenAI Whisper API fallback ($0.006/min); 30-day Redis cache + permanent Postgres `Transcript` table
- **D-C2** Hybrid schedule: pre-transcribe curated podcasts (worker, overnight); lazy-transcribe Podcast Index discoveries + videos on first Premium "show transcript" click

**Area D — Video discovery + embed + quota (CONT-05, CONT-07)**
- **D-D1** Hybrid: curated `apps/web/server/config/video-channels.ts` (~20-30 channels) → daily RSS poll → local `Video` table; per-article matching local-first, YouTube Data API search as fallback capped at **50 searches/day** (Redis daily counter)
- **D-D2** Player = `lite-youtube-embed` + custom Vimeo lite component; `react-player` rejected; standard YouTube iframe rejected

**Cross-cutting**
- **CC-01** Premium gates respect Phase 39 reader-app exemption: mobile shows neutral text + plain-text `newshub.example` (no link); web uses existing `UpgradePrompt` + `/pricing`
- **CC-02** Tier gating: `requireTier('PREMIUM')` for hard gates; `attachUserTier` for soft attach; `aiTierLimiter` is the analog for YouTube quota counter (D-D1) and optional Whisper cost cap (Q-04)
- **CC-03** Anti-pattern enforcement: ZERO writes to root `server/`, `prisma/`, `src/` (per `.planning/.continue-here.md`)
- **CC-04** i18n: DE/EN/FR for every new user-facing string; new namespace files under `apps/web/public/locales/{de,en,fr}/`
- **CC-05** All transcripts MUST support timestamp navigation + searchable text; `Transcript.segments` JSONB stores `[{startSec, endSec, text}, ...]`

### Claude's Discretion (planner consumes Q-XX recommendations from this RESEARCH.md table)

- **Q-01** Worker scheduling cadence for curated podcast pre-transcribe job
- **Q-02** Postgres index strategy for `Video` model FTS
- **Q-03** Quota-cap enforcement mechanism for YouTube Data API
- **Q-04** Whether to add Whisper API monthly cost circuit-breaker
- **Q-05** Search UI scope on `/podcasts` page
- **Q-06** Sub-region carving strategy (re-classify existing articles vs forward-only)

### Deferred Ideas (OUT OF SCOPE)

Embedding-based semantic similarity (pgvector); AssemblyAI speaker diarization; self-hosted faster-whisper; topic-cluster–driven podcast matching; Vimeo API search; Twitch/SoundCloud/Wistia; in-app podcast subscribe/download; re-classifying existing articles to new sub-regions; Apple Podcasts paid tier; Apple Music subscriber-only podcasts; standard YouTube iframe; `react-player`; Whisper cost circuit-breaker (default off); cross-content unified search; Whisper-overriding YouTube auto-captions for quality.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | System aggregates from 200+ news sources (up from 130) | Area A — `apps/web/server/config/sources.ts` extension; bias-balance script; `apps/web/scripts/check_feeds.ts` validation pattern |
| CONT-02 | System supports new regions/languages for source expansion | Area A — `PerspectiveRegion` extension (D-A2); region metadata, colors, i18n, framing grid |
| CONT-03 | User can browse podcast episodes related to news topics | Area B — Podcast Index + iTunes + curated baseline; entity+topic match; `/podcasts` page + inline NewsCard surface |
| CONT-04 | Podcast episodes show transcription (premium feature) | Area C — Whisper API + `<podcast:transcript>` RSS tag check; hybrid pre/lazy schedule; `requireTier('PREMIUM')` gate; `Transcript` model with timestamped segments |
| CONT-05 | User can view embedded video content (YouTube/Vimeo) | Area D — `lite-youtube-embed` + custom Vimeo lite; curated channel index + per-article fallback |
| CONT-06 | Video content includes auto-generated transcription (premium) | Area C — `youtube-caption-extractor` for free auto-captions, Whisper fallback; same `Transcript` model |
| CONT-07 | Content pipeline handles video/audio with minimal storage costs | Area D — embed-first (no transcoding), local indexes for free providers; YouTube quota cap; Cloudinary fetch for thumbnails (existing) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Source RSS validation | API/Backend | — | `rss-parser` runs Node-side; no browser path |
| Bias-balance gate | CI / Build | API/Backend | Pre-commit/CI script reads `sources.ts` source-of-truth; runs in Node |
| `PerspectiveRegion` enum | Shared types (`packages/types`) | Browser + Backend | Single declaration consumed by both UI filters and server perspective tagging |
| Podcast Index search | API/Backend | — | HMAC SHA-1 secret never exposed to browser |
| iTunes Search | API/Backend | (could be browser, but unify with Podcast Index for caching) | Server-side proxy enables Redis cache + rate-limit pooling |
| Curated podcast RSS poll | Worker (`app-worker` replicas=1) | — | Singleton job per Phase 37 D-XX; web replicas RUN_JOBS=false |
| `<podcast:transcript>` detection | Worker | — | Runs during RSS parse on worker |
| Whisper transcription | Worker | API/Backend (lazy on demand) | Pre-transcribe = worker; lazy-on-click = API endpoint enqueues to worker queue OR runs inline |
| YouTube auto-caption fetch | API/Backend | — | Lazy, on Premium click; `youtube-caption-extractor` runs Node-side |
| YouTube channel RSS poll | Worker | — | Daily job; same pattern as podcast RSS poll |
| YouTube Data API search | API/Backend | — | Quota counter in Redis; secret API key |
| YouTube quota counter | API/Backend (Redis) | — | Mirrors `aiTierLimiter` Redis store pattern |
| `lite-youtube-embed` player | Browser | — | Web component renders thumbnail; iframe loads on user click |
| Vimeo lite component | Browser | API/Backend (oEmbed proxy for thumbnail) | Browser-only after thumbnail URL resolved (Vimeo oEmbed CORS-permits browser fetch but server proxy gives caching) |
| Premium gate UI | Browser | — | `UpgradePrompt` (web) / plain-text fallback (mobile via `isNativeApp()`) |
| Transcript timestamp seek | Browser | — | Click segment → `audio.currentTime = startSec` |
| Transcript text search | Browser (client-side filter) | API/Backend (Postgres FTS for cross-episode search) | Within-transcript search = client; `/podcasts` cross-episode = server FTS |

## Standard Stack

### Core (existing in codebase — verified at versions below)

| Library | Installed Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `rss-parser` | 3.13.0 [VERIFIED: apps/web/package.json:114; npm view rss-parser version → 3.13.0] | RSS feed parse for sources, podcasts, video channels | Already used by `newsAggregator.ts:22-28` and `scripts/check_feeds.ts:1-10`; supports custom namespaces (needed for `<podcast:transcript>`) |
| `openai` | 6.35.0 [VERIFIED: npm view openai version → 6.35.0; pkg.json declares ^6.27.0] | Whisper transcription (`audio.transcriptions.create`) + existing AI calls | Already imported for `aiService.ts`; reuse same client |
| `ioredis` | 5.10.1 [VERIFIED: package.json] | Redis cache for `transcript:*`, `podcast:related:*`, `youtube:quota:*` keys | Already used by `CacheService` + adapter |
| `@socket.io/redis-emitter` | 5.1.0 [VERIFIED: package.json] | Worker → web fanout for "transcription complete" events | Already used by `workerEmitter.ts` |
| `prisma` / `@prisma/client` | 7.7.0 [VERIFIED: package.json] | New `Transcript`, `Video`, `Podcast`, `PodcastEpisode` models | Existing ORM; FTS via `Unsupported("tsvector")` per Phase 38 pattern |
| `zod` | 4.3.6 [VERIFIED: package.json] | API request/response validation for new podcast/video/transcript endpoints | CLAUDE.md requires zod at boundaries |
| `react-i18next` + `i18next-icu` | 17.0.4 / 2.4.3 [VERIFIED: package.json] | New `podcasts.json`, `videos.json`, `sources.json` namespaces in DE/EN/FR | Existing pattern |

### New dependencies to add

| Library | Recommended Version | Purpose | When to Use |
|---------|---------------------|---------|-------------|
| `lite-youtube-embed` | 0.3.4 [VERIFIED: npm view → 0.3.4] | Web component thumbnail-then-iframe player for YouTube | D-D2 player (no React wrapper needed — web component imports directly into React via tag + side-effect import; ~3KB initial cost) |
| `youtube-caption-extractor` | 1.9.1 [VERIFIED: npm view → 1.9.1] | Extract YouTube auto-captions free | D-C1 free transcript path (TypeScript types built-in; supports both XML and JSON fallback per package docs) |
| `ffmpeg-static` + `fluent-ffmpeg` | 5.3.0 / 2.1.3 [VERIFIED: npm view] | Chunk podcast audio >25MB into ≤25MB segments for Whisper | C2 chunking (only on worker; ffmpeg-static ships precompiled binaries, ~70MB but worker image only) |

### Hand-roll vs npm — podcast index client

| Approach | Tradeoff | Recommendation |
|----------|----------|----------------|
| `podcast-api` 2.0.4 npm | Maintained Node SDK for Podcast Index; abstracts HMAC | **Use it** — auth is fiddly enough that hand-rolling is anti-pattern (CONTEXT.md `<specifics>` flagged this) |
| Hand-roll `podcastIndexService.ts` with crypto.createHash | ~30 LoC; full control; no dep risk | Acceptable fallback IF the SDK proves unmaintained — verify last-publish on `podcast-api` before committing |

[VERIFIED: npm view podcast-api version → 2.0.4 (newer than the older `@podcastindex-org/sdk` which 404s on registry)]

**Installation:**
```bash
pnpm --filter @newshub/web add lite-youtube-embed youtube-caption-extractor ffmpeg-static fluent-ffmpeg podcast-api
pnpm --filter @newshub/web add -D @types/fluent-ffmpeg
```

**Version verification (run before plan):** `pnpm --filter @newshub/web outdated` for each above; lock to verified majors.

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser/Mobile)                          │
│   ┌──────────────┐  ┌──────────────────┐  ┌────────────┐  ┌──────────────┐  │
│   │  NewsCard +  │  │  /podcasts page  │  │ /videos    │  │ Transcript   │  │
│   │  Related     │  │  (FREE access)   │  │ (embedded  │  │ Drawer       │  │
│   │  Podcasts    │  │  + search        │  │ in cards)  │  │ (Premium)    │  │
│   │  (lazy)      │  │                  │  │            │  │              │  │
│   └──────┬───────┘  └─────────┬────────┘  └─────┬──────┘  └──────┬───────┘  │
│          │                    │                  │                │          │
│          │  isNativeApp()? ───┴── if true: hide /pricing CTA, plain text     │
└──────────┼────────────────────┼──────────────────┼────────────────┼─────────┘
           │                    │                  │                │
           ▼                    ▼                  ▼                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          API/BACKEND (web replicas)                           │
│   GET /api/podcasts/related/:articleId   (24h Redis cache; soft attach tier)  │
│   GET /api/podcasts                       (browse curated; FREE)              │
│   GET /api/podcasts/search                (FTS; episode-title FREE,           │
│                                            transcript-excerpt PREMIUM)        │
│   GET /api/podcasts/:id/transcript        (requireTier('PREMIUM'))            │
│   POST /api/podcasts/:id/transcribe       (requireTier; enqueue or run)       │
│   GET /api/videos/related/:articleId      (local FTS; YouTube API fallback    │
│                                            via youtubeQuota middleware)       │
│   GET /api/videos/:id/transcript          (requireTier('PREMIUM'))            │
└─────────┬─────────────────┬──────────────────────────┬──────────────────────┘
          │                 │                          │
          ▼                 ▼                          ▼
   ┌──────────┐    ┌──────────────────┐      ┌──────────────────┐
   │ Postgres │    │ Redis            │      │ External APIs    │
   │          │    │ • transcript:*   │      │ • Podcast Index  │
   │ NewsArt. │    │ • podcast:rel:*  │      │   (HMAC SHA-1)   │
   │ Source   │    │ • youtube:       │      │ • iTunes Search  │
   │ Podcast* │    │     quota:*      │      │   (no auth)      │
   │ PodEpis* │    │ • user:tier:*    │      │ • OpenAI Whisper │
   │ Video*   │    │ (5min)           │      │ • YouTube Data   │
   │ Trans-   │    └──────────────────┘      │   API v3         │
   │  cript*  │                              │ • youtube-       │
   │ (FTS GIN)│                              │   caption-       │
   └──────────┘                              │   extractor      │
                                             │   (yt private)   │
                                             └──────────────────┘
                                                      ▲
                                                      │
┌─────────────────────────────────────────────────────┴────────────────────────┐
│             WORKER (app-worker Swarm service, replicas=1, RUN_JOBS=true)      │
│   • Daily: poll curated podcast RSS feeds → detect new episodes              │
│     → check <podcast:transcript> tag → if absent, queue Whisper transcription │
│   • Daily: poll curated YouTube channel RSS → upsert into Video table         │
│   • On-demand (Pub/Sub from API): Whisper transcription for podcast/video    │
│   • Emits 'transcript:ready' via workerEmitter for live UI update            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
apps/web/
├── server/
│   ├── config/
│   │   ├── sources.ts                          # EXTEND: +70 sources, biasDiversityNote field
│   │   ├── podcasts.ts                         # NEW: ~30-50 curated podcast feeds
│   │   └── video-channels.ts                   # NEW: ~20-30 YouTube channels (handle + resolved channelId)
│   ├── services/
│   │   ├── podcastIndexService.ts              # NEW: HMAC SHA-1 wrapped Podcast Index calls
│   │   ├── itunesPodcastService.ts             # NEW: iTunes Search proxy + cache
│   │   ├── podcastMatcherService.ts            # NEW: D-B2 entity+topic match + dedupe + rank
│   │   ├── transcriptService.ts                # NEW: Whisper + YouTube captions orchestrator
│   │   ├── videoIndexService.ts                # NEW: video local FTS query + YouTube API fallback
│   │   └── youtubeService.ts                   # NEW: YouTube Data API + RSS feed parsing
│   ├── middleware/
│   │   └── youtubeQuota.ts                     # NEW: Redis daily counter, mirrors aiTierLimiter
│   ├── routes/
│   │   ├── podcasts.ts                         # NEW: /api/podcasts/* endpoints
│   │   └── videos.ts                           # NEW: /api/videos/* endpoints
│   └── jobs/
│       ├── podcastTranscribeJob.ts             # NEW: nightly pre-transcribe (Q-01)
│       ├── videoChannelPollJob.ts              # NEW: daily RSS poll → upsert Video rows
│       └── workerEmitter.ts                    # EXTEND: emitTranscriptReady(transcriptId)
├── prisma/
│   ├── schema.prisma                           # EXTEND: NewsSource (+biasDiversityNote);
│   │                                           #         NEW models: Podcast, PodcastEpisode,
│   │                                           #         Video, Transcript
│   └── migrations/
│       ├── 20260504_40_perspective_regions/    # NEW: data-only (no schema change — perspective is String)
│       ├── 20260504_40_content_models/         # NEW: Podcast, PodcastEpisode, Video, Transcript tables
│       └── 20260504_40_video_fts/              # NEW: tsvector + GIN (Q-02)
├── scripts/
│   ├── check-source-bias-coverage.ts           # NEW: D-A3 gate
│   ├── proposed-sources/
│   │   └── 70-sources-proposed.md              # NEW: D-A4 human review artifact
│   └── resolve-youtube-handles.ts              # NEW: one-shot @handle → UC… resolver (cached output to video-channels.ts)
├── src/
│   ├── types/index.ts                          # EXTEND: PerspectiveRegion enum +4 values
│   ├── config/regionMetadata.ts                # EXTEND: REGION_GEO_METADATA, REGION_DISPLAY_NAMES +4
│   ├── lib/utils.ts                            # EXTEND: getRegionColor, getRegionLabel +4
│   ├── components/
│   │   ├── ClusterSummary.tsx                  # EXTEND: REGION_COLORS_HEX, REGION_LABELS +4
│   │   ├── podcasts/
│   │   │   ├── RelatedPodcasts.tsx             # NEW: lazy "Related podcast episodes" inline
│   │   │   ├── PodcastPlayer.tsx               # NEW: <audio> with timestamp seek
│   │   │   ├── PodcastEpisodeCard.tsx          # NEW
│   │   │   └── TranscriptDrawer.tsx            # NEW: shared with videos; uses isNativeApp()
│   │   ├── videos/
│   │   │   ├── EmbeddedVideo.tsx               # NEW: dispatches to LiteYouTube or LiteVimeo
│   │   │   ├── LiteYouTube.tsx                 # NEW: ~30-line wrapper around lite-youtube-embed web component
│   │   │   └── LiteVimeo.tsx                   # NEW: ~80-line custom click-to-load with oEmbed thumbnail
│   │   └── Sidebar.tsx                         # EXTEND: add Podcasts entry (alphabetical)
│   ├── pages/
│   │   ├── PodcastsPage.tsx                    # NEW: /podcasts (FREE-accessible)
│   │   └── (no separate /videos page — videos render inline in NewsCard)
│   └── i18n/                                   # NOTE: actual i18n files live at apps/web/public/locales/
└── public/locales/{de,en,fr}/
    ├── podcasts.json                            # NEW
    ├── videos.json                              # NEW
    ├── sources.json                             # NEW (region labels + bias-diversity note text)
    └── common.json                              # EXTEND: navigation.podcasts label
packages/types/index.ts                          # EXTEND: PerspectiveRegion enum +4 values (mirror src/types)
```

### Pattern 1: PerspectiveRegion Extension (D-A2)
**What:** Add 4 enum values in BOTH type-source files plus 8+ consumer files.
**When:** First plan of phase (cross-cutting prep).

```typescript
// apps/web/src/types/index.ts AND packages/types/index.ts (must stay in sync)
export type PerspectiveRegion =
  | 'usa' | 'europa' | 'deutschland' | 'nahost' | 'tuerkei'
  | 'russland' | 'china' | 'asien' | 'afrika' | 'lateinamerika'
  | 'ozeanien' | 'kanada' | 'alternative'
  | 'sudostasien' | 'nordeuropa' | 'sub-saharan-africa' | 'indien';
```

**TypeScript will surface every consumer** because `Record<PerspectiveRegion, T>` types in `regionMetadata.ts`, `ClusterSummary.tsx`, `getRegionColor`, `getRegionLabel` will fail compilation until updated. Use `pnpm typecheck` as the verification gate. [CITED: apps/web/src/types/index.ts:1-14, apps/web/src/config/regionMetadata.ts:8-87, apps/web/src/lib/utils.ts:50-86, apps/web/src/components/ClusterSummary.tsx:50-80]

### Pattern 2: Postgres FTS via Raw Migration (Phase 38 mirror, Q-02)
**What:** Generated tsvector column + GIN index for `Video` (and optionally `Transcript.segments` per Q-05).

```sql
-- apps/web/prisma/migrations/20260504_40_video_fts/migration.sql
ALTER TABLE "Video"
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX video_search_tsv_idx ON "Video" USING GIN (search_tsv);
```

[CITED: apps/web/prisma/migrations/20260429120000_38_news_article_fts/migration.sql] — Use config `'simple'` (NOT `'english'`) per Phase 38 RESEARCH precedent: multilingual content + uniform tokenization without language-specific stemming. Schema declaration: `searchTsv Unsupported("tsvector")? @map("search_tsv")` + `@@index([searchTsv], type: Gin)`.

### Pattern 3: Worker Job Scheduling (D-C2 / D-D1, mirrors cleanupService)

```typescript
// apps/web/server/jobs/podcastTranscribeJob.ts
export class PodcastTranscribeJob {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly DAY_MS = 24 * 60 * 60 * 1000;

  start(): void {
    // Runs nightly at process boot + every 24h (Q-01 default = nightly batch)
    this.runOnce().catch(err => logger.error('podcast transcribe initial run failed', err));
    this.intervalId = setInterval(() => {
      this.runOnce().catch(err => logger.error('podcast transcribe scheduled run failed', err));
    }, this.DAY_MS);
  }
  // ...
}
```

[CITED: apps/web/server/services/cleanupService.ts:39-72] — Same `start()`/`stop()`/`runOnce()` shape; gated on `RUN_JOBS=true` in `apps/web/server/index.ts:73`.

### Pattern 4: YouTube Data API Quota Counter (Q-03, mirrors aiTierLimiter)

```typescript
// apps/web/server/middleware/youtubeQuota.ts (sketch)
const QUOTA_KEY = (date: string) => `youtube:quota:${date}`;
const DAILY_CAP = 50;

export async function checkAndConsumeQuota(): Promise<boolean> {
  const cache = CacheService.getInstance();
  const client = cache.getClient();
  if (!client) return true; // graceful degradation per existing pattern
  const today = new Date().toISOString().slice(0, 10);
  const key = QUOTA_KEY(today);
  const count = await client.incr(key);
  if (count === 1) {
    // Set expiry only on first increment (atomic-ish; acceptable race for our scale)
    const tomorrowMidnight = Math.floor(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate() + 1, 0, 0, 0
    ) / 1000);
    await client.expireat(key, tomorrowMidnight);
  }
  return count <= DAILY_CAP;
}
```

[CITED: apps/web/server/middleware/rateLimiter.ts:115-174] — Mirrors `aiTierLimiter` Redis-store pattern; key namespace + skip-on-Redis-down + tier-aware exemptions all carry over.

### Pattern 5: Premium Gate with Mobile Exemption (CC-01)

```tsx
// apps/web/src/components/podcasts/TranscriptDrawer.tsx (sketch)
import { isNativeApp } from '../../lib/platform';
import { UpgradePrompt } from '../subscription/UpgradePrompt';

export function TranscriptDrawer({ isPremium, ... }: Props) {
  if (!isPremium) {
    return isNativeApp() ? (
      <div className="p-4 text-sm text-gray-300">
        {t('transcripts.notAvailable')}
        {' '}
        {t('transcripts.visitWeb')}
        {' '}
        <span className="font-mono">newshub.example</span>
      </div>
    ) : (
      <UpgradePrompt feature={t('transcripts.feature')}>
        {/* blurred preview */}
      </UpgradePrompt>
    );
  }
  // ... rendered transcript with timestamp segments
}
```

[CITED: apps/web/src/components/subscription/UpgradePrompt.tsx:20-74; CONTEXT.md CC-01] — `newshub.example` is plain text, NOT a clickable `<a>` (App Review risk per Apple Rule 3.1.1(a)).

### Anti-Patterns to Avoid

- **Writing to root `server/`, `prisma/`, `src/`** — physically deleted in commit 651ce93 (Phase 36.3-03). Every new file under `apps/web/...`. [CC-03]
- **Hand-rolling YouTube channel ID resolution from page-source regex** at runtime — quota-free but fragile. Resolve at build/seed time via `channels.list?forHandle=@handle&part=id` (1 unit each, ~30 calls one-shot = trivial), bake into `video-channels.ts` as `{ handle, channelId }` pairs.
- **Allowing transcript Whisper calls without quota guard in dev** — easy to burn through OpenAI credits during tests. All Whisper calls must check `process.env.WHISPER_DISABLED === 'true'` for E2E + use `whisper-1` mock in vitest.
- **Re-implementing tier middleware** — use `requireTier('PREMIUM')` and `attachUserTier` verbatim. [CC-02]
- **Polluting `app.locals` with new aggregator instances** — Phase 37 explicitly removed `req.app.locals.newsAggregator`. New `podcastService` / `videoService` follow same pattern: getInstance() singletons imported directly. [CITED: apps/web/server/index.ts:144-148]
- **Using `network-only` fetch in podcast/video lazy queries** — TanStack Query default `staleTime` 24h on `podcast:related:*` aligns with Redis cache TTL.
- **`response_format: 'json'` on Whisper** — only `verbose_json` returns segments[] with start/end timestamps required by CC-05.
- **YouTube auto-caption fetch returning `null` on private/captions-disabled videos** silently — must surface "captions unavailable, falling back to Whisper" path explicitly with logger warn.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS feed parsing | XML parser + custom logic | `rss-parser` (already installed) | Handles namespace tags (`<podcast:transcript>`), date parsing, GUID extraction |
| Podcast Index HMAC auth | `crypto.createHash('sha1')` per-call boilerplate | `podcast-api` 2.0.4 npm | Auth is fiddly (3 headers, time-window check, hex lowercase); SDK encapsulates |
| YouTube transcript scraping | Reverse-engineer YouTube internal endpoints | `youtube-caption-extractor` 1.9.1 | Already maintains the YouTube internals workaround + has TS types + supports XML/JSON fallback |
| YouTube embed player | Vanilla iframe + thumbnail logic | `lite-youtube-embed` 0.3.4 | Web component, ~3KB, automatic thumbnail + click-to-iframe; preserves LCP < 2s budget |
| Audio chunking >25MB | Stream parser + manual byte-split | `ffmpeg-static` + `fluent-ffmpeg` | mp3/m4a/ogg byte-split corrupts headers; ffmpeg `-f segment -segment_time 600 -c copy` is the canonical solution |
| Tier-aware route guard | `if (user.tier !== 'PREMIUM')` checks scattered | `requireTier('PREMIUM')` middleware | Already includes status-grace-period + cache + invalidation contracts |
| Daily quota counter | `setInterval` + in-memory map | Redis `INCR` + `EXPIREAT` (mirrors `aiTierLimiter`) | Survives restarts + works across worker + web replicas |
| Region color/label lookup | Per-component `Record<...>` literals | `getRegionColor`, `getRegionLabel`, `REGION_DISPLAY_NAMES` | Already exist; extend in one place to cover 4 new regions |
| OAuth + email + Stripe — N/A this phase | — | — | — |

**Key insight:** Every "Don't Hand-Roll" entry has a verified npm package with maintained TypeScript types. The only judgment call is `podcast-api` (2.0.4, last published 2024 — verify maintenance during planning); fallback is a 30-line `apps/web/server/services/podcastIndexService.ts` wrapping `crypto.createHash('sha1').update(key + secret + unixTime).digest('hex')`.

## Runtime State Inventory

> N/A — Phase 40 is greenfield content addition, not rename/refactor/migration. No existing state to migrate (CONTEXT.md Q-06 default = no backfill of articles to new sub-regions).

## Common Pitfalls

### Pitfall 1: PerspectiveRegion duplicated in two files (silent drift)
**What goes wrong:** `packages/types/index.ts` and `apps/web/src/types/index.ts` both declare the enum. Updating only one passes some typechecks but breaks consumers that import from the other.
**Why it happens:** Monorepo type sharing is incomplete — historical artifact, not a deliberate design.
**How to avoid:** Single PR/plan modifies BOTH files atomically; CI typecheck across `apps/web` + `packages/types` catches drift. Add a unit test `packages/types` exports include all `apps/web/src/types` exports.
**Warning signs:** A `Record<PerspectiveRegion, X>` is incomplete-coverage error after the change → you missed a file.

### Pitfall 2: Whisper 25MB upload limit silently truncates long episodes
**What goes wrong:** Podcast episodes >2 hours can exceed 25MB at common bitrates (192kbps × 7200s ≈ 173MB). OpenAI returns 413 + opaque error.
**Why it happens:** Hard server-side cap; SDK does not chunk for you.
**How to avoid:** ffmpeg-static segment step BEFORE upload; recommended 10-min chunks (~14MB at 192kbps mp3, comfortable margin). Merge per-chunk `verbose_json` segments by adding chunk-offset to each `start`/`end`.
**Warning signs:** OpenAI 413 in worker logs; transcript JSON arrays end abruptly mid-episode. [CITED: https://platform.openai.com/docs/guides/speech-to-text — file size limit; community thread confirms]

### Pitfall 3: YouTube quota silently exhausted by background polls
**What goes wrong:** Daily channel-RSS poll (~30 channels × 3 new videos × 1 unit `videos.list` for `contentDetails`) plus search fallback can easily exceed 10k/day if local-index miss rate spikes.
**Why it happens:** RSS feed has NO `duration` field → must call `videos.list?part=contentDetails` per video for `durationSec`. CONTEXT.md math (5090/10000) assumes good local-hit rates.
**How to avoid:** Q-03 quota counter is the structural fix. Also: batch `videos.list?id=v1,v2,v3` (50 IDs per request → 1 unit per batch, not per video). Skip duration fetch entirely for videos shorter than `<media:thumbnail>` data hints (some channels include duration in description — parse opportunistically).
**Warning signs:** Sentry error `quotaExceeded` from Google API; daily stat `youtube:quota:{YYYY-MM-DD}` Redis key approaching 50.

### Pitfall 4: `<podcast:transcript>` namespace requires custom rss-parser config
**What goes wrong:** `rss-parser` ignores unknown XML namespaces by default. A naive parse misses `<podcast:transcript url="..." type="text/vtt"/>` entirely → triggers Whisper transcription unnecessarily ($$$).
**Why it happens:** Library defaults to known namespaces only.
**How to avoid:**
```typescript
const parser = new Parser({
  customFields: {
    item: [['podcast:transcript', 'transcripts', { keepArray: true }]],
  },
});
// Then on each item: item.transcripts is an array of { $: { url, type, language?, rel? } }
```
[CITED: https://podcasting2.org/docs/podcast-namespace/tags/transcript; rss-parser README customFields section]
**Warning signs:** Whisper bill higher than projected; spot-check curated podcasts that publishers known to ship transcripts (NPR, NYT The Daily) shows worker triggering Whisper for them.

### Pitfall 5: YouTube auto-captions disabled returns 200 + empty array
**What goes wrong:** `youtube-caption-extractor` returns `[]` (not throw) when video has no captions. If treated as "transcribed successfully", `Transcript` row is empty; user sees nothing.
**Why it happens:** Library design choice — empty result for both "no captions" AND "video unavailable" paths.
**How to avoid:** Treat empty array as "fall back to Whisper". Cache a sentinel `{ provider: 'youtube-captions-unavailable' }` for 7 days to avoid repeat YouTube hits. Then enqueue Whisper.
**Warning signs:** Premium users on certain videos see "Transcript: (empty)" without fallback firing.

### Pitfall 6: iTunes Search returns inconsistent country/language results
**What goes wrong:** iTunes Search defaults to US store. NewsHub serves DE/EN/FR users; querying without `country=` returns US-only podcasts → poor match quality for European users.
**Why it happens:** Apple country-store partitioning.
**How to avoid:** Pass `country` based on user's region/language preference. For multi-region matching (article in `nahost` → search across IL/SA/AE), make 3 parallel calls with different `country=` and dedupe. Stay under 20 req/min by serializing per-server-instance.
**Warning signs:** German users see only US podcasts.

### Pitfall 7: lite-youtube-embed doesn't auto-load styles in CSP-strict environments
**What goes wrong:** Web component injects styles via `adoptedStyleSheets`; some Vite dev configs + production CSP `style-src 'self'` blocks the inline shadow-DOM styles → unstyled boxes.
**Why it happens:** Strict CSP without `'unsafe-inline'` for shadow-DOM constructable stylesheets.
**How to avoid:** Phase 40 inherits the project's existing `index.html` CSP (research the current header before adding). Either vendor the lite-youtube-embed CSS into project Tailwind layer + import the JS-only build, or relax CSP for the component path.
**Warning signs:** Player renders as a blank rectangle in production; CSP violations in browser console.

### Pitfall 8: Bias-balance script blocking on `russland`/`china` if exception not wired
**What goes wrong:** D-A3 says hard gate, but explicit exception via `biasDiversityNote: 'limited'`. If the script doesn't read that field, the exception is dead.
**Why it happens:** Two changes (schema field + script logic) coupled; one without the other breaks the build.
**How to avoid:** Single plan does both: add `biasDiversityNote: String?` to NewsSource model AND make `check-source-bias-coverage.ts` skip regions where any source has `biasDiversityNote = 'limited'` (with an info-level log line).
**Warning signs:** CI fails on master after sources merge with the new field but the script unchanged.

## Code Examples

### Whisper transcription with timestamped segments (D-C1, CC-05)

```typescript
// apps/web/server/services/transcriptService.ts (sketch)
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface Segment { startSec: number; endSec: number; text: string; }

export async function transcribeWithWhisper(filePath: string): Promise<{
  segments: Segment[];
  language: string;
}> {
  const result = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'], // 'word' adds latency + cost
  });
  // verbose_json returns { language, duration, segments: [{ id, start, end, text, ... }] }
  return {
    segments: (result as any).segments.map((s: any) => ({
      startSec: s.start,
      endSec: s.end,
      text: s.text.trim(),
    })),
    language: (result as any).language,
  };
}
```

[CITED: https://platform.openai.com/docs/api-reference/audio/createTranscription; verbose_json includes segments array with start/end seconds — confirmed via WebSearch and openai-node SDK 6.35.0]

### Audio chunking >25MB with ffmpeg (Pitfall 2)

```typescript
// apps/web/server/services/transcriptService.ts (chunking helper)
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
ffmpeg.setFfmpegPath(ffmpegPath as string);

export async function chunkAudio(inputPath: string, outDir: string): Promise<string[]> {
  const segmentSeconds = 600; // 10 min → ~14MB at 192kbps mp3 → safe under 25MB
  const pattern = path.join(outDir, 'chunk_%03d.mp3');
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-f segment', `-segment_time ${segmentSeconds}`, '-c copy'])
      .output(pattern)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
  // Read directory for chunk_000.mp3, chunk_001.mp3, ...
  return fs.readdirSync(outDir)
    .filter(f => f.startsWith('chunk_'))
    .sort()
    .map(f => path.join(outDir, f));
}

// Then transcribe each, offsetting timestamps:
async function transcribeLong(filePath: string): Promise<Segment[]> {
  const chunks = await chunkAudio(filePath, '/tmp/whisper');
  const all: Segment[] = [];
  let offset = 0;
  for (const chunk of chunks) {
    const { segments } = await transcribeWithWhisper(chunk);
    for (const s of segments) all.push({
      startSec: s.startSec + offset,
      endSec: s.endSec + offset,
      text: s.text,
    });
    offset += 600; // chunk length, NOT actual audio duration — close enough for navigation
  }
  return all;
}
```

[VERIFIED: ffmpeg-static 5.3.0 + fluent-ffmpeg 2.1.3 are the standard Node.js ffmpeg wrappers; `-c copy` avoids re-encoding (fast + lossless segment)]

### Podcast Index HMAC auth (D-B1)

```typescript
// apps/web/server/services/podcastIndexService.ts (hand-rolled fallback if podcast-api unavailable)
import crypto from 'crypto';

const KEY = process.env.PODCAST_INDEX_API_KEY!;
const SECRET = process.env.PODCAST_INDEX_API_SECRET!;
const BASE = 'https://api.podcastindex.org/api/1.0';

async function piFetch(path: string, params: Record<string, string>): Promise<any> {
  const apiHeaderTime = Math.floor(Date.now() / 1000).toString();
  const auth = crypto.createHash('sha1').update(KEY + SECRET + apiHeaderTime).digest('hex');
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'NewsHub/2.0 (https://newshub.example)',
      'X-Auth-Date': apiHeaderTime,
      'X-Auth-Key': KEY,
      'Authorization': auth,
    },
  });
  if (!res.ok) throw new Error(`PodcastIndex ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function searchEpisodes(query: string, max = 10) {
  return piFetch('/search/byterm', { q: query, max: String(max), fulltext: '' });
}
```

[VERIFIED: https://podcastindex-org.github.io/docs-api/ — sha1(key+secret+unixTime) lowercase hex; +/- 3min time window]

### iTunes Search (D-B1, no auth)

```typescript
// apps/web/server/services/itunesPodcastService.ts (sketch)
export async function searchPodcasts(term: string, country = 'US', limit = 10) {
  const url = `https://itunes.apple.com/search?` + new URLSearchParams({
    term, country, media: 'podcast', entity: 'podcast', limit: String(limit),
  });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NewsHub/2.0 (https://newshub.example)' },
  });
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  return (await res.json()).results;
}
```

[CITED: iTunes Search API docs — no auth, 20 req/min/IP, `country=` and `entity=podcast` filters]

### YouTube channel RSS parsing (D-D1)

```typescript
// apps/web/server/services/youtubeService.ts (sketch)
import Parser from 'rss-parser';
const parser = new Parser({
  customFields: {
    item: [
      ['yt:videoId', 'videoId'],
      ['yt:channelId', 'channelId'],
      ['media:group', 'mediaGroup'],
    ],
  },
});

export async function fetchChannelRSS(channelId: string) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const feed = await parser.parseURL(url);
  return feed.items.map(item => ({
    youtubeId: item.videoId as string,
    title: item.title!,
    description: (item.mediaGroup as any)?.['media:description']?.[0] ?? '',
    publishedAt: new Date(item.pubDate!),
    thumbnailUrl: (item.mediaGroup as any)?.['media:thumbnail']?.[0]?.$?.url,
    // NOTE: durationSec is NOT in RSS — fetch via videos.list?part=contentDetails (1 unit per batch of 50)
  }));
}
```

[CITED: YouTube provides channel RSS at `youtube.com/feeds/videos.xml?channel_id=UC...` — no auth, no quota]

### lite-youtube-embed React wrapper (D-D2)

```tsx
// apps/web/src/components/videos/LiteYouTube.tsx (~30 lines)
import { useEffect } from 'react';

interface Props { videoId: string; title: string; }

export function LiteYouTube({ videoId, title }: Props) {
  useEffect(() => {
    // Lazy-import the web component module (side-effect: registers <lite-youtube>)
    import('lite-youtube-embed').catch(() => { /* swallow; player just won't init */ });
  }, []);

  return (
    // @ts-expect-error - web component not in JSX intrinsic types
    <lite-youtube
      videoid={videoId}
      playlabel={title}
      class="rounded-lg overflow-hidden border border-[#00f0ff]/20"
    />
  );
}
```

Plus one-time CSS import in main.tsx or component:
```typescript
import 'lite-youtube-embed/src/lite-yt-embed.css';
```

[CITED: https://github.com/paulirish/lite-youtube-embed — web component API; no React port required since v0.3 (web component works inside React); `react-lite-youtube-embed` 3.5.1 is an alternative wrapper if web component CSP issues arise]

### Vimeo lite component (D-D2)

```tsx
// apps/web/src/components/videos/LiteVimeo.tsx (~80 lines)
import { useEffect, useState } from 'react';

interface Props { vimeoId: string; }

interface OEmbed { thumbnail_url: string; title: string; }

export function LiteVimeo({ vimeoId }: Props) {
  const [meta, setMeta] = useState<OEmbed | null>(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}`)
      .then(r => r.json())
      .then(setMeta)
      .catch(() => setMeta({ thumbnail_url: '', title: 'Vimeo Video' }));
  }, [vimeoId]);

  if (activated) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full aspect-video rounded-lg border border-[#00f0ff]/20"
        title={meta?.title}
      />
    );
  }

  return (
    <button
      onClick={() => setActivated(true)}
      className="relative w-full aspect-video rounded-lg overflow-hidden group border border-[#00f0ff]/20"
      aria-label={`Play ${meta?.title ?? 'Vimeo video'}`}
    >
      {meta?.thumbnail_url && (
        <img src={meta.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition">
        <svg className="w-16 h-16 text-[#00f0ff]" /* play icon */ />
      </div>
    </button>
  );
}
```

[CITED: https://vimeo.com/api/oembed.json — public, no auth; thumbnail_url field present in response]

### Bias-balance check script (D-A3)

```typescript
// apps/web/scripts/check-source-bias-coverage.ts
import { NEWS_SOURCES } from '../server/config/sources';
import type { NewsSource } from '../src/types';

type Bucket = 'left' | 'center' | 'right';
const bucket = (b: number): Bucket =>
  b < -0.33 ? 'left' : b > 0.33 ? 'right' : 'center';

const byRegion: Record<string, Record<Bucket, NewsSource[]>> = {};
for (const s of NEWS_SOURCES) {
  byRegion[s.region] ??= { left: [], center: [], right: [] };
  byRegion[s.region][bucket(s.bias.political)].push(s);
}

let failures = 0;
for (const [region, buckets] of Object.entries(byRegion)) {
  const limited = (Object.values(buckets).flat() as NewsSource[])
    .some((s: any) => s.biasDiversityNote === 'limited');
  if (limited) {
    console.log(`ℹ ${region}: limited diversity (exception per D-A3) — skipping`);
    continue;
  }
  for (const b of ['left', 'center', 'right'] as Bucket[]) {
    if (buckets[b].length === 0) {
      console.error(`✗ ${region}: missing source for bucket "${b}"`);
      failures++;
    }
  }
}
process.exit(failures > 0 ? 1 : 0);
```

Wire as `pnpm test:run` step OR pre-commit (recommend pre-commit via husky if configured; otherwise CI step in `.github/workflows/ci.yml` after `pnpm typecheck`). Pre-commit blocks the commit; CI blocks the PR. **Recommendation: BOTH** — local pre-commit for fast feedback, CI as backstop for force-push or skipped hooks.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Standard YouTube iframe | `lite-youtube-embed` web component | 2020-stable; widely adopted by 2023 | ~500KB → ~3KB initial cost; LCP +0 vs +1.5s |
| Whisper response_format `'json'` | `'verbose_json' + timestamp_granularities: ['segment']` | OpenAI 2024 | Required for any timestamp-aware UI |
| Manual ffmpeg CLI shelling out | `fluent-ffmpeg` + `ffmpeg-static` | 2018+; standard since 2020 | Cross-platform, no system ffmpeg required |
| Polling RSS without GUID dedup | `<guid isPermaLink="false">` + Postgres unique constraint | RSS 2.0 standard | Avoids duplicate articles/episodes |
| Hand-rolled HMAC signing | npm `podcast-api` SDK | 2022+ | Reduces auth bug surface |
| `react-player` for embedded video | `lite-youtube-embed` + bespoke per provider | 2022+ Core Web Vitals push | Smaller bundle, no provider-sprawl |

**Deprecated/outdated:**
- Older youtube-transcript packages (`youtube-transcript@1.x`) — use `youtube-caption-extractor` 1.9.1 (more active) or `youtube-transcript-plus` (TypeScript-first)
- `@podcastindex-org/sdk` — 404s on registry; use `podcast-api` 2.0.4 or hand-roll

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `podcast-api` 2.0.4 (npm) is actively maintained enough to use | Standard Stack | Hand-rolled wrapper is 30 LoC; mitigation = fallback to `podcastIndexService.ts` per code example |
| A2 | YouTube Data API quota math (~5090/10000 daily) holds in production with chosen channel set | D-D1 / Pitfall 3 | Underestimate → quota exhaustion → degraded discovery; Q-03 counter limits blast radius |
| A3 | Whisper cost ~$7/mo at 100 Premium users / 5 views/day / 25min / 50% miss / 60% need-Whisper | C4 | Cost overrun → Q-04 circuit breaker becomes mandatory rather than optional |
| A4 | `<podcast:transcript>` adoption in curated podcasts is meaningful (~30-50%) | C5 | If only 10% have transcripts, full-coverage Whisper bill is ~$112/mo (still within budget per CONTEXT.md) |
| A5 | YouTube auto-captions cover ~80% of curated channels' content | C3 | Lower coverage → more Whisper fallback, higher bill |
| A6 | `apps/web/src/lib/platform.ts::isNativeApp()` will exist by Phase 40 execution (Phase 39 dependency) | E2 / CC-01 | Phase 40 must declare hard dep on Phase 39; alternative: inline `Capacitor.getPlatform()` check (acceptable but couples) |
| A7 | Phase 38's `'simple'` tsvector config is right choice for Video FTS too (multilingual content) | Q-02 | English-only `'english'` config gives better stemming for English-heavy news channels but degrades on DW/France 24/NHK |
| A8 | iTunes Search rate limit (20/min/IP) is not exceeded by NewsHub's traffic + per-article match cache | B2 / Pitfall 6 | If exceeded, Apple returns 429; mitigation = Redis cache + serialize per-replica |

## Open Questions

1. **Phase 39 (`platform.ts::isNativeApp()`) ordering**
   - What we know: Phase 39 mobile-apps phase introduces this seam (per `40-CONTEXT.md` CC-01 + `.planning/phases/39-mobile-apps/`).
   - What's unclear: Phase 39's actual completion status vs Phase 40 execution.
   - Recommendation: Plan-checker MUST verify `apps/web/src/lib/platform.ts` exists at execution time; if missing, prepend a "create platform stub" task to Phase 40's first plan.

2. **Existing CSP for lite-youtube-embed shadow DOM (Pitfall 7)**
   - What we know: Vite dev mode is permissive; production CSP is set somewhere (header middleware or meta tag).
   - What's unclear: Exact CSP rules in production.
   - Recommendation: Planner confirms CSP at plan time by grepping for `Content-Security-Policy` in `apps/web/server/middleware/` and `apps/web/index.html`. If `style-src` is strict, vendor lite-youtube-embed CSS into Tailwind layer.

3. **`podcast-api` package maintenance status**
   - What we know: 2.0.4 published; on registry.
   - What's unclear: Last publish date.
   - Recommendation: `npm view podcast-api time` at plan time; if stale (>1 year no patch), default to hand-rolled `podcastIndexService.ts`.

4. **PodcastEpisode primary key strategy**
   - What we know: Need to dedupe across Podcast Index + iTunes + curated baseline.
   - What's unclear: Use podcastguid (Podcasting 2.0 stable ID) vs hash(audioUrl) vs Podcast Index's `id`.
   - Recommendation: Composite: prefer `podcastguid` from `<podcast:guid>` namespace tag (stable across feed-host migrations); fallback to `hash(podcastTitle + episodeTitle + publishedAt)` for sources lacking the tag. Document in plan.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ (assumed; project runs Node 18+) | — | — |
| pnpm | Build | ✓ | — | — |
| PostgreSQL | All persistent storage | ✓ (Docker compose) | 17 | — |
| Redis | Cache + quota counter + adapter | ✓ (Docker compose) | — | Skip rate-limit/quota if unavailable (existing pattern) |
| ffmpeg | Whisper >25MB chunking | ✓ via `ffmpeg-static` npm (ships precompiled binary) | 5.3.0 wrapper / 6.x ffmpeg | None — chunking is required for long episodes |
| OpenAI API key | Whisper transcription | ⚠ (env var `OPENAI_API_KEY`) | — | If missing: skip transcription, return "transcription unavailable" |
| Podcast Index API key + secret | Podcast Index search | ⚠ (env vars new this phase) | — | iTunes Search + curated baseline still functional |
| YouTube Data API key | Per-article video search fallback | ⚠ (env var `YOUTUBE_API_KEY` new this phase) | — | Skip API search; local index only |

**Missing dependencies with no fallback:**
- ffmpeg (mitigated via `ffmpeg-static` npm — automatic install)
- OpenAI API key (mitigated by graceful "transcription unavailable" UX)

**Missing dependencies with fallback:**
- All third-party API keys: degrade to next-best path per the multi-source pattern

## Validation Architecture

> Skipped per `.planning/config.json` `workflow.nyquist_validation: false`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing JWT + `requireTier` middleware |
| V3 Session Management | yes | Inherited from existing auth |
| V4 Access Control | yes | `requireTier('PREMIUM')` for transcript endpoints; `attachUserTier` for soft-gate |
| V5 Input Validation | yes | zod schemas for all new request payloads (article ID, transcript ID, search query) |
| V6 Cryptography | yes | HMAC SHA-1 for Podcast Index (per provider spec); NEVER hand-roll signing — use Node `crypto` |
| V8 Errors & Logging | yes | Wrap all third-party API calls; never leak API keys in error responses |
| V11 Files & Resources | yes | Whisper audio file uploads: stream from URL, never save to repo dir; clean up `/tmp/whisper/*` after chunk-merge |
| V12 API & Web Service | yes | Rate-limit transcript endpoints with `requireTier` + per-user counter (analog of `aiTierLimiter`) for Premium spam-clicking |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Whisper cost-bomb via Premium spam-click | DoS / EoP (cost) | Per-user transcription rate-limit; permanent cache so 2nd click is free |
| Podcast Index API key leak | Information Disclosure | Server-side only; no client exposure; rotate on commit-history check |
| YouTube API key leak | Information Disclosure | Same — server-side only |
| Malicious podcast RSS injecting XML entity attack | Tampering | `rss-parser` disables external entities by default; do not change |
| Podcast audio URL pointing to non-audio resource (SSRF / arbitrary file) | EoP / Tampering | Validate `Content-Type: audio/*` HEAD before download; cap download size at 200MB; whitelist HTTPS-only |
| YouTube auto-caption returning XSS in segment text | Tampering | React escapes by default; do NOT use `dangerouslySetInnerHTML` for transcript display |
| Bias-balance script bypass (CI skip) | Spoofing | Enforce as CI required check on master branch (per CLAUDE.md branch-protection setup) |
| `requireTier` cache poisoning via Redis MITM | EoP | Redis is internal; same trust boundary as Postgres |

## Q-XX Recommendation Summary

| Q | Question | Recommendation | Rationale |
|---|----------|----------------|-----------|
| Q-01 | Worker scheduling cadence (curated podcast pre-transcribe) | **Nightly batch at 03:00 UTC** | Simpler ops; predictable cost; latency for "new episode" is ≤24h which is fine for transcripts (the article is already up; transcript is supplementary). Hourly RSS poll adds churn for marginal latency benefit. Mirrors `cleanupService` daily pattern at `apps/web/server/services/cleanupService.ts:39-72`. |
| Q-02 | Postgres index strategy for `Video` model FTS | **`to_tsvector('simple', title \|\| ' ' \|\| description)` + GIN; raw migration `apps/web/prisma/migrations/20260504_40_video_fts/migration.sql`** | Mirror Phase 38 precedent at `migrations/20260429120000_38_news_article_fts/migration.sql`. `'simple'` config (NOT `'english'`) because curated channels include DW (German), France 24 (French), NHK (English+JP). `'english'` would lose stemming on non-English content. |
| Q-03 | Quota-cap enforcement for YouTube Data API | **Redis `INCR youtube:quota:{YYYY-MM-DD}` + `EXPIREAT` to next-day-midnight UTC; cap=50 search.list calls/day; new middleware `apps/web/server/middleware/youtubeQuota.ts`** | Mirrors `aiTierLimiter` pattern at `apps/web/server/middleware/rateLimiter.ts:115-174`. Graceful degradation: if Redis down, allow request (consistent with existing pattern). Quota exhausted → return `{ source: 'local', fallbackUsed: false }` from search service. |
| Q-04 | Whisper monthly cost circuit-breaker | **NO automatic cap** — rely on observability (Sentry warn at $20/mo, alert at $50/mo). | Per CONTEXT.md default. Pre-transcribe + lazy-with-cache + 30-day Redis hot cache + permanent Postgres cold cache means recurring cost is bounded by NEW Premium users + NEW podcasts. If observability shows breach, add Redis monthly counter + `WHISPER_MONTHLY_BUDGET_USD` env in a follow-up plan. |
| Q-05 | `/podcasts` search UI scope | **Two-tier: episode-title + podcast-name search FREE (Postgres FTS on `Podcast.title \|\| PodcastEpisode.title`); transcript-excerpt search PREMIUM (FTS on `Transcript.fullText` denormalized column or PG `to_tsquery` over `segments` JSONB).** Recommend **adding a `Transcript.searchTsv` column** mirroring `NewsArticle.searchTsv` over a denormalized `fullText TEXT` field (concatenated segment.text). | Episode-title search is high-value low-cost. Transcript search is the killer Premium feature but requires its own FTS column for performance — querying JSONB segments at scale is slow. Denormalize `fullText` once at transcribe time (~50KB per 30-min transcript), index once, query fast. `pg_trgm` rejected: `tsvector` already in use, consistent with Phase 38. |
| Q-06 | Sub-region carving — re-classify existing or forward-only | **Forward-only (CONTEXT.md default)** | Re-classification requires a heuristic (no source-of-truth; would need re-perspective via aiService re-runs = AI cost spike + risk of incorrect re-tagging). Forward-only avoids data migration with no clear value. Existing articles in `asien` stay there; only new articles from `india-source-X` (region: 'indien') publish into the new perspective. |

## Sources

### Primary (HIGH confidence)
- **Podcast Index API docs** — https://podcastindex-org.github.io/docs-api/ — HMAC SHA-1 auth scheme, 3-min time window, free open API
- **OpenAI Audio API** — https://platform.openai.com/docs/api-reference/audio/createTranscription — whisper-1, 25MB limit, verbose_json + timestamp_granularities
- **OpenAI Speech to Text guide** — https://platform.openai.com/docs/guides/speech-to-text — chunking guidance for >25MB
- **YouTube Data API quota** — https://developers.google.com/youtube/v3/determine_quota_cost — search.list=100, videos.list=1, channels.list=1
- **YouTube channels.list forHandle** — https://developers.google.com/youtube/v3/docs/channels/list — `forHandle` parameter for @handle resolution
- **Podcasting 2.0 transcript tag** — https://podcasting2.org/docs/podcast-namespace/tags/transcript — `<podcast:transcript>` spec; well-supported by Buzzsprout/Captivate/Fireside; explicitly Apple-supported
- **lite-youtube-embed** — https://github.com/paulirish/lite-youtube-embed — web component, ~3KB, MIT
- **iTunes Search API** — https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/ — no auth, 20 req/min/IP, country/entity params
- **Codebase: PerspectiveRegion declarations** — `apps/web/src/types/index.ts:1-14`, `packages/types/index.ts:5-18`
- **Codebase: regionMetadata.ts** — `apps/web/src/config/regionMetadata.ts:8-87`
- **Codebase: getRegionColor / getRegionLabel** — `apps/web/src/lib/utils.ts:50-86`
- **Codebase: ClusterSummary REGION_COLORS_HEX** — `apps/web/src/components/ClusterSummary.tsx:50-80`
- **Codebase: aiTierLimiter (mirror for youtubeQuota)** — `apps/web/server/middleware/rateLimiter.ts:115-174`
- **Codebase: requireTier + attachUserTier** — `apps/web/server/middleware/requireTier.ts:31-156`
- **Codebase: cleanupService (mirror for podcast worker)** — `apps/web/server/services/cleanupService.ts:39-72`
- **Codebase: workerEmitter** — `apps/web/server/jobs/workerEmitter.ts:31-86`
- **Codebase: Phase 38 FTS migration** — `apps/web/prisma/migrations/20260429120000_38_news_article_fts/migration.sql`
- **Codebase: existing rss-parser usage** — `apps/web/server/services/newsAggregator.ts:1-28`, `apps/web/scripts/check_feeds.ts:1-60`
- **Codebase: UpgradePrompt** — `apps/web/src/components/subscription/UpgradePrompt.tsx:20-74`
- **Codebase: server entry RUN_JOBS pattern** — `apps/web/server/index.ts:70-73, 144-148`

### Secondary (MEDIUM confidence)
- **react-lite-youtube-embed** — https://www.npmjs.com/package/react-lite-youtube-embed — alternative React port if web-component CSP issues arise (3.5.1 active 2026)
- **youtube-caption-extractor** — https://www.npmjs.com/package/youtube-caption-extractor — 1.9.1, TypeScript types, dual XML/JSON fallback
- **youtube-transcript-plus** — https://github.com/ericmmartin/youtube-transcript-plus — alternative; SRT/VTT/text export
- **podcast-api** — https://www.npmjs.com/package/podcast-api — 2.0.4, Node SDK for Podcast Index (verify maintenance at plan time)
- **ffmpeg-static + fluent-ffmpeg** — Standard Node ffmpeg wrappers; precompiled binaries

### Tertiary (LOW confidence)
- **Podcast.example: NPR/BBC `<podcast:transcript>` adoption rate** — A4 assumption; spot-check curated podcasts.ts list at execution time. WebSearch did not return reliable adoption-percentage data.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via `npm view`; codebase patterns confirmed via grep + Read
- Architecture: HIGH — locked decisions in CONTEXT.md + verified existing patterns
- Pitfalls: MEDIUM-HIGH — most are direct extrapolations from existing code; podcast-namespace + Whisper chunking pitfalls confirmed via official docs
- Q-XX recommendations: HIGH for Q-01..Q-04 (mirror existing patterns); MEDIUM for Q-05 (`Transcript.searchTsv` denormalization is a design call, not a copy of an existing feature)

**Research date:** 2026-05-03
**Valid until:** 2026-06-02 (30 days; revisit if YouTube API quota policy or Whisper pricing changes)
