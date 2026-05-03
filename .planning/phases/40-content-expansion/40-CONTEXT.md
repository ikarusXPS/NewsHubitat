# Phase 40: Content Expansion — Context

**Gathered:** 2026-05-03
**Status:** Ready for planning
**Source:** `/gsd-discuss-phase 40` interactive session — 4 gray areas selected and discussed; 11 locked decisions captured

<domain>
## Phase Boundary

Add three new content axes to NewsHub on top of the existing `apps/web` Express + Prisma + Redis stack:

1. **Source expansion (CONT-01, CONT-02)** — Grow from the current 130 sources across 13 regions to **200+ sources across 17 regions** by (a) deepening existing 13 regions, (b) carving 4 new sub-regions (sudostasien, nordeuropa, sub-saharan-africa, indien), (c) increasing source-type diversity (independent / non-state / South-Global wire services / think-tanks). Curation is human-reviewed before merge.

2. **Podcasts (CONT-03, CONT-04)** — Surface news-relevant podcast episodes both inline in `NewsCard` (lazy "Related podcast episodes" section) and on a new dedicated `/podcasts` page. Multi-source data: Podcast Index (free open API, primary search) + hand-curated `apps/web/server/config/podcasts.ts` (~30-50 news-relevant feeds, guaranteed quality baseline) + Apple iTunes Search API (free secondary discovery). Premium-gated transcripts with timestamp navigation, hybrid pre-transcribe schedule.

3. **Video (CONT-05, CONT-06, CONT-07)** — Embed YouTube + Vimeo videos via lite-loader pattern (zero LCP impact). Discovery: hybrid — local Postgres index of curated channel RSS (~20-30 trusted news channels, e.g. PBS NewsHour, DW, Al Jazeera EN, France 24, Bloomberg, NHK) + per-article YouTube Data API search as quota-capped fallback (≤50 quota-spending searches/day to stay well under the 10k/day quota). Premium-gated transcripts: free YouTube auto-captions when present, Whisper API fallback otherwise.

**NOT in scope** (out of scope per REQUIREMENTS.md or explicitly deferred this phase):
- Self-hosted video / video transcoding pipeline (REQUIREMENTS.md Out of Scope: "storage/bandwidth costs prohibitive — embed-first")
- Apple IAP / Google Play Billing for Premium upgrade-from-mobile (already deferred to v1.7+ per Phase 39 D-10)
- Real-time chat, user-generated content, blockchain (PROJECT.md Out of Scope)
- Embedding-based semantic similarity for podcast match (deferred — entity+topic keyword search is sufficient for v1.6)
- AssemblyAI speaker diarization (deferred — revisit if podcast UI surfaces "who said what" need)
- Self-hosted faster-whisper worker (deferred — revisit if Whisper API costs spike beyond budget)
- Topic-cluster–driven podcast matching (deferred — could be added as a caching layer over entity+topic later)
- Vimeo API search / Vimeo channel indexing (out of scope — Vimeo only embeds when an article URL contains a vimeo.com link)
- Twitch / SoundCloud / Wistia / other video providers (out of scope — only YouTube + Vimeo this phase)

</domain>

<decisions>
## Implementation Decisions

### Area A — Source curation strategy (CONT-01, CONT-02)

- **D-A1 [LOCKED]** — **Source allocation = mixed strategy**. The +70 new sources split across (a) deepening existing 13 regions, (b) carving 4 new sub-regions (D-A2), (c) increasing source-type diversity (independent / non-state outlets in authoritarian regions, South-Global wire services like APA / Xinhua / RIA / TASS / Anadolu / IRNA where missing, think-tanks, academic / policy publications). No single dimension dominates — the curated list satisfies all three.

- **D-A2 [LOCKED]** — **Carve 4 new sub-regions**: `sudostasien` (Southeast Asia, split from `asien`), `nordeuropa` (Nordics, split from `europa`), `sub-saharan-africa` (split from `afrika`), `indien` (India / South Asia, split from `asien`). Each requires:
  - New value in `PerspectiveRegion` type (`packages/types/src/index.ts` + `apps/web/src/types/index.ts`)
  - New region color in the dark-cyber palette (CLAUDE.md "UI Design System")
  - New i18n labels in DE / EN / FR (`apps/web/src/i18n/locales/{de,en,fr}/`)
  - New cells in framing analysis grid (Phase 38 framing service consumes the perspective enum)
  - Backfill: zero existing articles need re-classification; new sub-region sources publish only into their own perspective going forward

