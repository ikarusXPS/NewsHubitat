# Phase 28: Team Collaboration - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 16 (new/modified files)
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/services/teamService.ts` | service | CRUD | `server/services/commentService.ts` | exact |
| `server/routes/teams.ts` | route | request-response | `server/routes/comments.ts` | exact |
| `server/middleware/teamAuth.ts` | middleware | request-response | `server/services/authService.ts` (authMiddleware) | exact |
| `prisma/schema.prisma` (Team models) | model | CRUD | `prisma/schema.prisma` (Comment model) | exact |
| `src/pages/TeamDashboard.tsx` | page | request-response | `src/pages/Profile.tsx` | role-match |
| `src/pages/TeamSettings.tsx` | page | request-response | `src/pages/Profile.tsx` | role-match |
| `src/components/teams/TeamSwitcher.tsx` | component | request-response | `src/components/LanguageSwitcher.tsx` | partial |
| `src/components/teams/TeamCard.tsx` | component | display | `src/components/comments/CommentCard.tsx` | role-match |
| `src/components/teams/TeamBookmarkCard.tsx` | component | display | `src/components/comments/CommentCard.tsx` | exact |
| `src/components/teams/TeamMemberList.tsx` | component | display | `src/components/community/Leaderboard.tsx` | partial |
| `src/components/teams/InviteModal.tsx` | component | form | `src/components/AuthModal.tsx` | exact |
| `src/components/teams/CreateTeamModal.tsx` | component | form | `src/components/AuthModal.tsx` | exact |
| `src/hooks/useTeams.ts` | hook | CRUD | `src/hooks/useComments.ts` | exact |
| `src/hooks/useTeamBookmarks.ts` | hook | event-driven | `src/hooks/useComments.ts` | exact |
| `src/hooks/useTeamMembers.ts` | hook | CRUD | `src/hooks/useComments.ts` | role-match |
| `src/store/teamSlice.ts` | store | state | `src/store/index.ts` | exact |

## Pattern Assignments

### `server/services/teamService.ts` (service, CRUD)

**Analog:** `server/services/commentService.ts`

**Imports pattern** (lines 1-11):
```typescript
/**
 * Team Service
 * Business logic for team CRUD, invites, and shared bookmarks
 */

import { prisma } from '../db/prisma';
import { WebSocketService } from './websocketService';
import { EmailService } from './emailService';
import { generateSecureToken, hashToken, getTokenExpiry, isTokenExpired } from '../utils/tokenUtils';
import logger from '../utils/logger';
```

**Singleton pattern** (lines 12-22):
```typescript
export class TeamService {
  private static instance: TeamService;

  private constructor() {}

