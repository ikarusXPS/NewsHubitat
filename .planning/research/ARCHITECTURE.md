# Architecture Patterns

**Domain:** User & Community Features for News Analysis Platform
**Researched:** 2026-04-23
**Confidence:** HIGH (verified against existing codebase + industry patterns)

## Executive Summary

The v1.4 features integrate into NewsHub's existing layered monolith architecture. This document specifies exact integration points with existing components, new Prisma models, Socket.IO extensions for real-time comments, and dependency-based build order.

**Key Architecture Decision:** All new features extend existing infrastructure rather than replacing it. OAuth adds to AuthService (preserves JWT), i18n layers on Zustand, comments leverage Socket.IO, teams follow existing RBAC patterns.

---

## Current Architecture Overview

```
+------------------+     +------------------+     +------------------+
|   React SPA      |     |  Express API     |     |  PostgreSQL      |
|  (Vite + React)  |<--->|  (REST + WS)     |<--->|  (via Prisma)    |
+------------------+     +------------------+     +------------------+
       |                        |                        |
       v                        v                        v
+------------------+     +------------------+     +------------------+
|  Zustand Store   |     |  Socket.IO       |     |  Redis Cache     |
|  (Client State)  |     |  (Real-time)     |     |  (Sessions, etc) |
+------------------+     +------------------+     +------------------+
```

### Existing Integration Points (Verified from Codebase)

| Component | File Location | Current Role | v1.4 Extension |
|-----------|--------------|--------------|----------------|
| `AuthService` | `server/services/authService.ts` | JWT + email/password auth, token blacklist | OAuth provider linking |
| `authMiddleware` | `server/services/authService.ts:559` | JWT validation, tokenVersion check | No change needed |
| `AuthContext` | `src/contexts/AuthContext.tsx` | React auth state, login/register | OAuth login methods |
| `WebSocketService` | `server/services/websocketService.ts` | News/event broadcasts, rooms | Comment broadcasts |
| `Zustand store` | `src/store/index.ts` | UI state (theme, language, filters) | i18n locale, team context |
| `User model` | `prisma/schema.prisma:66` | Auth, preferences, badges | OAuth accounts, team membership |
| `SharedContent` | `prisma/schema.prisma:245` | Share links (exists) | Leverage for social sharing |

---

## Feature 1: OAuth Integration (Google + GitHub)

### Integration with Existing JWT Auth

**Critical:** OAuth does NOT replace JWT. OAuth creates the same JWT token as email/password login.

```
EXISTING FLOW (preserved):
  Email/Password → AuthService.login() → JWT → AuthContext

NEW FLOW (added):
  OAuth Callback → AuthService.loginWithOAuth() → JWT → AuthContext
                                                   ^
                                         Same JWT format, same validation
```

### New Files Required

```
server/
├── config/
│   └── passport.ts              # Passport strategies (Google, GitHub)
├── routes/
│   └── oauth.ts                 # OAuth routes (/auth/google, /auth/github)
└── services/
    └── authService.ts           # EXTEND (add OAuth methods)

src/
├── pages/
│   └── AuthCallback.tsx         # Handle OAuth redirect with token
└── contexts/
    └── AuthContext.tsx          # EXTEND (add loginWithOAuth)
```

### Prisma Model: OAuthAccount

```prisma
// Add to prisma/schema.prisma

model OAuthAccount {
  id                String   @id @default(cuid())
  provider          String   // 'google' | 'github'
  providerAccountId String   // ID from provider (Google sub, GitHub id)

  // Optional: Store for API access on user's behalf
  accessToken       String?  // Encrypted at rest
  refreshToken      String?  // Encrypted at rest
  tokenExpiresAt    DateTime?

  // Profile data from provider
  email             String?  // Email from provider
  avatarUrl         String?  // Avatar from provider

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId            String

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([provider, providerAccountId])
  @@index([userId])
}
```

### User Model Extension

