# Phase 40 Plan Outline

**Phase:** 40-content-expansion
**Phase goal:** Users can access video and podcast content with transcription for Premium subscribers; system aggregates from 200+ sources across 17 regions
**Mode:** chunked / outline-only
**Generated:** 2026-05-03 by `/gsd-plan-phase 40` planner agent
**Plan count:** 6

---

## Plan map

| Plan ID | Objective (1 line) | Wave | Depends On | Requirements | Autonomous |
|---------|-------------------|------|-----------|--------------|------------|
| 40-01 | Cross-cutting prep — Prisma schema (Video / Transcript / Podcast / PodcastEpisode + biasDiversityNote field) + raw FTS migrations + PerspectiveRegion enum +4 across both type files and 8 downstream consumers + isNativeApp() stub + region colors + i18n region keys + new content-namespace JSON files; ends with `prisma db push` task | 1 | [] | CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06 | true |
| 40-02 | Source curation — author `apps/web/scripts/proposed-sources/70-sources-proposed.md` (D-A4); add `apps/web/scripts/check-source-bias-coverage.ts` (D-A3); after human sign-off, merge curated sources into `apps/web/server/config/sources.ts`; wire bias gate into CI | 2 | [40-01] | CONT-01, CONT-02 | false (human-verify checkpoint between proposal and merge) |
| 40-03 | Podcast backend — `podcastIndexService` (HMAC-SHA1) + `itunesPodcastService` + `podcastMatcherService` + `podcastService` orchestrator + `apps/web/server/config/podcasts.ts` curated feeds + `routes/podcasts.ts` + `podcastFeedPollJob` worker | 2 | [40-01] | CONT-03 | true |
| 40-04 | Podcast frontend — `RelatedPodcasts.tsx` (lazy inline in NewsCard) + `PodcastEpisodeCard.tsx` + `PodcastPlayer.tsx` (audio + timestamp seek) + `PodcastsPage.tsx` (FREE-tier route, two-tier search per Q-05) + `useRelatedPodcasts.ts` hook + Sidebar entry + App route + `podcasts.json` i18n in DE/EN/FR | 3 | [40-03] | CONT-03 | true |
| 40-05 | Video backend + frontend — `youtubeService` (RSS + Data API) + `videoIndexService` (local FTS query + API fallback) + `youtubeQuota` middleware (Redis daily counter, D-D1) + `apps/web/server/config/video-channels.ts` + `apps/web/scripts/resolve-youtube-handles.ts` + `routes/videos.ts` + `videoChannelPollJob` worker; `RelatedVideos.tsx` (lazy in NewsCard) + `EmbeddedVideo.tsx` dispatcher + `LiteYouTube.tsx` (web-component wrapper) + `LiteVimeo.tsx` (custom click-to-load) + `useRelatedVideos.ts` hook + `videos.json` i18n in DE/EN/FR | 2 | [40-01] | CONT-05, CONT-07 | true |
| 40-06 | Transcripts — `whisperService` (Whisper API + ffmpeg-static chunking for >25MB) + `youtube-caption-extractor` integration + `transcriptService` orchestrator (cache-first + provider chain + sentinel cache for "captions unavailable") + `routes/transcripts.ts` (`requireTier('PREMIUM')`) + `podcastTranscribeJob` worker (nightly, Q-01; checks `<podcast:transcript>` first per Pitfall 4) + `TranscriptDrawer.tsx` (Premium-gated, branches on `isNativeApp()` per CC-01) + `useTranscript.ts` hook + transcript timestamp navigation + transcript-excerpt FTS search wiring | 3 | [40-03, 40-05] | CONT-04, CONT-06, CONT-07 | true |

---

## Wave structure

```
Wave 1:  40-01 (prep — BLOCKING for everything)
            │
            ├──── Wave 2: 40-02 (sources)        — has human-verify checkpoint
            ├──── Wave 2: 40-03 (podcast backend)
            └──── Wave 2: 40-05 (video full slice)
                              │
                              ├──── Wave 3: 40-04 (podcast frontend) — depends on 40-03
                              └──── Wave 3: 40-06 (transcripts)      — depends on 40-03 + 40-05
```

**Parallelism:** Wave 2 has 3 plans running in parallel (40-02, 40-03, 40-05); Wave 3 has 2 (40-04, 40-06).

