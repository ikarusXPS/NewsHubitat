# Roadmap: NewsHub v1.0

**Milestone:** AI Analysis & User Features
**Created:** 2026-04-18
**Phases:** 6

## Overview

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 1 | AI Analysis | Complete AI Q&A with citations and context | AI-01, AI-02, AI-03, AI-04 | ✓ Complete |
| 2 | Event System | Link timeline to articles, add historical DB | EVT-01, EVT-02, EVT-03, EVT-04 | ◐ Planning |
| 3 | Auth Completion | Add email verification and password reset | AUTH-01, AUTH-02 | ○ Pending |
| 4 | User Preferences | Implement settings page with all preferences | PREF-01, PREF-02, PREF-03, PREF-04, UI-02 | ○ Pending |
| 5 | Bookmarks | Enable article saving and bookmark management | BOOK-01, BOOK-02, BOOK-03 | ○ Pending |
| 6 | Reading History | Track history and personalize feed | HIST-01, HIST-02, HIST-03, UI-01 | ○ Pending |

---

## Phase 1: AI Analysis

**Goal:** Complete AI Q&A with citations, follow-up context, and analysis features

**Requirements:** AI-01, AI-02, AI-03, AI-04

**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md — Implement coverage gap detection in AI Q&A responses (AI-03)

**Note:** AI-01 (citations), AI-02 (follow-up context), and AI-04 (propaganda detection) are already complete per RESEARCH.md analysis. Only AI-03 needs implementation.

**Success Criteria:**
1. User asks AI question and sees cited article IDs in response
2. User asks follow-up question and AI maintains conversation context
3. User views topic with <3 regional perspectives and sees coverage gap alert
4. User views article flagged by propaganda pattern detection

**Depends on:** None (builds on existing AskAI component)

**UI hint:** yes

---

## Phase 2: Event System

**Goal:** Link timeline events to articles and add historical database with bilingual support

**Requirements:** EVT-01, EVT-02, EVT-03, EVT-04

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md — Historical events i18n database (111 global events, DE/EN)
- [x] 02-02-PLAN.md — Location extraction expansion (184 global cities for B6)
- [ ] 02-03-PLAN.md — Article preview in EventDetailPanel with i18n
- [x] 02-04-PLAN.md — GlobeView independent query + useEventSocket hook
- [ ] 02-05-PLAN.md — LiveBadge component and Timeline WebSocket integration

**Success Criteria:**
1. User clicks timeline event and sees linked NewsArticles
2. User browses historical events page with 100+ key events
3. User views map with clustered markers in dense regions
4. User sees event markers update in real-time on globe

**Depends on:** None (builds on existing Timeline and EventMap pages)

**UI hint:** yes

---

## Phase 3: Auth Completion

**Goal:** Add email verification and password reset flows

**Requirements:** AUTH-01, AUTH-02

**Success Criteria:**
1. User registers and receives verification email
2. User clicks verification link and account is activated
3. User requests password reset and receives email link
4. User resets password via link and can login with new password

**Depends on:** None (builds on existing AuthService)

**UI hint:** no

---

## Phase 4: User Preferences

**Goal:** Implement settings page with theme, language, and region preferences

**Requirements:** PREF-01, PREF-02, PREF-03, PREF-04, UI-02

**Success Criteria:**
1. User changes language preference and UI updates
2. User toggles dark/light theme and UI updates immediately
3. User sets default region filters and sees them applied on dashboard
4. User closes browser, reopens, and preferences are preserved
5. User accesses all preference controls on SettingsPage

**Depends on:** Phase 3 (user must be authenticated)

**UI hint:** yes

---

## Phase 5: Bookmarks

**Goal:** Enable article saving and bookmark management

**Requirements:** BOOK-01, BOOK-02, BOOK-03

**Success Criteria:**
1. User clicks save on article and it appears in bookmarks
2. User clicks unsave on bookmarked article and it's removed
3. User views BookmarksPage with all saved articles
4. User bookmarks persist across sessions

**Depends on:** Phase 3 (user must be authenticated)

**UI hint:** yes

---

## Phase 6: Reading History

**Goal:** Track reading history and personalize news feed

**Requirements:** HIST-01, HIST-02, HIST-03, UI-01

**Success Criteria:**
1. User reads article and it appears in reading history
2. User views reading history page with all read articles
3. User sees personalized feed recommendations based on reading patterns
4. User views and edits profile on UserProfile page

**Depends on:** Phase 5 (builds on user data patterns)

**UI hint:** yes

---

## Dependency Graph

```
Phase 1 (AI Analysis) ──────────────────────┐
                                            │
Phase 2 (Event System) ─────────────────────┤
                                            │
Phase 3 (Auth Completion) ──┬───────────────┼──► Phase 4 (User Preferences)
                            │               │
                            └───────────────┼──► Phase 5 (Bookmarks)
                                            │
                                            └──► Phase 6 (Reading History)
```

**Parallelization:**
- Phases 1, 2, 3 can run in parallel (no dependencies)
- Phases 4, 5 require Phase 3
- Phase 6 requires Phase 5

---

## Bug Integration

High-priority bugs to address during phases:

| Bug | Description | Integrate With |
|-----|-------------|----------------|
| B5 | Settings page needs more options | Phase 4 |
| B6 | Map point density too low | Phase 2 (Plan 02) - FIXED |
| B7 | Article thumbnail fallback | Phase 1 or 2 |

---

*Roadmap created: 2026-04-18*
*Last updated: 2026-04-18 after 02-04 execution complete*
