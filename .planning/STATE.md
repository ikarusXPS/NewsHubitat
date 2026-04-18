# State: NewsHub

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-18)

**Core value:** Users can see how the same story is covered by different regional perspectives
**Current focus:** Phase 3 - Auth Completion

## Milestone Progress

**Milestone:** v1.0 - AI Analysis & User Features
**Status:** In Progress
**Started:** 2026-04-18

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | AI Analysis | ✓ Complete | 1/1 |
| 2 | Event System | ✓ Complete | 5/5 |
| 3 | Auth Completion | ✓ Complete | 5/5 |
| 4 | User Preferences | ○ Pending | 0/0 |
| 5 | Bookmarks | ○ Pending | 0/0 |
| 6 | Reading History | ○ Pending | 0/0 |

**Progress:** █████░░░░░ 50%

## Current Phase

**Phase:** 3 - Auth Completion
**Status:** Complete
**Goal:** Add email verification and password reset flows

### Requirements
- [x] AUTH-01: User receives email verification after registration
- [x] AUTH-02: User can reset password via email link

### Plans
| Plan | Objective | Tasks | Wave | Status |
|------|-----------|-------|------|--------|
| 03-01 | Schema + token utilities | 4 | 1 | ✓ Complete |
| 03-02 | Backend API + bilingual emails | 3 | 2 | ✓ Complete |
| 03-03 | Cleanup service | 2 | 2 | ✓ Complete |
| 03-04 | Frontend verification/reset pages | 4 | 3 | ✓ Complete |
| 03-05 | Verification UI components | 5 | 3 | ✓ Complete |

## Session Context

**Last action:** Completed 03-05 (Verification UI components) - 5 tasks
**Next step:** Phase 3 complete. Ready for Phase 4 (User Preferences).
**Resume file:** .planning/phases/03-auth-completion/03-05-SUMMARY.md

### Key Decisions (Phase 2)
- Inline article preview in event panel (D-01)
- Global historical scope 1900+ with bilingual DE/EN (D-05, D-06, D-07)
- Improve location extraction for B6 fix (D-10)
- Globe syncs with EventMap, LIVE badge + pulse (D-14, D-15)
- WebSocket for critical events, polling for rest (D-16)

## Open Issues

High-priority bugs to integrate:
- B5: Settings page needs more options (Phase 4)
- B6: Map point density too low - FIXED in 02-02 (184 location patterns)
- B7: Article thumbnail fallback (Phase 1 or 2)

### Key Decisions (02-01)
- Added 'economic' category to TimelineEventI18n for global events
- Preserved legacy getHistoricalEvents() with German default for backward compatibility

### Key Decisions (02-03)
- ArticlePreview component inline in Timeline.tsx (co-located with EventDetailPanel)
- getLocalizedText helper with German fallback if language key missing
- Loading skeleton max 3 placeholders regardless of article count

### Key Decisions (02-04)
- Use same queryKey ['geo-events'] for cache sharing across components
- Limit socket reconnection to 5 attempts with 1s delay (T-02-06 mitigation)
- Keep newEvents buffer at 10 items max

### Key Decisions (02-05)
- Consolidated LIVE badge styling into reusable LiveBadge component
- Timeline uses same WebSocket pattern as EventMap for consistency
- Last update timestamp shown in Timeline header for user awareness

### Key Decisions (03-01)
- 32-byte crypto random tokens (64 hex chars) per D-13
- SHA-256 hash storage for tokens per D-14
- timingSafeEqual for constant-time token comparison
- Set-based disposable domain lookup for O(1) performance

### Key Decisions (03-02)
- Exponential backoff for email retries: 1s, 2s, 4s (D-47)
- Generic "If account exists" response prevents email enumeration (D-34)
- tokenVersion in JWT payload for session invalidation (D-28)
- Password reset also marks email as verified (D-31)
- "Wasn't you?" recovery link in password change confirmation (D-33)

### Key Decisions (03-03)
- setInterval-based daily scheduler (simpler than node-cron for single job)
- Generate fresh verification token for each reminder email
- Cleanup runs immediately on startup then daily interval (D-18)

### Key Decisions (03-04)
- Use /profile instead of /login as return link (no dedicated login page exists)
- Password strength meter shows bilingual labels (EN/DE) simultaneously
- All auth pages use full-screen dark cyber theme (bg-[#0a0a0f], bg-[#111118])
- zxcvbn-ts initialization at module level for performance

### Key Decisions (03-05)
- Urgency colors: cyan (default) -> yellow (7 days) -> orange (3 days) -> red (1 day)
- VerificationBanner placed before Layout in App.tsx for top positioning
- LockedFeature renders children normally if not authenticated or already verified

---
*State initialized: 2026-04-18*
*Last updated: 2026-04-18 after 03-05 execution complete (Phase 3 complete)*
