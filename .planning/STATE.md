# State: NewsHub

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-18)

**Core value:** Users can see how the same story is covered by different regional perspectives
**Current focus:** Phase 2 - Event System

## Milestone Progress

**Milestone:** v1.0 - AI Analysis & User Features
**Status:** In Progress
**Started:** 2026-04-18

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | AI Analysis | ✓ Complete | 1/1 |
| 2 | Event System | ◐ Ready to execute | 5/5 |
| 3 | Auth Completion | ○ Pending | 0/0 |
| 4 | User Preferences | ○ Pending | 0/0 |
| 5 | Bookmarks | ○ Pending | 0/0 |
| 6 | Reading History | ○ Pending | 0/0 |

**Progress:** █░░░░░░░░░ 17%

## Current Phase

**Phase:** 2 - Event System
**Status:** Ready to execute
**Goal:** Link timeline events to articles and add historical database

### Requirements
- [ ] EVT-01: User can view timeline events linked to related NewsArticles
- [ ] EVT-02: User can browse historical events database (100+ key events)
- [ ] EVT-03: User sees clustered event markers in dense map regions
- [ ] EVT-04: User sees real-time event markers update on globe/map

### Plans
| Plan | Objective | Tasks | Wave | Status |
|------|-----------|-------|------|--------|
| 02-01 | Historical events i18n database (100+ events) | 2 | 1 | Complete |
| 02-02 | Location extraction expansion (100+ patterns) | 1 | 1 | Complete |
| 02-03 | Article preview in EventDetailPanel + i18n | 2 | 2 | Pending |
| 02-04 | useEventSocket hook + GlobeView query | 3 | 2 | Pending |
| 02-05 | LiveBadge component + Timeline integration | 3 | 3 | Pending |

## Session Context

**Last action:** Completed 02-01 (historical events i18n database - 111 events)
**Next step:** Continue with remaining Phase 2 plans (02-03, 02-04, 02-05)
**Resume file:** `.planning/phases/02-event-system/02-03-PLAN.md`

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

---
*State initialized: 2026-04-18*
*Last updated: 2026-04-18 after 02-01 execution complete*
