---
status: diagnosed
trigger: "Bookmarks not saved to team - On any article, click BookmarkButton. If user has teams, dropdown shows Personal and team options. Select a team, bookmark is saved to team with Added by [name] attribution."
created: 2026-04-25T00:00:00Z
updated: 2026-04-25T00:01:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - BookmarkButton component exists but is NOT integrated into any article card components
test: searched codebase for imports and usage of BookmarkButton
expecting: if integrated, would find import statements and JSX usage
next_action: return ROOT CAUSE FOUND diagnosis

## Symptoms

expected: On any article, click BookmarkButton. If user has teams, dropdown shows "Personal" and team options. Select a team, bookmark is saved to team with "Added by [name]" attribution.
actual: "no bookmarks not saved" (user report suggests bookmarks are not being saved to team)
errors: N/A - feature not wired up
reproduction: click BookmarkButton, select team from dropdown, bookmark should save
started: unknown - UAT phase 28

## Eliminated

## Evidence

- timestamp: 2026-04-25T00:00:30Z
  checked: BookmarkButton component at src/components/BookmarkButton.tsx
  found: Component exists with full team dropdown implementation (lines 67-161), uses useTeams() and useAddTeamBookmark() hooks correctly
  implication: Backend and component logic are implemented correctly

- timestamp: 2026-04-25T00:00:35Z
  checked: useAddTeamBookmark hook at src/hooks/useTeamBookmarks.ts
  found: Hook properly calls POST /api/teams/:teamId/bookmarks with TanStack Query mutation
  implication: Frontend hook is correctly implemented

- timestamp: 2026-04-25T00:00:40Z
  checked: Backend API at server/routes/teams.ts lines 597-663
  found: POST /api/teams/:teamId/bookmarks endpoint exists with proper Prisma upsert, auth middleware, and WebSocket broadcast
  implication: Backend is fully implemented

- timestamp: 2026-04-25T00:00:45Z
  checked: Prisma schema at prisma/schema.prisma lines 399-411
  found: TeamBookmark model exists with proper fields (teamId, articleId, addedBy, note, createdAt)
  implication: Database model is correctly defined

- timestamp: 2026-04-25T00:00:50Z
  checked: Usage of BookmarkButton in article card components
  found: ZERO imports or usages of BookmarkButton component anywhere in codebase
  implication: ROOT CAUSE - Component was created but never integrated

- timestamp: 2026-04-25T00:00:55Z
  checked: SignalCard.tsx and NewsCard.tsx bookmark implementations
  found: Both use inline bookmark buttons with simple toggleBookmark() from Zustand store. SignalCard.tsx lines 403-419, NewsCard.tsx lines 220-232. Neither has team dropdown functionality.
  implication: Article cards still use old personal-only bookmark approach, not the new BookmarkButton with team support

## Resolution

root_cause: The BookmarkButton component (src/components/BookmarkButton.tsx) was created with full team bookmark dropdown functionality, but it was NEVER integrated into the article card components (SignalCard.tsx, NewsCard.tsx). Both card components still use inline bookmark buttons that call the personal-only toggleBookmark() from Zustand store, which has no team support.
fix: Replace inline bookmark buttons in SignalCard.tsx and NewsCard.tsx with the BookmarkButton component
verification: pending
files_changed: []
