# Phase 38: Advanced AI Features - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

NewsHub gains user-visible AI evaluation of source quality and article claims:

- A **credibility score (0-100) with a confidence indicator** renders on every news source / article surface, derived deterministically from the existing static `NewsSource.reliability` + `politicalBias` fields. The score is anchored on existing data; an LLM only writes the human-readable methodology and attributes three sub-dimensions (accuracy, transparency, corrections).
- A **bias indicator (left/center/right)** uses the existing `MediaBiasBar` thresholds against `NewsSource.politicalBias`. Methodology bundles with the credibility methodology paragraph.
- A **framing analysis** view replaces the existing sentiment-heuristic in `FramingComparison.tsx` with a real LLM-driven structured output per region, exposing narrative, omissions, vocabulary, and evidence quotes.
- A **fact-check tool** lets the user highlight any claim in an article body and request a verdict (5-bucket scale + confidence + cited NewsHub articles). Citations come exclusively from NewsHub's own multilingual corpus via Postgres full-text search; no external fact-check API; no LLM web-search.
- All four AI artifacts (credibility, framing, fact-check, methodology) are **cached in Redis with 24h TTL** to control inference cost (criterion #6).

**Out of scope (deferred):**
- Community-shared fact-check verdicts visible to other users (private-to-user only this phase)
- pgvector / embedding-based semantic search for fact-check evidence (Postgres full-text only this phase)
- External fact-check API integration (Google Fact Check, ClaimReview)
- LLM web-search tool calling
- Worker-precomputed credibility cron (on-demand lazy cache only)
- Schema columns for credibility on `NewsSource` (Redis-only this phase)
- Live tracking of source corrections / retractions (LLM-attributed, not measured)

</domain>

<decisions>
## Implementation Decisions

### Credibility scoring approach

- **D-01 [LOCKED]** — The 0-100 credibility score is **derived deterministically** from existing `NewsSource.reliability` (0-10) and `politicalBias` (-1..1) via a normalization function in `apps/web/server/services/`. The LLM does NOT compute the score itself. This avoids ~130 LLM calls per refresh, stays idempotent across replicas, and reuses curated data already on every source. The LLM is invoked only for the methodology paragraph + sub-dimension attribution (D-02).

- **D-02 [LOCKED]** — Per AI-02 ("multiple dimensions: accuracy, transparency, corrections"), the LLM outputs structured JSON `{accuracy: 0-100, transparency: 0-100, corrections: 0-100}` per source, given the source name + reliability score + bias direction as input. The methodology paragraph **must explicitly disclose** that these sub-dimensions are LLM-attributed estimates, not measured signals — i.e., the user is told this is AI-derived, not a third-party rating.

- **D-03 [LOCKED]** — Refresh cadence: **on-demand lazy Redis cache, 24h TTL**. First user request for a source's credibility per day triggers the LLM call (~2-5s); subsequent requests within 24h hit cache. No worker job, no nightly cron. Stale-while-revalidate avoids visible latency on warm cache. Aligns with criterion #6 ("minimize inference costs") and Phase 37 stateless-replica model.

- **D-04 [LOCKED]** — The bias indicator (AI-03 "left/center/right") **reuses `NewsSource.politicalBias`** with `MediaBiasBar.tsx`'s existing thresholds (`<-0.2 = left`, `-0.2..0.2 = center`, `>0.2 = right`). No new bias derivation, no new schema. Bias methodology surfaces inside the same panel/tooltip as the credibility methodology — single explanatory surface, single LLM call.

- **D-05 [LOCKED]** — The confidence indicator (criterion #1) renders as a **categorical pill** with three buckets (low / medium / high), color-coded gray/yellow/cyan, using the existing design system pill component. Confidence is itself an LLM-attributed value (50-100) bucketed at 60/80 thresholds. Three i18n strings per locale. Numeric ± ranges and ring-around-score patterns rejected as bandwidth-heavy and accessibility-unfriendly.

### Fact-check trigger UX

- **D-06 [LOCKED]** — Trigger: **user highlights / selects text in the article body, a floating "Fact-check this" button appears**. Clicking POSTs the highlighted claim to a new `POST /api/ai/fact-check` route. Mobile fallback: long-press selection (native browser behavior). Coexists with existing share/quote tools (separate floating action). User retains precise control over what gets verified — no proactive AI-extracted-claim sidebar this phase.

- **D-07 [LOCKED]** — Verdict UI: **inline drawer expands beneath the highlighted text**. Contains verdict pill, confidence percentage, methodology paragraph, citations list. Collapsible. On mobile: full-width drawer that pushes content down. Visual anchor to the claim location is non-negotiable — modal dialog and right-side panel patterns rejected.

- **D-08 [LOCKED]** — Verdict scale: **5 buckets {true, mostly-true, mixed, unverified, false}** + confidence 0-100. Color coding: green / lime / yellow / gray / red. `unverified` is the explicit "we couldn't find sufficient evidence in the corpus" verdict — the LLM is instructed to pick this rather than guess. Maps to journalism-standard PolitiFact/Snopes scale; 3-bucket and numeric-only alternatives rejected as either too coarse or too hard to scan.

- **D-09 [LOCKED]** — Tier gating: **reuse the existing `aiTierLimiter`** mounted on `/api/ai/*` (Phase 36.4). FREE users share the existing 10 AI queries/day quota across `/ai/ask` + `/ai/propaganda` + `/ai/fact-check`. PREMIUM unlimited. No new per-feature quota system. The 11th request returns 429 with `upgradeUrl: "/pricing"` (existing behavior).

### Fact-check evidence sourcing

- **D-10 [LOCKED]** — Evidence source: **internal NewsHub corpus only**. No external fact-check APIs. No LLM web-search tools. Citations are NewsHub article IDs that become in-app links — explicitly reinforces the multi-perspective value proposition (the user sees their fact-check is built on the same multi-region articles the platform already aggregates).

- **D-11 [LOCKED]** — Corpus search: **Postgres full-text search via existing GIN indexes** (Phases 13/15 already cover `title`/`content`/`topics`/`entities`). Tokenize the claim at the API layer; run `ts_rank` against `title || content`; top-10 hits; filter to last 90 days. <50ms latency per search. **No pgvector / no embeddings this phase** — semantic search escalation is a candidate for a later phase if keyword retrieval proves inadequate.

- **D-12 [LOCKED]** — Cross-language behavior: **translate the claim into each i18n target language (DE/EN/FR initially) via the existing `translationService` chain** (Phase 1: DeepL → Google → LibreTranslate → Claude). Run `ts_rank` searches in each language; merge top-N. The LLM receives raw multilingual article snippets in the prompt with a language tag — the LLM is already multilingual-capable. **Articles are NOT translated to user locale before LLM context** (~10x cost). Translation only happens to the claim, not to articles.

- **D-13 [LOCKED]** — Citation render: **up to 5 cited articles render as compact perspective-badge cards** (source name + 13-region color badge + headline + "View article" link). Reuses `NewsCard` styling. The visual goal is letting the user see the multi-region diversity of the verdict's evidence basis. Plain link lists and inline `[1][2][3]` markers rejected.

- **D-14 [LOCKED]** — Framing analysis (criterion #4): **build a real LLM-driven framing analysis** to replace the existing sentiment-heuristic in `FramingComparison.tsx`. New method `aiService.generateFramingAnalysis(topic): Promise<Record<PerspectiveRegion, { narrative, omissions, vocabulary[], evidenceQuotes[] }>>`. The component swaps from the heuristic sentiment-class output to the structured LLM output. Cached 24h per topic.

### Storage & freshness model

- **D-15 [LOCKED]** — Credibility data: **Redis-only**. No Prisma schema change for credibility. Data is fully derivable from `NewsSource.reliability` + `politicalBias` (deterministic) + LLM methodology + LLM sub-dimensions (regenerable). Cache miss recomputes in ~2-5s. Aligns with Phase 37 stateless-replica model. Lowest blast radius.

- **D-16 [LOCKED]** — Fact-check data: **new Prisma model `FactCheck` in `apps/web/prisma/schema.prisma`** + **24h Redis lookup cache**. Schema:
  ```prisma
  model FactCheck {
    id                  String   @id @default(cuid())
    userId              String?  // FK to User; nullable for hard-delete on account-delete
    articleId           String?  // FK to NewsArticle; nullable if claim is pasted independently
    claimText           String   @db.Text
    claimHash           String   // sha256(claimText) for dedup + Redis key
    claimLanguage       String   // detected at submit time
    verdict             String   // 'true' | 'mostly-true' | 'mixed' | 'unverified' | 'false'
    confidence          Int      // 0-100
    methodologyMd       String   @db.Text
    citationArticleIds  String[] // array of NewsArticle.id
    modelUsed           String   // 'openrouter:...' | 'gemini:...' | 'anthropic:...'
    createdAt           DateTime @default(now())

    user                User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
    article             NewsArticle?  @relation(fields: [articleId], references: [id], onDelete: SetNull)

    @@index([claimHash])
    @@index([userId])
    @@index([articleId])
    @@index([createdAt])
  }
  ```
  Migration is purely additive. The model survives Redis flush, supports analytics ("most fact-checked claims this week"), and provides an audit trail if a verdict is later disputed. **DB writes happen after every fact-check; Redis is a 24h read-through cache keyed on `claimHash`.**

- **D-17 [LOCKED]** — Framing data: **Redis-only**, key `framing:topic:{topicHash}:{locale}`, 24h TTL. Topic-level structured output is cheaper to regenerate than to schema-version. No DB persistence this phase.

- **D-18 [LOCKED]** — Cache key shape: **locale-scoped per-resource where output text differs by language; locale-independent where the verdict is language-agnostic**.
  - `credibility:source:{sourceId}:{locale}` — 24h TTL (methodology text is locale-specific)
  - `framing:topic:{topicHash}:{locale}` — 24h TTL (narrative/vocabulary text is locale-specific)
  - `factcheck:claim:{claimHash}` — 24h TTL **locale-independent** (verdict + confidence + citation IDs do not vary by language; the methodology text is regenerated per-locale in a separate child key `factcheck:claim:{claimHash}:methodology:{locale}` if/when needed, or — simpler — the FactCheck DB row's `methodologyMd` is in the user's submit-time language and re-translated at render via existing `translationService` only when locale-mismatch is detected)
  Minimum cache duplication. Reuses the existing `CacheService` + `CacheKeys` patterns at `apps/web/server/services/cacheService.ts`.

- **D-19 [LOCKED]** — Community visibility: **fact-checks are private to the requesting user**. `FactCheck.userId` is the scope. `claimHash`-based dedup is also per-user (a user re-checking the same claim within 24h hits cache; another user fact-checking the identical claim runs a fresh inference). Other users opening the same article do not see prior fact-checks. Lowest moderation surface, simplest GDPR (rows hard-delete via `onDelete: SetNull` on user — actually let's hard-delete: `onDelete: Cascade` if `userId` set; the `SetNull` is for legal-retention case which we DON'T enable this phase). Researcher must confirm the cascade choice against existing GDPR patterns from `apps/web/server/services/cleanupService.ts`.

### Claude's Discretion

- The exact LLM prompt structure for credibility methodology, sub-dimension attribution, framing analysis, and fact-check verdicts — the planner and researcher pick prompt patterns. Constraints: must produce parseable JSON for structured fields; must explicitly disclose LLM-attribution status in user-visible methodology text; must instruct the LLM to return `unverified` rather than guess when corpus evidence is thin.
- The specific `ts_query` operators (`websearch_to_tsquery` vs `plainto_tsquery` vs `phraseto_tsquery`) used for corpus search — researcher picks based on Postgres docs and existing query patterns in `apps/web/server/services/newsReadService.ts`.
- The 60/80 confidence-bucket thresholds in D-05 — planner can adjust if the researcher surfaces evidence that LLM self-reported confidence is poorly calibrated.
- The location of the new "Fact-check this" highlight button (relative to existing share/quote/copy floating actions in the article body) — UI researcher picks.
- Whether `FactCheck.methodologyMd` stores locale-tagged content or always English-with-on-render-translation — D-18 leaves this open to the planner since it depends on whether the researcher finds existing precedent in `commentService.ts` / cluster summary storage.
- The exact route path: `POST /api/ai/fact-check` is the proposed shape (consistent with `/ai/ask`, `/ai/propaganda`); planner can adjust if a different naming convention is established under `/api/analysis/`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project + planning context
- `.planning/PROJECT.md` — Product vision, current state, milestone v1.6 scope including "Source credibility scoring", "Bias detection (political/framing analysis)", "Fact-checking (claim verification)"
- `.planning/REQUIREMENTS.md` §AI-01..AI-07 — Locked requirements that this phase closes
- `.planning/ROADMAP.md` §"Phase 38: Advanced AI Features" — 6 success criteria locked
- `.planning/STATE.md` — Current milestone state, prior-phase decisions, deferred items
- `.planning/.continue-here.md` — **MANDATORY READ** — milestone-global blocking anti-pattern: never write to root `server/`, `prisma/`, `src/`. All Phase 38 writes land under `apps/web/...`.

### Prior-phase context that locks downstream behavior
- `.planning/phases/36.4-relocate-plan-03-04-monetization-artifacts/36.4-CONTEXT.md` — Server-side tier gating decisions: `requireTier`, `aiTierLimiter`, `attachUserTier` patterns. D-09 verifies the FREE 11th `/api/ai/ask` returns 429 + `upgradeUrl`.
- `.planning/phases/37-horizontal-scaling/37-CONTEXT.md` — Stateless-replica model. AI service must hold no in-memory result state; cache in Redis.
- `.planning/phases/14-redis-caching/14-CONTEXT.md` — `CacheService` singleton patterns + `CacheKeys` namespacing
- `.planning/phases/13-postgresql-migration/13-CONTEXT.md` + Phase 15 — GIN indexes on `NewsArticle.title`/`content`/`topics`/`entities` already exist for full-text search

### Existing code that downstream agents MUST extend, not replace
- `apps/web/server/services/aiService.ts` — Singleton with multi-provider fallback chain (`callWithFallback`); existing methods `clusterArticles`, `generateClusterSummary`, `generateComparison` (heuristic — to be replaced by D-14), `analyzeSentiment`, `classifyTopics`. **New methods this phase must add**: `getSourceCredibility`, `generateFramingAnalysis`, `factCheckClaim`.
- `apps/web/server/services/cacheService.ts` — Use existing `CacheService.getInstance()` + extend `CacheKeys` per D-18 key shape
- `apps/web/server/services/translationService.ts` — Reuse for D-12 cross-language claim translation
- `apps/web/server/middleware/requireTier.ts` + `apps/web/server/middleware/rateLimiter.ts` (`aiTierLimiter`) — Already mounted on `/api/ai`; new route inherits gating
- `apps/web/server/routes/ai.ts` — Add `POST /ai/fact-check` here (mounted at `/api/ai`, gets `authMiddleware + aiTierLimiter` for free)
- `apps/web/server/routes/analysis.ts` — Add new framing endpoint here if researcher decides framing belongs under `/analysis`
- `apps/web/server/services/newsReadService.ts` — Existing Postgres full-text search patterns to extend for D-11 corpus search
- `apps/web/server/config/sources.ts` — 130 sources with `bias.political` + `bias.reliability` (read-only this phase)
- `apps/web/prisma/schema.prisma` §`NewsSource` — Read-only this phase. New `FactCheck` model lands here per D-16.
- `apps/web/server/openapi/schemas.ts` — Code-first OpenAPI (Zod). New endpoints' request/response shapes go here for `/api-docs`.

### UI components that get extended this phase
- `apps/web/src/components/MediaBiasBar.tsx` — Existing 3-bucket bias classification; D-04 reuses thresholds
- `apps/web/src/components/BiasRadarChart.tsx` — Existing visualization; possibly extends with credibility overlay
- `apps/web/src/components/FramingComparison.tsx` — D-14: swap heuristic for LLM structured output
- `apps/web/src/components/NewsCard.tsx` — Add credibility pill + bias badge
- `apps/web/src/components/SignalCard.tsx`, `apps/web/src/pages/Analysis.tsx` — Existing analysis surfaces
- `apps/web/src/components/feed-manager/SourceRow.tsx` — Per-source credibility detail surface

### i18n
- `apps/web/src/i18n/locales/{de,en,fr}/` — Strings for verdict labels (5 verdicts), confidence buckets (low/medium/high), bias buckets (left/center/right), methodology UI labels, "Fact-check this" button label, drawer labels

### Tier-gating + rate-limit infra
- `apps/web/server/middleware/requireTier.ts` (Phase 36.4) — `requireTier` factory + `attachUserTier`
- `apps/web/server/middleware/rateLimiter.ts` (`aiTierLimiter`) — 24h sliding window for FREE-tier 10 AI queries/day; reused via D-09

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`AIService.callWithFallback(prompt)`** at `apps/web/server/services/aiService.ts:245`: General-purpose multi-provider LLM call with OpenRouter → Gemini → Anthropic fallback. Phase 38 uses this for credibility methodology, framing analysis, and fact-check verdict generation. **Do not** add new provider logic; reuse this method.
- **`CacheService.getInstance()`** at `apps/web/server/services/cacheService.ts`: Redis wrapper with graceful in-memory fallback. Phase 38 cache writes go through this; new key namespaces under `CacheKeys`.
- **`requireTier(minTier)` factory** at `apps/web/server/middleware/requireTier.ts:31`: Hard-gate middleware. The existing `aiTierLimiter` chain on `/api/ai` already covers Phase 38 routes — no new middleware factory needed.
- **`translationService` chain** (Phase 1): D-12 cross-language fact-check translates the claim only via this chain.
- **Postgres GIN indexes on `NewsArticle.title || content`** (Phase 13/15): D-11 corpus search reuses these — `ts_rank` queries land in <50ms.
- **`MediaBiasBar.tsx` thresholds** (`<-0.2`, `-0.2..0.2`, `>0.2`): D-04 reuses the exact thresholds — single source of truth for left/center/right classification.
- **`FramingComparison.tsx`**: existing UI shell with topic search + region grid. D-14 keeps the shell; the per-region rendering swaps from sentiment-class to structured LLM output.
- **OpenAPI Zod schemas at `apps/web/server/openapi/schemas.ts`**: code-first single source of truth for runtime validation + API docs. New endpoints register here.

### Established Patterns

- **Singleton service + Redis cache + in-memory fallback**: every project-wide service (AIService, CacheService, TranslationService) uses this triple. Phase 38 must not introduce a new pattern.
- **Server-side tier gating only**: per Phase 36.4 D-09, all gating happens server-side (middleware), never client-only. Frontend may show upgrade prompts but the 429/403 truth comes from the server.
- **Code-first OpenAPI via Zod**: every new endpoint registers a request + response Zod schema in `apps/web/server/openapi/schemas.ts`. Used for both runtime validation and `/api-docs` rendering.
- **i18n triple DE/EN/FR via `react-i18next` + `i18next-icu`**: every user-visible string lives in `apps/web/src/i18n/locales/{de,en,fr}/`. Numeric/plural strings use ICU.
- **Prisma migrations are additive**: never destructive in regular phases. New tables OK; column drops require an explicit dedicated phase (precedent: 36.5 dropping `showPremiumBadge`).
- **`onDelete` semantics for user-owned data**: review existing patterns in `Bookmark`, `ReadingHistory`, `Comment`, `Team*` to choose between `Cascade` (hard-delete on user-delete) and `SetNull` (preserve audit trail). D-19 commentary leaves the choice to the researcher with a hard-delete preference.
- **Caching keys are namespaced** (existing examples: `cacheKeys.aiSummary(...)`, `cacheKeys.translation(...)`). D-18 follows the same convention.
- **AI route mount order matters**: per `apps/web/server/index.ts:164-168`, `authMiddleware` runs BEFORE `aiTierLimiter` so the limiter's `skip()` callback can read `req.user`. New `/ai/fact-check` route inherits this order automatically by mounting under the existing chain.

### Integration Points

- **Article-page layout**: the highlight + "Fact-check this" floating button hooks into the article-body rendering in `apps/web/src/pages/`. Researcher must locate the article-detail page component and identify the right insertion point relative to existing share/quote tools.
- **NewsCard / SourceRow**: new credibility pill renders on every card surface. Visual designer should ensure the pill doesn't crowd existing badges (perspective region, sentiment, confidence-from-source-count).
- **Analysis page (`apps/web/src/pages/Analysis.tsx`)**: framing comparison is likely surfaced here. Confirm whether the upgraded `FramingComparison.tsx` lands as an inline section or its own route.
- **`/api/ai/*` mount chain in `apps/web/server/index.ts:167`**: new `fact-check` route gets gating + auth for free.
- **GDPR cleanup (`apps/web/server/services/cleanupService.ts`)**: if D-19 is implemented as `onDelete: Cascade`, the user-delete path automatically cleans up FactCheck rows — no new cleanup logic needed. If `SetNull`, the cleanup service may need an explicit retention rule.
- **OpenAPI spec regeneration**: after adding Zod schemas + routes, `cd apps/web && pnpm openapi:generate` regenerates `public/openapi.json` for the `/api-docs` Scalar UI.

</code_context>

<specifics>
## Specific Ideas

- **Methodology paragraph must be honest about LLM-attribution.** Per D-02, the user-visible methodology must say (in DE/EN/FR) something like: "These dimensions are AI-attributed estimates based on the source's reputation and bias profile, not measured signals from this platform." This is the ethical guardrail for shipping AI-generated quality scores.
- **Multi-perspective citations as the value prop.** Per D-13, citations rendering as perspective-badge cards is not just a UI choice — it's the visual link between the platform's core value (multi-region perspective comparison) and the new fact-check feature. A fact-check that cites only USA sources should look visually different from one that draws from Russia + China + Germany.
- **"Unverified" verdict is the ethical default.** Per D-08, the LLM is instructed to return `unverified` rather than guess when corpus evidence is thin. The user must see this honestly. Researcher should design the prompt so the LLM picks `unverified` when fewer than ~3 distinct sources are retrieved or when retrieved snippets don't clearly address the claim.
- **130 sources × 3 locales = 390 cache entries for credibility.** Comfortable in Redis; warm-up cost ~390 LLM calls at first cold-start per locale per source per day. On-demand lazy means most sources never warm up — fine.

</specifics>

<deferred>
## Deferred Ideas

- **Community-shared fact-check verdicts** — visible to other users on the same article. Adds moderation, GDPR complexity, conflict resolution between disagreeing verdicts. Belongs in a follow-up "Community AI" phase.
- **External fact-check API integration** — Google Fact Check Tools API, ClaimReview aggregator. Could escalate when internal corpus has zero matches. Belongs in a "Fact-check coverage expansion" phase if internal corpus retrieval proves inadequate.
- **LLM web-search tool** — Anthropic web-search / OpenRouter browsing models. Highest coverage, highest cost, lowest determinism. Belongs in a premium-tier-only phase.
- **Embedding-based semantic search (pgvector)** — Catches paraphrased claims that keyword matching misses. Requires schema migration, embedding backfill cost (~$1-5 one-shot for 130k articles), per-article ongoing embedding cost. Belongs in a dedicated "Semantic retrieval" phase if Phase 38's keyword search shows clear paraphrase gaps in production telemetry.
- **Worker-precomputed credibility cron** — nightly recompute for all 130 sources via Phase 37's `app-worker`. Belongs in a "Predictable AI cost" phase if on-demand lazy cache shows cold-cache latency complaints.
- **Live tracking of source corrections / retractions** — would replace D-02's LLM-attributed `corrections` sub-dimension with a measured signal. Requires a new ingestion pipeline that detects retractions in source feeds. Belongs in "Phase 40+ Source quality improvements" per PROJECT.md milestone v1.6 target features.
- **Per-article fact-check counter for FREE users** — alternative to D-09's shared 10/day quota. Lets FREE users sample on every article. Captured if the chosen quota model proves too restrictive.
- **AI-extracted-claim sidebar** — proactive "claims to fact-check" panel when article opens. Higher discoverability vs D-06's user-driven highlight model. Captured for a future UX iteration.
- **Confidence indicator as numeric ± range** — alternative to D-05's categorical pill if accessibility/precision feedback warrants a more granular display.
- **5-bucket bias scale (far-left/lean-left/center/lean-right/far-right)** — alternative to D-04's reuse of `MediaBiasBar` thresholds if user feedback wants more granularity.

</deferred>

---

*Phase: 38-advanced-ai-features*
*Context gathered: 2026-04-29*