  static getInstance(): TeamService {
    if (!TeamService.instance) {
      TeamService.instance = new TeamService();
    }
    return TeamService.instance;
  }
```

**Create with transaction pattern** (from commentService lines 75-120, adapted):
```typescript
async createTeam(userId: string, name: string, description?: string): Promise<Team> {
  // Validate name (Claude's discretion: 3-50 chars)
  if (name.length < 3 || name.length > 50) {
    throw new Error('Team name must be 3-50 characters');
  }

  // Check team limit per user (Claude's discretion: max 10)
  const membershipCount = await prisma.teamMember.count({
    where: { userId },
  });
  if (membershipCount >= 10) {
    throw new Error('Maximum 10 teams per user');
  }

  // Transaction: create team + add creator as owner
  const team = await prisma.$transaction(async (tx) => {
    const newTeam = await tx.team.create({
      data: { name, description },
    });

    await tx.teamMember.create({
      data: {
        teamId: newTeam.id,
        userId,
        role: 'owner',
      },
    });

    return newTeam;
  });

  return team;
}
```

**WebSocket broadcast pattern** (from commentService lines 142-146):
```typescript
// Broadcast to team room via WebSocket
const wsService = WebSocketService.getInstance();
wsService.broadcastTeamBookmark(teamId, bookmark);
```

---

### `server/routes/teams.ts` (route, request-response)

**Analog:** `server/routes/comments.ts`

**Imports pattern** (lines 1-11):
```typescript
/**
 * Team API Routes
 * CRUD endpoints for teams, invites, and shared bookmarks
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../services/authService';
import { TeamService } from '../services/teamService';
import { teamMemberMiddleware, requireTeamRole } from '../middleware/teamAuth';
```

**AuthRequest interface pattern** (lines 12-14):
```typescript
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}
```

**Zod validation schemas pattern** (lines 19-34):
```typescript
const createTeamSchema = z.object({
  name: z.string().min(3, 'Team name must be at least 3 characters').max(50, 'Team name must be 50 characters or less'),
  description: z.string().max(500, 'Description too long').optional(),
});

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Role must be admin or member' }),
  }),
});

function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}
```

**POST handler with validation pattern** (lines 44-90):
```typescript
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = createTeamSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: formatZodError(result.error),
      });
      return;
    }

    const userId = req.user!.userId;
    const { name, description } = result.data;

    const teamService = TeamService.getInstance();
    const team = await teamService.createTeam(userId, name, description);

    res.status(201).json({
      success: true,
      data: team,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create team';

    // Handle specific errors
    if (message.includes('Maximum 10 teams')) {
      res.status(400).json({ success: false, error: message });
      return;
    }

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});
```

**GET list handler pattern** (lines 96-121):
```typescript
router.get('/:teamId/bookmarks', authMiddleware, teamMemberMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;

    const teamService = TeamService.getInstance();
    const bookmarks = await teamService.getTeamBookmarks(teamId);

    res.status(200).json({
      success: true,
      data: bookmarks,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch bookmarks',
    });
  }
});
```

---

### `server/middleware/teamAuth.ts` (middleware, request-response)

**Analog:** `server/services/authService.ts` (authMiddleware function, lines 559-603)

**Imports pattern**:
```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

type TeamRole = 'owner' | 'admin' | 'member';

interface TeamRequest extends Request {
  user?: { userId: string; email: string };
  teamMember?: { teamId: string; userId: string; role: TeamRole };
}
```

**Middleware function pattern** (adapted from authMiddleware lines 559-603):
```typescript
export async function teamMemberMiddleware(
  req: TeamRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { teamId } = req.params;
  const userId = req.user!.userId;

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    include: { team: { select: { deletedAt: true } } },
  });

  if (!membership || membership.team.deletedAt) {
    res.status(403).json({ success: false, error: 'Not a team member' });
    return;
  }

  req.teamMember = {
    teamId: membership.teamId,
    userId: membership.userId,
    role: membership.role as TeamRole,
  };
  next();
}
```

**Role check middleware factory pattern**:
```typescript
export function requireTeamRole(...roles: TeamRole[]) {
  return (req: TeamRequest, res: Response, next: NextFunction): void => {
    if (!req.teamMember || !roles.includes(req.teamMember.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
```

---

### `prisma/schema.prisma` - Team Models (model, CRUD)

**Analog:** `prisma/schema.prisma` (Comment model, lines 338-363)

**Team model pattern**:
```prisma
model Team {
  id          String       @id @default(cuid())
  name        String       @db.VarChar(50)
  description String?      @db.VarChar(500)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?    // Soft delete

  members     TeamMember[]
  bookmarks   TeamBookmark[]
  invites     TeamInvite[]

  @@index([deletedAt])
}
```

**TeamMember model pattern** (similar to UserBadge, lines 309-321):
```prisma
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
```

**TeamBookmark model pattern** (similar to Bookmark, lines 132-141):
```prisma
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
```

**TeamInvite model pattern** (similar to verification token fields in User):
```prisma
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

**User relation addition**:
```prisma
// Add to User model
teamMemberships TeamMember[]
```

---

### `src/hooks/useTeams.ts` (hook, CRUD)

**Analog:** `src/hooks/useComments.ts`

**Imports pattern** (lines 1-6):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../../server/services/websocketService';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

**Fetch function pattern** (lines 31-36):
```typescript
async function fetchMyTeams(token: string): Promise<Team[]> {
  const response = await fetch('/api/teams', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch teams');
  const data = await response.json();
  return data.data;
}
```

**useQuery hook pattern** (lines 72-81):
```typescript
export function useTeams() {
  const { token } = useAuth();

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => fetchMyTeams(token!),
    staleTime: 60_000,
    enabled: !!token,
  });

  return { teams: teams || [], isLoading };
}
```

**useMutation with cache invalidation pattern** (lines 122-170):
```typescript
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description, token }: { name: string; description?: string; token: string }) => {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create team');
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
```

---

### `src/hooks/useTeamBookmarks.ts` (hook, event-driven)

**Analog:** `src/hooks/useComments.ts`

**WebSocket subscription pattern** (lines 83-110):
```typescript
export function useTeamBookmarks(teamId: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const { token } = useAuth();

  const { data: bookmarks, isLoading } = useQuery({
    queryKey: ['team-bookmarks', teamId],
    queryFn: () => fetchTeamBookmarks(teamId, token!),
    staleTime: 60_000,
    enabled: !!teamId && !!token,
  });

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!teamId || !token) return;

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('authenticate', token);
      socket.emit('subscribe:team', teamId);
    });

    socket.on('team:bookmark:new', ({ teamId: eventTeamId }) => {
      if (eventTeamId === teamId) {
        queryClient.invalidateQueries({ queryKey: ['team-bookmarks', teamId] });
      }
    });

    return () => {
      socket.emit('unsubscribe:team', teamId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [teamId, token, queryClient]);

  return { bookmarks: bookmarks || [], isLoading };
}
```

---

### `src/components/teams/InviteModal.tsx` (component, form)

**Analog:** `src/components/AuthModal.tsx`

**Modal structure pattern** (lines 148-178):
```typescript
export function InviteModal({ isOpen, onClose, teamId }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-md rounded-lg p-6 border border-gray-700 bg-gray-800"
      )}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-white">Invite Member</h2>
        {/* Form content */}
      </div>
    </div>
  );
}
```

**Form submit pattern** (lines 120-141):
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setIsSubmitting(true);

  try {
    await inviteMember({ teamId, email, role, token });
    onClose();
    setEmail('');
    setRole('member');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
  } finally {
    setIsSubmitting(false);
  }
};
```

