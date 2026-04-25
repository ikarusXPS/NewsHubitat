# Phase 28: Team Collaboration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 28-team-collaboration
**Areas discussed:** Team membership model, Shared resources scope, Permission system design, Real-time collaboration

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Team membership model | Invite flow, member limits, join approval, removing members | ✓ |
| Shared resources scope | What's shared (bookmarks, reading history, comments?) | ✓ |
| Permission system design | RBAC granularity, where permissions checked, role customization | ✓ |
| Real-time collaboration | Live presence, activity feed, shared views | ✓ |

**User's choice:** All 4 areas selected for discussion

---

## Team Membership Model

### Question 1: How should users join teams?

| Option | Description | Selected |
|--------|-------------|----------|
| Email invite only (Recommended) | Owner/admin sends invite to email, recipient clicks link to join — controlled, auditable | ✓ |
| Shareable link | Generate link anyone with it can join — frictionless but less secure | |
| Both | Email invites for formal, link for casual — flexible but more complex UI | |

**User's choice:** Email invite only (Recommended)
**Notes:** User prefers controlled, auditable invite flow

### Question 2: Member limits per team?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft limit (50 members) | Teams can exceed with warning, no hard block — flexible for growth | |
| Hard limit (20 members) | Strict cap per team — keeps feature lightweight | |
| No limit | Unlimited members — simple but may impact performance | |
| Claude decides | Let Claude pick based on typical use patterns | ✓ |

**User's choice:** Claude decides
**Notes:** Claude will recommend soft limit of 50 members

### Question 3: Pending invite expiry?

| Option | Description | Selected |
|--------|-------------|----------|
| Expires in 7 days (Recommended) | Invite link valid for 7 days, admin can resend — matches existing token patterns | ✓ |
| Never expires | Invite valid until accepted or revoked — simpler, less maintenance | |
| 24 hours | Short expiry for security-conscious teams | |

**User's choice:** Expires in 7 days (Recommended)

---

## Shared Resources Scope

### Question 1: What should teams share?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared bookmarks only (Recommended) | Team bookmark collection visible to all members — focused, matches requirements | ✓ |
| Bookmarks + activity feed | Plus see who read/bookmarked what — more engaging but privacy considerations | |
| Full collaboration | Shared collections, notes, annotations — rich but complex, scope creep risk | |

**User's choice:** Shared bookmarks only (Recommended)
**Notes:** Focused scope matches COLLAB-02 requirement

### Question 2: How to add team bookmarks?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct add to team (Recommended) | "Save to Team" button when bookmarking — explicit, controlled | ✓ |
| Copy from personal | Bookmark personally first, then share to team — extra step | |
| Both options | Either path works — flexible but more UI complexity | |

**User's choice:** Direct add to team (Recommended)

### Question 3: Who can remove team bookmarks?

| Option | Description | Selected |
|--------|-------------|----------|
| Original adder + admins (Recommended) | Person who added it or team admins can remove — balanced control | ✓ |
| Admins only | Only Owner/Admin can remove — strict but may frustrate members | |
| Any member | Anyone can remove any bookmark — simple but risky for accidental deletions | |

**User's choice:** Original adder + admins (Recommended)

---

## Permission System Design

### Question 1: Role granularity?

| Option | Description | Selected |
|--------|-------------|----------|
| 3 fixed roles (Recommended) | Owner, Admin, Member — matches requirements, simple and clear | ✓ |
| Custom permissions | Users can create custom roles with granular permissions — powerful but complex | |
| 2 roles only | Owner and Member — minimal, easy to understand | |

**User's choice:** 3 fixed roles (Recommended)
**Notes:** Matches COLLAB-03 requirement

### Question 2: Role permissions?

| Option | Description | Selected |
|--------|-------------|----------|
| Standard hierarchy (Recommended) | Owner: all + delete team \| Admin: invite, remove members, manage bookmarks \| Member: view, add bookmarks | ✓ |
| Minimal admin | Owner: all \| Admin: only invite/remove \| Member: view, add — simpler but less flexible | |
| Claude decides | Let Claude define permission matrix based on common patterns | |

**User's choice:** Standard hierarchy (Recommended)

### Question 3: Implementation approach?

| Option | Description | Selected |
|--------|-------------|----------|
| Simple inline checks (Recommended) | Direct role checks in middleware/routes — straightforward for 3 fixed roles | ✓ |
| CASL library | Ability-based with defineAbility() — overkill for fixed roles, useful if custom roles later | |
| Custom permission service | Dedicated PermissionService with caching — middle ground, extensible | |

**User's choice:** Simple inline checks (Recommended)
**Notes:** No CASL needed for 3 fixed roles

---

## Real-time Collaboration

### Question 1: Real-time features?

| Option | Description | Selected |
|--------|-------------|----------|
| Bookmark updates only (Recommended) | New team bookmarks appear live — simple, extends existing WebSocket | ✓ |
| With presence | Plus show who's online in team — social but more WebSocket traffic | |
| Full activity feed | Live feed of all team actions — engaging but complex, potential noise | |

**User's choice:** Bookmark updates only (Recommended)
**Notes:** Extends existing WebSocket infrastructure without added complexity

### Question 2: Notifications?

| Option | Description | Selected |
|--------|-------------|----------|
| In-app only (Recommended) | Badge notification for new team bookmarks — matches Phase 27 comment pattern | ✓ |
| Email digest option | Optional weekly team activity email — useful for passive members | |
| No notifications | Users check team page manually — simplest | |

**User's choice:** In-app only (Recommended)

---

## Claude's Discretion

- Member limits: Soft limit of 50 members per team
- Team name constraints: 3-50 characters
- Max teams per user: 10 teams
- Invite email template: Reuse EmailService patterns
- Team deletion: Soft delete with 7-day grace period
- Team settings UI: Modal or dedicated route
- Bookmark display: Same card layout as personal bookmarks
- Team switcher: Dropdown in header/sidebar

---

## Deferred Ideas

- Team activity feed (v1.5)
- Online presence indicators (v1.5)
- Team chat (v1.7, CHAT-01)
- Enterprise SSO/SCIM (v1.5+)
- Custom roles
- Team analytics
