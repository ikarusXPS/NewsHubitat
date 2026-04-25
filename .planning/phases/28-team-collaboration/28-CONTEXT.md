# Phase 28: Team Collaboration - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can collaborate in team workspaces with shared resources. This phase covers team creation, email-based member invites, shared bookmark collections, and role-based permissions (Owner, Admin, Member). Users can be members of multiple teams.

</domain>

<decisions>
## Implementation Decisions

### Team Membership Model
- **D-01:** Email invite only — Owner/Admin sends invite to email, recipient clicks link to join (controlled, auditable)
- **D-02:** Invites expire in 7 days — matches existing token patterns, admin can resend
- **D-03:** Users can belong to multiple teams — no restriction on team count per user

### Shared Resources Scope
- **D-04:** Shared bookmarks only — team bookmark collection visible to all members (focused, matches requirements)
- **D-05:** Direct add to team — "Save to Team" button when bookmarking an article, explicit team selection
- **D-06:** Remove permissions: original adder + admins — person who added bookmark or team admins can remove

### Permission System Design
- **D-07:** 3 fixed roles: Owner, Admin, Member — simple, matches COLLAB-03 requirements
- **D-08:** Standard hierarchy permissions:
  - Owner: all permissions + delete team + transfer ownership
  - Admin: invite members, remove members (except Owner), manage bookmarks
  - Member: view team, add bookmarks to team collection
- **D-09:** Simple inline checks — direct role checks in middleware/routes (no CASL library for 3 fixed roles)

### Real-time Collaboration
- **D-10:** Bookmark updates only — new team bookmarks appear live via existing WebSocket infrastructure
- **D-11:** In-app notifications only — badge notification for new team bookmarks (matches Phase 27 pattern)

### Claude's Discretion
- Member limits: recommend soft limit of 50 members per team (warning, not hard block) — scales well for B2B use case
- Team name constraints: recommend 3-50 characters, alphanumeric + spaces
- Max teams per user: recommend 10 teams (prevents abuse while allowing flexibility)
- Invite email template: reuse existing EmailService patterns from Phase 22
- Team deletion: recommend soft delete with 7-day grace period (matches user account deletion pattern)
- Team settings page UI: recommend modal or dedicated /team/:id/settings route
- Bookmark display in team view: recommend same card layout as personal bookmarks for consistency
- Team switcher UI: recommend dropdown in header or sidebar (similar to workspace switchers in Slack/Discord)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Authentication & Authorization
- `server/services/authService.ts` — JWT auth patterns, token versioning for team-aware tokens
- `server/middleware/auth.ts` — authMiddleware pattern to extend with team permission checks

### Database
- `prisma/schema.prisma` — Add Team, TeamMember, TeamBookmark models with relations

### Existing Bookmark Infrastructure
- `server/routes/bookmarks.ts` — Personal bookmark endpoints, extend for team bookmarks
- `src/hooks/useBookmarks.ts` — Client-side bookmark hooks, add team variants

### WebSocket Infrastructure
- `server/services/websocketService.ts` — Room-based subscriptions, add `team:{teamId}` rooms for real-time bookmark updates

### Email Infrastructure
- `server/services/emailService.ts` — Use for team invite emails
- `server/config/emailTemplates.ts` — Add team invite template

### Notification Pattern
- Phase 27 Comment notifications — Same in-app notification pattern for team activity

### UI Patterns
- `src/pages/Profile.tsx` — Profile sections layout, reference for team settings
- `src/components/AuthModal.tsx` — Modal patterns for team creation/invite flows

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **authMiddleware**: JWT verification, extend with team membership checks
- **EmailService**: Send team invites using existing template system
- **WebSocketService**: Room subscriptions for `team:{teamId}` channels
- **Bookmark components**: Reuse BookmarkCard for team bookmark display
- **Toast notifications**: Existing pattern for invite sent/accepted feedback

### Established Patterns
- Singleton services with `getInstance()` pattern
- Zod validation for all API inputs
- JWT with tokenVersion for session invalidation
- Soft delete with grace period (user accounts, adapt for teams)
- 7-day token expiry (password reset, email verification — now team invites)

### Integration Points
- Header/Sidebar: Add team switcher dropdown
- Profile/Settings: Add "My Teams" section
- Bookmark flow: Add "Save to Team" option in bookmark action
- New route: `/team/:id` for team dashboard and bookmarks
- Express server: New `/api/teams` routes

### Database Schema Addition
```prisma
model Team {
  id          String       @id @default(cuid())
  name        String       @db.VarChar(50)
  description String?      @db.VarChar(500)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?    // D-Soft delete

  members     TeamMember[]
  bookmarks   TeamBookmark[]
  invites     TeamInvite[]

  @@index([deletedAt])
}

model TeamMember {
  id        String   @id @default(cuid())
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  role      String   @default("member") // owner, admin, member
  joinedAt  DateTime @default(now())

  @@unique([teamId, userId])
  @@index([teamId])
  @@index([userId])
}

model TeamBookmark {
  id        String   @id @default(cuid())
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId    String
  articleId String
  addedBy   String   // userId of person who added
  note      String?  @db.VarChar(500)
  createdAt DateTime @default(now())

  @@unique([teamId, articleId])
  @@index([teamId])
  @@index([addedBy])
}

model TeamInvite {
  id           String    @id @default(cuid())
  team         Team      @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId       String
  email        String
  tokenHash    String    @unique
  invitedBy    String    // userId
  role         String    @default("member") // role to assign on accept
  expiresAt    DateTime
  acceptedAt   DateTime?
  createdAt    DateTime  @default(now())

  @@index([teamId])
  @@index([tokenHash])
  @@index([email])
}
```

Add relation to User model:
```prisma
// In User model
teamMemberships TeamMember[]
```

</code_context>

<specifics>
## Specific Ideas

- Invite flow: Generate secure token (like password reset), send email with `/team/invite/:token` link
- Team switcher: Dropdown showing user's teams, "Create Team" option at bottom
- Team bookmarks view: Same layout as personal bookmarks, with "Added by [name]" attribution
- Role badge: Small badge showing Owner/Admin/Member in team member list
- WebSocket rooms: User joins `team:{teamId}` room on team page load, receives bookmark updates
- Permission check pattern: `checkTeamPermission(userId, teamId, 'admin')` helper function

</specifics>

<deferred>
## Deferred Ideas

- **Team activity feed** — Live feed of all team actions (too complex for v1.4, consider for v1.5)
- **Online presence** — Show who's online in team (additional WebSocket complexity)
- **Team chat** — Real-time messaging within teams (CHAT-01 in v1.7)
- **Enterprise SSO/SCIM** — Deferred to v1.5+ per PROJECT.md
- **Custom roles** — Granular permission customization (overkill for current requirements)
- **Team analytics** — Shared reading insights, bookmark trends (future feature)

</deferred>

---

*Phase: 28-team-collaboration*
*Context gathered: 2026-04-25*