**Input field pattern** (lines 228-238):
```typescript
<div>
  <label className="mb-1 block text-sm text-gray-400">Email</label>
  <div className="relative">
    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="member@example.com"
      required
      className="w-full rounded-lg border border-gray-600 bg-gray-700 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
    />
  </div>
</div>
```

---

### `src/components/teams/TeamBookmarkCard.tsx` (component, display)

**Analog:** `src/components/comments/CommentCard.tsx`

**Card structure pattern** (lines 119-143):
```typescript
export function TeamBookmarkCard({ bookmark, teamId, canRemove }: TeamBookmarkCardProps) {
  const { t } = useTranslation();
  const { mutate: removeBookmark } = useRemoveTeamBookmark(teamId);

  const handleRemove = () => {
    if (!confirm(t('teams.bookmarks.removeConfirm', 'Remove this bookmark from the team?'))) return;

    const token = localStorage.getItem('newshub-auth-token');
    if (!token) return;

    removeBookmark({ bookmarkId: bookmark.id, token });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-4 rounded-lg"
    >
      {/* Header with user attribution */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center text-xs font-bold flex-shrink-0">
          {bookmark.addedByUser.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-gray-500">
            Added by {bookmark.addedByUser.name}
          </span>
        </div>
      </div>

      {/* Article content */}
      <a href={bookmark.article.url} className="block hover:text-[#00f0ff]">
        <h3 className="font-semibold">{bookmark.article.title}</h3>
      </a>

      {/* Actions */}
      {canRemove && (
        <button onClick={handleRemove} className="text-gray-400 hover:text-[#ff0044]">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}
```

---

### `src/pages/TeamDashboard.tsx` (page, request-response)

**Analog:** `src/pages/Profile.tsx`

**Page structure pattern** (lines 203-264):
```typescript
export function TeamDashboard() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { language } = useAppStore();

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId!),
    enabled: !!teamId,
  });

  // Not authenticated - show login prompt
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {/* Login prompt similar to Profile.tsx lines 127-183 */}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white font-mono flex items-center gap-3">
          <Users className="h-6 w-6 text-[#00f0ff]" />
          <span className="gradient-text-cyber">{team?.name}</span>
        </h1>
      </div>

      {/* Team Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel rounded-xl p-4 hover:border-[#00f0ff]/30 transition-colors">
          {/* Members count */}
        </div>
        <div className="glass-panel rounded-xl p-4 hover:border-[#00f0ff]/30 transition-colors">
          {/* Bookmarks count */}
        </div>
      </div>

      {/* Team Bookmarks Section */}
      <div className="glass-panel rounded-xl p-6">
        <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">
          {language === 'de' ? 'Team Lesezeichen' : 'Team Bookmarks'}
        </h3>
        {/* Bookmark list */}
      </div>

      {/* Quick Actions */}
      <div className="glass-panel rounded-xl overflow-hidden">
        {/* Action buttons similar to Profile.tsx lines 285-335 */}
      </div>
    </div>
  );
}
```

---

### `src/store/teamSlice.ts` (store, state)

**Analog:** `src/store/index.ts`

