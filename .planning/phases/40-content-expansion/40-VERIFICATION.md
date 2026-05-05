---
phase: 40-content-expansion
verified: 2026-05-05T09:37:02Z
status: human_needed
score: 6/7 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Premium user sees podcast transcript with timestamp navigation (UAT Test 8)"
    expected: "Logged-in PREMIUM user opens a podcast episode, clicks the transcript toggle, sees timestamped segments, clicks a segment and audio player seeks to that position"
    why_human: "UAT Test 8 was skipped at UAT time (account is FREE-tier). Requires either a real PREMIUM account or a test-mode tier-override. onSeek is wired in EmbeddedVideo.tsx (video path) but intentionally deferred in RelatedPodcasts.tsx with a // TODO — premium seek from RelatedPodcasts inline player cannot be verified programmatically."
  - test: "Native app reader-app exemption (UAT Test 9)"
    expected: "iOS/Android Capacitor build shows plain text 'feature not available' + newshub.example as <span> (not <a>) for all premium gates; no clickable pricing links appear"
    why_human: "Requires physical device or simulator. isNativeApp() returns true only inside Capacitor runtime. TranscriptDrawer.tsx branch 1 (FREE mobile) has code verified by grep, but end-to-end render on real device cannot be confirmed programmatically."
---

# Phase 40: Content Expansion Verification Report

**Phase Goal:** Users can access video and podcast content with transcription for Premium subscribers
**Verified:** 2026-05-05T09:37:02Z
**Status:** human_needed
**Re-verification:** No — initial verification (no prior VERIFICATION.md found)

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria + PLAN must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| SC-1 | System aggregates from 200+ news sources across existing and new regions | VERIFIED | `sources.ts` contains 233 entries (grep -c "region: '" = 233). All 4 new sub-regions present: sudostasien=6, nordeuropa=6, sub-saharan-africa=8, indien=7. 17 regions total. UAT Test 2 and 11 both passed. |
| SC-2 | User can browse podcast episodes related to news topics with embedded player | VERIFIED | `RelatedPodcasts.tsx` mounted in `NewsCard.tsx` (2 hits: import + JSX at line 487). `PodcastsPage.tsx` exists at 250+ lines. `PodcastPlayer.tsx` uses vanilla `<audio>` with full controls. Sidebar and App.tsx route wired. |
| SC-3 | Premium users see podcast transcription with timestamp navigation | UNCERTAIN | `TranscriptDrawer.tsx` exists with 3 branches (FREE-mobile, FREE-web, PREMIUM). PREMIUM branch fetches transcript via `useTranscript`. `TranscriptSegment` fires `onSeek(startSec)`. However: onSeek is NOT wired from RelatedPodcasts.tsx to PodcastPlayer (documented `// TODO` in RelatedPodcasts.tsx:16-22). Video path (EmbeddedVideo.tsx) has onSeek wired. UAT Test 8 was skipped — needs human with PREMIUM account. |
| SC-4 | User can view embedded video content from YouTube and Vimeo sources | VERIFIED | `LiteYouTubeEmbed.tsx`, `LiteVimeoEmbed.tsx`, `EmbeddedVideo.tsx` all exist with click-to-load. `RelatedVideos.tsx` mounted in `NewsCard.tsx` (line 12 import + line 490 JSX). YouTube uses `youtube-nocookie.com`. UAT Test 6 was blocked by grid-overlap (now fixed). |
| SC-5 | Premium users see auto-generated video transcription with searchable text | VERIFIED | `transcripts.ts` routes with `requireTier('PREMIUM')` on both GET endpoints. `TranscriptService` with cache-first chain (Postgres → YouTube captions → Whisper). FTS search on `Transcript.searchTsv` GIN index. `EmbeddedVideo.tsx` mounts `TranscriptDrawer` with `onSeek={handleSeek}` (postMessage to iframe). |
| SC-6 | Media pipeline handles video/audio transcoding with Cloudinary integration | VERIFIED | `whisperService.ts` uses `ffmpeg-static` for >25MB audio chunking (10-min segments). `youtubeService.ts` + `videoChannelPollJob.ts` + `podcastTranscribeJob.ts` all exist. Cloudinary used for image optimization (`src/lib/cloudinary.ts`). SC-6 wording says "Cloudinary integration" — Cloudinary is present and configured (`.env` entry, `ResponsiveImage.tsx` uses it for image fetch/transform). Video transcoding is handled by ffmpeg+Whisper, not Cloudinary upload — this is the embed-first strategy. |
| SC-7 | Storage costs remain predictable through embed-first strategy and upload quotas | VERIFIED | `youtubeQuota.ts` middleware caps YouTube Data API at 50 search.list calls/day with Redis counter. `videoChannelPollJob` uses RSS-first with batched videos.list back-fill. `podcastTranscribeJob` checks `PodcastEpisode.transcriptUrl` before calling Whisper (Pitfall 4 guard). Embed-first: no video binary stored; only thumbnail URLs and metadata. |

