---
status: resolved
trigger: "Team bookmarks can't open in new tab - team bookmarks empty and cant open in new tab"
created: 2026-04-25T00:00:00Z
updated: 2026-04-30T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - TeamBookmarkCard expects articleTitle and articleUrl props but backend API does not include article data
test: Traced data flow from API response through hooks to component props
expecting: Component receives only bookmark metadata (articleId), not article data (title, url)
next_action: Return diagnosis - root cause confirmed

## Symptoms

expected: On Team Dashboard, Bookmarks tab shows all shared bookmarks with article title, note, "Added by" attribution, and external link that opens in new tab
actual: Team bookmarks empty and can't open in new tab
errors: None specified
reproduction: Navigate to Team Dashboard, click Bookmarks tab, try to open bookmark in new tab
started: Phase 28 team collaboration implementation

## Eliminated

## Evidence

- timestamp: 2026-04-25T00:01:00Z
  checked: TeamBookmarkCard.tsx component props
  found: |
    Component accepts articleTitle?: string and articleUrl?: string as optional props (lines 17-18)
    Link renders with: href={articleUrl || `/article/${bookmark.articleId}`} target="_blank" (line 84)
    When articleUrl is undefined, it defaults to internal route `/article/${articleId}`
  implication: Component has target="_blank" correctly, but needs articleUrl to open external links

- timestamp: 2026-04-25T00:02:00Z
  checked: TeamDashboard.tsx bookmark rendering
  found: |
    Renders TeamBookmarkCard without passing articleTitle or articleUrl props (lines 183-189):
    <TeamBookmarkCard
      key={bookmark.id}
      bookmark={bookmark}
      teamId={teamId!}
      userRole={team.role}
    />
  implication: articleTitle and articleUrl are NEVER passed to the component

- timestamp: 2026-04-25T00:03:00Z
  checked: GET /api/teams/:teamId/bookmarks endpoint (server/routes/teams.ts lines 548-594)
  found: |
    Returns only bookmark metadata from TeamBookmark table:
    - id, teamId, articleId, addedBy, addedByUser, note, createdAt
    Does NOT join with NewsArticle table to get title/url
  implication: API does not provide article data needed for display

- timestamp: 2026-04-25T00:04:00Z
  checked: TeamBookmark TypeScript interface (useTeamBookmarks.ts lines 18-30)
  found: |
    Interface does not include article property:
    - id, teamId, articleId, addedBy, addedByUser, note, createdAt
  implication: Type definition matches API but missing article data

- timestamp: 2026-04-25T00:05:00Z
  checked: Prisma schema for TeamBookmark (prisma/schema.prisma lines 399-411)
  found: |
    TeamBookmark only stores articleId (string), NOT a relation to NewsArticle
    NewsArticle has url and title fields that should be joined
  implication: Database design supports join, just not implemented in API

## Resolution

root_cause: |
  The GET /api/teams/:teamId/bookmarks endpoint returns only bookmark metadata without joining
  the NewsArticle table. TeamBookmarkCard receives articleTitle and articleUrl as optional props
  but TeamDashboard never passes them because the API response doesn't include article data.

  Result: Cards show "Article {articleId}" as title and link to non-existent internal route
  `/article/{articleId}` instead of the actual external article URL.

fix: |
  1. Modify GET /api/teams/:teamId/bookmarks to join NewsArticle table and include title + url
  2. Update TeamBookmark TypeScript interface to include article: { title: string, url: string }
  3. Update TeamDashboard to pass articleTitle and articleUrl from bookmark.article to TeamBookmarkCard

  The backend at apps/web/server/routes/teams.ts enriches each bookmark with
  article: { id, title, url } via separate findMany + map (no Prisma relation, intentional).
  TeamDashboard.tsx passes articleTitle={bookmark.article?.title} articleUrl={bookmark.article?.url}.
  TeamBookmarkCard.tsx renders <a href={articleUrl || /article/${articleId}} target="_blank" rel="noopener noreferrer">.
  All three fixes were made silently between 2026-04-25 and 2026-04-30; phase 40.1 verifies them.
verification: |
  - Vitest unit test: apps/web/src/components/teams/TeamBookmarkCard.test.tsx (≥7 tests, all pass)
  - E2E test: apps/web/e2e/teams.spec.ts > "Phase 40.1 — wired flows" > "team bookmark anchor has target=_blank and non-fallback href"
  - grep verification on TeamBookmarkCard: `grep -q 'href={articleUrl' apps/web/src/components/teams/TeamBookmarkCard.tsx` exits 0
  - grep verification on TeamDashboard: `grep -q 'articleUrl={bookmark.article?.url}' apps/web/src/pages/TeamDashboard.tsx` exits 0
files_changed:
  - apps/web/server/routes/teams.ts (article join in GET bookmarks endpoint, pre-40.1 silent fix)
  - apps/web/src/hooks/useTeamBookmarks.ts (TeamBookmark interface includes article: { id, title, url } | null, pre-40.1 silent fix)
  - apps/web/src/pages/TeamDashboard.tsx (passes articleTitle + articleUrl to TeamBookmarkCard, pre-40.1 silent fix)
  - apps/web/src/components/teams/TeamBookmarkCard.test.tsx (new, phase 40.1 plan 01)
  - apps/web/e2e/teams.spec.ts (new E2E coverage, phase 40.1 plan 04)
