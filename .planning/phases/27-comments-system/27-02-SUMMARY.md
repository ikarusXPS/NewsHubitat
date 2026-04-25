---
phase: 27-comments-system
plan: 02
subsystem: backend-api
tags: [comments, api, ai-moderation, websocket, crud]
dependency_graph:
  requires: [27-01]
  provides: [CommentService, comment API endpoints, /api/comments routes]
  affects: [server/services/commentService.ts, server/routes/comments.ts, server/index.ts, server/services/aiService.ts]
tech_stack:
  added: []
  patterns: [AI toxicity pre-screening with graceful degradation, 2-level threading validation, 15-minute edit window, soft delete]
key_files:
  created:
    - server/services/commentService.ts
    - server/routes/comments.ts
  modified:
    - server/index.ts
    - server/services/aiService.ts
decisions:
  - AI toxicity check has 5s timeout with graceful degradation (auto-approve on failure)
  - Threading depth validated server-side (rejects replies to replies)
  - Edit window enforced server-side (15 minutes from createdAt)
  - Soft delete sets isDeleted: true, preserves thread structure
  - AIService.callWithFallback() made public for CommentService use
metrics:
  duration: ~5 minutes
  completed: 2026-04-25T06:13:18Z
---

# Phase 27 Plan 02: Backend Comment API Summary

Comment CRUD API with AI-powered toxicity moderation, 2-level threading, and real-time WebSocket broadcasting.

## Task Completion

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | Create CommentService with AI moderation | Done | 899b843 | server/services/commentService.ts, server/services/aiService.ts |
| 2 | Create comment API routes | Done | 41058ed | server/routes/comments.ts |
| 3 | Register comment routes in Express server | Done | e76034f | server/index.ts |

## Key Implementations

### CommentService (Task 1)

- Singleton pattern matching existing service patterns
- `checkToxicity()`: AI pre-screening with 5s timeout via Promise.race()
- Graceful degradation: auto-approve comment on AI failure (per D-04)
- `createComment()`: validates parentId depth, rejects 3rd level nesting (per D-05)
- `createComment()`: sets `aiModerated: true`, flags if toxic with >0.7 confidence
- `createComment()`: broadcasts via WebSocketService.broadcastNewComment()
- `getComments()`: fetches root comments with nested replies, sorted per D-06
- `editComment()`: validates 15-minute window from createdAt (per D-08)
- `deleteComment()`: soft delete via `isDeleted: true` (per D-09)
- `flagComment()`: updates isFlagged and stores flagReasons JSON
- Made `AIService.callWithFallback()` public for moderation integration

### Comment Routes (Task 2)

- `POST /api/comments` - Create comment (auth + rate limited)
- `GET /api/comments/:articleId` - List comments (public, no auth)
- `PATCH /api/comments/:id/edit` - Edit comment (auth + rate limited)
- `DELETE /api/comments/:id` - Soft delete (auth required)
- `POST /api/comments/:id/flag` - Flag for moderation (auth required)
- Zod validation schemas for all inputs
- formatZodError helper for user-friendly messages
- Specific HTTP status codes: 400 (validation), 403 (unauthorized), 404 (not found), 500 (server error)

### Route Registration (Task 3)

- Import `commentRoutes` from `./routes/comments`
- Registered at `/api/comments` in Express app
- Placed after other user routes (bookmarks, history), before error handlers

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
TypeScript compilation: 0 errors
CommentService file: 8.8K, all methods present
Comment routes file: 6.2K, 5 routes implemented
Route registration: Line 154 in server/index.ts
AI timeout: 5000ms Promise.race confirmed
Threading validation: "Max 2 levels" error message confirmed
Edit window: 15 * 60 * 1000 calculation confirmed
Soft delete: No prisma.comment.delete() calls found
```

## Self-Check: PASSED

- [x] server/services/commentService.ts exists with CommentService class
- [x] server/routes/comments.ts exists with 5 routes
- [x] server/index.ts has commentRoutes import and registration
- [x] Commit 899b843 exists (CommentService)
- [x] Commit 41058ed exists (comment routes)
- [x] Commit e76034f exists (route registration)
- [x] npm run typecheck exits 0
