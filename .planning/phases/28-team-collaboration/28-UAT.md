---
status: planning
phase: 28-team-collaboration
source: 28-01-SUMMARY.md, 28-02-SUMMARY.md, 28-03-SUMMARY.md, 28-04-SUMMARY.md, 28-05-SUMMARY.md
started: 2026-04-25T11:30:00Z
updated: 2026-04-25T13:00:00Z
gap_closure_plan: 28-06-PLAN.md
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service, start fresh with `npm run dev`. Server boots without errors, Prisma migrations apply, /api/health returns OK.
result: pass

### 2. Create a Team
expected: Click "Create Team" in TeamSwitcher. Modal opens with name (3-50 chars) and description fields. Submit creates team, modal closes, team appears in switcher.
result: pass

### 3. Team Appears in Header Switcher
expected: After creating a team, TeamSwitcher in header shows the new team with check icon when active.
result: pass

### 4. Navigate to Team Dashboard
expected: Click team in switcher. Navigate to /team/{teamId}. Dashboard shows team name, description, role badge (Owner), member count (1), bookmark count (0).
result: pass

### 5. Invite Team Member
expected: On Team Dashboard as owner/admin, click "Invite Member". Modal opens with email input and role toggle (Admin/Member). Submit shows success state, modal auto-closes.
result: pass

### 6. View Pending Invites
expected: As team admin+, invites tab or section shows pending invite with email, role, expiry date, and cancel option.
result: issue
reported: "no pending invites listed"
severity: major
fix_plan: 28-06-PLAN.md Task 1

### 7. Accept Team Invite
expected: Receive invite email, click link. If logged in, goes to /team/invite/:token, accepts automatically, redirects to team. If not logged in, redirects to login first.
result: blocked
blocked_by: prior-phase
reason: "depends on invite visibility from Test 6"

### 8. Add Bookmark to Team
expected: On any article, click BookmarkButton. If user has teams, dropdown shows "Personal" and team options. Select a team, bookmark is saved to team with "Added by [name]" attribution.
result: issue
reported: "no bookmarks not saved"
severity: major
fix_plan: 28-06-PLAN.md Task 2

### 9. View Team Bookmarks
expected: On Team Dashboard, Bookmarks tab shows all shared bookmarks with article title, note, "Added by" attribution, and external link.
result: issue
reported: "team bookmarks empty and cant open in new tab"
severity: major
fix_plan: 28-06-PLAN.md Task 3

### 10. Remove Team Bookmark
expected: On Team Dashboard, as bookmark adder or admin+, click remove on a bookmark. Bookmark disappears from list.
result: skipped
reason: no bookmarks to test with

### 11. View Team Members
expected: On Team Dashboard, Members tab shows all members with avatar, name, role badge, and join date. Owner shows gold badge, Admin cyan, Member gray.
result: pass

### 12. Change Member Role
expected: As team owner, in Members tab, use role dropdown on a member. Change between Admin and Member. Role badge updates immediately.
result: skipped
reason: only member in team

### 13. Remove Team Member
expected: As team owner/admin, click remove on a member (not owner). Member is removed from list. Removed user no longer sees team in their switcher.
result: skipped
reason: only member in team

### 14. Leave Team
expected: As non-owner member, use Leave Team option. Confirm, you are removed. Team no longer appears in your switcher.
result: skipped
reason: user is owner - owners cannot leave their own team

### 15. Delete Team
expected: As team owner, delete team. Team is soft-deleted, no longer visible in switcher, dashboard returns 404.
result: issue
reported: "cant find delete team"
severity: major
fix_plan: 28-06-PLAN.md Task 4

### 16. Real-time Bookmark Updates
expected: Have two browser windows open on same team. Add bookmark in window A. Bookmark appears in window B within seconds without refresh (WebSocket).
result: skipped
reason: bookmarks not working from Test 8

### 17. TeamSwitcher on Mobile
expected: On mobile view (< md breakpoint), open hamburger menu. TeamSwitcher appears in drawer under "Teams" section.
result: pass

