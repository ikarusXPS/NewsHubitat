# Phase 27: Comments System - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can engage in article discussions with threaded comments. This phase covers comment creation, 2-level threading (comment + reply), AI pre-screening moderation, user flagging with mod queue, real-time updates via existing WebSocket infrastructure, edit/delete capabilities, and in-app notifications for replies.

</domain>

<decisions>
## Implementation Decisions

### Moderation Strategy
- **D-01:** AI pre-screening + user flag queue — AI checks every comment for toxicity/spam before publishing, users can flag, flagged items go to mod queue
- **D-02:** Every comment goes through AI check — use existing multi-provider AI fallback (OpenRouter → Gemini → Anthropic)
- **D-03:** Flagged comments stay visible but marked — queue for mod review, don't hide immediately
- **D-04:** Comments auto-publish if AI passes — no delay for non-toxic content

### Threading & Display
- **D-05:** 2 levels of nesting only — comments and direct replies, deeper replies link to parent
- **D-06:** Sort by newest first — latest comments on top, good for breaking news discussions
- **D-07:** Replies collapsed by default — shows reply count, click to expand, keeps view clean

### Comment Actions
- **D-08:** Edit allowed within time window — 15-30 minutes, shows "edited" indicator after save
- **D-09:** Soft delete with placeholder — "[Comment deleted]" shown, preserves thread structure, replies remain
- **D-10:** No reaction system — keep simple, focus on discussion not engagement metrics
- **D-11:** Author info shows name + avatar only — clean minimal display using existing profile data

### Real-time Behavior
- **D-12:** Real-time for new comments only — edits/deletes require refresh, simple and low bandwidth
- **D-13:** Auto-insert with animation — new comments slide in at position based on sort order
- **D-14:** Simple typing indicator — "Someone is typing..." without usernames, adds social presence
- **D-15:** In-app notifications only — notification badge for replies, no email notifications

### Claude's Discretion
- Moderator permissions — recommend admin-only initially (no role system exists), add community mods later as separate phase
- AI toxicity threshold — recommend moderate sensitivity with clear appeal path
- Edit time window — recommend 15 minutes (common pattern)
- Typing indicator debounce — recommend 300ms with 2s timeout after typing stops
- Comment input placement — recommend at top of comment section with logged-in requirement clearly shown
- Rate limiting — recommend 5 comments per minute per user (extend existing rate limiting)
- Character limits — recommend 1-5000 characters (matches existing content patterns)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### WebSocket Infrastructure
- `server/services/websocketService.ts` — Existing real-time service with room-based subscriptions, extends with `comment:new`, `comment:typing` events

### Authentication & Authorization
- `server/services/authService.ts` — JWT auth with tokenVersion, authMiddleware for protected routes
- `server/routes/auth.ts` — Auth route patterns with Zod validation

### Database
- `prisma/schema.prisma` — Add Comment model with User relation, self-referencing parentId for threading

### AI Infrastructure
- `server/services/aiService.ts` — Multi-provider fallback chain, reuse for toxicity detection
- `server/config/aiProviders.ts` — AI model configuration

### Frontend Patterns
- `src/components/community/` — Existing community components (Leaderboard, StreakCalendar)
- `src/contexts/AuthContext.tsx` — Auth state for comment permissions
- `src/hooks/useMediaQuery.ts` — Responsive behavior for mobile comment UI

### Notification Infrastructure
- `server/services/websocketService.ts` — `sendNotification()` method for user-specific notifications

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **WebSocketService**: Singleton with room subscriptions, `sendNotification()` for user-specific messages
- **AIService**: Multi-provider fallback for toxicity detection prompts
- **authMiddleware**: JWT verification for protected comment routes
- **Zod schemas**: Pattern for input validation (min/max length, etc.)
- **Toast notifications**: Existing pattern for success/error feedback
- **Framer Motion**: Available for comment animation (auto-insert slide)

### Established Patterns
- Singleton services with `getInstance()` pattern
- API routes with Zod validation
- JWT with tokenVersion for session invalidation
- TanStack Query for data fetching with optimistic updates
- Zustand for client-side state (may need comment cache slice)

### Integration Points
- Article detail view: Add comment section below article content
- WebSocket events: Add `comment:new`, `comment:typing` to ServerToClientEvents
- Prisma User model: Add `comments Comment[]` relation
- Express server: New `/api/comments` routes
- Notification system: Extend for "reply to your comment" notifications

### Database Migration Required
```prisma
model Comment {
  id              String    @id @default(cuid())
  text            String    @db.VarChar(5000)
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId          String
  articleId       String    // Reference to NewsArticle.id
  parentComment   Comment?  @relation("Replies", fields: [parentId], references: [id])
  parentId        String?
  replies         Comment[] @relation("Replies")
  isDeleted       Boolean   @default(false)  // D-09: soft delete
  isEdited        Boolean   @default(false)  // D-08: edit indicator
  isFlagged       Boolean   @default(false)  // D-03: moderation flag
  flagReasons     Json?     // Array of flag reasons
  aiModerated     Boolean   @default(false)  // D-04: passed AI check
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([articleId])
  @@index([userId])
  @@index([parentId])
  @@index([isFlagged])
  @@index([createdAt])
}
```

</code_context>

<specifics>
## Specific Ideas

- Use existing `sendNotification()` pattern from WebSocketService for reply notifications
- AI toxicity check can reuse AIService with a simple toxicity prompt
- Edit window: Store `editableUntil` computed from `createdAt + 15 minutes`
- Typing indicator: Track per-article, show "Someone is typing..." without names
- Comment section placement: Below article content, above related articles

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-comments-system*
*Context gathered: 2026-04-25*
