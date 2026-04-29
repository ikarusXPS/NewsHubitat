---
phase: 28-team-collaboration
plan: 02
subsystem: team-collaboration
tags: [backend, api, express, rate-limiting]
dependency_graph:
  requires:
    - 28-01 (TeamService, teamAuth middleware)
  provides:
    - Team API routes at /api/teams
    - Team invite rate limiter (10/hour per team per user)
  affects:
    - server/index.ts
    - server/middleware/rateLimiter.ts
tech_stack:
  added: []
  patterns:
    - Express Router with middleware chain
    - Zod schema validation
    - Upsert pattern for idempotent bookmark creation
    - WebSocket broadcast on bookmark creation
key_files:
  created:
    - server/routes/teams.ts
  modified:
    - server/middleware/rateLimiter.ts
    - server/index.ts
decisions:
  - Same error message for existing member/pending invite to prevent enumeration (T-28-04)
  - Upsert pattern for bookmark creation (idempotent)
  - WebSocket broadcast on bookmark add for real-time sync
metrics:
  duration: ~8 minutes
  completed: 2026-04-25
  tasks_completed: 3
  files_created: 1
  files_modified: 2
---

# Phase 28 Plan 02: Team API Routes Summary

Complete REST API for team collaboration: CRUD operations for teams, members, invites, and shared bookmarks with rate limiting.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 02cca20 | feat | Create team API routes with CRUD endpoints |
| b5a7845 | feat | Add team invite rate limiter |
| 5cb3f10 | feat | Register teams routes at /api/teams |

## What Was Built

### Task 1: Team API Routes

Created `server/routes/teams.ts` (665 lines) with:

**Team CRUD Endpoints:**
- `POST /api/teams` - Create team (auth required)
- `GET /api/teams` - List user's teams (auth required)
- `GET /api/teams/:teamId` - Get team details (member required)
- `PATCH /api/teams/:teamId` - Update team (admin+ required)
- `DELETE /api/teams/:teamId` - Delete team (owner only)

**Member Management:**
- `GET /api/teams/:teamId/members` - List members (member required)
- `PATCH /api/teams/:teamId/members/:userId` - Update role (owner only)
- `DELETE /api/teams/:teamId/members/:userId` - Remove member (D-08 rules)

**Invite Endpoints:**
- `POST /api/teams/:teamId/invite` - Send invite (admin+, rate limited)
- `GET /api/teams/:teamId/invites` - List pending invites (admin+)
- `DELETE /api/teams/:teamId/invites/:inviteId` - Cancel invite (admin+)

**Bookmark Endpoints:**
- `GET /api/teams/:teamId/bookmarks` - List bookmarks (member required)
- `POST /api/teams/:teamId/bookmarks` - Add bookmark (member required, D-05)
- `DELETE /api/teams/:teamId/bookmarks/:bookmarkId` - Remove (D-06: adder or admin)

**Validation Schemas:**
- `createTeamSchema` - name (3-50 chars), optional description
- `inviteSchema` - email validation, role enum
- `addBookmarkSchema` - articleId, optional note
- `updateTeamSchema` - optional name/description
- `updateMemberRoleSchema` - role enum (admin/member)

### Task 2: Team Invite Rate Limiter

Added `teamInviteLimiter` to `server/middleware/rateLimiter.ts`:
- Window: 1 hour (60 * 60 * 1000 ms)
- Limit: 10 invites per window
- Key: `${teamId}:${userId}` for per-team per-user limiting
- Redis store with graceful degradation
- Standard headers enabled

### Task 3: Route Registration

Updated `server/index.ts`:
- Import: `import teamsRoutes from './routes/teams'`
- Mount: `app.use('/api/teams', teamsRoutes)`

## API Response Format

All endpoints return standard `ApiResponse<T>`:
```typescript
{ success: true, data: T }           // Success
{ success: false, error: string }    // Error
{ success: true, message: string }   // Action completed
```

## Middleware Chain

```
authMiddleware -> teamMemberMiddleware -> requireTeamRole(...) -> handler
```

- `authMiddleware` - JWT validation, sets req.user
- `teamMemberMiddleware` - Team membership check, sets req.teamMember
- `requireTeamRole` - Role-based permission check

## Verification Results

- `npm run typecheck` - No TypeScript errors
- All acceptance criteria verified via grep
- Routes properly registered at /api/teams

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-28-07 | authMiddleware + teamMemberMiddleware verify identity |
| T-28-08 | D-06 permission check: only adder or admin+ can delete bookmark |
| T-28-09 | requireTeamRole('owner', 'admin') restricts invite list access |
| T-28-10 | teamInviteLimiter: 10/hour per team per user |
| T-28-11 | requireTeamRole('owner') for role changes, cannot change owner role |

## Self-Check: PASSED

- [x] server/routes/teams.ts exists (665 lines)
- [x] Contains `router.post('/', authMiddleware,` (line 70)
- [x] Contains `router.get('/', authMiddleware,` (line 116)
- [x] Contains `router.post('/:teamId/invite',` (line 372)
- [x] Contains `router.get('/:teamId/bookmarks',` (line 507)
- [x] Contains `router.post('/:teamId/bookmarks',` (line 555)
- [x] Contains `router.delete('/:teamId/bookmarks/:bookmarkId',` (line 624)
- [x] Contains `teamMemberMiddleware` (10 usages)
- [x] Contains `requireTeamRole('owner', 'admin')` (4 usages)
- [x] Contains `teamInviteLimiter` import and usage
- [x] server/middleware/rateLimiter.ts contains teamInviteLimiter export
- [x] teamInviteLimiter has windowMs: 60 * 60 * 1000
- [x] teamInviteLimiter has max: 10
- [x] server/index.ts imports teamsRoutes
- [x] server/index.ts mounts at /api/teams
- [x] All commits verified: 02cca20, b5a7845, 5cb3f10
