---
status: partial
phase: 40-content-expansion
source: [40-VERIFICATION.md]
started: 2026-05-05T13:40:00Z
updated: 2026-05-05T13:40:00Z
---

## Current Test

[awaiting human testing — 2 items requiring PREMIUM tier or native device]

## Tests

### 1. Premium user sees podcast transcript with timestamp navigation (UAT Test 8)
expected: Logged-in PREMIUM user opens a podcast episode, clicks the transcript toggle, sees timestamped segments, clicks a segment and audio player seeks to that position.
result: pending
notes: |
  UAT Test 8 was skipped at the original 2026-05-05 UAT pass (account is FREE-tier). Requires either a real PREMIUM account or a test-mode tier-override.

  Code state: `onSeek` is wired in `EmbeddedVideo.tsx` (video path) but intentionally deferred in `RelatedPodcasts.tsx` with a `// TODO` comment. Premium seek from the RelatedPodcasts inline player cannot be verified programmatically — needs a human with PREMIUM tier or a tier-override switch in dev.

### 2. Native app reader-app exemption (UAT Test 9)
expected: iOS/Android Capacitor build shows plain text "feature not available" + `newshub.example` as `<span>` (NOT `<a>`) for all premium gates; no clickable pricing links appear.
result: pending
notes: |
  Requires a physical device or simulator. `isNativeApp()` returns true only inside the Capacitor runtime.

  Code state: `TranscriptDrawer.tsx` branch 1 (FREE mobile) has been verified via grep — the conditional is in place — but the end-to-end render on a real device cannot be confirmed programmatically. Apple Rule 3.1.3 / Google Play equivalent require this to be visually correct on device, not just in code.

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
