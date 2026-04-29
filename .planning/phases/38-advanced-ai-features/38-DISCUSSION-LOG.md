# Phase 38: Advanced AI Features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 38-advanced-ai-features
**Areas discussed:** Credibility scoring approach, Fact-check trigger UX, Fact-check evidence sourcing, Storage & freshness model, Confidence indicator UX, Cross-language fact-check behavior, Community fact-check visibility

---

## Credibility scoring approach

### Q1 — Score derivation

| Option | Description | Selected |
|--------|-------------|----------|
| Static fields + LLM explanation | Deterministic 0-100 from existing reliability + politicalBias; LLM only writes methodology paragraph. Fast, cheap, idempotent. | ✓ |
| LLM live re-scoring per source | LLM evaluates each of 130 sources from name + bias claim. ~130 LLM calls/day; LLM speculates correction history. | |
| Hybrid: static base + signals + LLM | Static base + live signals (sentiment volatility, retraction patterns) + LLM combines. Most accurate, most code. | |
| You decide | Claude picks lowest-cost option. | |

**User's choice:** Static fields + LLM explanation
**Notes:** Anchors the score on curated data already on every source; avoids LLM speculation about correction history.

### Q2 — Sub-dimensions (AI-02 multiple dimensions)

| Option | Description | Selected |
|--------|-------------|----------|
| LLM-attributed per source | LLM outputs {accuracy, transparency, corrections} 0-100 each given source name + reliability + bias. Cached 24h. | ✓ |
| Static formula split | Decompose reliability (0-10) into three dimensions via fixed weights. Fully deterministic. | |
| Single score + qualitative methodology | No numeric dimensions; methodology paragraph names factors qualitatively. | |

**User's choice:** LLM-attributed per source
**Notes:** Methodology must explicitly disclose LLM-attribution status — ethical guardrail.

### Q3 — Refresh cadence

| Option | Description | Selected |
|--------|-------------|----------|
| On-demand lazy cache | First user request per source per day triggers LLM (~2-5s); cached 24h. No worker. | ✓ |
| Worker precomputes nightly | app-worker runs computeCredibility job nightly for 130 sources. Always warm. | |
| Manual refresh + admin endpoint | Cache populated by admin POST when source added/edited. Cheapest, least fresh. | |

**User's choice:** On-demand lazy cache
**Notes:** Aligns with Phase 37 stateless-replica model; cost scales with actual demand.

### Q4 — Bias indicator (AI-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse politicalBias on source card | 3-bucket badge (left/center/right) using MediaBiasBar's existing thresholds. Zero schema work. | ✓ |
| New bias scale with sub-buckets | Five buckets (far-left → far-right) with new icons/strings. Richer signal, more code. | |
| Bias surfaced only in methodology text | No discrete badge; direction named qualitatively. Lighter UI. | |

**User's choice:** Reuse politicalBias on source card

---

## Fact-check trigger UX

### Q1 — Trigger pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight + button | User selects text in article body; floating "Fact-check this" appears. Most precise. Mobile: long-press. | ✓ |
| AI auto-extracts claims on article open | LLM extracts 3-5 claims per article load; sidebar with check-button per claim. Most discoverable, costliest. | |
| Hybrid panel suggests + user adds | Sidebar suggests + free-text input. Doubles the UI. | |
| Free-text only | Modal with text input. Simplest, lowest discoverability. | |

**User's choice:** Highlight + button

### Q2 — Verdict render location

| Option | Description | Selected |
|--------|-------------|----------|
| Inline drawer below highlighted text | Verdict expands beneath claim. Visual anchor preserved. | ✓ |
| Right-side panel | Persistent panel accumulates session history. Mobile complexity. | |
| Modal dialog | Center-screen modal. Loses visual anchor. | |

**User's choice:** Inline drawer below highlighted text

### Q3 — Verdict scale

| Option | Description | Selected |
|--------|-------------|----------|
| 5-bucket scale | {true, mostly-true, mixed, unverified, false} + confidence 0-100. Standard journalism scale. | ✓ |
| 3-bucket scale | {supported, contested, unverified}. Simpler, loses gradient. | |
| Numeric only | Confidence 0-100 with no categorical label. Honest about uncertainty, harder to scan. | |

