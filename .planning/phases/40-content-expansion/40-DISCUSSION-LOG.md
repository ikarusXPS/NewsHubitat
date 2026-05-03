# Phase 40 Discussion Log

**Session:** `/gsd-discuss-phase 40` — 2026-05-03
**Mode:** default (4 single-question turns per area, then check)
**Operator:** ikarusXPS (b.tunc1984@gmail.com)
**Workflow:** discuss-phase.md (DISCUSS_MODE = "discuss" via config default)

This log captures the interactive Q&A that produced `40-CONTEXT.md`. It is a human-reference audit trail and is NOT consumed by downstream agents (researcher, planner, executor). The locked decisions live in `40-CONTEXT.md` `<decisions>`.

## Pre-Discussion Setup

### Anti-pattern gate
- Read `.planning/.continue-here.md` (milestone-level).
- One blocking row found: writing to root `server/`, `prisma/`, `src/`.
- Demonstrated understanding inline (what / how it manifested / structural prevention via 36.3-03 commit `651ce93` deletion).
- Cleared to proceed.

### Prior context loaded
- `.planning/PROJECT.md` — current state, milestone v1.6 framing, Out of Scope.
- `.planning/REQUIREMENTS.md` lines 52-60 (CONT-01..CONT-07) + Out of Scope (lines 135-148).
- `.planning/STATE.md` — current position, satellite-phase recovery audit notes.
- `.planning/phases/39-mobile-apps/39-CONTEXT.md` (D-08, D-09 reader-app exemption — Phase 40 must respect).
- `.planning/phases/35-infrastructure-foundation/35-CONTEXT.md` and `38-CONTEXT.md` (high-level prior decisions — none directly applicable to Phase 40 scope).
- `.planning/codebase/STRUCTURE.md` — flagged as STALE (pre-monorepo); deferred to CLAUDE.md as source of truth.

### Pending todos
- Searched `.planning/todos/pending/` — empty directory. No matches to fold.

### Codebase scout (for gray-area identification)
- `apps/web/prisma/schema.prisma` — confirmed `NewsArticle.entities` + `topics` exist as JSONB (D-B2 reuse).
- `apps/web/server/config/sources.ts` — 130 sources × 13 regions confirmed.
- Cloudinary: only fetch-mode (image transforms via URL); no upload pipeline (consistent with REQUIREMENTS embed-first ban on self-hosted video).
- No existing podcast or video infrastructure — Phase 40 is greenfield for content types.

## Gray Area Selection

### Question presented
"Which areas do you want to discuss for Phase 40 (Content Expansion)?"

### Options
1. Source curation strategy (+70 sources)
2. Podcast discovery + linking
3. Transcription provider (podcast + video)
4. Video discovery + embed + quota

### User selection
**All four** — every area was selected for discussion. None left to Claude's discretion at the area level.

## Area 1 — Source curation strategy (CONT-01, CONT-02)

### Q1.1 — Allocation strategy
**Options:** (a) Deepen existing 13 regions / (b) Add new sub-regions / (c) Mix ~50 deepen + ~20 sub-regions / (d) Underrepresented voices/types focus
**User selection:** **all** (combine all four directions)
**→ Decision D-A1**: ~70 sources allocated across deepen + new sub-regions + underrepresented voices.

### Q1.2 — Which sub-regions to carve (multiSelect)
**Options:** sudostasien / nordeuropa / sub-saharan-africa / indien
**User selection:** **all four** carved
**→ Decision D-A2**: 4 new sub-regions; PerspectiveRegion type extended; new region colors + i18n + framing-analysis cells.

### Q1.3 — Bias-balance enforcement
**Options:** Hard (gate per region) / Soft (prefer balance, allow gaps) / Reliability-first
**User selection:** **Hard** — every region must end with at least one left + center + right outlet
**→ Decision D-A3**: Hard gate via curation script; honest exception only for state-dominated press (russland, china) flagged in UI footnote.

### Q1.4 — Curation review process
**Options:** Review proposed list / Trust the planner / Trust with stop-list
**User selection:** **Review the proposed list**
**→ Decision D-A4**: Planner produces `70-sources-proposed.md` for human sign-off; one round of edits expected before `sources.ts` diff lands.

**Area 1 outcome:** 4 locked decisions. Moving to area 2.

## Area 2 — Podcast discovery + linking (CONT-03)

### Q2.1 — Podcast data source
**Options:** Podcast Index / Listen Notes / Hand-curated RSS / iTunes Search API
**User selection:** **1, 3, and 4** (Podcast Index + hand-curated + iTunes — combined multi-source strategy)
**Note:** User interrupted the original AskUserQuestion to provide the multi-select answer in chat ("1,3 und4"). Captured as a tiered/combined strategy mirroring the existing multi-provider AI/translation pattern.
**→ Decision D-B1**: Multi-source — Podcast Index (primary search) + curated `podcasts.ts` (~30-50 feeds, baseline) + iTunes Search (secondary discovery). $0/mo cost.

### Q2.2 — Match strategy
**Options:** Entity + topic keyword search / Embedding similarity / Topic-cluster matching / Editorial hand-tagged
**User selection:** **Entity + topic keyword search (Recommended)**
**→ Decision D-B2**: Use existing `NewsArticle.entities`/`topics` JSONB; Redis 24h cache; zero AI calls; <1s p95 latency.

### Q2.3 — UI surface
**Options:** Both inline + /podcasts page (Recommended) / Inline only / /podcasts only / Mini-player in HeroSection
**User selection:** **Both — inline in NewsCard + dedicated /podcasts page (Recommended)**
**→ Decision D-B3**: Lazy-loaded inline section in NewsCard + new top-level /podcasts route + Sidebar entry.

