---
phase: 27-comments-system
plan: 03
subsystem: frontend-comments-ui
tags: [react, tanstack-query, websocket, framer-motion, i18n, comments]
dependency_graph:
  requires: [27-01]
  provides: [useComments hook, CommentSection, CommentInput, CommentCard, ReplyThread, TypingIndicator, FlaggedBadge]
  affects: [src/hooks/useComments.ts, src/components/comments/]
tech_stack:
  added: []
  patterns: [TanStack Query optimistic mutations, Socket.io room subscriptions, Framer Motion animations]
key_files:
  created:
    - src/hooks/useComments.ts
    - src/hooks/useComments.test.ts
    - src/components/comments/CommentSection.tsx
    - src/components/comments/CommentInput.tsx
    - src/components/comments/CommentCard.tsx
    - src/components/comments/ReplyThread.tsx
    - src/components/comments/TypingIndicator.tsx
    - src/components/comments/FlaggedBadge.tsx
    - src/components/comments/index.ts
  modified: []
decisions:
  - useComments subscribes to article rooms via socket.emit('subscribe:article')
  - Optimistic mutations use temp ID pattern with temp-${Date.now()}
  - 15-minute edit window enforced via client-side timestamp comparison
  - Typing indicator auto-stops after 2s via setTimeout
  - Character counter shows yellow warning at 4500 chars (before 5000 limit)
metrics:
  duration: ~9 minutes
  completed: 2026-04-25T06:17:10Z
---

# Phase 27 Plan 03: Frontend Comment Components Summary

TanStack Query hooks and React components for real-time article comments with optimistic updates and WebSocket integration.

## Task Completion

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | useComments hook with TanStack Query mutations | Done | 28a1741 | src/hooks/useComments.ts, src/hooks/useComments.test.ts |
| 2 | CommentSection container component | Done | 5493190 | src/components/comments/CommentSection.tsx |
| 3 | CommentInput with character counter | Done | ca6e852 | src/components/comments/CommentInput.tsx |
| 4a | CommentCard component | Done | c6c41b1 | src/components/comments/CommentCard.tsx |
| 4b | ReplyThread component | Done | 041ddf0 | src/components/comments/ReplyThread.tsx |
| 4c | TypingIndicator component | Done | ce49a0a | src/components/comments/TypingIndicator.tsx |
| 4d | FlaggedBadge component | Done | 8c67601 | src/components/comments/FlaggedBadge.tsx, index.ts |

## Key Implementations

### useComments Hook (Task 1)
- **6 exported functions:** useComments, usePostComment, useEditComment, useDeleteComment, useFlagComment, useTypingIndicator
- WebSocket subscription to `article:${articleId}` room with auto-unsubscribe on cleanup
- Optimistic mutations with cache rollback on error (onMutate/onError pattern)
- Query key: `['comments', articleId]` for cache consistency
- Typing indicator with 2s auto-stop timeout

### CommentSection (Task 2)
- TanStack Query container using useComments(articleId)
- Auth gate: shows login prompt for unauthenticated users
- WebSocket `comment:typing` event handling with 2.5s display timeout
- Empty state with localized heading/body
- Comment count badge

### CommentInput (Task 3)
- 5000 character limit with visual counter
- Yellow warning at 4500 chars, red at 5000+
- startTyping/stopTyping integration via useTypingIndicator
- Ctrl+Enter keyboard shortcut
- Toast feedback for success/error/rate limit

### CommentCard (Task 4a)
- 15-minute edit window enforcement (client-side)
- Edit/Delete buttons for own comments only
- Flag button for other users' comments
- Framer Motion slide-in animation for new comments
- Deleted comment placeholder: "[Comment deleted]"
- FlaggedBadge display when isFlagged: true

### ReplyThread (Task 4b)
- Collapsed by default (defaultCollapsed: true)
- "Show N replies" / "Hide replies" toggle
- 24px left indent (ml-6) per UI-SPEC

### TypingIndicator (Task 4c)
- 3-dot pulse animation with staggered delays (0, 0.2s, 0.4s)
- i18n translation: "Someone is typing..."

### FlaggedBadge (Task 4d)
- Yellow warning theme (bg-yellow-500/20, border-yellow-500/40)
- AlertCircle icon with i18n text

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
TypeScript: 0 errors (npm run typecheck)
Hook tests: 5 passed (npm run test -- src/hooks/useComments.test.ts)
Components: All 7 created in src/components/comments/
Exports: useComments, usePostComment, useEditComment, useDeleteComment, useFlagComment, useTypingIndicator
WebSocket: subscribe:article, unsubscribe:article, comment:new, comment:typing events
15-minute edit: Date.now() - 15 * 60 * 1000 comparison implemented
Character counter: MAX_CHARS = 5000, yellow > 4500, red > 5000
```

## Self-Check: PASSED

- [x] src/hooks/useComments.ts exists with 6 exports
- [x] src/hooks/useComments.test.ts exists with 5 passing tests
- [x] src/components/comments/CommentSection.tsx exists
- [x] src/components/comments/CommentInput.tsx exists
- [x] src/components/comments/CommentCard.tsx exists
- [x] src/components/comments/ReplyThread.tsx exists
- [x] src/components/comments/TypingIndicator.tsx exists
- [x] src/components/comments/FlaggedBadge.tsx exists
- [x] src/components/comments/index.ts barrel export exists
- [x] Commit 28a1741 exists (useComments hook)
- [x] Commit 5493190 exists (CommentSection)
- [x] Commit ca6e852 exists (CommentInput)
- [x] Commit c6c41b1 exists (CommentCard)
- [x] Commit 041ddf0 exists (ReplyThread)
- [x] Commit ce49a0a exists (TypingIndicator)
- [x] Commit 8c67601 exists (FlaggedBadge)
