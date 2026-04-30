---
status: resolved
trigger: "No pending invites listed in Team Dashboard"
created: 2026-04-25T10:00:00Z
updated: 2026-04-30T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - TeamDashboard component only has 2 tabs (bookmarks, members) and never imports or displays pending invites
test: Checked TeamDashboard.tsx for invite-related code
expecting: Found missing tab/section for invites
next_action: Return root cause diagnosis

## Symptoms

expected: As team admin+, invites tab or section shows pending invite with email, role, expiry date, and cancel option
actual: No pending invites listed
errors: None reported
reproduction: View Team Dashboard as admin
started: Phase 28 UAT

## Eliminated

## Evidence

- timestamp: 2026-04-25T10:01:00Z
  checked: TeamDashboard.tsx component structure
  found: Only 2 tabs exist - 'bookmarks' and 'members' (line 25 shows `useState<'bookmarks' | 'members'>('bookmarks')`)
  implication: No 'invites' tab option exists in the UI

- timestamp: 2026-04-25T10:02:00Z
  checked: TeamDashboard imports and hook usage
  found: Imports useTeamMembers but NOT useTeamInvites (lines 13-17)
  implication: Dashboard never fetches pending invites data

- timestamp: 2026-04-25T10:03:00Z
  checked: useTeamMembers.ts hook file
  found: useTeamInvites hook exists (lines 155-170) and is fully implemented, fetches from /api/teams/${teamId}/invites
  implication: Backend API and frontend hook exist, just not used in TeamDashboard

- timestamp: 2026-04-25T10:04:00Z
  checked: Backend teams.ts routes
  found: GET /api/teams/:teamId/invites endpoint exists (lines 467-503), returns pending invites for admin+
  implication: Full backend support exists

- timestamp: 2026-04-25T10:05:00Z
  checked: Invite UI components
  found: InviteModal exists for SENDING invites but NO PendingInviteList or similar component for VIEWING invites
  implication: Missing UI component to display pending invites with cancel functionality

## Resolution

root_cause: TeamDashboard.tsx is missing (1) a "Pending Invites" tab/section, (2) import and usage of the useTeamInvites hook, and (3) a UI component to display pending invites. The backend API (GET /api/teams/:teamId/invites) and frontend hook (useTeamInvites) both exist and work correctly, but the TeamDashboard component was never updated to consume and display this data.
fix: |
  TeamDashboard.tsx now declares a 3-tab state ('bookmarks' | 'members' | 'invites'),
  imports useTeamInvites at line 13, renders PendingInviteList on the invites tab (line 260),
  and shows a count badge (line 200-204). The PendingInviteList component itself was already
  present. The fix was made silently between 2026-04-25 and 2026-04-30; phase 40.1 verifies it.
verification: |
  - Vitest unit test: apps/web/src/components/teams/PendingInviteList.test.tsx (≥5 tests, all pass)
  - E2E test: apps/web/e2e/teams.spec.ts > "Phase 40.1 — wired flows" > "owner sees Pending Invites tab and sent invites appear in the list"
  - grep verification: `grep -q "useTeamInvites" apps/web/src/pages/TeamDashboard.tsx` exits 0
files_changed:
  - apps/web/src/pages/TeamDashboard.tsx (3rd tab + useTeamInvites + PendingInviteList render, pre-40.1 silent fix)
  - apps/web/src/components/teams/PendingInviteList.test.tsx (new, phase 40.1 plan 01)
  - apps/web/e2e/teams.spec.ts (new E2E coverage, phase 40.1 plan 04)
