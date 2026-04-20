# Phase 1: AI Analysis - Research

**Researched:** 2026-04-18
**Domain:** AI-powered news analysis with citations, context preservation, and coverage gap detection
**Confidence:** HIGH

## Summary

Phase 1 enhances the existing AI analysis system in NewsHub. The codebase already has a functional AI chat component (`AskAI.tsx`), propaganda detection (`PropagandaDetector.tsx`), conversation history management (`historySummarizer.ts`), and article relevance scoring (`articleRelevance.ts`). The CONTEXT.md decisions confirm that most features are already complete or nearly complete.

The only remaining work is **AI-03 (Coverage Gap Detection)**: adding logic to detect when AI responses are based on fewer than 3 regional perspectives and appending an alert to the AI response. This is a backend modification to the `/api/ai/ask` route's system prompt and response handling.

**Primary recommendation:** Modify `server/routes/ai.ts` to count unique regions in the article context, and if < 3, append a perspective gap warning to the AI system prompt so the AI includes the alert naturally in its response.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Keep numeric `[1]`, `[2]` citation format -- already implemented and working
- **D-02:** Article IDs remain in the data payload (sources array) for technical tracking but are not displayed to users
- **D-03:** Current citation click behavior (scroll to source) is correct and complete
- **D-04:** Coverage gap alerts appear in AI chat responses, not as UI badges
- **D-05:** Gap threshold is <3 regional perspectives -- when AI answers about a topic with fewer than 3 regions, include a note like "This topic only has Western sources. Consider seeking other perspectives."
- **D-06:** Leverage existing `articleRelevance.ts` diversity logic to calculate region counts
- **D-07:** Keep manual trigger per article -- user clicks to analyze
- **D-08:** Current `PropagandaDetector.tsx` component is complete and correct
- **D-09:** No automatic badges or pre-computation needed
- **D-10:** No explicit context indicators in UI -- conversation history works implicitly
- **D-11:** Current `historySummarizer.ts` and localStorage persistence (20 message limit) is complete
- **D-12:** Current `prepareOptimizedHistory()` approach (summarize older, keep 2 recent) is correct

### Claude's Discretion
- Exact wording of coverage gap alerts in AI responses
- How to phrase the gap warning without being alarmist
- Error handling when AI providers fail during gap analysis

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | User receives citations with article IDs when AI answers questions | COMPLETE: `AskAI.tsx` already renders `[1]`, `[2]` citations with clickable scroll-to-source behavior. `server/routes/ai.ts` extracts citation references via regex. |
| AI-02 | User can ask follow-up questions with preserved context | COMPLETE: `historySummarizer.ts` implements `prepareOptimizedHistory()` with 20-message localStorage persistence. Frontend passes `conversationHistory` to API. |
| AI-03 | User sees coverage gap alerts when topics lack regional diversity | TO IMPLEMENT: Count unique `perspective` values in article context. If < 3, inject gap alert instruction into AI system prompt. |
| AI-04 | User sees propaganda pattern indicators on articles | COMPLETE: `PropagandaDetector.tsx` is fully functional with score display, indicator breakdown, severity levels, and recommendations. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Citation rendering | Frontend (React) | -- | UI display of clickable `[N]` badges and source list |
| Citation extraction | API (Express) | -- | Regex parsing of AI response for `[N]` patterns |
| Conversation history | Frontend (React) | localStorage | Client manages history state, persists to browser storage |
| History optimization | Frontend (lib) | -- | `prepareOptimizedHistory()` runs client-side before API call |
| Coverage gap detection | API (Express) | -- | Region counting and prompt injection happen server-side |
| Propaganda analysis | API (Express) | -- | AI prompt construction and response parsing |
| AI provider orchestration | API (Express) | -- | Fallback chain (Gemini -> OpenRouter -> Anthropic) |

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.90.0 | Anthropic API client | Official SDK, premium fallback [VERIFIED: npm registry] |
| @google/generative-ai | ^0.24.1 | Gemini API client | Official SDK, free tier primary [VERIFIED: npm registry] |
| openai | ^6.27.0 | OpenRouter via OpenAI SDK | Standard approach for OpenRouter [VERIFIED: npm registry] |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^4.3.6 | Schema validation | Validate API request/response shapes |
| framer-motion | ^12.35.0 | Animations | Chat UI transitions |
| lucide-react | ^1.8.0 | Icons | AI chat icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Multi-provider fallback | Single provider | Simpler but less reliable |
| Client-side history | Server-side sessions | Current approach avoids backend state |

**Installation:** No new packages needed. All dependencies are already installed.

## Architecture Patterns

### System Architecture Diagram

