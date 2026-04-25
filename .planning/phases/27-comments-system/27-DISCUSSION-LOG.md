# Phase 27: Comments System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 27-comments-system
**Areas discussed:** Moderation strategy, Threading depth & display, Comment actions, Real-time behavior

---

## Moderation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| AI pre-screening + flag queue | AI checks toxicity/spam before publishing, users can flag, mod queue for flagged items. Balanced automation + human oversight. | ✓ |
| Community-driven only | User flags + upvote/downvote visibility. No AI screening. Simple but relies on active community. | |
| AI auto-moderation | AI decides publish/hide automatically. Fast but may have false positives, less human control. | |
| You decide | Claude picks based on project context and existing AI infrastructure | |

**User's choice:** AI pre-screening + flag queue (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Every comment | All comments go through AI check before publishing. Most thorough, uses existing multi-provider AI fallback. | ✓ |
| First N comments from user | New users get screened, trusted users skip after threshold. Reduces AI calls. | |
| Keyword-triggered only | AI only runs if suspicious keywords detected. Fastest but may miss subtle issues. | |

**User's choice:** Every comment (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Queue for review, stay visible | Flagged comments visible but marked. Mod reviews and can hide. Less disruptive to discussions. | ✓ |
| Auto-hide after N flags | Threshold-based auto-hide (e.g., 3 flags). Mod can restore. Faster community response. | |
| Immediate hide on flag | Single flag hides comment. Mod reviews. Aggressive but prevents harm quickly. | |

**User's choice:** Queue for review, stay visible

| Option | Description | Selected |
|--------|-------------|----------|
| Admin users only | Keep it simple — only admins (you) can moderate. Easy to start, add community mods later. | |
| Admin + designated moderators | Add moderator role with limited permissions. More scalable but needs role system now. | |
| You decide | Claude picks based on existing auth system (no role system currently exists) | ✓ |

**User's choice:** You decide
**Notes:** Claude recommends admin-only initially since no role system exists, add community mods in future phase

---

## Threading Depth & Display

| Option | Description | Selected |
|--------|-------------|----------|
| 2 levels (comment + reply) | Simple: comments and direct replies only. Deep threads link to parent. Clean UX, easy to implement. | ✓ |
| 3 levels (Reddit-style) | Comment → reply → reply-to-reply. Common pattern, good for discussions, needs collapse logic. | |
| Unlimited with visual cap | Store full tree, but visually indent only 3 levels. "Continue thread" link for deeper. | |

**User's choice:** 2 levels (comment + reply)

| Option | Description | Selected |
|--------|-------------|----------|
| Newest first | Latest comments on top. Fresh activity visible. Good for breaking news. | ✓ |
| Oldest first | Read conversations in order. Traditional forum style. | |
| Best/Most upvoted | Quality rises to top. Requires upvote system (covered in Comment actions). | |

**User's choice:** Newest first

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with replies collapsed by default | Shows comment count, click to expand replies. Keeps view clean for long discussions. | ✓ |
| Yes, but expanded by default | All visible, user can collapse. Better for reading flow, needs scroll management. | |
| No collapse | All comments visible always. Simplest implementation. | |

**User's choice:** Yes, with replies collapsed by default

---

## Comment Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, within time window | Edit allowed for 15-30 minutes. Shows "edited" indicator. Balances correction with accountability. | ✓ |
| Yes, unlimited | Edit anytime. No indicator. Simple but allows history rewriting. | |
| No editing | Delete and re-post only. Strict accountability. | |

**User's choice:** Yes, within time window

| Option | Description | Selected |
|--------|-------------|----------|
| Soft delete, show placeholder | "[Comment deleted]" placeholder. Preserves thread structure. Replies remain visible. | ✓ |
| Hard delete if no replies | Remove completely if no children. Show placeholder if replies exist. | |
| Hard delete always | Remove comment and orphan replies. Cleanest but breaks conversation flow. | |

**User's choice:** Soft delete, show placeholder

| Option | Description | Selected |
|--------|-------------|----------|
| None (keep simple) | No reactions, just comments. Minimal UI, focus on discussion. | ✓ |
| Upvote only | Single "like" action. Simple engagement signal. | |
| Upvote/downvote | Reddit-style voting. Enables quality sorting. Can be polarizing. | |
| Emoji reactions | Multiple emoji options (Slack/GitHub style). Expressive but more complex UI. | |

**User's choice:** None (keep simple)

| Option | Description | Selected |
|--------|-------------|----------|
| Name + avatar only | Clean, minimal. Uses existing user profile data. | ✓ |
| Name + avatar + featured badge | Show user's featured badge (existing gamification). Encourages engagement. | |
| Name + avatar + role indicator | Show if author is admin/mod. Builds trust in moderated discussions. | |

**User's choice:** Name + avatar only

---

## Real-time Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| New comments only | New comments appear instantly. Edits/deletes require refresh. Simple, low bandwidth. | ✓ |
| All comment changes | New, edited, deleted comments all sync live. Full real-time experience. | |
| New comments + comment count | New comments appear, plus count updates. Middle ground. | |

**User's choice:** New comments only

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-insert with animation | New comments slide in. Live feed feel. May disrupt reading if busy. | ✓ |
| "X new comments" banner | Show notification bar, click to load. User controls when to refresh view. | |
| Append at bottom/top | Add silently based on sort order. No interruption, may be missed. | |

**User's choice:** Auto-insert with animation

| Option | Description | Selected |
|--------|-------------|----------|
| No | Keep it simple. No typing indicators. Standard for news comment sections. | |
| Yes, simple "Someone is typing..." | Generic indicator. Adds social presence without revealing who. | ✓ |
| Yes, with usernames | "John is typing..." Full presence. Chat-like, may feel intrusive for articles. | |

**User's choice:** Yes, simple "Someone is typing..."

| Option | Description | Selected |
|--------|-------------|----------|
| In-app only | Notification badge/bell in app. No external notifications. Uses existing notification system. | ✓ |
| In-app + optional email | Default in-app, user can enable email notifications for replies. More engagement. | |
| You decide | Claude picks based on existing notification infrastructure | |

**User's choice:** In-app only

---

## Claude's Discretion

- Moderator permissions (admin-only initially)
- AI toxicity threshold
- Edit time window (15 minutes recommended)
- Typing indicator debounce
- Comment input placement
- Rate limiting
- Character limits

## Deferred Ideas

None — discussion stayed within phase scope
