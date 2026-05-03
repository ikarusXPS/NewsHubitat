---
phase: 40-content-expansion
plan: 03
subsystem: backend
tags:
  - podcast
  - rss
  - hmac
  - multi-source
  - matcher
  - worker-job
  - fts-prep
  - html-strip
  - cont-03

# Dependency graph
requires:
  - phase: 40-content-expansion
    provides: Prisma Podcast / PodcastEpisode models, PerspectiveRegion 4 new sub-regions, apps/web/server/index.ts placeholder comments
  - phase: 36.4-relocate-plan-03-04-monetization-artifacts
    provides: requireTier / attachUserTier (not consumed by this plan — FREE-tier only — but available for 40-06's transcripts)
  - phase: 37-horizontal-scaling
    provides: app-worker Swarm service with RUN_JOBS=true; PodcastFeedPollJob.start() self-skips when RUN_JOBS=false
provides:
  - PodcastIndexService — HMAC SHA-1 wrapper with 1h Redis cache + secret-leak-safe logging
  - ItunesPodcastService — no-auth iTunes Search wrapper with 24h cache + min-100ms throttle
  - PodcastMatcherService.rankEpisodes — pure deterministic ranker (entity 10x + topic 3x + recency + popularity); dedupe + cap-at-5
  - PodcastService — singleton orchestrator: findRelated (cache-first, Promise.allSettled fan-out), listCurated, getEpisodes, getEpisode, pollFeed (HTML stripped at the persistence boundary)
  - apps/web/server/config/podcasts.ts — 32 curated PodcastFeed entries covering all 17 PerspectiveRegions
  - /api/podcasts router with 4 GET endpoints (FREE-tier; Zod-validated; T-40-03-03 mitigated)
  - PodcastFeedPollJob — daily 24h interval; per-feed try/catch; RUN_JOBS-gated internally
  - 'podcast:related:{articleId}' Redis key namespace (24h TTL); 'podcastindex:search:*' (1h); 'itunes:search:{country}:*' (24h)
affects:
  - 40-04-podcasts-page (frontend can call /api/podcasts/* with the documented response contract; PodcastEpisode.title and .description GUARANTEED plain text — no DOMPurify needed)
  - 40-06-transcripts (PodcastEpisode.transcriptUrl + .transcriptType now populated for episodes whose feeds publish them — orchestrator MUST check these BEFORE invoking Whisper, ties to Pitfall 4 cost-control)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-source provider fan-out via Promise.allSettled (single-provider failure does not bubble)"
    - "HTML strip at the persistence boundary in pollFeed() — cheerio with block-element padding (`<p></p><p></p>` -> two words separated, not concatenated)"
    - "rss-parser customFields for Podcasting 2.0 namespace tags (`podcast:transcript`, `podcast:guid`)"
    - "RUN_JOBS internal gate inside job module's start() — matches index.ts:543 placeholder contract"
    - "Secret hygiene via spy-test that asserts no log call argument string-includes the API key/secret (T-40-03-01)"
    - "Deterministic matcher with closed-form recency decay (Math.exp(-ageDays/43)) — pure, unit-testable, zero AI calls"

key-files:
  created:
    - apps/web/server/services/podcastIndexService.ts (181)
    - apps/web/server/services/podcastIndexService.test.ts (202, 9 tests)
    - apps/web/server/services/itunesPodcastService.ts (138)
    - apps/web/server/services/itunesPodcastService.test.ts (158, 9 tests)
    - apps/web/server/services/podcastMatcherService.ts (128)
    - apps/web/server/services/podcastMatcherService.test.ts (129, 9 tests)
    - apps/web/server/services/podcastService.ts (409)
    - apps/web/server/services/podcastService.test.ts (415, 18 tests)
    - apps/web/server/config/podcasts.ts (368, 32 PODCAST_FEEDS entries)
    - apps/web/server/routes/podcasts.ts (100)
    - apps/web/server/routes/podcasts.test.ts (188, 12 tests)
    - apps/web/server/jobs/podcastFeedPollJob.ts (97)
    - apps/web/server/jobs/podcastFeedPollJob.test.ts (155, 7 tests)
  modified:
    - apps/web/server/index.ts (route mount + worker job start at 40-01 placeholder seams)
    - apps/web/.env.example (PODCAST_INDEX_API_KEY + PODCAST_INDEX_API_SECRET)

key-decisions:
  - "Use Prisma Podcast.title (not 'name') and PodcastFeed.title in config — aligns with both the schema and apps/web/src/types/podcasts.ts shared shape. The plan's '<must_haves>' mentioned 'name' but the schema landed by 40-01 uses 'title', so the config matches the schema."
  - "Auto-generate podcastGuid from sha1(feedId|title|pubDate) when RSS lacks a `<podcast:guid>` or `<guid>` tag. Schema has PodcastEpisode.podcastGuid String @unique (NON-NULL); plan assumed nullable. Deviation Rule 1 — could not write rows otherwise."
  - "Make PodcastFeedPollJob.start() self-check RUN_JOBS internally — per the explicit instruction in the index.ts:543 placeholder comment ('both check RUN_JOBS internally inside the job module's start() method'). The placeholder block sits AFTER runBootLifecycle(), outside its `if (opts.runJobs)` gate, so self-check is required."
  - "Inline PodcastFeed type in apps/web/server/config/podcasts.ts (superset of apps/web/src/types/podcasts.ts adding `tags?` and string-enum `transcriptCheckHint`). The shared frontend type uses `transcriptCheckHint: boolean`; this file uses `'likely-published' | 'never'` for matcher-engine logic. Frontend keeps its narrower shape; consolidation deferred to a follow-up phase."
  - "stripHtml() block-element padding (`<p></p>`, `<div></div>`, `<br>`, `<li>`, `<h1-6>`, `<tr>`, `<td>`, `<section>`, `<article>` → space) added before cheerio text extraction. Without this, `<p>line 1</p><p>line 2</p>` collapses to `'line 1line 2'` — Test 14 in the H8/M2 contract requires `'line 1 line 2'`."
  - "iTunes Search returns podcasts (feeds), not episodes. normaliseFromItunes treats each as a feed-level candidate (collectionName as both podcast + episode title; feedUrl as audioUrl placeholder). Less precise than Podcast Index but provides a fallback when PI is down."

requirements-completed:
  - CONT-03

# Metrics
duration: ~30min (post-base-correction)
completed: 2026-05-04
---

# Phase 40 Plan 03: Podcast Backend Summary

**Built the FREE-tier podcast backend on top of Phase 40-01's schema: 4 services (Podcast Index HMAC wrapper, iTunes Search wrapper, deterministic matcher, singleton orchestrator) + 32-entry curated config + 4-route Express router + daily worker job. `findRelated` is cache-first with Promise.allSettled fan-out; `pollFeed` captures `<podcast:transcript>` (Pitfall 4) and strips HTML at the persistence boundary (H8/M2). 64 unit tests pass, 1528 total tests pass, typecheck clean.**

## Performance

- **Duration:** ~30 minutes (after correcting the worktree base from stale `d4331a0` to current master `35d56f2`)
- **Completed:** 2026-05-04
- **Tasks:** 9/9 (executed as 8 atomic commits — Task 9 is verification-only, no code)
- **Files created:** 13
- **Files modified:** 2

## Accomplishments

- **Multi-source podcast discovery (D-B1):** Podcast Index (HMAC SHA-1) + iTunes Search (no auth) + curated baseline (`PODCAST_FEEDS`) all wired into `findRelated()` via `Promise.allSettled` so a single-provider failure cannot bubble. Pattern mirrors `aiService.ts`'s multi-provider fallback chain.
- **Deterministic matcher (D-B2):** `score = 10 * entityHits + 3 * topicHits + 2 * recencyDecay + popularityLog`. Closed-form `Math.exp(-ageDays/43)` for recency. Dedupe on `podcastGuid`, falls back to `hash(podcastTitle|episodeTitle|publishedAt)`. Cap at 5. Zero AI calls.
- **24h Redis cache** at `podcast:related:{articleId}` per D-B2; 1h cache for Podcast Index `podcastindex:search:{sha1(query|max)}`; 24h cache for iTunes `itunes:search:{country}:{sha1(term|limit)}`.
- **Pitfall 4 mitigation (T-40-03-04):** rss-parser instance configured with `customFields.item: [['podcast:transcript', 'transcripts', { keepArray: true }], ['podcast:guid', 'podcastGuid'], ...]`. Test 9 ("captures podcast:transcript and podcast:guid into upsert payload") parses a fixture XML and asserts both fields land in the `prisma.podcastEpisode.upsert` create payload — load-bearing for Phase 40-06's Whisper cost model.
- **Pitfall 6 mitigation:** `country=` is always passed to iTunes Search (default `'US'`, `'DE'` for German articles, `'FR'` for French). Test 3 (`itunesPodcastService.test.ts`) asserts the URL contains `country=US` even when the caller omits it.
- **H8 / M2 fix (HTML strip at the persistence boundary):** `stripHtml()` is exported from `podcastService.ts` and applied to every `PodcastEpisode.title` and `.description` write inside `pollFeed`. Tests 11–15 (5 tests) cover description, title, entity decoding, undefined/empty/whitespace, and malformed HTML. Block-element padding (`<p>` → space) ensures `<p>line 1</p><p>line 2</p>` becomes `"line 1 line 2"` (not `"line 1line 2"` — pure cheerio `.text()` concatenates child text nodes).
- **Threat model:** all 8 STRIDE rows in the threat register are addressed:
  - T-40-03-01 (secret leak) — spy-test in `podcastIndexService.test.ts` asserts `TESTKEY` and `TESTSECRET` never appear in any logger argument across info/warn/error/debug
  - T-40-03-02 (DoS via hostile feed) — `parser` has `timeout: 10_000`; per-feed try/catch in `podcastFeedPollJob.runOnce()`
  - T-40-03-03 (path-param tampering / stack-trace leak) — Zod safeParse at every route boundary; 500 returns `'Failed to fetch related podcasts'` only, full detail logged server-side
  - T-40-03-04 (silent transcript drop) — see Pitfall 4 above
  - T-40-03-05 (iTunes query string PII) — accepted (only public news content)
  - T-40-03-06 (iTunes 429 cost) — in-process throttle (Test 5 asserts 100ms wall-clock gap); 429 returns `[]` + warn-log, no retry storm
  - T-40-03-07 (Whisper triggered unnecessarily) — see Pitfall 4
  - T-40-03-08 (XML entity injection) — accepted (rss-parser disables external entities by default)

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | PodcastIndexService HMAC SHA-1 wrapper + 9 tests | `86ded9c` |
| 2 | ItunesPodcastService search wrapper + 9 tests | `bfa39ed` |
| 3 | podcastMatcherService deterministic ranker + 9 tests | `3d0bbe2` |
| 5 | Curated PODCAST_FEEDS config (32 entries) | `cfb82c2` |
| 4 | PodcastService orchestrator + stripHtml() boundary + 18 tests | `ca6ae36` |
| 6 | /api/podcasts router (4 endpoints) + 12 route tests | `31ea4d4` |
| 7 | PodcastFeedPollJob daily worker + 7 tests | `b609dfc` |
| 8 | Wire route mount + worker job start in index.ts | `a1eafbc` |

(Task 5 was committed before Task 4 because Task 4 imports from `../config/podcasts`; the rest follow plan order.)

## Pitfall 4 status

**CONFIRMED** — rss-parser `customFields.item` carries `['podcast:transcript', 'transcripts', { keepArray: true }]` and `['podcast:guid', 'podcastGuid']`. The load-bearing test (`podcastService.test.ts > rss-parser instance config (Pitfall 4 — load-bearing) > customFields.item contains podcast:transcript and podcast:guid`) asserts both keys exist in the captured Parser options. A second test (`pollFeed > captures podcast:transcript and podcast:guid into upsert payload`) parses a fixture RSS item with `<podcast:transcript url=... type='text/vtt' />` and asserts the upsert create payload sets `transcriptUrl: 'https://x/transcript.vtt'` and `transcriptType: 'text/vtt'`.

## Pitfall 6 status

**CONFIRMED** — `ItunesPodcastService.searchPodcasts` defaults `country = 'US'` in its signature; Test 2 asserts `country=US` appears in the constructed URL even when the caller omits the argument. Caller (`PodcastService.findRelated`) maps `originalLanguage === 'de' → 'DE'`, `'fr' → 'FR'`, else `'US'`. No code path ever sends a blank `country=`.

## H8/M2 fix status

**CONFIRMED** — `stripHtml()` is exported from `podcastService.ts` and called at every persistence-boundary write inside `pollFeed`. The verification grep returns 13 occurrences (definition + 12 call sites). All 5 H8/M2 round-trip tests pass:

| Test | Input | Expected output |
|------|-------|-----------------|
| 11 | `'<p>Hello <strong>world</strong></p>'` | `'Hello world'` |
| 12 | `'<b>Episode 1</b>'` (CDATA-wrapped title) | `'Episode 1'` |
| 13 | `'AT&amp;T merger'` | `'AT&T merger'` |
| 14a | `undefined` / `null` / `''` | `''` |
| 14b | `'   <p>  spaced  </p>  '` | `'spaced'` |
| 14c | `'<p>line 1</p><p>line 2</p>'` | `'line 1 line 2'` |
| 15 | `'<p>unclosed <strong>nested'` | `'unclosed nested'` |

**Boundary handoff to 40-04:** `PodcastEpisode.title` and `.description` are GUARANTEED plain text in the database. The frontend renders them via `{episode.description}` without DOMPurify, no DOM sanitiser, no `dangerouslySetInnerHTML`.

**Boundary handoff to 40-06:** When the Phase 40-06 transcript orchestrator reads a `PodcastEpisode`, it MUST check `transcriptUrl` BEFORE invoking Whisper. Episodes whose RSS feeds carry a `<podcast:transcript>` tag arrive with this URL pre-populated by the daily poll. Burning Whisper $$ on these is the cost regression Pitfall 4 was designed to prevent.

## Threat-model status

| Threat ID | Disposition | Implemented? |
|-----------|-------------|--------------|
| T-40-03-01 | mitigate | Yes — spy-test asserts secrets never reach logger |
| T-40-03-02 | mitigate | Yes — 10s timeout + per-feed try/catch |
| T-40-03-03 | mitigate | Yes — Zod safeParse + safe 500 message + server-side log only |
| T-40-03-04 | mitigate | Yes — customFields capture + load-bearing test |
| T-40-03-05 | accept | n/a |
| T-40-03-06 | mitigate | Yes — 100ms throttle + 24h cache + 429 returns [] |
| T-40-03-07 | mitigate | Yes (covered by T-40-03-04) |
| T-40-03-08 | accept | n/a (rss-parser default) |

## Worker observability

After deployment, ops can grep for cadence:

```
podcast-feed-poll:start (32 feeds)
podcast-feed-poll:done (inserted=N)
```

Both lines emit at `info` level. Per-feed failures emit at `warn`:

```
pollFeed(<feedId>) parse failed: <error message>
pollFeed(<feedId>) podcast upsert failed: <error message>
pollFeed(<feedId>) error: <error message>          # caught at runOnce level
```

PodcastFeedPollJob.start() emits two distinct startup lines:

```
PodcastFeedPollJob initialized                      # constructor (every getInstance call site)
PodcastFeedPollJob started — runs daily             # only when RUN_JOBS != 'false'
PodcastFeedPollJob skipped: RUN_JOBS=false          # debug — web replicas (RUN_JOBS=false)
```

## Env-var requirements for production

| Variable | Required? | Behaviour when unset |
|----------|-----------|----------------------|
| `PODCAST_INDEX_API_KEY` | optional but recommended | `PodcastIndexService` returns `[]` + warn-log on every call; `findRelated` falls back to iTunes + curated only |
| `PODCAST_INDEX_API_SECRET` | optional but recommended | same as above |

Per the plan's `user_setup`, both come from <https://api.podcastindex.org/> (single sign-up issues both). No dashboard configuration needed — the only setup is the env-var pair.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree was on a stale base (24 commits behind master)**
- **Found during:** Task 1 commit (orchestrator detected the mismatch and halted current work)
- **Issue:** Worktree HEAD `d4331a0` predated 40-01's merge — `apps/web/prisma/schema.prisma` did NOT yet have the `Podcast` / `PodcastEpisode` / `Video` / `Transcript` models, and the placeholder comments in `apps/web/server/index.ts` did not exist. Any test or service code referencing these would have failed to compile.
- **Fix:** `git reset --hard 35d56f2` (current master HEAD which includes both 40-01 and 40-02 merges); `cd apps/web && npx prisma generate`; verified via `grep -E '^model (Podcast|PodcastEpisode|Video|Transcript) '` and `grep '// 40:' apps/web/server/index.ts`. Re-applied the env.example change after reset and restarted Task 1.
- **Files modified:** entire worktree (hard reset)
- **Verification:** `pnpm typecheck` exits 0 against fresh base; all 4 schema models + 4 placeholder comments verified present.
- **Committed in:** N/A (recovery action; subsequent commits stack on top of 35d56f2)

**2. [Rule 1 — Bug] `PodcastEpisode.podcastGuid` is NON-NULL @unique in schema; plan assumed nullable**
- **Found during:** Task 4 implementation (TypeScript error in `pollFeed` upsert payload)
- **Issue:** The plan's `<context>` block declared `podcastGuid String?` (nullable). The actual schema landed by 40-01 has `podcastGuid String @unique` (non-null). Without an auto-generated guid, RSS feeds that don't ship a `<guid>` or `<podcast:guid>` tag would fail to write.
- **Fix:** `pollFeed` now resolves `podcastGuid` in three steps: (1) prefer `<podcast:guid>` namespace tag; (2) fall back to standard `<guid>`; (3) fall back to `sha1(feedId|title|pubDate)` as a deterministic guid. The `id` is then `sha1(pg:{podcastGuid})`. Idempotent: same RSS item → same id → upsert no-op.
- **Files modified:** `apps/web/server/services/podcastService.ts`
- **Committed in:** `ca6ae36` (Task 4 commit)

**3. [Rule 1 — Bug] Worker-job placeholder is in `index.ts`, not `bootLifecycle.ts`**
- **Found during:** Task 8 wiring (grep showed the placeholder is at `index.ts:543`, not in `bootLifecycle.ts` as the plan instructed)
- **Issue:** The plan's `<action>` told me to wire `PodcastFeedPollJob.getInstance().start()` into `bootLifecycle.ts` inside the `if (opts.runJobs)` block. But the actual placeholder added by 40-01 lives in `index.ts:543`, AFTER `runBootLifecycle()` returns — outside the `runJobs` gate. The placeholder comment explicitly says "both check RUN_JOBS internally inside the job module's start() method".
- **Fix:** Followed the placeholder's contract instead of the plan's instruction. `PodcastFeedPollJob.start()` now self-checks `process.env.RUN_JOBS === 'false'` and returns a debug log without spawning the timer. The seam in `index.ts` simply calls `start()` unconditionally. Added a unit test (`RUN_JOBS=false self-skip`) to lock in the behaviour. The seam preserves the placeholder so 40-05 can sibling-add `videoChannelPollJob.getInstance().start()` on the next line.
- **Files modified:** `apps/web/server/jobs/podcastFeedPollJob.ts`, `apps/web/server/jobs/podcastFeedPollJob.test.ts`, `apps/web/server/index.ts`
- **Committed in:** `a1eafbc` (Task 8 commit)

**4. [Rule 2 — Missing critical] cheerio's `.text()` concatenates adjacent block-element children — H8 Test 14 would fail**
- **Found during:** Task 4 first GREEN test run
- **Issue:** Plain `cheerio.load(html).root().text()` returns `'line 1line 2'` for `'<p>line 1</p><p>line 2</p>'`. Test 14c's contract requires `'line 1 line 2'` (space preserved). Without this fix, every multi-paragraph RSS description would have words bleed into each other in the database.
- **Fix:** `stripHtml()` now does a regex pre-pass (`<\/?(p|div|br|li|h[1-6]|tr|td|th|section|article)\b[^>]*>` → `' '`) before invoking cheerio, so block boundaries become whitespace before text extraction. The trailing `\s+ → ' '` collapse cleans up the multiple spaces.
- **Files modified:** `apps/web/server/services/podcastService.ts`
- **Committed in:** `ca6ae36` (Task 4 commit)

**5. [Rule 1 — Bug] iTunes Search returns podcasts (feeds), not episodes; plan's normalisation contract was ambiguous**
- **Found during:** Task 4 implementation
- **Issue:** Plan said `searchPodcasts` returns "podcasts" but the matcher contract expects `CandidateEpisode[]` (episodes). iTunes Search has no episode endpoint.
- **Fix:** `normaliseFromItunes` treats each iTunes podcast row as a feed-level candidate: collection name is both `podcastTitle` and `episodeTitle`; `feedUrl` (the RSS URL, not direct audio) goes into `audioUrl` as a placeholder. This is less precise than Podcast Index but provides a fallback when PI is down. Documented as a key decision.
- **Files modified:** `apps/web/server/services/podcastService.ts`
- **Committed in:** `ca6ae36` (Task 4 commit)

**Total deviations:** 5 auto-fixed (1 base recovery + 4 implementation rule-1/2/3 fixes). No architectural changes. No checkpoints required.

## Outstanding TODOs

None for this plan. The 17-region coverage check passed cleanly — all 13 existing PerspectiveRegion values plus the 4 new sub-regions (sudostasien, nordeuropa, sub-saharan-africa, indien) have ≥1 entry in `PODCAST_FEEDS`.

The `PodcastFeed` shape divergence between the inline declaration in `apps/web/server/config/podcasts.ts` (richer; `tags?` and string-enum `transcriptCheckHint`) and `apps/web/src/types/podcasts.ts` (narrower; `transcriptCheckHint: boolean`) is documented as a key decision. Consolidation is deferred to a follow-up plan once 40-04 frontend lands and the actual frontend-needed shape is concrete.

## Handoff to 40-04 (frontend)

Frontend consumes the following routes; each returns the standard `{ success, data, meta? }` JSON envelope. No auth required. CORS/cache headers as documented.

| Route | Response shape | Cache-Control |
|-------|----------------|---------------|
| `GET /api/podcasts` | `{ success, data: PodcastFeed[], meta: { total } }` | `public, max-age=86400` |
| `GET /api/podcasts/:feedId/episodes` (limit 1-100, default 50) | `{ success, data: PodcastEpisode[], meta: { total, limit } }` | `public, max-age=600` |
| `GET /api/podcasts/episodes/:episodeId` | `{ success, data: PodcastEpisode }` or 404 | `public, max-age=3600` |
| `GET /api/podcasts/related/:articleId` | `{ success, data: MatchedEpisode[], meta: { total } }` | `public, max-age=3600` |

**`PodcastEpisode.title` and `.description` are GUARANTEED plain text** — the frontend can render directly via JSX expression interpolation (`{episode.description}`) without DOMPurify, no `dangerouslySetInnerHTML`, no sanitiser dependency.

**Suggested TanStack Query hook** (40-04 Task TBD):

```typescript
function useRelatedPodcasts(articleId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['related-podcasts', articleId],
    queryFn: async () => {
      const r = await fetch(`/api/podcasts/related/${encodeURIComponent(articleId)}`);
      if (!r.ok) throw new Error(`Failed: ${r.status}`);
      return (await r.json()).data as MatchedEpisode[];
    },
    staleTime: 24 * 60 * 60 * 1000, // matches server 24h cache TTL
    enabled: options.enabled !== false && !!articleId,
    retry: 1,
  });
}
```

## Handoff to 40-06 (transcripts)

The `transcriptUrl` and `transcriptType` fields on `PodcastEpisode` are now populated for every episode whose RSS feed carries a `<podcast:transcript>` tag. The transcript orchestrator MUST check these BEFORE invoking Whisper:

```typescript
const ep = await prisma.podcastEpisode.findUnique({ where: { id } });
if (ep?.transcriptUrl) {
  return await fetchPublisherTranscript(ep.transcriptUrl, ep.transcriptType);
}
// ...else fall through to YouTube auto-captions / Whisper
```

Curated feeds flagged `transcriptCheckHint: 'likely-published'` (NPR, NYT, Guardian, CBC) are the highest-yield candidates for this short-circuit. Per the cost model in 40-CONTEXT.md D-C2, capturing this saves ≥40% of the projected Whisper bill.

## Self-Check

Verifying claims before completion.

### Files claimed created — verified present

- `apps/web/server/services/podcastIndexService.ts` — FOUND
- `apps/web/server/services/podcastIndexService.test.ts` — FOUND
- `apps/web/server/services/itunesPodcastService.ts` — FOUND
- `apps/web/server/services/itunesPodcastService.test.ts` — FOUND
- `apps/web/server/services/podcastMatcherService.ts` — FOUND
- `apps/web/server/services/podcastMatcherService.test.ts` — FOUND
- `apps/web/server/services/podcastService.ts` — FOUND
- `apps/web/server/services/podcastService.test.ts` — FOUND
- `apps/web/server/config/podcasts.ts` — FOUND
- `apps/web/server/routes/podcasts.ts` — FOUND
- `apps/web/server/routes/podcasts.test.ts` — FOUND
- `apps/web/server/jobs/podcastFeedPollJob.ts` — FOUND
- `apps/web/server/jobs/podcastFeedPollJob.test.ts` — FOUND

### Commit hashes — verified in git log

- `86ded9c` Task 1 — FOUND
- `bfa39ed` Task 2 — FOUND
- `3d0bbe2` Task 3 — FOUND
- `cfb82c2` Task 5 — FOUND
- `ca6ae36` Task 4 — FOUND
- `31ea4d4` Task 6 — FOUND
- `b609dfc` Task 7 — FOUND
- `a1eafbc` Task 8 — FOUND

### Verification gates — exit-0

- `pnpm typecheck` — PASSED
- `pnpm test:run` — PASSED (1528 tests across 69 test files)
- 64 new tests across 6 new test files — PASSED
- `stripHtml` greppable in podcastService.ts (definition + ≥1 call site, comments excluded) — 13 occurrences, PASSED

### Anti-pattern check (CC-03) — verified

- All committed paths under `apps/web/`, `packages/`, `.github/`, `.planning/`, `apps/mobile/`, `e2e-stack/`, or `pgbouncer/` — CONFIRMED
- No writes to root `server/`, `prisma/`, `src/` — CONFIRMED ABSENT
- 40-05's `// 40: video routes mount here` placeholder — PRESERVED UNTOUCHED

### Placeholder preservation (40-01 → 40-05 handoff)

- `// 40: podcast routes mount here` (line 204) — PRESERVED, with route mount at line 205
- `// 40: video routes mount here` (line 206) — UNTOUCHED (40-05's slot)
- `// 40: transcripts route mount here` (line 207) — UNTOUCHED (40-06's slot)
- `// 40: worker job starts here` (line 543) — PRESERVED, with start call at line 544

## Self-Check: PASSED

---
*Phase: 40-content-expansion*
*Plan: 03*
*Completed: 2026-05-04*