**User's choice:** 5-bucket scale

### Q4 — Tier gating

| Option | Description | Selected |
|--------|-------------|----------|
| FREE: limited daily quota; PREMIUM unlimited | Reuse aiTierLimiter — FREE shares 10 AI/day quota across /ai/ask + /propaganda + /fact-check. | ✓ |
| PREMIUM-only | FREE sees button but click triggers upgrade prompt. Maximizes upgrade pressure. | |
| FREE: 1-2 per article, PREMIUM unlimited | Per-article counter for FREE. New quota system needed. | |

**User's choice:** FREE: limited daily quota; PREMIUM unlimited

---

## Fact-check evidence sourcing

### Q1 — Citation source

| Option | Description | Selected |
|--------|-------------|----------|
| Internal corpus + LLM synthesis | Search NewsHub's own articles via Postgres GIN; LLM synthesizes verdict. No external API. | ✓ |
| External fact-check API | Google Fact Check / ClaimReview API. Highest authority; misses most claims; English-only. | |
| LLM with web-search tool | Anthropic / OpenRouter browsing model. Highest coverage, highest cost, least deterministic. | |
| Hybrid — internal first, external fallback | Internal first; escalate to external if low confidence. Most code paths. | |

**User's choice:** Internal corpus + LLM synthesis
**Notes:** Reinforces multi-perspective value prop — citations are NewsHub article IDs that become in-app links.

### Q2 — Corpus search method

| Option | Description | Selected |
|--------|-------------|----------|
| Postgres full-text + GIN index | ts_rank against title+content; existing indexes from Phase 13/15. <50ms latency. | ✓ |
| Embedding-based semantic search (pgvector) | Catches paraphrased matches. Requires migration + ~$1-5 backfill + ongoing per-article cost. | |
| LLM-driven search query generation | LLM generates 2-3 query strings; aggregate hits. +1 LLM call per fact-check. | |

**User's choice:** Postgres full-text + GIN index

### Q3 — Citation render in verdict drawer

| Option | Description | Selected |
|--------|-------------|----------|
| Article cards with perspective badges | Up to 5 cards: source + region color + headline + link. Visualizes perspective diversity. | ✓ |
| Plain link list | Numbered "[1] Source: Title" links. Loses diversity visualization. | |
| Inline citation markers in verdict text | LLM uses [1][2][3] inline; references list below. Familiar, requires reliable LLM citation syntax. | |

**User's choice:** Article cards with perspective badges

### Q4 — Framing analysis (criterion #4)

| Option | Description | Selected |
|--------|-------------|----------|
| Build real LLM framing analysis | New aiService.generateFramingAnalysis(topic) returns structured per-region narrative/omissions/vocab/quotes. | ✓ |
| Keep heuristic, polish UI only | Existing sentiment-class output stays; add methodology tooltip. Reads as low-effort. | |
| Hybrid: heuristic baseline + LLM deep dive button | Fast heuristic on render + opt-in LLM deep dive. Doubles code surface. | |

**User's choice:** Build real LLM framing analysis

---

## Storage & freshness model

### Q1 — Credibility data location

| Option | Description | Selected |
|--------|-------------|----------|
| Redis-only | Pure derived view; deterministic score + LLM methodology. Cache key {sourceId, locale}. No schema change. | ✓ |
| Add JSON column to NewsSource | NewsSource.credibility Json? holds methodology + dimensions. Survives Redis flush. | |
| New SourceCredibility model (1:1) | Versioned table with audit history. Schema overhead vs durability need. | |

**User's choice:** Redis-only

### Q2 — Fact-check data location

| Option | Description | Selected |
|--------|-------------|----------|
| FactCheck Prisma model + Redis lookup cache | New model in apps/web/prisma/schema.prisma; Redis 24h cache keyed on claimHash. Audit trail. | ✓ |
| Redis-only with claimHash key | Verdict cached 24h, no DB. No analytics, no audit. | |
| FactCheck row + persistent (no TTL) | DB-only, no Redis. Same claim never re-verified. Rejects 24h freshness criterion. | |