```prisma
// Modify existing User model in prisma/schema.prisma

model User {
  // ... existing fields (id, email, passwordHash, name, etc.) ...

  // OAuth support (NEW)
  oauthAccounts     OAuthAccount[]

  // Make passwordHash nullable for OAuth-only users
  // MIGRATION: Add default value first, then make nullable
  passwordHash      String?  // Was: String (required)
}
```

### AuthService Extension

```typescript
// Add to server/services/authService.ts

interface OAuthProfile {
  provider: 'google' | 'github';
  providerAccountId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

// Add these methods to AuthService class:

async loginWithOAuth(profile: OAuthProfile): Promise<{ user: SafeUser; token: string; isNewUser: boolean }> {
  // 1. Check if OAuthAccount exists
  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId
      }
    },
    include: { user: true }
  });

  if (existingOAuth) {
    // Existing OAuth user - generate JWT
    const token = this.generateToken(existingOAuth.user);
    return { user: this.sanitizeUser(existingOAuth.user), token, isNewUser: false };
  }

  // 2. Check if email matches existing User
  const existingUser = await prisma.user.findUnique({
    where: { email: profile.email.toLowerCase() }
  });

  if (existingUser) {
    // Link OAuth to existing account (user already has email/password)
    await prisma.oAuthAccount.create({
      data: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        userId: existingUser.id
      }
    });
    const token = this.generateToken(existingUser);
    return { user: this.sanitizeUser(existingUser), token, isNewUser: false };
  }

  // 3. Create new User + OAuthAccount (no password)
  const newUser = await prisma.user.create({
    data: {
      email: profile.email.toLowerCase(),
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      emailVerified: true,  // OAuth email is pre-verified
      passwordHash: null,    // No password for OAuth-only users
      preferences: JSON.stringify({
        language: 'de',
        theme: 'dark',
        regions: ['western', 'middle-east', 'turkish', 'russian', 'chinese', 'alternative']
      }),
      oauthAccounts: {
        create: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
          email: profile.email,
          avatarUrl: profile.avatarUrl
        }
      }
    },
    include: { oauthAccounts: true }
  });

  const token = this.generateToken(newUser);
  return { user: this.sanitizeUser(newUser), token, isNewUser: true };
}

async linkOAuthAccount(userId: string, profile: OAuthProfile): Promise<boolean> {
  // Security: Requires authenticated session
  try {
    await prisma.oAuthAccount.create({
      data: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        userId
      }
    });
    return true;
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error('This account is already linked to another user');
    }
    throw err;
  }
}

async unlinkOAuthAccount(userId: string, provider: string): Promise<boolean> {
  // Prevent unlinking if it's the only auth method
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { oauthAccounts: true }
  });

  if (!user) return false;

  const hasPassword = !!user.passwordHash;
  const oauthCount = user.oauthAccounts.length;

  if (!hasPassword && oauthCount <= 1) {
    throw new Error('Cannot unlink last authentication method');
  }

  await prisma.oAuthAccount.deleteMany({
    where: { userId, provider }
  });
  return true;
}
```

### AuthContext Extension

```typescript
// Add to src/contexts/AuthContext.tsx interface

interface AuthContextType {
  // ... existing methods ...
  loginWithOAuth: (provider: 'google' | 'github') => void;
  linkOAuthAccount: (provider: 'google' | 'github') => void;
  unlinkOAuthAccount: (provider: 'google' | 'github') => Promise<void>;
  oauthAccounts: { provider: string; email: string }[];
}

// Add implementation:

const loginWithOAuth = useCallback((provider: 'google' | 'github') => {
  // Redirect to OAuth flow
  window.location.href = `/api/auth/${provider}`;
}, []);

const linkOAuthAccount = useCallback((provider: 'google' | 'github') => {
  // Redirect with linking intent
  window.location.href = `/api/auth/${provider}?intent=link`;
}, []);
```

---

## Feature 2: i18n Multi-Language UI