### 18. Role-based UI Restrictions
expected: As regular member (not owner/admin), Invite Member button is hidden, role change dropdown is hidden, can only remove own bookmarks.
result: skipped
reason: need non-owner member account to test

### 19. i18n Translations
expected: Switch language to German. Team-related UI (TeamSwitcher, modals, dashboard labels) displays German translations from teams.json.
result: pass

### 20. Rate Limiting on Invites
expected: Send 10+ invites rapidly to different emails. After 10th invite within 1 hour, receive rate limit error.
result: skipped
reason: too tedious to test manually

## Summary

total: 20
passed: 8
issues: 4
pending: 0
skipped: 7
blocked: 1

## Gaps

- truth: "Pending invites section shows invites with email, role, expiry date, and cancel option"
  status: planning
  reason: "User reported: no pending invites listed"
  severity: major
  test: 6
  root_cause: "TeamDashboard.tsx only has 2 tabs (bookmarks, members). useTeamInvites hook and API exist but invites tab UI was never built."
  artifacts:
    - path: "src/pages/TeamDashboard.tsx"
      issue: "Missing invites tab, missing useTeamInvites import"
  missing:
    - "Add 'invites' tab option to TeamDashboard"
    - "Create PendingInviteList component"
    - "Import and use useTeamInvites hook"
  fix: "28-06-PLAN.md Task 1"

- truth: "Bookmark saves to team with 'Added by' attribution when selecting team from dropdown"
  status: planning
  reason: "User reported: no bookmarks not saved"
  severity: major
  test: 8
  root_cause: "BookmarkButton component exists with full team dropdown but was NEVER integrated. SignalCard.tsx and NewsCard.tsx still use inline bookmark buttons with personal-only toggleBookmark()."
  artifacts:
    - path: "src/components/BookmarkButton.tsx"
      issue: "Component exists but never imported/used anywhere"
    - path: "src/components/SignalCard.tsx"
      issue: "Lines 403-419 use inline bookmark button without team support"
    - path: "src/components/NewsCard.tsx"
      issue: "Lines 220-232 use inline bookmark button without team support"
  missing:
    - "Replace inline bookmark buttons in SignalCard with BookmarkButton component"
    - "Replace inline bookmark buttons in NewsCard with BookmarkButton component"
  fix: "28-06-PLAN.md Task 2"

- truth: "Team bookmarks tab shows shared bookmarks with external link that opens in new tab"
  status: planning
  reason: "User reported: team bookmarks empty and cant open in new tab"
  severity: major
  test: 9
  root_cause: "GET /api/teams/:teamId/bookmarks endpoint doesn't join NewsArticle table. TeamBookmarkCard falls back to internal /article/{id} route when articleUrl is undefined."
  artifacts:
    - path: "server/routes/teams.ts"
      issue: "Bookmarks endpoint missing NewsArticle join"
    - path: "src/hooks/useTeamBookmarks.ts"
      issue: "TeamBookmark interface missing article property"
    - path: "src/pages/TeamDashboard.tsx"
      issue: "Not passing articleTitle/articleUrl to TeamBookmarkCard"
  missing:
    - "Modify bookmarks API to join NewsArticle table"
    - "Update TeamBookmark TypeScript interface to include article data"
    - "Pass bookmark.article.url to TeamBookmarkCard"
  fix: "28-06-PLAN.md Task 3"

- truth: "Delete Team option available for team owner"
  status: planning
  reason: "User reported: cant find delete team"
  severity: major
  test: 15
  root_cause: "Backend DELETE endpoint and useDeleteTeam hook exist but UI components (DeleteTeamModal, settings icon) were never created."
  artifacts:
    - path: "src/pages/TeamDashboard.tsx"
      issue: "Missing settings icon and delete team entry point"
    - path: "src/components/teams/DeleteTeamModal.tsx"
      issue: "Component does not exist (needs to be created)"
  missing:
    - "Create DeleteTeamModal component with name confirmation"
    - "Add delete icon to TeamDashboard header (owner only)"
    - "Wire delete icon to open DeleteTeamModal"
  fix: "28-06-PLAN.md Task 4"
