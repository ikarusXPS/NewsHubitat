# State: NewsHub

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-18)

**Core value:** Users can see how the same story is covered by different regional perspectives
**Current focus:** Phase 6 - Reading History

## Milestone Progress

**Milestone:** v1.0 - AI Analysis & User Features
**Status:** In Progress
**Started:** 2026-04-18

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | AI Analysis | ✓ Complete | 1/1 |
| 2 | Event System | ✓ Complete | 5/5 |
| 3 | Auth Completion | ✓ Complete | 5/5 |
| 4 | User Preferences | ✓ Complete | 0/0 (pre-existing) |
| 5 | Bookmarks | ✓ Complete | 0/0 (pre-existing) |
| 6 | Reading History | ◆ Ready to execute | 6/6 |

**Progress:** ████████░░ 83%

## Current Phase

**Phase:** 6 - Reading History
**Status:** Ready to execute
**Goal:** Track reading history and personalize news feed

### Requirements
- [ ] HIST-01: User's read articles are tracked automatically
- [ ] HIST-02: User can view reading history
- [ ] HIST-03: User sees personalized feed based on reading patterns
- [ ] UI-01: User can view and edit profile on UserProfile page

### Plans
| Plan | Objective | Tasks | Wave | Status |
|------|-----------|-------|------|--------|
| 06-01 | Database schema + store extensions | 3 | 1 | ✓ Complete |
| 06-02 | History page with timeline grouping | 3 | 1 | ✓ Complete |
| 06-03 | Personalization engine + For You carousel | 3 | 2 | ✓ Complete |
| 06-04 | Profile enhancements + avatar system | 3 | 2 | ○ Pending |
| 06-05 | Gamification: badges, achievements | 3 | 3 | ○ Pending |
| 06-06 | Leaderboard + account management | 3 | 3 | ○ Pending |

## Session Context

**Last action:** Completed 06-03 (Personalization engine + For You carousel)
**Next step:** Execute 06-04 (Profile enhancements + avatar system)
**Resume file:** —

### Key Decisions (06-03)
- Topic weighting from title keywords with DE/EN stop words (D-09)
- 7-day recency window weights recent reads 2x higher (D-15)
- ForYouCarousel rendered after HeroSection in NewsFeed (D-17)
- Settings toggles for personalization (D-14) and history pause (D-65)
- Already-read articles excluded from recommendations (D-21)

### Phase 5 Notes
Phase 5 (Bookmarks) was marked complete without new plans — all requirements pre-existing:
- BOOK-01: `toggleBookmark()` in Zustand store + bookmark button in NewsCard
- BOOK-02: Same toggle removes bookmarks
- BOOK-03: `src/pages/Bookmarks.tsx` with grid view, clear all, empty state

### Key Decisions (Phase 2)
- Inline article preview in event panel (D-01)
- Global historical scope 1900+ with bilingual DE/EN (D-05, D-06, D-07)
- Improve location extraction for B6 fix (D-10)
- Globe syncs with EventMap, LIVE badge + pulse (D-14, D-15)
- WebSocket for critical events, polling for rest (D-16)

## Open Issues

High-priority bugs to integrate:
- B5: Settings page needs more options - RESOLVED (Settings.tsx already has theme, language, regions, presets, export/import)
- B6: Map point density too low - FIXED in 02-02 (184 location patterns)
- B7: Article thumbnail fallback (Phase 1 or 2)

### Phase 4 Notes
Phase 4 (User Preferences) was marked complete without new plans because all requirements were already implemented:
- PREF-01: Language toggle exists in Settings.tsx (lines 297-321)
- PREF-02: Theme toggle exists in Settings.tsx (lines 267-295)
- PREF-03: Region filters exist in Settings.tsx (lines 386-406)
- PREF-04: Zustand persist middleware handles cross-session persistence
- UI-02: SettingsPage accessible via navigation

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