**Area 2 outcome:** 3 locked decisions. Moving to area 3.

## Area 3 — Transcription provider (CONT-04, CONT-06)

### Q3.1 — Transcription provider
**Options:** YouTube captions + Whisper fallback (Recommended) / Whisper API only / AssemblyAI with diarization / Self-hosted faster-whisper
**Note:** First attempt presented 5 options and triggered InputValidationError (max 4 options). Re-presented with 4 options.
**User selection:** **YouTube captions + Whisper API fallback (Recommended)**
**→ Decision D-C1**: Free YouTube captions when present (~80% video coverage); Whisper API ($0.006/min) for podcasts + caption-less videos; 30d Redis + Postgres `Transcript` model permanence; cost estimate ~$7/mo at 100 Premium users.

### Q3.2 — Transcription schedule
**Options:** Hybrid (pre-transcribe curated, lazy for the rest, Recommended) / Lazy on-demand only / Pre-transcribe everything
**User selection:** **Hybrid — pre-transcribe curated, lazy for the rest (Recommended)**
**→ Decision D-C2**: Worker job pre-transcribes new episodes from `podcasts.ts` overnight on `app-worker` Swarm service; lazy-transcribe Podcast Index discoveries + videos on first Premium click. Bounded cost ceiling ~$112/mo at full coverage; in practice much lower due to Podcasting 2.0 publisher transcripts + free YouTube captions.

**Area 3 outcome:** 2 locked decisions (felt sufficient — implementation details like cost-cap circuit-breaker pushed to Q-04 Claude's-discretion). Moving to area 4.

## Area 4 — Video discovery + embed + quota (CONT-05, CONT-07)

### Q4.1 — Video discovery strategy
**Options:** Curated channels + per-article search hybrid (Recommended) / YouTube Data API per-article / Embed-only (no discovery) / RSS-only from curated channels
**User selection:** **Curated YouTube channels + per-article search (hybrid, Recommended)**
**→ Decision D-D1**: ~20-30 trusted news channels in `video-channels.ts`, daily RSS index into Postgres `Video` model with FTS GIN index; per-article match queries local index first, falls back to YouTube Data API search capped at 50 quota-spending searches/day. Vimeo embed-only on article-URL detection.

### Q4.2 — Player choice
**Options:** lite-youtube-embed (Recommended) / Standard YouTube iframe / react-player
**User selection:** **lite-youtube-embed (Recommended)**
**→ Decision D-D2**: lite-youtube-embed (~3KB) + custom click-to-load Vimeo equivalent. Zero LCP impact. Aligns with 250KB bundle warning + LCP <2s + Lighthouse 90+ targets.

**Area 4 outcome:** 2 locked decisions.

## Decision Summary

**Total locked decisions: 11** (D-A1..D-A4, D-B1..D-B3, D-C1..D-C2, D-D1..D-D2)
**Cross-cutting constraints: 5** (CC-01 reader-app exemption, CC-02 tier middleware reuse, CC-03 anti-pattern enforcement, CC-04 i18n DE/EN/FR, CC-05 transcript timestamps + search)
**Claude's Discretion items: 6** (Q-01 worker schedule, Q-02 video-index FTS config, Q-03 quota counter mechanism, Q-04 Whisper cost circuit-breaker default-off, Q-05 /podcasts search scope, Q-06 sub-region article re-classification default = no backfill)

**Deferred ideas:** 14 items captured in `40-CONTEXT.md` `<deferred>` (embeddings, AssemblyAI, self-hosted Whisper, topic-cluster matching, Vimeo API, other providers, in-app subscribe, article re-classification, Apple Podcasts paid tier, paywalled podcasts, standard iframe, react-player, Whisper cost cap, cross-content unified search, transcribing videos with poor auto-captions).

**Scope creep redirected:** None during this session — all four areas stayed within CONT-01..CONT-07 boundary.

## Next Step

Per `40-CONTEXT.md` `<canonical_refs>`, run `/gsd-plan-phase 40` to:
1. Spawn `gsd-phase-researcher` to investigate Podcast Index API auth, Whisper file-size handling, YouTube channel-ID resolution, lite-youtube-embed React wrapping, Postgres FTS config for video index.
2. Spawn `gsd-planner` to break the work into ~5-7 plans across waves.
3. Spawn `gsd-plan-checker` to verify plans against this CONTEXT.md before execute-phase.

**Suggested plan partitioning** (planner refines):
- Wave 1: Schema additions (`Video`, `Transcript`, `Podcast`, `KeywordWatch`-equivalent for podcast subscriptions if needed; extend `NewsSource` with `biasDiversityNote`; extend `PerspectiveRegion` enum)
- Wave 1: Source curation review handoff (`70-sources-proposed.md` for human sign-off — D-A4)
- Wave 2 (after Wave 1 schema): podcast service + Podcast Index + iTunes integration + match endpoint; video service + curated channel RSS poll + local index + quota-capped fallback search
- Wave 2 (after Wave 1 schema): transcript service (Whisper + youtube-transcript-api) with `Transcript` cache, pre-transcribe worker on `app-worker`
- Wave 3: Frontend — `RelatedPodcastEpisodes` inline section, `/podcasts` page, lite-youtube-embed wrapper, `LiteVimeoEmbed`, transcript drawer with timestamp navigation + search
- Wave 4: i18n updates DE/EN/FR; sub-region color extensions; framing-analysis grid cells; verification plan