```
User Question
      |
      v
+-------------------+
|   AskAI.tsx       |  <-- Client
|   (React)         |
+-------------------+
      |
      | 1. getTopRelevantArticles()
      |    (articleRelevance.ts)
      |
      | 2. prepareOptimizedHistory()
      |    (historySummarizer.ts)
      |
      v
+-------------------+
|   POST /api/ai/ask|  <-- API
|   (ai.ts)         |
+-------------------+
      |
      | 3. Count unique regions
      |    in context array
      |
      | 4. Build system prompt
      |    (include gap alert if < 3 regions)
      |
      | 5. callAIWithFallback()
      |    Gemini -> OpenRouter -> Anthropic
      |
      | 6. Extract citations [N]
      |    Map to source objects
      |
      v
+-------------------+
|   Response JSON   |
|   {answer, sources}|
+-------------------+
      |
      v
+-------------------+
|   AskAI.tsx       |
|   renderContent   |
|   WithCitations() |
+-------------------+
```

### Recommended Project Structure
```
src/
├── components/
│   ├── AskAI.tsx            # AI chat UI (EXISTS)
│   └── PropagandaDetector.tsx # Propaganda analysis UI (EXISTS)
├── lib/
│   ├── articleRelevance.ts  # Relevance scoring (EXISTS)
│   └── historySummarizer.ts # History optimization (EXISTS)

server/
├── routes/
│   └── ai.ts                # API endpoints (MODIFY for gap detection)
├── services/
│   └── aiService.ts         # AI provider orchestration (EXISTS)
└── config/
    └── aiProviders.ts       # Model config (EXISTS)
```

### Pattern 1: Coverage Gap Detection
**What:** Count unique regions in article context before AI call, inject instruction if below threshold
**When to use:** Every `/api/ai/ask` request
**Example:**
```typescript
// Source: D:\NewsHub\server\routes\ai.ts (line 118-187) - to be modified

// NEW: Count unique regions in context
const uniqueRegions = new Set(context.map(a => a.perspective));
const regionCount = uniqueRegions.size;
const hasGap = regionCount < 3;

// Build system prompt with conditional gap instruction
const systemPrompt = `Nachrichtenanalyse-Assistent. ${context.length} Artikel verfügbar.

ZITIER-PFLICHT: Jede Aussage mit [1], [2] etc. belegen. Mehrere Quellen: [1][2][3].

${hasGap ? `PERSPEKTIVEN-HINWEIS: Die verfügbaren Quellen stammen nur aus ${regionCount} Region(en): ${[...uniqueRegions].join(', ')}. Weise den Nutzer am Ende darauf hin, dass andere Perspektiven fehlen könnten.` : ''}

Aufgaben: Fragen anhand der Artikel beantworten, Perspektiven vergleichen, Unterschiede aufzeigen, neutral bleiben.

Antworte auf Deutsch, prägnant.`;
```

### Pattern 2: Region Counting Helper (Optional Refactor)
**What:** Extract region counting to reusable function
**When to use:** If gap detection logic needs to be shared
**Example:**
```typescript
// Could add to articleRelevance.ts for consistency with D-06
export function countUniqueRegions(articles: Array<{ perspective: string }>): {
  count: number;
  regions: string[];
  hasGap: boolean;
} {
  const regions = [...new Set(articles.map(a => a.perspective))];
  return {
    count: regions.length,
    regions,
    hasGap: regions.length < 3,
  };
}
```

### Anti-Patterns to Avoid
- **UI-side gap detection:** Don't add badges or alerts in React -- user decided alerts appear IN the AI response text
- **Pre-computed gap analysis:** Don't analyze gaps before user asks a question -- do it per-request
- **Modifying PropagandaDetector:** Component is complete per D-08, don't touch it
- **Adding context indicators to UI:** Per D-10, context works implicitly via history

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI provider fallback | Custom retry logic | Existing `callAIWithFallback()` | Already handles multi-provider chain |
| Citation parsing | Custom text parser | Existing regex `/\[(\d+)\]/g` | Already works, battle-tested |
| Conversation history | Custom state management | Existing localStorage + `prepareOptimizedHistory()` | Complete per D-11 |
| Article relevance | Custom scoring | Existing `getTopRelevantArticles()` | Includes keyword + recency + diversity |

**Key insight:** This phase is primarily about connecting existing pieces. The codebase has sophisticated AI infrastructure already built.

## Common Pitfalls

### Pitfall 1: Overwhelming Gap Alerts
**What goes wrong:** Gap alert is too prominent and distracts from the actual answer
**Why it happens:** Alert phrasing is alarmist or placed at the beginning
**How to avoid:** Place alert at END of response, use neutral phrasing ("Note: This analysis is based on sources from X regions. Other perspectives may offer different insights.")
**Warning signs:** Users complain about constant warnings, or start ignoring them

### Pitfall 2: Region Count Off-by-One
**What goes wrong:** Using 6-region types from types/index.ts but context uses different values
**Why it happens:** PerspectiveRegion type has 13 values (usa, europa, deutschland, nahost, tuerkei, russland, china, asien, afrika, lateinamerika, ozeanien, kanada, alternative) but the original system used 6 (western, middle-east, turkish, russian, chinese, alternative)
**How to avoid:** Count whatever `perspective` values are actually in the context array, don't assume a fixed set
**Warning signs:** Gap alerts trigger incorrectly (too often or not enough)