**Zustand store pattern** (lines 93-391):
```typescript
// Add to existing AppState interface or create separate slice
interface TeamState {
  activeTeamId: string | null;
  setActiveTeam: (teamId: string | null) => void;
}

// Integration into existing store:
// Add to AppState interface
activeTeamId: string | null;
setActiveTeam: (teamId: string | null) => void;

// Add to create() implementation
activeTeamId: null,
setActiveTeam: (teamId) => set({ activeTeamId: teamId }),

// Add to partialize for persistence
activeTeamId: state.activeTeamId,
```

---

## Shared Patterns

### Authentication Middleware
**Source:** `server/services/authService.ts` (lines 559-603)
**Apply to:** All team routes requiring authentication

```typescript
export async function authMiddleware(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const authService = AuthService.getInstance();
  const payload = authService.verifyToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  // Add user info to request
  (req as unknown as { user: JWTPayload }).user = payload;
  next();
}
```

### Secure Token Generation
**Source:** `server/utils/tokenUtils.ts` (lines 12-16)
**Apply to:** Team invite token creation

```typescript
export function generateSecureToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}
```

### Token Expiry
**Source:** `server/utils/tokenUtils.ts` (lines 48-58)
**Apply to:** Team invite 7-day expiry (per D-02)

```typescript
export function getTokenExpiry(hoursFromNow: number): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

export function isTokenExpired(expiry: Date | null): boolean {
  if (!expiry) return true;
  return new Date() > expiry;
}
```

### Email Template
**Source:** `server/services/emailService.ts` (lines 431-488)
**Apply to:** Team invite email

```typescript
async sendTeamInvite(
  email: string,
  teamName: string,
  inviterName: string,
  inviteUrl: string
): Promise<boolean> {
  const subject = `You're invited to join ${teamName} on NewsHub`;
  const html = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f; font-family: -apple-system, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; background: #111118; border-radius: 12px; padding: 32px; border: 1px solid #00f0ff;">
    <h1 style="color: #00f0ff; margin: 0 0 16px;">Team Invitation</h1>
    <p style="color: #e5e7eb;">
      <strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on NewsHub.
    </p>
    <a href="${inviteUrl}"
       style="display: inline-block; background: #00f0ff; color: #0a0a0f; padding: 12px 24px;
              border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
      Join Team
    </a>
    <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
      This invitation expires in 7 days.
    </p>
  </div>
</body>
</html>
  `;

  return this.send(email, subject, html);
}
```

### WebSocket Room Subscription
**Source:** `server/services/websocketService.ts` (lines 162-171)
**Apply to:** Team bookmark real-time updates

```typescript
// Add to ClientToServerEvents interface
'subscribe:team': (teamId: string) => void;
'unsubscribe:team': (teamId: string) => void;

// Add to ServerToClientEvents interface
'team:bookmark:new': (data: { teamId: string; bookmark: TeamBookmarkWithArticle }) => void;

// Handler implementation
socket.on('subscribe:team', async (teamId) => {
  // Verify membership before allowing subscription
  const userId = socket.data.userId;
  if (!userId) return;

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });

  if (membership) {
    socket.join(`team:${teamId}`);
    logger.debug(`Client ${socket.id} joined team:${teamId}`);
  }
});
```

### API Response Format
**Source:** `server/routes/comments.ts` (lines 67-70)
**Apply to:** All team API responses

```typescript
res.status(201).json({
  success: true,
  data: result,
});
```

### Error Response Format
**Source:** `server/routes/comments.ts` (lines 85-89)
**Apply to:** All team API error responses

```typescript
res.status(500).json({
  success: false,
  error: message,
});
```

### Zod Error Formatting
**Source:** `server/routes/comments.ts` (lines 36-38)
**Apply to:** All team route validation

```typescript
function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}
```

### TanStack Query with Stale Time
**Source:** `src/hooks/useComments.ts` (lines 76-80)
**Apply to:** All team data fetching hooks

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['team-bookmarks', teamId],
  queryFn: () => fetchTeamBookmarks(teamId, token!),
  staleTime: 60_000,
  enabled: !!teamId && !!token,
});
```

### Mutation with Cache Invalidation
**Source:** `src/hooks/useComments.ts` (lines 125-170)
**Apply to:** All team mutation hooks

```typescript
return useMutation({
  mutationFn: (data) => apiCall(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  },
});
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| - | - | - | All files have close analogs in the existing codebase |

## Metadata

**Analog search scope:** `server/services/`, `server/routes/`, `server/middleware/`, `src/hooks/`, `src/components/`, `src/pages/`, `src/store/`, `prisma/`
**Files scanned:** 47
**Pattern extraction date:** 2026-04-25