**File-ownership check** (no file appears in two same-wave plans):
- Wave 2: 40-02 owns `apps/web/server/config/sources.ts` + `apps/web/scripts/check-source-bias-coverage.ts` + `apps/web/scripts/proposed-sources/70-sources-proposed.md`. 40-03 owns `apps/web/server/{services/podcast*.ts, config/podcasts.ts, routes/podcasts.ts, jobs/podcastFeedPollJob.ts}` and extends `apps/web/server/index.ts` (route mount + job start). 40-05 owns `apps/web/server/{services/{youtube,videoIndex}Service.ts, middleware/youtubeQuota.ts, config/video-channels.ts, routes/videos.ts, jobs/videoChannelPollJob.ts}` + `apps/web/src/components/videos/*` + `apps/web/src/hooks/useRelatedVideos.ts` + `apps/web/scripts/resolve-youtube-handles.ts` and extends `apps/web/server/index.ts` (route mount + job start) + `apps/web/src/components/NewsCard.tsx` (RelatedVideos slot) + `apps/web/public/locales/{de,en,fr}/videos.json`.
- **Detected overlap:** 40-03 and 40-05 both extend `apps/web/server/index.ts`. Resolve by either (a) bumping 40-05 to Wave 3 alongside 40-04 (sacrifices parallelism), or (b) having 40-01 add stub mount points / job-registration scaffolding to `index.ts` so 40-03 and 40-05 can edit non-overlapping line ranges. **Recommended (b)** — 40-01 adds three commented placeholders in `index.ts` (`// 40: podcast routes mount here`, `// 40: video routes mount here`, `// 40: worker job starts here`) to allow line-range-disjoint edits. The planner per-plan can then reuse the same placeholder convention without serializing waves.
- **Detected overlap:** 40-04 and 40-06 both edit `apps/web/src/components/NewsCard.tsx` (40-04 adds `<RelatedPodcasts>` slot, 40-06 does not actually need NewsCard — TranscriptDrawer mounts inside `RelatedPodcasts` and `EmbeddedVideo`). **Resolved** — 40-04 owns the NewsCard `RelatedPodcasts` slot edit; 40-06 only edits files inside `RelatedPodcasts.tsx` and `EmbeddedVideo.tsx`. No actual overlap.

---

## Coverage check

Every Phase 40 requirement appears in at least one plan's `requirements` field:

| Requirement | Plans |
|-------------|-------|
| CONT-01 (200+ sources) | 40-01 (PerspectiveRegion enum prep), 40-02 (sources.ts merge) |
| CONT-02 (new regions/languages) | 40-01 (enum + colors + i18n), 40-02 (region-grouped sources) |
| CONT-03 (browse podcasts related to news) | 40-01 (Podcast / PodcastEpisode models), 40-03 (backend), 40-04 (UI) |
| CONT-04 (premium podcast transcripts) | 40-01 (Transcript model + FTS migration), 40-06 (whisper + transcript drawer + worker job + premium gate) |
| CONT-05 (embedded YouTube/Vimeo) | 40-01 (Video model + FTS migration), 40-05 (services + components + worker) |
| CONT-06 (premium video transcripts) | 40-01 (Transcript model + FTS), 40-06 (caption extractor + whisper fallback + premium gate) |
| CONT-07 (minimal storage costs) | 40-05 (embed-first, YouTube quota cap, no transcoding), 40-06 (transcribe-once cache + RSS-tag short-circuit per Pitfall 4) |

**Coverage status:** ✓ All 7 requirements covered. No requirement is unplanned.

---

## Notes

### Cross-cutting (not duplicated as plan-level requirements)

- **CC-01** (reader-app exemption) — applies to every Premium-gated UI in 40-06 (TranscriptDrawer); also applies to 40-04 (transcript-search toggle on PodcastsPage shows plain text on mobile)
- **CC-02** (`requireTier`/`attachUserTier` reuse) — 40-06 transcripts route only; do NOT re-implement
- **CC-03** (anti-pattern) — every plan's `<files_modified>` MUST be under `apps/web/...`, `packages/...`, `.github/...`, or `.planning/...`; checker rejects on violation
- **CC-04** (i18n DE/EN/FR triple-write) — applies to 40-01 (regions.json keys), 40-02 (sources.json bias-diversity-note text if needed), 40-04 (podcasts.json), 40-05 (videos.json), 40-06 (transcripts strings — likely live in podcasts.json + videos.json rather than a separate namespace)
- **CC-05** (timestamped + searchable transcripts) — 40-01 schema enforces `Transcript.segments` JSONB shape; 40-06 ensures Whisper called with `response_format: 'verbose_json'` + `timestamp_granularities: ['segment']`

### Drift corrections honored

- **i18n path:** All plans use `apps/web/public/locales/{de,en,fr}/` (per PATTERNS.md correction; CONTEXT.md line 94 wrong)
- **Shared types path:** All plans use `packages/types/index.ts` (no `src/` subdir; PATTERNS.md correction)
- **`isNativeApp()` stub:** 40-01 creates `apps/web/src/lib/platform.ts` with the 5-line stub function so Phase 40 is unblocked from Phase 39's credential timing. Phase 39 Plan 03 reuses this seam unchanged when it ships.

### [BLOCKING] schema push

- 40-01 final task = `cd apps/web && npx prisma generate && npx prisma db push --accept-data-loss` (matches CLAUDE.md "Database" command pattern). All later plans assume the schema is live.

### Human-verify checkpoint

- 40-02 has one `checkpoint:human-verify` task between (a) authoring `70-sources-proposed.md` and (b) merging the diff into `sources.ts`. User reviews the proposed list, signs off (one round of edits expected per D-A4), and the rest of the plan proceeds autonomously. `autonomous: false` in frontmatter accordingly.

