---
phase: 28-team-collaboration
plan: 03
subsystem: team-collaboration
tags: [frontend, hooks, tanstack-query, websocket, zustand, i18n]
dependency_graph:
  requires:
    - 28-01 (TeamService, WebSocket events)
    - 28-02 (Team API routes)
  provides:
    - useTeams, useTeam, useCreateTeam, useUpdateTeam, useDeleteTeam, useLeaveTeam hooks
    - useTeamBookmarks, useAddTeamBookmark, useRemoveTeamBookmark hooks with WebSocket
    - useTeamMembers, useTeamInvites, useInviteMember, useCancelInvite, useRemoveMember, useUpdateMemberRole hooks
    - activeTeamId state in Zustand store with persistence
    - teams namespace in i18n config
  affects:
    - src/hooks/useTeams.ts
    - src/hooks/useTeamBookmarks.ts
    - src/hooks/useTeamMembers.ts
    - src/store/index.ts
    - src/i18n/i18n.ts
tech_stack:
  added: []
  patterns:
    - TanStack Query hooks with cache invalidation
    - WebSocket real-time subscription pattern
    - Optimistic updates with rollback on error
    - Zustand persist middleware for state
key_files:
  created:
    - src/hooks/useTeams.ts
    - src/hooks/useTeamBookmarks.ts
    - src/hooks/useTeamMembers.ts
  modified:
    - src/store/index.ts
    - src/i18n/i18n.ts
decisions:
  - All hooks use useAuth() for token and authentication state
  - WebSocket authenticates before subscribing to team room (T-28-12)
  - useTeamInvites returns empty array on 403 to avoid error exposure (T-28-14)
  - Optimistic updates with full rollback on error (T-28-13)
metrics:
  duration: ~4 minutes
  completed: 2026-04-25
  tasks_completed: 4
  files_created: 3
  files_modified: 2
---

# Phase 28 Plan 03: Frontend Hooks and State Summary

TanStack Query hooks with WebSocket real-time updates for team collaboration, Zustand store extension, and i18n namespace registration.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 18fb469 | feat | Create useTeams hook for team CRUD operations |
| 168684a | feat | Create useTeamBookmarks hook with WebSocket real-time updates |
| caa558a | feat | Create useTeamMembers hook for member management |
| 2634467 | feat | Add activeTeamId to Zustand store and teams i18n namespace |

## What Was Built

### Task 1: useTeams.ts (234 lines)

Created `src/hooks/useTeams.ts` with:

**Types:**
- `TeamRole` - 'owner' | 'admin' | 'member'
- `Team` - id, name, description, createdAt, memberCount, role

**Hooks:**
- `useTeams()` - Fetches user's teams with loading state, 60s stale time
- `useTeam(teamId)` - Fetches single team details
- `useCreateTeam()` - Mutation with cache invalidation on ['teams']
- `useUpdateTeam(teamId)` - Mutation invalidating ['teams'] and ['team', teamId]
- `useDeleteTeam()` - Mutation for owner-only deletion
- `useLeaveTeam()` - Uses user.id from useAuth to remove self

### Task 2: useTeamBookmarks.ts (225 lines)

Created `src/hooks/useTeamBookmarks.ts` with:

**Types:**
- `TeamBookmark` - id, teamId, articleId, addedBy, addedByUser, note, createdAt

**Hooks:**
- `useTeamBookmarks(teamId)` - Fetches bookmarks with WebSocket real-time updates
- `useAddTeamBookmark(teamId)` - Mutation with optimistic update
- `useRemoveTeamBookmark(teamId)` - Mutation with optimistic update

**WebSocket Integration (D-10):**
```typescript
socket.on('connect', () => {
  socket.emit('authenticate', token);
  socket.emit('subscribe:team', teamId);
});

socket.on('team:bookmark:new', ({ teamId: eventTeamId }) => {
  if (eventTeamId === teamId) {
    queryClient.invalidateQueries({ queryKey: ['team-bookmarks', teamId] });
  }
});
```

### Task 3: useTeamMembers.ts (254 lines)

Created `src/hooks/useTeamMembers.ts` with:

**Types:**
- `TeamMember` - userId, name, avatarUrl, role, joinedAt
- `TeamInvite` - id, email, role, createdAt, expiresAt

**Hooks:**
- `useTeamMembers(teamId)` - Fetches team members
- `useTeamInvites(teamId)` - Fetches pending invites (returns [] on 403)
- `useInviteMember(teamId)` - Sends invite with email and role (D-01)
- `useCancelInvite(teamId)` - Cancels pending invite
- `useRemoveMember(teamId)` - With optimistic update (D-08 rules)
- `useUpdateMemberRole(teamId)` - For role changes (owner only)

### Task 4: Zustand Store and i18n

**src/store/index.ts additions:**
```typescript
// Interface
activeTeamId: string | null;
setActiveTeamId: (teamId: string | null) => void;

// Implementation
activeTeamId: null,
setActiveTeamId: (teamId) => set({ activeTeamId: teamId }),

// Partialize (persistence)
activeTeamId: state.activeTeamId,
```

**src/i18n/i18n.ts update:**
```typescript
ns: ['common', 'share', 'teams'],  // Added teams namespace
```

## Exported Hooks

| File | Exports |
|------|---------|
| useTeams.ts | `useTeams`, `useTeam`, `useCreateTeam`, `useUpdateTeam`, `useDeleteTeam`, `useLeaveTeam`, `Team`, `TeamRole` |
| useTeamBookmarks.ts | `useTeamBookmarks`, `useAddTeamBookmark`, `useRemoveTeamBookmark`, `TeamBookmark` |
| useTeamMembers.ts | `useTeamMembers`, `useTeamInvites`, `useInviteMember`, `useCancelInvite`, `useRemoveMember`, `useUpdateMemberRole`, `TeamMember`, `TeamInvite` |

## Verification Results

- `npm run typecheck` - No TypeScript errors
- grep activeTeamId returns 4 occurrences (type, initial, action, partialize)
- All hooks use `enabled: isAuthenticated && !!token` for auth gating
- WebSocket subscription follows useComments.ts pattern exactly

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-28-12 | WebSocket authenticates via token before subscribe:team |
| T-28-13 | Optimistic updates roll back on error via onError handler |
| T-28-14 | useTeamInvites returns empty array on 403 (non-admin) |

## Self-Check: PASSED

- [x] src/hooks/useTeams.ts exists (234 lines)
- [x] src/hooks/useTeamBookmarks.ts exists (225 lines)
- [x] src/hooks/useTeamMembers.ts exists (254 lines)
- [x] useTeams exports: useTeams, useTeam, useCreateTeam, useUpdateTeam, useDeleteTeam, useLeaveTeam
- [x] useTeamBookmarks exports: useTeamBookmarks, useAddTeamBookmark, useRemoveTeamBookmark
- [x] useTeamMembers exports: useTeamMembers, useTeamInvites, useInviteMember, useCancelInvite, useRemoveMember, useUpdateMemberRole
- [x] WebSocket pattern: socket.emit('subscribe:team', teamId) present
- [x] WebSocket pattern: socket.on('team:bookmark:new') present
- [x] Optimistic update in onMutate for add/remove bookmarks
- [x] src/store/index.ts contains activeTeamId (4 occurrences)
- [x] src/i18n/i18n.ts contains 'teams' namespace
- [x] All commits verified: 18fb469, 168684a, caa558a, 2634467
