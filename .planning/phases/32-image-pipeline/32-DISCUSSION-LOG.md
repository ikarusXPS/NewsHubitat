# Phase 32: Image Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 32-image-pipeline
**Areas discussed:** Migration scope, Cloudinary setup, Priority loading strategy, Measurement approach

---

## Migration Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All three (Recommended) | SignalCard + NewsCardPremium + ForYouCard — full consistency, maximum payload savings | ✓ |
| SignalCard only | Main news feed only — biggest impact, minimal changes | |
| SignalCard + ForYouCard | Feed and personalization carousel — skip the rarely-used Premium card | |

**User's choice:** All three (Recommended)
**Notes:** User opted for full consistency across all card components.

---

## Cloudinary Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, I have cloud name ready | I'll set VITE_CLOUDINARY_CLOUD_NAME in .env | ✓ |
| Not yet, defer setup | Graceful fallback to original URLs works. I'll configure later. | |
| Skip Cloudinary entirely | Use original URLs only. No format conversion or resizing. | |

**User's choice:** Yes, I have cloud name ready
**Notes:** Cloudinary account is configured and ready.

---

## Priority Loading Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| First 3 cards (current) | Matches existing ResponsiveImage default. Good for most grid layouts. | |
| First 6 cards | Better for wide screens showing 3 columns. More images load immediately. | ✓ |
| Dynamic based on viewport | Calculate based on screen size and grid columns. More complex. | |

**User's choice:** First 6 cards
**Notes:** Increase from 3 to 6 for better wide-screen experience where 2 rows are visible above fold.

---

## Measurement Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Lighthouse CI (Recommended) | Already integrated. Compare LCP and total image weight before/after. | |
| Manual DevTools Network tab | Capture before/after screenshots. More visual but less automated. | |
| Both | Lighthouse CI for regression, plus manual spot-check for confidence. | ✓ |

**User's choice:** Both
**Notes:** Use both approaches — Lighthouse CI for automated regression tracking, manual DevTools for visual confirmation.

---

## Claude's Discretion

- Image aspect ratios per component
- Responsive sizes attribute values
- Error handling integration details

## Deferred Ideas

None — discussion stayed within phase scope
