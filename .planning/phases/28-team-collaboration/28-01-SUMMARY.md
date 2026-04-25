---
phase: 28-team-collaboration
plan: 01
subsystem: team-collaboration
tags: [backend, prisma, websocket, email, i18n]
dependency_graph:
  requires: []
  provides:
    - Team, TeamMember, TeamBookmark, TeamInvite Prisma models
    - TeamService singleton with CRUD and invite methods
    - teamMemberMiddleware and requireTeamRole middleware
    - WebSocket team room events and broadcast methods
    - EmailService.sendTeamInvite method
    - EN/DE i18n translations for teams namespace
  affects:
    - prisma/schema.prisma
    - server/services/websocketService.ts
    - server/services/emailService.ts
tech_stack:
  added: []
  patterns:
    - Singleton service pattern (TeamService)
    - Middleware factory pattern (requireTeamRole)
    - WebSocket room-based subscriptions
    - Secure token generation for invites
key_files:
  created:
    - server/services/teamService.ts
    - server/middleware/teamAuth.ts
    - public/locales/en/teams.json
    - public/locales/de/teams.json
  modified:
    - prisma/schema.prisma
    - server/services/websocketService.ts
    - server/services/emailService.ts
decisions:
  - Team name validation: 3-50 characters per Claude discretion
  - Max 10 teams per user per Claude discretion
  - Soft limit 50 members per team (warning only)
  - 7-day invite expiry per D-02
  - Soft delete with deletedAt field per Claude discretion
  - Same error message for existing member/pending invite (T-28-04)
metrics:
  duration: ~25 minutes
  completed: 2026-04-25
  tasks_completed: 4
  files_created: 4
  files_modified: 3
---

# Phase 28 Plan 01: Database Models and Core Services Summary

Team collaboration foundation with Prisma models, TeamService, auth middleware, WebSocket events, email template, and i18n translations.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 4126567 | feat | Add Team, TeamMember, TeamBookmark, TeamInvite Prisma models |
| fc78f48 | feat | Create TeamService singleton with core methods |
| c8ff6de | feat | Add team auth middleware and extend WebSocket/Email services |
| 63ec44b | feat | Add i18n translation files for teams namespace |

## What Was Built

### Task 1: Prisma Models

Added four new models to `prisma/schema.prisma`:

- **Team**: id, name (varchar 50), description (varchar 500), createdAt, updatedAt, deletedAt (soft delete)
- **TeamMember**: teamId, userId, role (owner/admin/member), joinedAt with unique constraint on [teamId, userId]
- **TeamBookmark**: teamId, articleId, addedBy, note with unique constraint on [teamId, articleId]
- **TeamInvite**: teamId, email, tokenHash, invitedBy, role, expiresAt, acceptedAt

Extended User model with `teamMemberships TeamMember[]` relation.

### Task 2: TeamService

Created `server/services/teamService.ts` singleton with:

- `createTeam(userId, name, description)` - validates name 3-50 chars, max 10 teams per user
- `getUserTeams(userId)` - returns teams with member count and user's role
- `getTeam(teamId, userId)` - single team detail with membership check
- `updateTeam(teamId, updates, actorUserId)` - admin+ permission required
- `createInvite(teamId, invitedByUserId, email, role)` - generates secure token, sends email, 7-day expiry
- `acceptInvite(token, userId)` - validates token, creates membership, WebSocket broadcast
- `getTeamMembers(teamId)` - ordered by role then join date
- `removeMember(teamId, targetUserId, actorUserId)` - D-08 permission rules
- `deleteTeam(teamId, ownerUserId)` - owner-only soft delete
- `getTeamBookmarks(teamId)` - with user attribution
- `addBookmark(teamId, articleId, userId, note)` - WebSocket broadcast
- `removeBookmark(teamId, bookmarkId, userId)` - D-06 permission rules

### Task 3: Middleware and Service Extensions

**server/middleware/teamAuth.ts:**
- `teamMemberMiddleware` - verifies team membership via Prisma lookup, sets req.teamMember
- `requireTeamRole(...roles)` - middleware factory for role-based permission checks

**server/services/websocketService.ts extensions:**
- Added `TeamBookmarkWithArticle` and `TeamMemberInfo` interfaces
- ServerToClientEvents: `team:bookmark:new`, `team:member:joined`, `team:member:removed`
- ClientToServerEvents: `subscribe:team`, `unsubscribe:team`
- Team room handlers with authentication check (T-28-05)
- Broadcast methods: `broadcastTeamBookmark`, `broadcastTeamMemberJoined`, `broadcastTeamMemberRemoved`

**server/services/emailService.ts extension:**
- `sendTeamInvite(email, teamName, inviterName, inviteUrl)` - styled HTML template matching project design

### Task 4: i18n Translations

Created `public/locales/en/teams.json` and `public/locales/de/teams.json` with:
- 23 top-level keys
- Nested objects for empty states, roles, forms, validation, actions, confirmations
- Success and error messages with ICU interpolation
- Plural forms using _one/_other suffixes

## Verification Results

- `npx prisma validate` - schema is valid
- `npx prisma db push` - models synced to database
- `npx prisma generate` - client generated
- `npm run typecheck` - no TypeScript errors

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-28-01 | Secure 32-byte token via generateSecureToken(), SHA-256 hash storage |
| T-28-02 | teamMemberMiddleware verifies DB membership before all team operations |
| T-28-04 | Same error message for "already member" and "pending invite" to prevent enumeration |
| T-28-05 | WebSocket subscribe:team requires authentication check before joining room |
| T-28-06 | requireTeamRole middleware enforces server-side role check |

## Self-Check: PASSED

- [x] prisma/schema.prisma contains `model Team {`
- [x] prisma/schema.prisma contains `model TeamMember {`
- [x] prisma/schema.prisma contains `model TeamBookmark {`
- [x] prisma/schema.prisma contains `model TeamInvite {`
- [x] server/services/teamService.ts exists with singleton pattern
- [x] server/middleware/teamAuth.ts exports teamMemberMiddleware and requireTeamRole
- [x] server/services/websocketService.ts contains subscribe:team handler
- [x] server/services/emailService.ts contains sendTeamInvite method
- [x] public/locales/en/teams.json and public/locales/de/teams.json exist with 23 keys each
- [x] All commits verified: 4126567, fc78f48, c8ff6de, 63ec44b
