# Phase 1: AI Analysis - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete AI Q&A with citations, follow-up context preservation, coverage gap detection, and propaganda pattern indicators. This phase enhances the existing AskAI component and PropagandaDetector with the remaining requirements (AI-01 through AI-04).

</domain>

<decisions>
## Implementation Decisions

### Citation Display (AI-01)
- **D-01:** Keep numeric `[1]`, `[2]` citation format — already implemented and working
- **D-02:** Article IDs remain in the data payload (sources array) for technical tracking but are not displayed to users
- **D-03:** Current citation click behavior (scroll to source) is correct and complete

### Coverage Gap Detection (AI-03)
- **D-04:** Coverage gap alerts appear in AI chat responses, not as UI badges
- **D-05:** Gap threshold is <3 regional perspectives — when AI answers about a topic with fewer than 3 regions, include a note like "This topic only has Western sources. Consider seeking other perspectives."
- **D-06:** Leverage existing `articleRelevance.ts` diversity logic to calculate region counts

### Propaganda Indicators (AI-04)
- **D-07:** Keep manual trigger per article — user clicks to analyze
- **D-08:** Current `PropagandaDetector.tsx` component is complete and correct
- **D-09:** No automatic badges or pre-computation needed

### Follow-up Context (AI-02)
- **D-10:** No explicit context indicators in UI — conversation history works implicitly
- **D-11:** Current `historySummarizer.ts` and localStorage persistence (20 message limit) is complete
- **D-12:** Current `prepareOptimizedHistory()` approach (summarize older, keep 2 recent) is correct

### Claude's Discretion
- Exact wording of coverage gap alerts in AI responses
- How to phrase the gap warning without being alarmist
- Error handling when AI providers fail during gap analysis

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AI Chat System
- `src/components/AskAI.tsx` — Main chat component with citation rendering, history, sources display
- `src/lib/articleRelevance.ts` — Relevance scoring with `calculateDiversityBonus()` for perspective tracking
- `src/lib/historySummarizer.ts` — Conversation history optimization with `prepareOptimizedHistory()`

### Backend AI Routes
- `server/routes/ai.ts` — `/api/ai/ask` endpoint with citation extraction, `/api/ai/propaganda` endpoint
- `server/services/aiService.ts` — Multi-provider fallback chain, clustering, topic classification

### Propaganda Detection
- `src/components/PropagandaDetector.tsx` — Complete analysis UI with indicators, scores, recommendations

### Type Definitions
- `src/types/index.ts` — `PerspectiveRegion` type with 6 regions: western, middle-east, turkish, russian, chinese, alternative

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AskAI.tsx`: Chat interface with citation rendering already handles `[1]`, `[2]` links — extend for gap alerts
- `PropagandaDetector.tsx`: Complete component, no changes needed
- `articleRelevance.ts`: `calculateDiversityBonus()` already tracks regions — reuse for gap detection
- `historySummarizer.ts`: Context optimization complete — no changes needed

### Established Patterns
- Multi-provider AI fallback: OpenRouter → Gemini → Anthropic (in `aiService.ts` and `ai.ts`)
- Citation extraction via regex `/\[(\d+)\]/g` pattern
- Article context built with compact format: `[N] title | source (perspective)\nsummary`

### Integration Points
- Gap detection logic goes in `/api/ai/ask` route — analyze region distribution before responding
- AI system prompt in `server/routes/ai.ts` needs update to include gap alert instructions
- No new components needed — all UI exists

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for gap alert wording.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-ai-analysis*
*Context gathered: 2026-04-18*