### Integration with Zustand Store

**Existing:** `language: 'de' | 'en'` in Zustand store (line 104-105)
**Extension:** Expand type, sync with i18next

```typescript
// Update src/store/index.ts

// Change from:
language: 'de' | 'en';

// To:
language: 'de' | 'en' | 'es' | 'fr' | 'zh' | 'ar';

// Add i18n sync effect in a new file:
// src/hooks/useI18nSync.ts
export function useI18nSync() {
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = ['ar', 'he'].includes(language) ? 'rtl' : 'ltr';
  }, [language]);
}
```

### File Structure

```
src/
├── i18n/
│   ├── index.ts              # i18next initialization
│   └── useTypedTranslation.ts # Type-safe t() hook
└── locales/
    ├── en/
    │   ├── common.json       # Shared: buttons, labels, nav
    │   ├── dashboard.json    # Dashboard-specific
    │   ├── analysis.json     # Analysis page
    │   ├── auth.json         # Login, register, password
    │   └── errors.json       # Error messages
    ├── de/
    │   └── (same structure)
    └── es/ fr/ zh/ ar/
        └── (same structure)
```

### Configuration

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'es', 'fr', 'zh', 'ar'],
    ns: ['common', 'dashboard', 'analysis', 'auth', 'errors'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    },
    interpolation: {
      escapeValue: false  // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'newshub-storage',
      lookupFromPathIndex: 0
    }
  });

export default i18n;
```

### No Backend Changes Required

UI translations are client-side only. Article translations (JSONB in NewsArticle) remain separate.

---

## Feature 3: Mobile Responsive Layouts

### Component Updates Required

| Component | Current | Mobile Changes |
|-----------|---------|----------------|
| `Layout` | Desktop sidebar | Collapsible drawer + bottom nav |
| `NewsFeed` | 3-col grid | 1-col stack |
| `HeroSection` | Horizontal stats | Vertical stack |
| `FilterPanel` | Side panel | Bottom sheet modal |
| `Navigation` | Sidebar | Hidden + hamburger |

### New Components

```
src/components/layout/
├── MobileNav.tsx           # Bottom tab bar (mobile only)
├── MobileDrawer.tsx        # Hamburger menu content
├── ResponsiveLayout.tsx    # Breakpoint-aware wrapper
└── BottomSheet.tsx         # Modal for filters on mobile
```

### Tailwind Breakpoint Strategy

```tsx
// Mobile-first pattern (already in use with Tailwind v4)
<div className="
  flex flex-col           // Mobile: vertical stack
  sm:flex-row             // 640px+: horizontal
  gap-4
  p-4 sm:p-6 lg:p-8       // Progressive padding
">
  <aside className="
    hidden lg:block        // Hide on mobile/tablet
    lg:w-64               // Desktop sidebar width
  ">
```

### No Backend Changes Required

---

## Feature 4: Social Media Sharing

### Leveraging Existing SharedContent Model

The `SharedContent` model already exists (schema line 245). New work:

1. Create share link endpoint
2. Server-side OG tag rendering for crawlers
3. Share button components

### New Route for OG Tags (Server-Side)

```typescript
// server/routes/share.ts
import { Router } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

// Bot User-Agent patterns
const BOT_PATTERNS = [
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'TelegramBot',
  'Slackbot',
  'Discordbot'
];

function isSocialBot(userAgent: string): boolean {
  return BOT_PATTERNS.some(bot => userAgent.includes(bot));
}