- **D-A3 [LOCKED]** — **Hard bias-balance per region**. Every region (existing 13 + 4 new = **17 total**) MUST end with at least one source per bias bucket: left-leaning (`politicalBias < -0.33`), centrist (`-0.33 ≤ politicalBias ≤ 0.33`), right-leaning (`politicalBias > 0.33`). A curation script (`apps/web/scripts/check-source-bias-coverage.ts` or similar) blocks the `sources.ts` diff from merging until the gate passes for all 17 regions. **Honest exception**: regions where state-dominated press makes balance infeasible (`russland`, `china`) are flagged with `biasDiversityNote: 'limited'` in `NewsSource` (new optional field), surfaced in framing-analysis UI as a footnote: "Limited bias diversity available for this region — state-dominated press constrains source balance."

- **D-A4 [LOCKED]** — **Human curation review before merge**. The planner produces `apps/web/scripts/proposed-sources/70-sources-proposed.md` (or similar) with **name + URL + region + bias score + reliability score + 1-2-line rationale per source**, organized by region. User reviews, signs off (one round of edits expected), THEN the diff to `apps/web/server/config/sources.ts` is generated and committed. Adds ~1 plan to the phase but eliminates "wait, why is X in there" surprise post-merge.

### Area B — Podcast discovery + linking (CONT-03)

- **D-B1 [LOCKED]** — **Multi-source podcast data, mirroring the multi-provider AI/translation chain pattern**. Three layers:
  - **Primary search**: Podcast Index (`podcastindex.org`) — free open API, ~4M podcasts, full-text search, episode search. Backend dependency: `podcast-index-api` npm package or direct fetch with HMAC auth.
  - **Curated baseline**: hand-maintained `apps/web/server/config/podcasts.ts` (mirror of `sources.ts` shape) listing ~30-50 news-relevant podcast feeds (e.g. The Daily, Up First, Today in Focus, FAZ Frühdenker, Le Monde en parle, Hard Fork, Stratechery, Echo der Zeit). Same RSS-fetch pattern as news sources. Zero API cost. Guaranteed quality.
  - **Secondary discovery**: Apple Podcasts / iTunes Search API (free, no auth, ~20 req/min rate limit). Lookup-by-id and basic search supplement Podcast Index for podcasts that aren't in the open index.

  Total ongoing cost: **$0/mo** for podcast data. CONT-07's "minimal storage costs" philosophy preserved.

- **D-B2 [LOCKED]** — **Match strategy = entity + topic keyword search using existing JSONB fields**. For each `NewsArticle`, take top 3 entries from `entities` JSONB + top 2 from `topics` JSONB, build a query string, hit Podcast Index search + iTunes search in parallel, rank by recency + popularity (limit 5 episodes per article). Cache results in Redis 24h with key `podcast:related:{articleId}`. **Zero AI calls** for matching. Fast (<1s p95 target). Strong on named entities ("Trump", "Putin", "OPEC"); weaker on abstract topics ("inflation", "climate") — accept the trade-off; revisit with embeddings later if user feedback demands.

- **D-B3 [LOCKED]** — **Both UI surfaces**:
  - **Inline in NewsCard**: a "Related podcast episodes" section, lazy-loaded (`useQuery` with `enabled: isExpanded` pattern), collapsed by default to preserve page weight. Show 1-3 matching episodes with title + duration + publish date + a play button. Expanding the player is `lite-podcast-player` style (click-to-load — same philosophy as D-D2 video player).
  - **Dedicated `/podcasts` page**: new top-level route. Browse all curated podcasts + episode lists + search input + tier-gated transcript access. Discoverable from the Sidebar (new entry, alphabetical position). Reuses `cn` utility, `glass-panel` styling, dark-cyber theme.

### Area C — Transcription provider (CONT-04, CONT-06)