### Worker scheduling (Q-01 default)

- 40-06's `podcastTranscribeJob` runs nightly batch (24h `setInterval`). 40-05's `videoChannelPollJob` runs daily (24h `setInterval`). Both gated by `RUN_JOBS=true` per Phase 37 contract; only the `app-worker` Swarm replica starts them.

### Postgres FTS config (Q-02)

- 40-01 `Video` and `Transcript` FTS migrations both use `'simple'` config (per Phase 38 precedent — multilingual content + uniform tokenization without language-specific stemming).

### YouTube quota cap (Q-03)

- 40-05 `youtubeQuota.ts` exposes `checkAndConsumeQuota(): Promise<boolean>` (NOT an Express middleware — quota check is internal to the service path per PATTERNS.md). Cap = 50 searches/day. Redis-down → `return true` (graceful degradation).

### Whisper monthly cost circuit-breaker (Q-04)

- Default OFF per CONTEXT.md. 40-06 does NOT add a circuit-breaker. Add later if budget review demands.

### Search UI (Q-05)

- 40-04 PodcastsPage includes podcast-name + episode-title search (FREE) + transcript-excerpt search (Premium-only, server-side `requireTier`). 40-06 wires the transcript-FTS query that the Premium-only toggle hits.

### Sub-region carving (Q-06)

- 40-01 does NOT backfill existing articles. New sub-region perspective applies only to new articles from sources tagged in 40-02 with the new region. Avoids one-shot data migration.

### Anti-pattern enforcement (CC-03 / `.planning/.continue-here.md`)

- Every plan's `<files_modified>` checked against allow-list. Forbidden roots: root `server/`, `prisma/`, `src/`, `tsup.config.ts`, `prisma.config.ts` (the canonical `apps/web/prisma.config.ts` is already in place; no plan touches it).

### Estimated context per plan

All plans target ~50% context budget per CC-08 (planner-implicit). Sizing:

| Plan | Files | Subsystems | Estimated context |
|------|-------|------------|-------------------|
| 40-01 | ~12 modified, ~3 created | schema + types + i18n + utility stub | medium (~40%) |
| 40-02 | 3 created/modified | curation + script | light (~25%) |
| 40-03 | ~7 created, 1 extended | podcast backend single subsystem | medium (~40%) |
| 40-04 | ~7 created, 3 extended | podcast frontend single subsystem | medium (~40%) |
| 40-05 | ~10 created, 3 extended | video full slice | medium-heavy (~50%) — split candidate if execute-phase signals overrun |
| 40-06 | ~6 created, 2 extended | transcripts (cross-cuts podcast + video) | medium (~45%) |

**Split candidate:** 40-05 is the heaviest. If execute-phase reports it consumed >55% context, the planner can revise into 40-05a (backend) + 40-05b (frontend) post-hoc.

---

## ⚠ Source Audit summary

| Source type | Items | Coverage |
|-------------|-------|----------|
| **GOAL** (ROADMAP success criteria #1-7) | 7 | All 7 mapped to plans (criterion #1→40-02, #2-3→40-04+40-06, #4→40-05, #5→40-06, #6→40-05+40-06, #7→40-05+40-06) |
| **REQ** (CONT-01..CONT-07) | 7 | All 7 covered (table above) |
| **RESEARCH** (key features from RESEARCH.md) | Standard stack adoption (lite-youtube-embed, youtube-caption-extractor, ffmpeg-static, podcast-api), Postgres FTS via raw migration, multi-provider fallback chain, worker job pattern, Redis quota counter, Premium gate with mobile exemption, transcript timestamp navigation | All covered: stack picks land in 40-03 (podcast-api), 40-05 (lite-youtube-embed), 40-06 (whisper + youtube-caption-extractor + ffmpeg). Patterns 1-5 land in 40-01 (PerspectiveRegion + FTS), 40-03/40-05/40-06 (worker jobs + cache + multi-provider), 40-05 (quota counter), 40-06 (premium gate + segments) |
| **CONTEXT** (D-A1..D-A4, D-B1..D-B3, D-C1..D-C2, D-D1..D-D2, CC-01..CC-05) | 16 | All 16 mapped: D-A1/A2/A3/A4 → 40-01+40-02; D-B1/B2/B3 → 40-03+40-04; D-C1/C2 → 40-06; D-D1/D2 → 40-05; CC-01 → 40-06+40-04; CC-02 → 40-06; CC-03 → all plans (allow-list check); CC-04 → 40-01+40-04+40-05+40-06; CC-05 → 40-01+40-06 |

**No items missing.** No `## PHASE SPLIT RECOMMENDED` block emitted — all 7 requirements fit in 6 plans within budget.

---

## OUTLINE COMPLETE

Plan count: **6**
Wave count: **3**
Parallelism: Wave 2 = 3 plans, Wave 3 = 2 plans
Human-verify checkpoints: **1** (in 40-02)
Schema push gate: end of 40-01 (BLOCKING for Wave 2)