### Pitfall 3: Breaking Existing Citation Flow
**What goes wrong:** Modifying ai.ts breaks existing citation extraction or source mapping
**Why it happens:** Changing response format or prompt structure
**How to avoid:** Only add to the system prompt, don't change response processing logic
**Warning signs:** Citations stop working, sources array is empty

### Pitfall 4: AI Provider Failure During Gap Check
**What goes wrong:** Gap detection logic throws error and breaks the entire request
**Why it happens:** Not handling edge cases (empty context, missing perspective field)
**How to avoid:** Defensive coding: if context is empty or has no perspective fields, skip gap detection gracefully
**Warning signs:** AI chat crashes on certain queries

## Code Examples

### Coverage Gap Detection Implementation
```typescript
// Source: To be added to server/routes/ai.ts

// Step 1: Count unique regions (defensive)
const perspectives = context
  .map(a => a.perspective)
  .filter(p => typeof p === 'string' && p.length > 0);
const uniqueRegions = [...new Set(perspectives)];
const regionCount = uniqueRegions.length;

// Step 2: Determine if gap exists (threshold from D-05)
const hasGap = regionCount > 0 && regionCount < 3;

// Step 3: Build gap instruction for system prompt
const gapInstruction = hasGap
  ? `\nHINWEIS: Die Quellen stammen nur aus ${regionCount} Region(en) (${uniqueRegions.join(', ')}). Erwähne am Ende deiner Antwort kurz, dass weitere Perspektiven hilfreich sein könnten.`
  : '';

// Step 4: Inject into system prompt
const systemPrompt = `Nachrichtenanalyse-Assistent. ${context.length} Artikel verfügbar.

ZITIER-PFLICHT: Jede Aussage mit [1], [2] etc. belegen.${gapInstruction}

Antworte auf Deutsch, prägnant.`;
```

### Suggested Gap Alert Phrasing (Claude's Discretion)
```markdown
# German (default)
"Hinweis: Diese Analyse basiert auf Quellen aus [N] Regionen ([regions]).
Weitere regionale Perspektiven könnten zusätzliche Einblicke bieten."

# English (if language detection added later)
"Note: This analysis draws from sources in [N] regions ([regions]).
Additional regional perspectives may offer further insights."
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single AI provider | Multi-provider fallback | Current codebase | Better reliability, cost optimization |
| Full conversation in context | Summarized older + full recent | Current codebase | Token efficiency |
| All articles in context | Relevance-scored top 10 | Current codebase | Better answers, lower cost |

**Deprecated/outdated:**
- None identified -- current approach is solid

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Gap threshold of 3 regions is appropriate for 13 total regions | Common Pitfalls | May trigger too often or rarely; easy to adjust constant |
| A2 | German language gap alerts are appropriate (user base is German) | Code Examples | May need English option; low risk since prompt includes language instruction |

## Open Questions

1. **Region Threshold Calibration**
   - What we know: Threshold is < 3 per D-05
   - What's unclear: Is 3 optimal given 13 total PerspectiveRegion values?
   - Recommendation: Start with 3, monitor user feedback, adjust if needed

2. **Gap Alert Placement in Response**
   - What we know: Alert goes IN the AI response, not as UI element
   - What's unclear: Should it be at beginning, end, or as a separate paragraph?
   - Recommendation: End of response as a brief note (less intrusive)

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified) -- this phase modifies existing code with no new external tools or services.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | yes | Existing zod validation on API requests |
| V6 Cryptography | no | -- |

### Known Threat Patterns for AI/LLM Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection | Tampering | Input sanitization, strict system prompts (already in place) |
| Context overflow | Denial of Service | Existing token limits (max 10 articles, truncated summaries) |
| Sensitive data in prompts | Information Disclosure | Only article metadata sent, no user PII |

## Sources

### Primary (HIGH confidence)
- `D:\NewsHub\server\routes\ai.ts` - Current AI endpoint implementation [VERIFIED: codebase]
- `D:\NewsHub\src\components\AskAI.tsx` - Citation rendering implementation [VERIFIED: codebase]
- `D:\NewsHub\src\lib\articleRelevance.ts` - Diversity scoring logic [VERIFIED: codebase]
- `D:\NewsHub\src\lib\historySummarizer.ts` - History optimization [VERIFIED: codebase]
- `D:\NewsHub\01-CONTEXT.md` - User decisions [VERIFIED: planning docs]

### Secondary (MEDIUM confidence)
- npm registry - Package versions verified via `npm view` [VERIFIED: npm registry]

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already installed and working
- Architecture: HIGH - Based on direct codebase analysis
- Pitfalls: MEDIUM - Based on code review, not production experience

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days - stable phase, minimal dependencies)