**User's choice:** FactCheck Prisma model + Redis lookup cache

### Q3 — Cache key shape

| Option | Description | Selected |
|--------|-------------|----------|
| Locale-scoped per-resource | credibility:source:{id}:{locale}, framing:topic:{hash}:{locale}, factcheck:claim:{hash} (locale-independent). | ✓ |
| Per-locale always | Every key includes :{locale}. 3x cache footprint for verdicts that don't vary by language. | |
| Locale-independent, translate at render | Cache only English; re-translate via translationService. Adds per-render latency. | |

**User's choice:** Locale-scoped per-resource

---

## Confidence indicator UX

| Option | Description | Selected |
|--------|-------------|----------|
| Categorical pill | low / medium / high with color-coded pills. 3 i18n strings per locale. | ✓ |
| Numeric ± range | "78 ± 8" next to score. Most precise; bandwidth-heavy on cards. | |
| Ring around score | Score in circle; ring thickness = confidence. Custom SVG; harder for screen readers. | |

**User's choice:** Categorical pill (low / medium / high)

---

## Cross-language fact-check behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Translate claim to article-search target language(s) | Claim translated via existing translationService into DE/EN/FR; ts_rank in each; LLM gets multilingual snippets. | ✓ |
| Search only in claim language | Skips translation. Misses 60%+ of corpus. Defeats multi-perspective value. | |
| Translate articles at search time | Translate top-10 articles to user locale. ~10x translation cost. Conflicts with criterion #6. | |

**User's choice:** Translate claim to article-search target language(s)

---

## Community fact-check visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Private to the user | FactCheck.userId scopes everything. Lowest moderation/GDPR complexity. | ✓ |
| Community-shared verdicts | Global FactCheck rows; community panel. Adds moderation, GDPR complexity, conflict resolution. | |
| Private but allow user to share | Private by default + opt-in share toggle. Hybrid; defers community moderation. | |

**User's choice:** Private to the user
**Notes:** Captured community-shared as a deferred idea for a follow-up "Community AI" phase.

---

## Claude's Discretion

The following implementation details were left to downstream researcher / planner / executor:

- Exact LLM prompt structure for credibility methodology, sub-dimension attribution, framing analysis, and fact-check verdicts. Constraint: must produce parseable JSON; must explicitly disclose LLM-attribution; must instruct LLM to return `unverified` rather than guess.
- Specific `ts_query` operators (`websearch_to_tsquery` vs `plainto_tsquery` vs `phraseto_tsquery`) for corpus search — researcher picks per Postgres docs and existing newsReadService.ts patterns.
- 60/80 confidence-bucket thresholds — planner can adjust if researcher surfaces evidence that LLM self-reported confidence is poorly calibrated.
- Location of "Fact-check this" highlight button relative to existing share/quote/copy floating actions in the article body — UI researcher picks.
- Whether `FactCheck.methodologyMd` stores locale-tagged content or always-English-with-on-render-translation — depends on existing precedent in commentService.ts / cluster summary storage.
- Exact route path: `POST /api/ai/fact-check` proposed (consistent with `/ai/ask`, `/ai/propaganda`); planner can adjust if `/api/analysis/` convention applies.

## Deferred Ideas

Captured during discussion, deferred to future phases:

- Community-shared fact-check verdicts (moderation, GDPR complexity, conflict resolution)
- External fact-check API integration (Google Fact Check, ClaimReview) — could escalate when internal corpus has zero matches
- LLM web-search tool calling (Anthropic web-search / OpenRouter browsing models)
- Embedding-based semantic search (pgvector) — for paraphrased claim matching
- Worker-precomputed credibility cron — if on-demand lazy shows cold-cache latency complaints
- Live tracking of source corrections / retractions — would replace LLM-attributed corrections sub-dimension
- Per-article fact-check counter for FREE users (alternative to shared 10/day quota)
- AI-extracted-claim sidebar (proactive claim suggestions)
- Confidence indicator as numeric ± range (alternative to categorical pill)
- 5-bucket bias scale (far-left → far-right; alternative to 3-bucket reuse of MediaBiasBar)
