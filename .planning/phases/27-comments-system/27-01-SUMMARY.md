---
phase: 27-comments-system
plan: 01
subsystem: foundation-infrastructure
tags: [database, websocket, rate-limiting, i18n, comments]
dependency_graph:
  requires: []
  provides: [Comment model, WebSocket comment events, comment rate limiting, comment translations]
  affects: [prisma/schema.prisma, server/services/websocketService.ts, server/config/rateLimits.ts, server/middleware/rateLimiter.ts, public/locales]
tech_stack:
  added: []
  patterns: [Prisma self-referencing relations, Socket.io room broadcasting, tiered rate limiting]
key_files:
  created: []
  modified:
    - prisma/schema.prisma
    - server/services/websocketService.ts
    - server/config/rateLimits.ts
    - server/middleware/rateLimiter.ts
    - public/locales/en/common.json
    - public/locales/de/common.json
decisions:
  - Comment.parentId uses onDelete:NoAction to prevent cascade loops
  - 2s typing indicator timeout for auto-stop
  - 5/min rate limit per user for comment endpoints
  - German translations use informal 'du' form consistently
metrics:
  duration: ~6 minutes
  completed: 2026-04-25T06:04:52Z
---

# Phase 27 Plan 01: Foundation Infrastructure Summary

Comment system infrastructure with Prisma model, WebSocket events, rate limiting, and i18n translations.

## Task Completion

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | Add Comment model to Prisma schema | Done | 1f6df84 | prisma/schema.prisma |
| 2 | Extend WebSocketService with comment events | Done | c52dee7 | server/services/websocketService.ts |
| 3 | Add comment rate limiting configuration | Done | 362ec3c | server/config/rateLimits.ts, server/middleware/rateLimiter.ts |
| 4 | Add comment i18n translations | Done | 6e838f1 | public/locales/en/common.json, public/locales/de/common.json |

## Key Implementations

### Comment Model (Task 1)
- Self-referencing relation with `parentId` for 2-level threading
- `onDelete: NoAction, onUpdate: NoAction` prevents cascade loops
- 5 indexes: articleId, userId, parentId, isFlagged, createdAt
- User model extended with `comments Comment[]` relation

### WebSocket Events (Task 2)
- ServerToClientEvents: `comment:new`, `comment:typing`
- ClientToServerEvents: `subscribe:article`, `unsubscribe:article`, `comment:typing:start`, `comment:typing:stop`
- `CommentWithUser` interface for typed broadcasts
- Article room subscriptions with `socket.join/leave`
- Typing indicator with 2s auto-stop timeout
- `broadcastNewComment()` method using `io.to(article:id)` pattern

### Rate Limiting (Task 3)
- Added `comment` tier: 5 requests/min per user
- User-based key generation (falls back to IP if unauthenticated)
- Paths: `/api/comments`, `/api/comments/:id/edit`, `/api/comments/:id/flag`
- Exported `commentLimiter` from rateLimiter middleware

### i18n Translations (Task 4)
- 24 keys in `comments` namespace (17 top-level + nested)
- English and German translations
- Covers: actions (post, reply, edit, delete, flag), indicators (typing, deleted, edited, flagged), character counter, auth requirement, empty state, error messages, delete confirmation dialog

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
Prisma schema: Valid
TypeScript: 0 errors
Comment model: All 11 fields present
Self-reference: onDelete: NoAction confirmed
Indexes: All 5 present
WebSocket events: comment:new, comment:typing confirmed
Rate limit: comment tier at 5/min per user confirmed
i18n: 24 keys in EN, 24 keys in DE confirmed
```

## Self-Check: PASSED

- [x] prisma/schema.prisma exists with Comment model
- [x] server/services/websocketService.ts has comment events
- [x] server/config/rateLimits.ts has comment tier
- [x] server/middleware/rateLimiter.ts exports commentLimiter
- [x] public/locales/en/common.json has comments namespace
- [x] public/locales/de/common.json has comments namespace
- [x] Commit 1f6df84 exists
- [x] Commit c52dee7 exists
- [x] Commit 362ec3c exists
- [x] Commit 6e838f1 exists