- **D-C1 [LOCKED]** — **Transcription source = YouTube auto-captions (free) + OpenAI Whisper API fallback**.
  - **Videos with YouTube auto-captions** (~80% of YouTube content): scrape via `youtube-transcript-api` npm package (or equivalent). Free. Fast.
  - **Videos without captions + all podcast audio**: OpenAI Whisper API (`whisper-1`), $0.006/min = $0.36/hr. Latency ~30s for 30-min content. 99 languages.
  - **Cache layer**: 30-day Redis cache (`transcript:{contentType}:{id}`) for hot reads + permanent Postgres storage (new `Transcript` model with `id`, `contentType: 'podcast'|'video'`, `sourceId`, `episodeOrVideoId`, `language`, `segments` JSONB with timestamped chunks, `provider: 'youtube-captions'|'whisper'`, `transcribedAt`). Transcribe-once-serve-many.
  - **Cost estimate at ramp**: 100 Premium users × 5 transcript views/day × 25min avg × 50% cache miss × 60% needing Whisper (40% covered by free YouTube captions) = **~$7/mo**. Well within budget.

- **D-C2 [LOCKED]** — **Hybrid transcription schedule**:
  - **Pre-transcribe** the curated `podcasts.ts` (~30-50 feeds): worker job (runs on the existing `app-worker` Swarm service from Phase 37, `RUN_JOBS=true`) detects new episodes via RSS poll, kicks off Whisper transcription overnight, stores in `Transcript` table. Bounded cost ceiling: ~30 podcasts × 5 episodes/wk × 25min × $0.006/min = ~$112/mo at full coverage; in practice much lower because some podcasts have publisher-provided transcripts (check first via `<podcast:transcript>` RSS tag per the Podcasting 2.0 spec).
  - **Lazy-transcribe** Podcast Index discoveries + videos: first Premium "show transcript" click triggers Whisper API; subsequent users hit the cache. Show "Transcribing… (~30s)" progress state with optimistic UI.
  - Premium tier check via existing `attachUserTier` middleware before triggering paid transcription. FREE users see the upgrade gate per existing `UpgradePrompt` pattern (web) / Phase 39 D-09 plain-text rule (mobile).

### Area D — Video discovery + embed + quota (CONT-05, CONT-07)

- **D-D1 [LOCKED]** — **Hybrid video discovery**:
  - **Curated channel index**: maintain `apps/web/server/config/video-channels.ts` (~20-30 trusted news channels: PBS NewsHour, DW News, Al Jazeera English, France 24, Bloomberg, NHK World, Channel 4 News, ARD-aktuell, BBC News, NBC News Now, ABC News In-Depth, etc.). Worker job fetches each channel's RSS feed daily (YouTube provides RSS at `https://www.youtube.com/feeds/videos.xml?channel_id=...`), indexes new videos in a new Postgres `Video` model with `id`, `youtubeId`, `channelId`, `title`, `description`, `tags` (JSONB), `publishedAt`, `durationSec`, `thumbnailUrl`. Postgres FTS GIN index on `title` + `description` (mirror Phase 38's tsvector pattern at `apps/web/prisma/schema.prisma:39,50`).
  - **Per-article matching**: query the local index by entities + topics first (free, fast, no quota burn). Fall back to YouTube Data API search ONLY when local index returns 0 results, capped at **50 quota-spending searches/day** (Redis daily counter `youtube:quota:{YYYY-MM-DD}` mirroring the `aiTierLimiter` pattern at `apps/web/server/middleware/rateLimiter.ts`). At 100 units per search, that's 5000 of the 10k daily quota — leaves headroom for video metadata fetches.
  - **Vimeo**: no API key, no proactive discovery. Detect `vimeo.com/<id>` patterns in article body content; embed inline when found. Roughly mirrors the YouTube fallback path but without the per-article search.