router.get('/share/:code', async (req, res) => {
  const share = await prisma.sharedContent.findUnique({
    where: { shareCode: req.params.code }
  });

  if (!share) {
    return res.redirect('/');
  }

  // Track view
  await prisma.sharedContent.update({
    where: { id: share.id },
    data: { viewCount: { increment: 1 } }
  });

  const userAgent = req.headers['user-agent'] || '';

  if (isSocialBot(userAgent)) {
    // Render HTML with OG tags for crawlers
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta property="og:title" content="${escapeHtml(share.title)}" />
        <meta property="og:description" content="${escapeHtml(share.description || '')}" />
        <meta property="og:image" content="${share.imageUrl || 'https://newshub.app/og-default.png'}" />
        <meta property="og:url" content="${process.env.APP_URL}/share/${share.shareCode}" />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${escapeHtml(share.title)}" />
        <meta name="twitter:description" content="${escapeHtml(share.description || '')}" />
        <meta name="twitter:image" content="${share.imageUrl || 'https://newshub.app/og-default.png'}" />
      </head>
      <body>
        <script>window.location.href = '/${share.contentType}/${share.contentId}';</script>
        <noscript><a href="/${share.contentType}/${share.contentId}">Click here</a></noscript>
      </body>
      </html>
    `);
  } else {
    // Human: redirect to SPA
    res.redirect(`/${share.contentType}/${share.contentId}`);
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export { router as shareRoutes };
```

---

## Feature 5: Article Comments

### Prisma Models

```prisma
// Add to prisma/schema.prisma

model Comment {
  id          String   @id @default(cuid())
  content     String   @db.VarChar(2000)

  // Article relation
  article     NewsArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  articleId   String

  // Author relation
  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId    String

  // Threading (one level only)
  parent      Comment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  parentId    String?
  replies     Comment[] @relation("CommentReplies")

  // Moderation
  isHidden    Boolean  @default(false)
  hiddenAt    DateTime?
  hiddenBy    String?
  reportCount Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  reactions   CommentReaction[]

  @@index([articleId, createdAt])
  @@index([authorId])
  @@index([parentId])
}

model CommentReaction {
  id          String   @id @default(cuid())
  type        String   // 'like' | 'insightful' | 'disagree'

  comment     Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  commentId   String

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String

  createdAt   DateTime @default(now())

  @@unique([commentId, userId, type])
  @@index([commentId])
}
```

### User and NewsArticle Model Extensions

```prisma
// Add to existing User model
model User {
  // ... existing fields ...

  // Comments (NEW)
  comments          Comment[]
  commentReactions  CommentReaction[]
}

// Add to existing NewsArticle model
model NewsArticle {
  // ... existing fields ...

  // Comments (NEW)
  comments    Comment[]
}
```

### Socket.IO Integration

**Existing WebSocket Interface (line 13-48):**

```typescript
// Add to ServerToClientEvents in server/services/websocketService.ts

export interface ServerToClientEvents {
  // ... existing events (news:new, event:new, etc.) ...

  // Comment events (NEW)
  'comment:new': (comment: CommentWithAuthor) => void;
  'comment:updated': (data: { id: string; content?: string; isHidden?: boolean }) => void;
  'comment:deleted': (data: { commentId: string; articleId: string }) => void;
  'comment:reaction': (data: { commentId: string; type: string; count: number }) => void;
}

export interface ClientToServerEvents {
  // ... existing events ...

  // Comment subscriptions (NEW)
  'subscribe:article-comments': (articleId: string) => void;
  'unsubscribe:article-comments': (articleId: string) => void;
}
```

### WebSocketService Extension

```typescript
// Add to server/services/websocketService.ts

// In setupEventHandlers(), add:
socket.on('subscribe:article-comments', (articleId: string) => {
  socket.join(`article:${articleId}:comments`);
  logger.debug(`Client ${clientId} subscribed to article comments: ${articleId}`);
});

socket.on('unsubscribe:article-comments', (articleId: string) => {
  socket.leave(`article:${articleId}:comments`);
});

// Add broadcast method:
broadcastComment(articleId: string, event: string, data: unknown): void {
  if (!this.io) return;
  this.io.to(`article:${articleId}:comments`).emit(event, data);
}
```

### Comment Service

```typescript
// server/services/commentService.ts
import { prisma } from '../db/prisma';
import { WebSocketService } from './websocketService';
import { CacheService, CACHE_TTL } from './cacheService';

export class CommentService {
  private static instance: CommentService;

  static getInstance(): CommentService {
    if (!CommentService.instance) {
      CommentService.instance = new CommentService();
    }
    return CommentService.instance;
  }

  async createComment(
    articleId: string,
    authorId: string,
    content: string,
    parentId?: string
  ) {
    // Rate limiting via Redis
    const cacheService = CacheService.getInstance();
    const rateLimitKey = `comment:rate:${authorId}`;
    const recentCount = await cacheService.get(rateLimitKey);

    if (recentCount && parseInt(recentCount) >= 10) {
      throw new Error('Too many comments. Please wait.');
    }

    // Validate parent exists and is not a reply (max 1 level)
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { parentId: true }
      });
      if (!parent) throw new Error('Parent comment not found');
      if (parent.parentId) throw new Error('Cannot reply to a reply');
    }

    const comment = await prisma.comment.create({
      data: { articleId, authorId, content, parentId },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    // Increment rate limit
    await cacheService.set(rateLimitKey, String((parseInt(recentCount || '0')) + 1), CACHE_TTL.MINUTE * 5);

    // Broadcast via WebSocket
    WebSocketService.getInstance().broadcastComment(
      articleId,
      'comment:new',
      comment
    );

    return comment;
  }

  async getCommentsForArticle(articleId: string, page = 1, limit = 50) {
    const comments = await prisma.comment.findMany({
      where: {
        articleId,
        parentId: null,  // Top-level only
        isHidden: false
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true }
        },
        replies: {
          where: { isHidden: false },
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { reactions: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return comments;
  }
}
```

### Frontend Hook

```typescript
// src/hooks/useComments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSocket } from '../services/socket';

export function useComments(articleId: string) {
  const queryClient = useQueryClient();

  // REST for initial load
  const query = useQuery({
    queryKey: ['comments', articleId],
    queryFn: () => fetch(`/api/comments?articleId=${articleId}`).then(r => r.json()),
    staleTime: 60_000
  });

  // Socket for real-time updates
  useEffect(() => {
    const socket = getSocket();
    socket.emit('subscribe:article-comments', articleId);

    socket.on('comment:new', (comment) => {
      queryClient.setQueryData(['comments', articleId], (old: Comment[]) => {
        if (!old) return [comment];
        if (comment.parentId) {
          // Add reply to parent
          return old.map(c =>
            c.id === comment.parentId
              ? { ...c, replies: [...(c.replies || []), comment] }
              : c
          );
        }
        return [comment, ...old];
      });
    });

    return () => {
      socket.emit('unsubscribe:article-comments', articleId);
      socket.off('comment:new');
    };
  }, [articleId, queryClient]);

  return query;
}
```

---

## Feature 6: Team Collaboration

### Prisma Models

```prisma
// Add to prisma/schema.prisma

model Team {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  description   String?
  logoUrl       String?

  settings      Json?    // Team preferences
  plan          String   @default("free")  // free | pro | enterprise

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  members       TeamMember[]
  invitations   TeamInvitation[]
  bookmarks     TeamBookmark[]
  feeds         TeamFeed[]

  @@index([slug])
}

model TeamMember {
  id          String   @id @default(cuid())

  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId      String

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String

  role        String   @default("member")  // owner | admin | member | viewer

  joinedAt    DateTime @default(now())

  @@unique([teamId, userId])
  @@index([userId])
  @@index([teamId])
}

model TeamInvitation {
  id          String   @id @default(cuid())

  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId      String

  email       String
  role        String   @default("member")

  invitedBy   String   // User ID
  token       String   @unique
  expiresAt   DateTime

  acceptedAt  DateTime?
  createdAt   DateTime @default(now())

  @@index([email])
  @@index([token])
}

model TeamBookmark {
  id          String   @id @default(cuid())

  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId      String

  articleId   String
  addedBy     String   // User ID
  note        String?

  createdAt   DateTime @default(now())

  @@unique([teamId, articleId])
  @@index([teamId])
}

model TeamFeed {
  id          String   @id @default(cuid())
  name        String

  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId      String

  filters     Json     // Saved filter configuration
  createdBy   String   // User ID

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([teamId])
}
```

### User Model Extension

```prisma
// Add to existing User model
model User {
  // ... existing fields ...

  // Team membership (NEW)
  teamMemberships   TeamMember[]
  activeTeamId      String?
}
```

### Team Authorization Middleware

```typescript
// server/middleware/teamAuth.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

const ROLE_HIERARCHY: Record<TeamRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4
};

export function requireTeamRole(...allowedRoles: TeamRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { teamId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    const userRoleLevel = ROLE_HIERARCHY[membership.role as TeamRole] || 0;
    const requiredLevel = Math.min(...allowedRoles.map(r => ROLE_HIERARCHY[r]));

    if (userRoleLevel < requiredLevel) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    (req as any).teamMember = membership;
    next();
  };
}

// Usage example:
// router.delete('/teams/:teamId', authMiddleware, requireTeamRole('owner'), deleteTeam);
// router.post('/teams/:teamId/bookmarks', authMiddleware, requireTeamRole('member', 'admin', 'owner'), addBookmark);
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `AuthService` | JWT + OAuth + token blacklist | Prisma, Redis, OAuthAccount model |
| `OAuthAccount model` | Store linked OAuth providers | User model |
| `i18n/index.ts` | Translation loading + detection | Zustand (language state) |
| `MobileNav` | Bottom navigation for mobile | React Router |
| `MobileDrawer` | Hamburger menu content | React Router, AuthContext |
| `ShareService` | Create share links, track clicks | SharedContent model (existing) |
| `CommentService` | CRUD comments, rate limit | Comment model, WebSocket, Redis |
| `TeamService` | Team CRUD, invitations | Team/TeamMember models, Email |
| `requireTeamRole` | Role-based access control | TeamMember, authMiddleware |

---

## Build Order (Dependency-Based)

Features must be built in this order due to dependencies:

```
                    +-------------------+
                    |   1. i18n Setup   |  No dependencies
                    |   (2-3 days)      |
                    +--------+----------+
                             |
            +----------------+----------------+
            |                                 |
            v                                 v
+-------------------+               +-------------------+
| 2. Mobile Resp.   |               | 3. OAuth Backend  |
| (3-4 days)        |               | (2-3 days)        |
| No dependencies   |               | No dependencies   |
+-------------------+               +--------+----------+
                                             |
                                             v
                                  +-------------------+
                                  | 4. OAuth Frontend |
                                  | (2 days)          |
                                  | Depends on: #3    |
                                  +--------+----------+
                                             |
                    +------------------------+------------------------+
                    |                                                 |
                    v                                                 v
         +-------------------+                              +-------------------+
         | 5. Social Sharing |                              | 6. Comments       |
         | (2-3 days)        |                              | Backend + UI      |
         | Depends on: #4    |                              | (6-8 days)        |
         | (auth optional)   |                              | Depends on: #4    |
         +-------------------+                              +--------+----------+
                                                                      |
                                                                      v
                                                           +-------------------+
                                                           | 7. Team Collab.   |
                                                           | (7-9 days)        |
                                                           | Depends on: #4,#6 |
                                                           +-------------------+
```

### Detailed Build Order

| Order | Feature | Days | Dependencies | Critical Path? |
|-------|---------|------|--------------|----------------|
| 1 | i18n Setup | 2-3 | None | Yes - enables localized work |
| 2 | Mobile Responsive | 3-4 | None | No - parallel track |
| 3 | OAuth Backend | 2-3 | None | Yes - unblocks frontend |
| 4 | OAuth Frontend | 2 | #3 | Yes - unblocks auth features |
| 5 | Social Sharing | 2-3 | #4 (optional) | No - can proceed without auth |
| 6 | Comments | 6-8 | #4 | Yes - requires auth |
| 7 | Team Collaboration | 7-9 | #4, #6 | End of critical path |

**Total Estimated: 24-32 days**

### Parallelization Opportunities

- **Parallel Track A:** i18n (1) + Mobile Responsive (2) = 5-7 days
- **Parallel Track B:** OAuth Backend (3) during Track A
- **After OAuth:** Social Sharing (5) can parallelize with Comments (6)
- **Final:** Team Collaboration (7) must be last

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: OAuth Tokens in localStorage
**What:** Storing OAuth access tokens in frontend localStorage.
**Why bad:** XSS can steal tokens, OAuth providers don't recommend this.
**Instead:** Store in httpOnly cookies or keep server-side only. Frontend only gets NewsHub JWT.

### Anti-Pattern 2: Blocking Translation Loads
**What:** `await i18n.loadNamespaces('analysis')` before rendering.
**Why bad:** Slow initial render, poor UX.
**Instead:** Use Suspense with loading fallback, show untranslated text briefly.

### Anti-Pattern 3: Polling for Comments
**What:** `setInterval(() => fetchComments(), 5000)`.
**Why bad:** Wastes bandwidth, delayed updates, inconsistent with Socket.IO for news.
**Instead:** Use existing WebSocket infrastructure, subscribe to article rooms.

### Anti-Pattern 4: N+1 Comment Queries
**What:** Fetch comments, then loop to fetch replies one-by-one.
**Why bad:** 100 comments = 101 database queries.
**Instead:** Single query with `include: { replies: true }`, build tree client-side.

### Anti-Pattern 5: Team Role in JWT Claims
**What:** `jwt.sign({ userId, teamRole: 'admin' })`.
**Why bad:** Team membership changes won't reflect until JWT expires.
**Instead:** Fetch team membership per-request, cache briefly in Redis.

---

## Scalability Considerations

| Concern | At 1K users | At 100K users | At 1M users |
|---------|------------|--------------|-------------|
| OAuth | Passport in-memory OK | Redis session store | Rate limit per provider |
| i18n | Bundled JSON | CDN-hosted locales | Edge-cached translations |
| Comments | PostgreSQL | Read replicas | Sharding by article ID |
| Teams | Single DB | Single DB | Tenant isolation schema |
| Real-time | Single Socket.IO | Redis adapter | Socket.IO cluster |
| Share analytics | Sync writes | Async queue | Event stream (Kafka) |

---

## Sources

- [Passport.js Google OAuth20](https://www.passportjs.org/packages/passport-google-oauth20/)
- [Passport.js GitHub OAuth2](https://github.com/jaredhanson/passport-oauth2)
- [How to Implement OAuth2 in Express](https://oneuptime.com/blog/post/2026-02-02-express-oauth2/view)
- [react-i18next Complete Guide 2026](https://intlpull.com/blog/react-i18next-internationalization-guide-2026)
- [i18next GitHub](https://github.com/i18next/react-i18next)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Tailwind CSS Best Practices 2026](https://samioda.com/en/blog/tailwind-css-best-practices)
- [Open Graph Tags 2026](https://www.imarkinfotech.com/open-graph-tags-boost-social-sharing-and-seo-in-2026/)
- [Meta Tags & Open Graph Guide](https://vladimirsiedykh.com/blog/meta-tags-open-graph-complete-implementation-guide-nextjs-react-helmet)
- [Multi-Tenancy for B2B SaaS](https://clerk.com/blog/what-is-multi-tenancy-and-why-it-matters-for-B2B-SaaS)
- [Real-Time Chat with Socket.io and PostgreSQL](https://strapi.io/blog/real-time-chat-application-using-strapi-next-socket-io-and-postgre-sql)
- [Socket.IO Rooms Documentation](https://socket.io/docs/v4/rooms/)
