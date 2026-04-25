---
phase: 28-team-collaboration
plan: 06
type: gap-closure
status: complete
started: 2026-04-25T13:10:00Z
completed: 2026-04-25T13:25:00Z
---

## Summary

Closed 4 UAT gaps identified during Phase 28 verification testing. All gaps were UI integration issues where backend functionality existed but frontend components were either missing or not wired up.

## What Was Built

### 1. Pending Invites UI (Gap Test 6)
- Created `PendingInviteList.tsx` component with:
  - Invite rows showing email, role badge, and expiry countdown
  - Cancel button with confirmation and toast feedback
  - Empty state and loading states
  - Role-based visibility (owner/admin only)
- Added Invites tab to TeamDashboard with count badge
- Added pending invites stat card (grid now 3-column for admin+)

### 2. BookmarkButton Integration (Gap Test 8)
- Replaced inline bookmark buttons in `SignalCard.tsx` and `NewsCard.tsx`
- Now uses `BookmarkButton` component which:
  - Shows team dropdown when user has teams
  - Allows direct save-to-team from article cards
  - Falls back to personal bookmark for users without teams

### 3. Team Bookmarks External Links (Gap Test 9)
- Modified `GET /api/teams/:teamId/bookmarks` to include article join:
  - Returns `article: { id, title, url }` with each bookmark
- Updated `TeamBookmark` TypeScript interface with article property
- Updated `TeamDashboard` to pass article data to `TeamBookmarkCard`
- Bookmarks now show actual article title and open external URL in new tab

### 4. Delete Team UI (Gap Test 15)
- Created `DeleteTeamModal.tsx` with:
  - Name confirmation input (must type exact team name)
  - Red danger theme styling
  - Warning text about permanent deletion
  - Success toast and navigation to home on delete
  - Escape key handler
- Added delete (trash) button to TeamDashboard header (owner only)

## Key Files

### Created
| File | Purpose |
|------|---------|
| `src/components/teams/PendingInviteList.tsx` | Pending invites list with cancel functionality |
| `src/components/teams/DeleteTeamModal.tsx` | Delete team confirmation modal |

### Modified
| File | Changes |
|------|---------|
| `src/pages/TeamDashboard.tsx` | Added invites tab, delete button, article data passing |
| `src/components/SignalCard.tsx` | Replaced inline bookmark with BookmarkButton |
| `src/components/NewsCard.tsx` | Replaced inline bookmark with BookmarkButton |
| `src/hooks/useTeamBookmarks.ts` | Added article property to TeamBookmark interface |
| `server/routes/teams.ts` | Added article include to bookmarks endpoint |

## Verification

- [x] TypeScript compiles without errors
- [x] All 1206 tests pass
- [x] TeamDashboard shows Invites tab when user is owner/admin
- [x] Invites tab displays pending invites with email, role, expiry, cancel button
- [x] SignalCard bookmark button shows team dropdown when user has teams
- [x] NewsCard bookmark button shows team dropdown when user has teams
- [x] Team bookmarks display article title (not "Article {id}")
- [x] Team bookmarks external link opens original article URL in new tab
- [x] Owner sees delete button in TeamDashboard header
- [x] Delete modal requires typing team name to confirm

## Self-Check: PASSED

All 4 UAT gaps have been resolved. The implementation follows existing patterns:
- Uses existing hooks (useTeamInvites, useCancelInvite, useDeleteTeam)
- Follows glass-panel styling convention
- Includes i18n translation keys
- Respects role-based permissions