- **D-D2 [LOCKED]** — **Player = lite-youtube-embed + equivalent for Vimeo**. Use `lite-youtube-embed` (Paul Irish, ~3KB) — renders thumbnail + play button; only loads the real YouTube iframe on click. Equivalent click-to-load thumbnail pattern for Vimeo (custom ~200-line component). Aligns with the existing 250KB bundle warning + LCP < 2s + Lighthouse 90+ targets in CLAUDE.md "Performance Budgets". `react-player` rejected as unnecessary scope (covers providers we're not adopting). Standard YouTube iframe rejected as it tanks LCP on multi-video article pages.

### Cross-cutting constraints (apply to all areas)

- **CC-01 [LOCKED]** — **All Premium-gated features (CONT-04 podcast transcripts, CONT-06 video transcripts) MUST respect the Phase 39 reader-app exemption (D-08 / D-09)**. On `isNativeApp() === true` (iOS / Android Capacitor wrapper), the Premium gate UX shows neutral text "This feature is not available on your current plan. Visit newshub.example from your browser to learn more." with `newshub.example` as **plain text, NOT a clickable link**. Web continues to use `UpgradePrompt` with the `/pricing` CTA. Detection seam: `apps/web/src/lib/platform.ts::isNativeApp()`.

- **CC-02 [LOCKED]** — **Tier gating uses the existing middleware stack from Phase 36.4 + Phase 36.5**: `requireTier('PREMIUM')` for hard gates on transcript endpoints, `attachUserTier` for soft attach when the route serves both tiers. AI rate-limiter pattern (`aiTierLimiter` at `apps/web/server/middleware/rateLimiter.ts:115-174`) is the analog for the YouTube Data API daily quota counter (D-D1) and the optional Whisper monthly cost circuit-breaker.

- **CC-03 [LOCKED]** — **Anti-pattern enforcement (per `.planning/.continue-here.md`)**. Every plan's `<files_modified>` MUST live under `apps/web/...`, `apps/<other>/...`, `packages/...`, `.github/...`, `.planning/...`, or named top-level configs. Zero writes to root `server/`, `prisma/`, `src/` (those paths were physically deleted in commit `651ce93` and recreating them silently is a regression). Plan-checker MUST verify paths before sign-off.

- **CC-04 [LOCKED]** — **i18n: DE / EN / FR for every new user-facing string**. New keys land in `apps/web/public/locales/{de,en,fr}/{podcasts,videos,sources}.json` (or per existing namespace conventions). Use `react-i18next` + `i18next-icu` (the `icu` part already wired for plural rules from Phase 23). New region labels (sudostasien, nordeuropa, sub-saharan-africa, indien) extend `regions.json`.

- **CC-05 [LOCKED]** — **All transcripts MUST support timestamp navigation (CONT-04 ROADMAP success criterion #3) AND searchable text (CONT-06 ROADMAP success criterion #5)**. Whisper API natively returns `.srt`/`.vtt` segments with timestamps; YouTube auto-captions also segmented. The `Transcript.segments` JSONB stores `[{startSec, endSec, text}, ...]`. Frontend search filters segments client-side; clicking a segment seeks the audio/video player to `startSec`.

### Claude's Discretion

- **Q-01** — Worker scheduling cadence for the curated podcast pre-transcribe job. Researcher picks: nightly batch (simplest, predictable cost) vs hourly RSS poll → transcribe-on-detect (lower latency for new episodes, more worker churn). Default to nightly batch unless a strong reason emerges.

- **Q-02** — Exact Postgres index strategy for the video local index (D-D1 `Video` model). Default: GIN on `to_tsvector('english', title || ' ' || description)` mirroring the Phase 38 FTS pattern at `apps/web/prisma/schema.prisma:39,50`. Researcher confirms language config (English-only? multilingual via `simple` config?) based on channel-language distribution.

- **Q-03** — Quota-cap enforcement mechanism for the YouTube Data API (D-D1, 50 searches/day). Default: Redis `INCR youtube:quota:{YYYY-MM-DD}` with `EXPIREAT` to next-day-midnight UTC, mirroring the `aiTierLimiter` 24h sliding-window pattern. Quota exhausted → degrade gracefully: skip the API search, return only local-index hits, log warning for observability.

- **Q-04** — Optional Whisper API monthly cost circuit-breaker. Default: NO automatic cap (trust observability + monthly budget review). If the user requests one later, add a Redis monthly counter with a `WHISPER_MONTHLY_BUDGET_USD` env var; on cap-hit, lazy-transcribe degrades to "Transcript temporarily unavailable" banner + Sentry warning.

- **Q-05** — Whether to add a basic search UI on the new `/podcasts` page (search by podcast name, episode title, transcript excerpt for Premium). Default: include podcast-name + episode-title search; transcript-excerpt search Premium-only, Postgres FTS on the new `Transcript.segments` content field. Researcher validates with `pg_trgm` vs `tsvector` based on expected corpus size.

- **Q-06** — Sub-region carving (D-A2): which of the existing 13 regions get articles re-classified vs left as-is. Default: leave existing articles in their original regions (e.g. an article currently tagged `asien` stays `asien` even after `indien` exists); new articles from new-sub-region sources publish into the new perspective going forward. Avoids a backfill migration.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before researching or planning.**

### Phase scope and requirements
- `.planning/ROADMAP.md` lines 349-362 — Phase 40 contract (goal, requirements, success criteria, plans=TBD)
- `.planning/REQUIREMENTS.md` lines 52-60 — CONT-01..CONT-07 verbatim
- `.planning/REQUIREMENTS.md` lines 135-148 — Out of Scope (self-hosted video, RTL, Apple Sign-In, etc.)
- `.planning/PROJECT.md` — Core value (multi-perspective comparison), constraints, current milestone v1.6 framing
- `CLAUDE.md` — anti-pattern rules, monorepo structure (`apps/web/...`), Premium tier middleware, Cloudinary integration, performance budgets, i18n + PWA setup, GDPR/consent, mobile reader-app exemption

### Anti-pattern enforcement
- `.planning/.continue-here.md` — milestone-level anti-pattern registry. Read this BEFORE proposing any `<files_modified>`. Hard rule: zero writes to root `server/`, `prisma/`, `src/`.

### Cross-phase contracts Phase 40 must respect
- `.planning/phases/39-mobile-apps/39-CONTEXT.md` D-08 + D-09 — reader-app exemption + plain-text upgrade UX. Phase 40's Premium gates inherit this rule.
- `.planning/phases/36.4-relocate-plan-03-04-monetization-artifacts/` (full directory) — `requireTier`, `attachUserTier`, `aiTierLimiter` middleware contract. Phase 40 reuses these middleware exports verbatim; do NOT re-implement.
- `.planning/phases/36.5-fix-monetization-followup-bugs/36.5-VERIFICATION.md` — webhook idempotency + Sidebar `subscriptionTier`-derived badge pattern. Tier-gated UI in Phase 40 follows the same `user.subscriptionTier === 'PREMIUM'` derivation, not standalone boolean flags.
- `.planning/phases/38-advanced-ai-features/38-CONTEXT.md` — Postgres FTS pattern (tsvector + GIN index, raw migration). Phase 40 video local-index reuses the same shape for D-Q2.
- `.planning/phases/32-image-pipeline/` — Cloudinary fetch-mode integration. Phase 40 thumbnail handling for podcast cover art and video thumbnails reuses `apps/web/src/lib/cloudinary.ts` + `ResponsiveImage.tsx`.
- `.planning/phases/37-horizontal-scaling/` — `app-worker` Swarm service with `RUN_JOBS=true`. The pre-transcribe + curated-channel-RSS-fetch + Podcast-Index-poll jobs (D-C2, D-D1) MUST run on `app-worker`, not on web replicas.

### Existing codebase surfaces Phase 40 extends
- `apps/web/server/config/sources.ts` (1266 lines, 130 sources) — exact mirror shape for new `podcasts.ts` and `video-channels.ts`
- `apps/web/prisma/schema.prisma` lines 14-68 — `NewsArticle` (uses `entities`/`topics` JSONB for D-B2 matching) + `NewsSource` (extend with `biasDiversityNote` per D-A3)
- `apps/web/src/types/index.ts` + `packages/types/src/index.ts` — `PerspectiveRegion` type to extend with 4 new sub-regions per D-A2
- `apps/web/src/i18n/locales/{de,en,fr}/` — i18n target dirs
- `apps/web/server/services/cacheService.ts` — Redis wrapper for `transcript:*`, `podcast:related:*`, `youtube:quota:*` keys
- `apps/web/server/services/newsAggregator.ts` — RSS fetch + dedup pattern; `podcastService` and `videoService` mirror the same orchestration
- `apps/web/server/middleware/rateLimiter.ts` lines 115-174 — `aiTierLimiter` pattern for YouTube quota cap (Q-03) and optional Whisper cost cap (Q-04)
- `apps/web/server/middleware/requireTier.ts` lines 31-110 — gate transcript endpoints with `requireTier('PREMIUM')`
- `apps/web/src/components/subscription/UpgradePrompt.tsx` — web Premium-gate component
- `apps/web/src/lib/platform.ts::isNativeApp()` — reader-app detection seam (CC-01)
- `apps/web/src/lib/cloudinary.ts` + `apps/web/src/components/ResponsiveImage.tsx` — thumbnail handling for podcast covers / video thumbnails

### Codebase maps (background context)
- `.planning/codebase/STRUCTURE.md` — **STALE** (dated 2026-04-18, pre-monorepo; references root `server/`/`src/`/`prisma/` that no longer exist). Use CLAUDE.md as source of truth for current layout.
- `.planning/codebase/STACK.md`, `INTEGRATIONS.md`, `CONVENTIONS.md`, `ARCHITECTURE.md` — same caveat re: staleness; useful for high-level naming + testing patterns

### External docs the planner SHOULD verify (not yet locked specs)
- Podcast Index API auth (HMAC-SHA1 with API key + secret + timestamp): https://podcastindex-org.github.io/docs-api/
- iTunes Search API: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
- OpenAI Whisper API reference: https://platform.openai.com/docs/api-reference/audio/createTranscription
- YouTube Data API v3 quota costs: https://developers.google.com/youtube/v3/determine_quota_cost
- lite-youtube-embed: https://github.com/paulirish/lite-youtube-embed
- Podcasting 2.0 `<podcast:transcript>` tag: https://podcasting2.org/podcast-namespace/tags/transcript

</canonical_refs>

<specifics>
## Specific Ideas

- The `NewsArticle.entities` JSONB shape (per Phase 1 / Phase 6 generated articles) stores `string[]` — top-3 picks for D-B2 podcast matching can be array slice. Same for `topics`. No re-extraction needed; researcher confirms current entity-extraction pipeline still populates these fields for new articles.

- **Podcasting 2.0 `<podcast:transcript>` tag** — many publisher-hosted podcasts now ship transcripts in their RSS feed (via this namespace tag). The pre-transcribe worker (D-C2) MUST check for this tag FIRST and skip Whisper if a publisher transcript exists (free, often higher quality than auto-generated). Researcher quantifies: what % of the curated podcasts.ts list provides this?

- **YouTube channel ID lookup** — for `video-channels.ts`, channel IDs (UCxxxx format) needed for the RSS feed URL. Some channels expose only handles (@PBSNewsHour); planner needs a one-time resolution step (e.g. `youtube.com/@PBSNewsHour` → page source contains `channelId="UCxxxx"`). Cache forever once resolved.

- **Whisper file-size limit** — OpenAI Whisper API caps audio uploads at 25MB. Long podcast episodes (2+ hours) may exceed this and need chunking + concatenation. Researcher specifies: `ffmpeg` chunking step? Or use `audio.transcriptions.create` with `response_format: 'verbose_json'` and stream chunks?

- **YouTube quota math sanity-check (D-D1 Q-03)**: `search.list` costs 100 units. 50 searches/day × 100 = 5000 units. `videos.list` (for fetching video metadata when adding to local index) costs 1 unit per video. Daily channel-RSS poll generates ~30 channels × ~3 new videos avg = 90 metadata fetches × 1 unit = 90 units. Total daily: ~5090 units = ~50% of free 10k quota. Comfortable headroom.

- **lite-youtube-embed** ships as a single `.js` file ~3KB; lite-youtube-embed has a `web-component` API (`<lite-youtube videoid="...">`). Wraps cleanly in a thin React component (~30 lines). NO NPM dependency required if vendored; install option available via `lite-youtube-embed` package on npm.

- **`/podcasts` route position in Sidebar** — alphabetical sits between "Monitor" and "Settings". Confirm with current sidebar structure (`apps/web/src/components/Sidebar.tsx`). Phase 40 plan adds the entry; researcher confirms ordering is alphabetical or use-frequency.

- **Sub-region color picks (D-A2)** — current dark-cyber palette has cyan #00f0ff (primary), red #ff0044, green #00ff88, yellow #ffee00, purple #bf00ff, plus per-region tints. New 4 colors should: (a) be distinct from existing 13 region colors, (b) hold accessibility contrast on the dark background. Suggested starting points (researcher refines): sudostasien = teal #00d4b8, nordeuropa = ice-blue #4ecdc4, sub-saharan-africa = amber #ffa500, indien = saffron #ff7f00. Verify WCAG AA contrast.

- **Bias-balance script (D-A3)** is a tiny TypeScript file: read `sources.ts`, group by region, count `politicalBias` buckets per region, exit non-zero if any region lacks left/center/right. Could live at `apps/web/scripts/check-source-bias-coverage.ts` and be wired into `pnpm test:run` or as a pre-commit hook (planner decides).

- **Podcast Index HMAC auth** is fiddly — every request needs `X-Auth-Date`, `X-Auth-Key`, `Authorization: SHA-1(key + secret + date)` headers. Researcher confirms the npm package `podcast-index-api` (or similar) handles this, or wrap in a small `apps/web/server/services/podcastIndexService.ts` helper.

</specifics>

<deferred>
## Deferred Ideas

These came up during discussion but are explicitly out of scope for Phase 40:

- **Embedding-based semantic similarity for podcast matching** (e.g. pgvector + OpenAI text-embedding-3-small). Stronger match quality on abstract topics. Defer until v1.7+ if user feedback shows entity+topic keyword matching produces too many false negatives. Would also enable cross-content-type semantic search (article → video → podcast) as a unified surface.

- **AssemblyAI speaker diarization** ("Episode features 3 speakers, here's who said what"). Defer until podcast UI shows demand. Would replace Whisper as the transcription provider for podcasts only.

- **Self-hosted faster-whisper worker** (CTranslate2 port on a CPU/GPU droplet, ~$5-15/mo marginal cost). Defer — revisit if Whisper API monthly cost exceeds budget. Adds ops burden (model file ~1.5GB, GPU recommended for speed, separate worker service to monitor + scale).

- **Topic-cluster–driven podcast matching**. Match podcasts to `StoryCluster` rows once per cluster instead of per article (cheaper, lower latency on article view). Defer until per-article matching costs prove unsustainable.

- **Vimeo API search / Vimeo channel indexing**. Out of scope this phase — Vimeo only embeds when an article URL contains a `vimeo.com/<id>` link. Revisit if the Vimeo channel ecosystem grows in news relevance.

- **Twitch / SoundCloud / Wistia / other video providers**. Out of scope — only YouTube + Vimeo this phase. `react-player` was rejected as the player library partly to avoid encouraging future provider sprawl.

- **In-app podcast "subscribe and download episodes"** (a la Pocket Casts / Overcast). Out of scope — NewsHub is a discovery surface, not a podcast player replacement. The lite-player just streams; users can copy the RSS URL to their preferred podcast app.

- **Re-classifying existing articles into the 4 new sub-regions** (Q-06). No backfill — existing articles stay in their original regions; new sub-region perspective only applies to articles from sources tagged with the new region going forward. Avoids a one-shot data migration that has no clear value.

- **Apple Podcasts paid tier ($499/mo for 100k req/month)** considered for primary search but rejected (Podcast Index covers the same need for free).

- **Apple Music episode imports / subscription-only podcast handling** (e.g. NYT subscriber-only Daily episodes). Out of scope — NewsHub doesn't authenticate against external podcast paywalls.

- **Standard YouTube iframe** rejected (~500KB initial-load cost) in favor of lite-youtube-embed.

- **`react-player`** rejected (~10KB + provider-sprawl temptation) in favor of lite-youtube-embed + custom Vimeo lite component.

- **Whisper API monthly cost circuit-breaker** (Q-04) — default is NO cap. Add later if monthly Whisper bill exceeds expectations and the user requests an automatic guard.

- **Podcast-name + episode-title search on the `/podcasts` page** is in scope (Q-05 default); transcript-excerpt search Premium-only is in scope (Q-05 default). Cross-content-type unified search ("search articles + podcasts + videos with one query") deferred to a future search-overhaul phase.

- **Transcribing videos' audio when YouTube auto-captions exist but quality is poor** — accept the auto-caption quality this phase. Cost of running Whisper anyway negates the YouTube-captions-free win.

</deferred>

---

*Phase: 40-content-expansion*
*Context gathered: 2026-05-03 via /gsd-discuss-phase interactive session*
*Discussion log: 40-DISCUSSION-LOG.md (sibling file)*
