---
status: complete
phase: 35-infrastructure-foundation
source: [35-01-SUMMARY.md, 35-02-SUMMARY.md, 35-03-SUMMARY.md, 35-04-SUMMARY.md]
started: 2026-04-28T08:45:00Z
updated: 2026-04-28T08:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. API Key Creation via UI
expected: Navigate to /developers, enter key name, click Create Key. Plaintext key in format `nh_live_[24-chars]_[4-chars]` displayed once with copy button.
result: pass

### 2. Public API Authentication
expected: `curl -H "X-API-Key: <KEY>" http://localhost:3001/api/v1/public/news?limit=5` returns 200 with `{success: true, data: [...], meta: {...}}`.
result: pass
evidence: HTTP 200, 5 articles returned (Jerusalem Post 2026-04-28 timestamps), `meta: {total: 1000, page: 1, limit: 5, hasMore: true}`

### 3. Rate Limiting Enforcement
expected: 11 rapid requests with same key. First 10 return 200, 11th returns 429 with `Retry-After` header.
result: pass
evidence: |
  Reqs 1-10: HTTP 200; Req 11: HTTP 429
  Headers: RateLimit-Policy=10;w=60, RateLimit-Limit=10, RateLimit-Remaining=0, RateLimit-Reset=60, Retry-After=60
  IETF RFC 9239 compliant.

### 4. API Key Revocation
expected: Revoke key via UI trash icon, retry request with revoked key. Returns 401 with "Invalid or revoked API key".
result: pass
evidence: |
  Initial test failed: 429 from rate-limit window, NOT 401 — Redis cache (5min TTL) kept honoring revoked key.
  Root cause: revokeApiKey updated DB (revokedAt) but did not invalidate the apiKeyAuth cache.
  Fix: Phase 35.1 hotfix (commit 484d4da) — added secondary cache index (apikey:by-id:<keyId>) so revocation can O(1) invalidate the prefix-based primary cache.
  Re-tested after fix: HTTP 401, body `{"success":false,"error":"Invalid or revoked API key"}` — exactly as specified.

### 5. Scalar Documentation Rendering
expected: Navigate to /developers, scroll to API documentation section. Interactive Scalar docs render with try-it-out functionality, dark theme matching NewsHub (cyan accent #00f0ff).
result: pass
evidence: Scalar API client visible, try-it-out worked (16ms 52B roundtrip on /api/v1/public/news/{id}), dark theme + cyan accent confirmed via screenshot.

## Summary

total: 5
passed: 5
issues: 0  (1 issue found during Test 4, immediately fixed in Phase 35.1 — re-test passed)
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Revoked API key returns 401 'Invalid or revoked API key' on next request"
  status: resolved
  reason: "Initial test 4 returned 429 from rate-limit window because Redis cache held the revoked key as still-valid for 5min."
  severity: major
  test: 4
  root_cause: |
    apiKeyService.revokeApiKey updated the DB row (revokedAt timestamp) but did not invalidate the
    apiKeyAuth cache. The cache uses key prefix (apikey:<first-15-chars-of-plaintext>) which is not
    derivable from the keyId that revokeApiKey receives.
  artifacts:
    - path: "apps/web/server/services/apiKeyService.ts"
      issue: "revokeApiKey only writes DB, no cache invalidation"
    - path: "apps/web/server/middleware/apiKeyAuth.ts"
      issue: "cache write needs reverse-index for keyId-based lookups"
  missing:
    - "Add secondary index apikey:by-id:<keyId> -> cacheKey on cache-miss validation write"
    - "On revoke: read secondary index, delete primary + secondary"
  resolution: "Fixed in commit 484d4da (Phase 35.1 hotfix). Verified post-fix: HTTP 401 returned immediately."
  resolved_at: "2026-04-28T08:54:50Z"

## Notes

- Phase 35.1 inserted as inline hotfix during UAT (commit 484d4da) — see commit message for full rationale
- All 5 ROADMAP success criteria for Phase 35 now have observable + verified evidence
- Phase status: human_needed → verified
