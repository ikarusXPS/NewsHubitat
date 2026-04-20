# Phase 1: AI Analysis - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 01-ai-analysis
**Areas discussed:** Citation display, Coverage gap detection, Propaganda indicators placement, Follow-up context behavior

---

## Citation Display

| Option | Description | Selected |
|--------|-------------|----------|
| Keep numeric [1], [2] | Current behavior. Simple and readable. Article IDs are in the data but not shown to users — they're technical identifiers. | ✓ |
| Show article IDs on hover | Keep [1], [2] display but show actual ID (e.g., 'abc123') in tooltip on hover. | |
| Show short IDs inline | Display truncated IDs like [abc1...] instead of numbers. More technical but traceable. | |

**User's choice:** Keep numeric [1], [2] (Recommended)
**Notes:** Article IDs remain in the data payload for tracking but aren't shown to users. Current implementation is essentially complete.

---

## Coverage Gap Detection

### Where should alerts appear?

| Option | Description | Selected |
|--------|-------------|----------|
| In AI chat responses | When user asks about a topic, AI mentions if coverage is limited. E.g., 'Note: This topic only has Western sources.' | ✓ |
| Badge on topic clusters | Show a warning badge on the Analysis page topic cards when <3 regions cover that topic. | |
| Both chat + badges | Alert in AI responses AND show badges on topic clusters. More visible but potentially noisy. | |

**User's choice:** In AI chat responses (Recommended)

### What counts as a 'coverage gap'?

| Option | Description | Selected |
|--------|-------------|----------|
| <3 regions | Alert when topic has fewer than 3 regional perspectives. Matches existing cluster filter logic. | ✓ |
| <2 regions | Only alert when single-region coverage. More conservative, fewer alerts. | |
| Missing key regions | Alert when specific important regions are missing (e.g., no Middle East on Gaza topic). Context-aware but more complex. | |

**User's choice:** <3 regions (Recommended)
**Notes:** AI will alert when answering questions about topics with limited perspective diversity.

---

## Propaganda Indicators Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Keep manual trigger | Current behavior. User clicks to analyze. Saves API calls, gives user control. | ✓ |
| Auto-analyze on article open | Run analysis when user opens article detail view. More convenient but uses more API quota. | |
| Pre-compute for all articles | Background job scores all articles. Show badges in feed. High API cost but consistent visibility. | |

**User's choice:** Keep manual trigger (Recommended)
**Notes:** Current PropagandaDetector component behavior is correct and complete.

---

## Follow-up Context Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| No indicators needed | Current behavior. Context is implicit — AI just 'remembers'. Clean UI, no clutter. | ✓ |
| Show 'Using context from X messages' | Small badge in chat showing how many prior messages inform the response. | |
| Show context preview on hover | Hovering over AI response shows which prior messages/topics informed it. Educational but complex. | |

**User's choice:** No indicators needed (Recommended)
**Notes:** Conversation history works implicitly as currently implemented. historySummarizer.ts is complete.

---

## Claude's Discretion

- Exact wording of coverage gap alerts in AI responses
- How to phrase the gap warning without being alarmist
- Error handling when AI providers fail during gap analysis

## Deferred Ideas

None — discussion stayed within phase scope.