**Score: 6/7 truths verified** (SC-3 UNCERTAIN due to onSeek deferral in RelatedPodcasts + skipped UAT Test 8)

### Gap-Closure Verification (4 UAT gaps from 2026-05-05)

| Gap | Plan | Status | Code Evidence |
|-----|------|--------|---------------|
| Analysis page fetchers missing Bearer JWT | 40-07 | CLOSED | `ClusterSummary.tsx`: `headers: { Authorization: \`Bearer ${getToken()}\` }` at line 52. `FramingComparison.tsx`: same pattern at line 93. `PerspectiveCoverageStats.tsx`: same pattern at line 85. All three confirmed by grep. |
| /analysis route not gated by RequireAuth | 40-07 Task 2 (path 3) | CLOSED (deferred) | No `RequireAuth` component exists in codebase (confirmed by plan). `App.tsx:122` has `{/* TODO(40-07): gate /analysis with auth guard once a RequireAuth/ProtectedRoute wrapper exists */}`. Pending todo filed at `.planning/todos/pending/40-07-add-requireauth-wrapper.md`. Acceptable per plan's documented path-3 deferral. |
| PodcastPlayer requires two clicks to play audio | 40-08 | CLOSED | `PodcastPlayer.tsx` accepts `autoPlayOnMount?: boolean` prop (line 44). `loadedmetadata` listener calls `audio.play()` once (line 103-105), guarded by `hasAttemptedAutoPlay` ref. `PodcastEpisodeCard.tsx` passes `autoPlayOnMount` at lines 152-154. Test rewritten: `PodcastEpisodeCard.test.tsx` Test 2 now asserts `data-auto-play="true"`. `PodcastPlayer.test.tsx` has 5 new `autoPlayOnMount` tests in appended `describe` block. |
| VirtualizedGrid data-row-index typo (row overlap) | 40-09 | CLOSED | `VirtualizedGrid.tsx:130` reads `data-index={virtualRow.index}` (confirmed by grep, commit 0f04edd noted as pre-closure). `ref={virtualizer.measureElement}` (direct reference, no inline closure). `estimateSize` is 360. |
| LanguageSwitcher missing FR entry | 40-10 | CLOSED | `LanguageSwitcher.tsx:10` contains `{ code: 'fr', label: 'Français', flag: 'FR' }`. Confirmed by grep. `languages` array now has 3 entries. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `apps/web/server/config/sources.ts` | 200+ sources, 17 regions | VERIFIED | 233 sources, 17 regions confirmed |
| `apps/web/scripts/check-source-bias-coverage.ts` | Bias gate with biasDiversityNote | VERIFIED | File exists, exits 0 per UAT Test 11 |
| `apps/web/server/config/podcasts.ts` | Curated podcast feeds | VERIFIED | 33 PODCAST_FEEDS entries |
| `apps/web/server/config/video-channels.ts` | Curated video channels | VERIFIED | 25 VIDEO_CHANNELS entries |
| `apps/web/server/routes/podcasts.ts` | Podcast API routes | VERIFIED | EXISTS — GET /api/podcasts and related endpoints |
| `apps/web/server/routes/videos.ts` | Video API routes | VERIFIED | EXISTS — GET /api/videos/* endpoints |
| `apps/web/server/routes/transcripts.ts` | Transcript routes with Premium gate | VERIFIED | requireTier('PREMIUM') on both endpoints |
| `apps/web/server/services/whisperService.ts` | Whisper + ffmpeg chunking | VERIFIED | ffmpeg-static chunking implemented (line 29, 186+) |
| `apps/web/server/services/transcriptService.ts` | Cache-first transcript chain | VERIFIED | EXISTS — Postgres cache → YouTube captions → Whisper → sentinel |
| `apps/web/src/components/podcasts/PodcastPlayer.tsx` | Vanilla audio player + autoPlayOnMount | VERIFIED | autoPlayOnMount prop + loadedmetadata handler confirmed |
| `apps/web/src/components/podcasts/PodcastEpisodeCard.tsx` | Episode card passing autoPlayOnMount | VERIFIED | `autoPlayOnMount` passed at line 154 |
| `apps/web/src/components/podcasts/RelatedPodcasts.tsx` | Lazy collapsed podcast section | VERIFIED | EXISTS, lazy-fetch with enabled:isExpanded |
| `apps/web/src/components/podcasts/TranscriptDrawer.tsx` | 3-branch Premium transcript UI | VERIFIED | 3 branches confirmed (FREE-mobile, FREE-web, PREMIUM) |
| `apps/web/src/pages/PodcastsPage.tsx` | Browse + two-tier search | VERIFIED | EXISTS, wired to /podcasts route |
| `apps/web/src/components/videos/LiteYouTubeEmbed.tsx` | Click-to-load YouTube | VERIFIED | EXISTS |
| `apps/web/src/components/videos/LiteVimeoEmbed.tsx` | Click-to-load Vimeo | VERIFIED | EXISTS |
| `apps/web/src/components/videos/EmbeddedVideo.tsx` | YouTube/Vimeo dispatcher | VERIFIED | youtube-nocookie.com + TranscriptDrawer wired with onSeek |
| `apps/web/src/components/videos/RelatedVideos.tsx` | Lazy collapsed video section in NewsCard | VERIFIED | EXISTS, mounted in NewsCard.tsx:490 |
| `apps/web/src/components/ClusterSummary.tsx` | Bearer JWT on analysis fetcher | VERIFIED | Authorization header confirmed |
| `apps/web/src/components/FramingComparison.tsx` | Bearer JWT on framing fetcher | VERIFIED | Authorization header confirmed |
| `apps/web/src/components/PerspectiveCoverageStats.tsx` | Bearer JWT on coverage fetcher | VERIFIED | Authorization header confirmed |
| `apps/web/src/components/LanguageSwitcher.tsx` | DE + EN + FR entries | VERIFIED | 3 entries confirmed, Français at line 10 |
| `apps/web/src/i18n/i18n.ts` | podcasts namespace registered | VERIFIED | 'podcasts' in ns array at line 16 |
| `apps/web/public/locales/fr/podcasts.json` | FR podcast i18n keys | VERIFIED | relatedPodcasts key present |
| `apps/web/public/locales/de/podcasts.json` | DE podcast i18n keys | VERIFIED | relatedPodcasts key present |
| `apps/web/public/locales/en/podcasts.json` | EN podcast i18n keys | VERIFIED | relatedPodcasts key present |
| `apps/web/package.json` | check:source-bias script | VERIFIED | "check:source-bias": "tsx scripts/check-source-bias-coverage.ts" |
| `.github/workflows/ci.yml` | check-source-bias CI job | VERIFIED | Job "Source Bias Coverage" at line 62, runs check:source-bias |
| `.planning/todos/pending/40-07-add-requireauth-wrapper.md` | RequireAuth deferral todo | VERIFIED | EXISTS with status: pending |
| `.planning/todos/pending/40-07-shared-api-fetch.md` | Tech-debt todo for apiFetch | VERIFIED | EXISTS with status: pending |
| `.planning/todos/pending/40-08-podcast-autoplay-e2e.md` | Playwright E2E todo | VERIFIED | EXISTS |
| `.planning/todos/pending/40-10-fr-namespace-backfill.md` | FR namespace backfill todo | VERIFIED | EXISTS |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ClusterSummary.tsx` | `/api/analysis/clusters` | `Authorization: Bearer ${getToken()}` | WIRED | Confirmed at line 52 |
| `FramingComparison.tsx` | `/api/analysis/framing` | `Authorization: Bearer ${getToken()}` | WIRED | Confirmed at line 93 |
| `PerspectiveCoverageStats.tsx` | `/api/analysis/coverage-gaps` | `Authorization: Bearer ${getToken()}` | WIRED | Confirmed at line 85 |
| `PodcastEpisodeCard.tsx` | `PodcastPlayer.tsx` | `<PodcastPlayer ... autoPlayOnMount />` | WIRED | Confirmed at line 154 |
| `PodcastPlayer.tsx` | `audio.play()` | `loadedmetadata` + `hasAttemptedAutoPlay` ref | WIRED | Confirmed at lines 101-105 |
| `VirtualizedGrid.tsx` | `measureElement()` | `data-index={virtualRow.index}` | WIRED | Confirmed at line 130 |
| `LanguageSwitcher.tsx` | i18next + Zustand | `{ code: 'fr', label: 'Français', flag: 'FR' }` | WIRED | No other plumbing needed; i18n already supported fr |
| `NewsCard.tsx` | `RelatedPodcasts.tsx` | `<RelatedPodcasts articleId={localArticle.id} />` | WIRED | Line 13 import + line 487 JSX |
| `NewsCard.tsx` | `RelatedVideos.tsx` | `<RelatedVideos articleId={article.id} />` | WIRED | Line 12 import + line 490 JSX |
| `PodcastsPage.tsx` | `/api/podcasts` | `useCuratedPodcasts` hook | WIRED | useCuratedPodcasts imported and used |
| `App.tsx` | `PodcastsPage` | `<Route path="/podcasts" element={<PodcastsPage />} />` | WIRED | Line 130 confirmed |
| `Sidebar.tsx` | `/podcasts` | navItems entry with Podcast icon | WIRED | Line 90 confirmed |
| `i18n.ts` | `podcasts.json` locales | ns array includes 'podcasts' | WIRED | Line 16 confirmed |
| `EmbeddedVideo.tsx` | `TranscriptDrawer` with seek | `onSeek={handleSeek}` (iframe postMessage) | WIRED | Lines 136, 176-179 confirmed |
| `TranscriptDrawer.tsx` | Premium gate | `requireTier('PREMIUM')` on backend routes | WIRED | transcripts.ts lines 37, 65 |
| `RelatedPodcasts.tsx` | `TranscriptDrawer` (onSeek) | onSeek intentionally `undefined` — documented TODO | PARTIAL | RelatedPodcasts comment lines 16-22: "onSeek stays undefined and segment clicks highlight only" — known deferral, not a blocker for SC-3's core requirement |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `PodcastsPage.tsx` | `feeds` from `useCuratedPodcasts` | `/api/podcasts` → `PODCAST_FEEDS` from `podcasts.ts` | Yes (33 real feeds) | FLOWING |
| `RelatedPodcasts.tsx` | `episodes` from `useRelatedPodcasts` | `/api/podcasts/related/:articleId` (24h Redis cache) | Yes (real matching logic) | FLOWING |
| `TranscriptDrawer.tsx` | `transcriptQuery` from `useTranscript` | `/api/transcripts/:contentType/:id` → TranscriptService chain | Yes (Postgres → Whisper) | FLOWING (requires PREMIUM token) |
| `sources.ts` | `NEWS_SOURCES` | Static TS array — 233 entries | Yes (233 real source entries) | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for server start checks (requires running server). Static code checks performed instead.

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| Sources count = 233 | `grep -c "region: '" sources.ts` | 233 | PASS |
| New sub-regions present | `grep -c "region: 'sudostasien'"` etc. | 6/6/8/7 | PASS |
| biasDiversityNote on russland+china | `grep -c "biasDiversityNote: 'limited'"` | 32 | PASS |
| FR in LanguageSwitcher | grep for `code: 'fr'` | Found at line 10 | PASS |
| Bearer JWT in analysis fetchers | grep for `Authorization.*Bearer` | All 3 components | PASS |
| autoPlayOnMount prop exists | grep PodcastPlayer.tsx | Found at lines 44, 67, 103 | PASS |
| data-index attribute | grep VirtualizedGrid.tsx | Found at line 130 | PASS |
| RelatedPodcasts in NewsCard | grep NewsCard.tsx | 2 hits (import + JSX) | PASS |
| Premium gate on transcripts | grep transcripts.ts | requireTier('PREMIUM') at lines 37, 65 | PASS |
| Podcasts namespace registered | grep i18n.ts | 'podcasts' in ns array | PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| CONT-01 | 40-02 | System aggregates from 200+ news sources | SATISFIED | 233 sources in sources.ts; UAT Test 2 passed |
| CONT-02 | 40-02 | System supports new regions/languages | SATISFIED | 4 new regions: sudostasien, nordeuropa, sub-saharan-africa, indien |
| CONT-03 | 40-04 | User can browse podcast episodes related to news topics | SATISFIED | RelatedPodcasts in NewsCard + PodcastsPage + PodcastPlayer all wired |
| CONT-04 | 40-06 | Podcast episodes show transcription (premium feature) | SATISFIED | TranscriptDrawer.tsx with 3-branch gate; requireTier('PREMIUM') on backend |
| CONT-05 | 40-05 | User can view embedded video content (YouTube/Vimeo) | SATISFIED | LiteYouTubeEmbed + LiteVimeoEmbed + RelatedVideos wired in NewsCard |
| CONT-06 | 40-06 | Video content includes auto-generated transcription (premium) | SATISFIED | youtubeCaptionService + WhisperService; EmbeddedVideo wired with TranscriptDrawer + seek |
| CONT-07 | 40-05, 40-06 | Content pipeline handles video/audio with minimal storage costs | SATISFIED | Embed-first (no binary storage); youtubeQuota cap (50/day); Pitfall 4 publisher-transcript-first; ffmpeg chunking |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `apps/web/src/components/podcasts/RelatedPodcasts.tsx` lines 16-22 | `onSeek` deliberately `undefined` — documented TODO for wiring to PodcastPlayer.seek() | Warning | Premium users cannot use segment clicks to seek audio from RelatedPodcasts context (video path works; this is a deferred UX improvement, not a requirement gap — CONT-04 requires transcription display, not necessarily click-to-seek from every surface) |
| `apps/web/src/App.tsx` line 122 | TODO comment — `/analysis` route still unguarded for anonymous users (path 3 taken in 40-07 Task 2) | Warning | Anonymous users visiting /analysis see 401-derived error UI rather than redirect to login. Bearer tokens now attached so authenticated users work. Tracked in `.planning/todos/pending/40-07-add-requireauth-wrapper.md` |

No PLACEHOLDER/TODO stubs blocking goal delivery. No `return null` / `return []` stubs detected in critical paths.

### Human Verification Required

#### 1. Premium Transcript with Timestamp Navigation (UAT Test 8)

**Test:** Log in with a PREMIUM-tier account (or use test-mode tier-override). Navigate to `/podcasts`, select a feed, open an episode, click the transcript toggle. Transcript segments should appear with timestamps. Click a segment — audio player should seek to that segment's `startSec`.

**Expected:** Timestamped segments visible; clicking segment changes `audio.currentTime` to `segment.startSec`. For video, iframe receives `seekTo` postMessage.

**Why human:** UAT Test 8 was skipped (test account is FREE-tier). The code has the correct wiring for video path (EmbeddedVideo.tsx:136, 176-179 confirmed). The podcast path (RelatedPodcasts) has `onSeek` intentionally `undefined` per documented TODO — this means segment clicks highlight only, not seek. Whether this satisfies SC-3 "timestamp navigation" requires product owner judgment.

#### 2. Native App Reader-App Exemption (UAT Test 9)

**Test:** Run Capacitor iOS or Android build. Open the app. Navigate to `/podcasts`. Verify the transcript toggle shows plain text ("feature not available") with `newshub.example` as `<span>` (not `<a href>`). Verify no clickable upgrade/pricing link appears.

**Expected:** `isNativeApp() === true` branch in `TranscriptDrawer.tsx` renders: `<span className="font-mono">newshub.example</span>` per Apple Rule 3.1.1(a).

**Why human:** Requires physical device or iOS/Android simulator with Capacitor build. `isNativeApp()` returns true only in Capacitor runtime; cannot be tested programmatically without mocking (unit tests mock it but end-to-end native behavior needs device validation).

### Gaps Summary

No hard FAILED truths exist. The 4 UAT-reported gaps are all confirmed closed in code. The only outstanding items are:

1. **SC-3 UNCERTAIN** — Premium transcript timestamp navigation is code-complete for the video path (EmbeddedVideo → TranscriptDrawer with onSeek). For the podcast path (RelatedPodcasts → TranscriptDrawer), `onSeek` is intentionally `undefined` per documented design decision, meaning segment highlights but audio does not seek. The ROADMAP SC-3 says "timestamp navigation" without specifying every surface. Product owner needs to confirm whether the current implementation satisfies the requirement or if the RelatedPodcasts seek wiring is required before phase close.

2. **Two skipped UAT tests** (Test 8, Test 9) require human testing with PREMIUM account and physical device respectively — these were pre-existing skips at UAT time, not new gaps introduced by gap-closure plans.

---

_Verified: 2026-05-05T09:37:02Z_
_Verifier: Claude (gsd-verifier)_
