/**
 * Team API Routes
 * CRUD endpoints for teams, invites, members, and shared bookmarks
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../services/authService';
import { TeamService } from '../services/teamService';
import { teamMemberMiddleware, requireTeamRole, TeamRequest } from '../middleware/teamAuth';
import { teamInviteLimiter } from '../middleware/rateLimiter';
import { prisma } from '../db/prisma';
import { WebSocketService } from '../services/websocketService';

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTeamSchema = z.object({
  name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(50, 'Team name must be 50 characters or less'),
  description: z.string().max(500, 'Description too long').optional(),
});

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Role must be admin or member' }),
  }),
});

const addBookmarkSchema = z.object({
  articleId: z.string().min(1, 'Article ID required'),
  note: z.string().max(500, 'Note too long').optional(),
});

const updateTeamSchema = z.object({
  name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(50, 'Team name must be 50 characters or less')
    .optional(),
  description: z.string().max(500, 'Description too long').optional().nullable(),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Role must be admin or member' }),
  }),
});

function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}

// ============================================================================
// INVITE ACCEPTANCE (must be before /:teamId routes for proper specificity)
// ============================================================================

/**
 * POST /api/teams/accept-invite/:token
 * Accept team invite (auth required)
 * Note: Route is at /api/teams level, not under /:teamId
 */
router.post('/accept-invite/:token', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const userId = req.user!.userId;

    if (!token) {
      res.status(400).json({ success: false, error: 'Invite token required' });
      return;
    }

    const teamService = TeamService.getInstance();
    const team = await teamService.acceptInvite(token, userId);

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to accept invite';

    if (message.includes('Invalid') || message.includes('expired') || message.includes('already used')) {
      res.status(400).json({ success: false, error: message });
      return;
    }

    if (message.includes('no longer exists') || message.includes('Already a team member')) {
      res.status(400).json({ success: false, error: message });
      return;
    }

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// ============================================================================
// TEAM CRUD
// ============================================================================

/**
 * POST /api/teams
 * Create new team (auth required)
 */
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

    if (message.includes('Maximum 10 teams')) {
      res.status(400).json({ success: false, error: message });
      return;
    }

    if (message.includes('3-50 characters')) {
      res.status(400).json({ success: false, error: message });
      return;
    }

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/teams
 * List user's teams (auth required)
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const teamService = TeamService.getInstance();
    const teams = await teamService.getUserTeams(userId);

    res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch teams',
    });
  }
});

/**
 * GET /api/teams/:teamId
 * Get single team (member required)
 */
router.get('/:teamId', authMiddleware, teamMemberMiddleware, async (req: TeamRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const userId = req.user!.userId;

    const teamService = TeamService.getInstance();
    const team = await teamService.getTeam(teamId, userId);

    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch team',
    });
  }
});

/**
 * PATCH /api/teams/:teamId
 * Update team (admin+ required)
 */
router.patch(
  '/:teamId',
  authMiddleware,
  teamMemberMiddleware,
  requireTeamRole('owner', 'admin'),
  async (req: TeamRequest, res: Response) => {
    try {
      const result = updateTeamSchema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: formatZodError(result.error),
        });
        return;
      }

      const { teamId } = req.params;
      const { name, description } = result.data;

      const team = await prisma.team.update({
        where: { id: teamId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        },
      });

      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update team',
      });
    }
  }
);

/**
 * DELETE /api/teams/:teamId
 * Delete team (owner required)
 */
router.delete(
  '/:teamId',
  authMiddleware,
  teamMemberMiddleware,
  requireTeamRole('owner'),
  async (req: TeamRequest, res: Response) => {
    try {
      const { teamId } = req.params;
      const userId = req.user!.userId;

      const teamService = TeamService.getInstance();
      await teamService.deleteTeam(teamId, userId);

      res.status(200).json({
        success: true,
        message: 'Team deleted',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete team',
      });
    }
  }
);

// ============================================================================
// TEAM MEMBERS
// ============================================================================

/**
 * GET /api/teams/:teamId/members
 * List team members (member required)
 */
router.get(
  '/:teamId/members',
  authMiddleware,
  teamMemberMiddleware,
  async (req: TeamRequest, res: Response) => {
    try {
      const { teamId } = req.params;

      const teamService = TeamService.getInstance();
      const members = await teamService.getTeamMembers(teamId);

      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch members',
      });
    }
  }
);

/**
 * PATCH /api/teams/:teamId/members/:userId
 * Update member role (owner required, cannot change owner role)
 */
router.patch(
  '/:teamId/members/:userId',
  authMiddleware,
  teamMemberMiddleware,
  requireTeamRole('owner'),
  async (req: TeamRequest, res: Response) => {
    try {
      const result = updateMemberRoleSchema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: formatZodError(result.error),
        });
        return;
      }

      const { teamId, userId: targetUserId } = req.params;
      const { role } = result.data;

      // Cannot change owner's role
      const targetMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: targetUserId } },
      });

      if (!targetMember) {
        res.status(404).json({ success: false, error: 'Member not found' });
        return;
      }

      if (targetMember.role === 'owner') {
        res.status(400).json({ success: false, error: 'Cannot change owner role' });
        return;
      }

      await prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId: targetUserId } },
        data: { role },
      });

      res.status(200).json({
        success: true,
        message: 'Role updated',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update role',
      });
    }
  }
);

/**
 * DELETE /api/teams/:teamId/members/:userId
 * Remove member or leave team (admin+ to remove others, any member to leave)
 */
router.delete(
  '/:teamId/members/:userId',
  authMiddleware,
  teamMemberMiddleware,
  async (req: TeamRequest, res: Response) => {
    try {
      const { teamId, userId: targetUserId } = req.params;
      const actorUserId = req.user!.userId;

      const teamService = TeamService.getInstance();
      await teamService.removeMember(teamId, targetUserId, actorUserId);

      res.status(200).json({
        success: true,
        message: 'Member removed',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member';

      if (message.includes('cannot') || message.includes('Cannot')) {
        res.status(403).json({ success: false, error: message });
        return;
      }

      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

// ============================================================================
// TEAM INVITES
// ============================================================================

/**
 * POST /api/teams/:teamId/invite
 * Send email invite (admin+ required, rate limited)
 */
router.post(
  '/:teamId/invite',
  authMiddleware,
  teamMemberMiddleware,
  requireTeamRole('owner', 'admin'),
  teamInviteLimiter,
  async (req: TeamRequest, res: Response) => {
    try {
      const result = inviteSchema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: formatZodError(result.error),
        });
        return;
      }

      const { teamId } = req.params;
      const userId = req.user!.userId;
      const { email, role } = result.data;

      const teamService = TeamService.getInstance();
      await teamService.createInvite(teamId, userId, email, role);

      res.status(201).json({
        success: true,
        message: 'Invite sent',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invite';

      // Same error for member/pending to prevent enumeration (T-28-04)
      if (message.includes('could not be sent') || message.includes('already a team member') || message.includes('Pending invite')) {
        res.status(400).json({ success: false, error: 'Cannot invite this email' });
        return;
      }

      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * GET /api/teams/:teamId/invites
 * List pending invites (admin+ required)
 */
router.get(
  '/:teamId/invites',
  authMiddleware,
  teamMemberMiddleware,
  requireTeamRole('owner', 'admin'),
  async (req: TeamRequest, res: Response) => {
    try {
      const { teamId } = req.params;

      const invites = await prisma.teamInvite.findMany({
        where: {
          teamId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: invites,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch invites',
      });
    }
  }
);

/**
 * DELETE /api/teams/:teamId/invites/:inviteId
 * Cancel pending invite (admin+ required)
 */
router.delete(
  '/:teamId/invites/:inviteId',
  authMiddleware,
  teamMemberMiddleware,
  requireTeamRole('owner', 'admin'),
  async (req: TeamRequest, res: Response) => {
    try {
      const { teamId, inviteId } = req.params;

      const invite = await prisma.teamInvite.findFirst({
        where: { id: inviteId, teamId },
      });

      if (!invite) {
        res.status(404).json({ success: false, error: 'Invite not found' });
        return;
      }

      await prisma.teamInvite.delete({
        where: { id: inviteId },
      });

      res.status(200).json({
        success: true,
        message: 'Invite cancelled',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to cancel invite',
      });
    }
  }
);

// ============================================================================
// TEAM BOOKMARKS
// ============================================================================

/**
 * GET /api/teams/:teamId/bookmarks
 * List team bookmarks (member required)
 */
router.get(
  '/:teamId/bookmarks',
  authMiddleware,
  teamMemberMiddleware,
  async (req: TeamRequest, res: Response) => {
    try {
      const { teamId } = req.params;

      const bookmarks = await prisma.teamBookmark.findMany({
        where: { teamId },
        orderBy: { createdAt: 'desc' },
      });

      // Fetch user info for attribution
      const userIds = [...new Set(bookmarks.map((b) => b.addedBy))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, avatarUrl: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      const enrichedBookmarks = bookmarks.map((b) => ({
        id: b.id,
        teamId: b.teamId,
        articleId: b.articleId,
        addedBy: b.addedBy,
        addedByUser: userMap.get(b.addedBy) || { id: b.addedBy, name: 'Unknown', avatarUrl: null },
        note: b.note,
        createdAt: b.createdAt,
      }));

      res.status(200).json({
        success: true,
        data: enrichedBookmarks,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch bookmarks',
      });
    }
  }
);

/**
 * POST /api/teams/:teamId/bookmarks
 * Add bookmark to team (member required, D-05 direct add)
 */
router.post(
  '/:teamId/bookmarks',
  authMiddleware,
  teamMemberMiddleware,
  async (req: TeamRequest, res: Response) => {
    try {
      const result = addBookmarkSchema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: formatZodError(result.error),
        });
        return;
      }

      const { teamId } = req.params;
      const userId = req.user!.userId;
      const { articleId, note } = result.data;

      // Upsert pattern for idempotency
      const bookmark = await prisma.teamBookmark.upsert({
        where: { teamId_articleId: { teamId, articleId } },
        update: {}, // No update if exists
        create: {
          teamId,
          articleId,
          addedBy: userId,
          note: note || null,
        },
      });

      // Get user info for response and WebSocket
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatarUrl: true },
      });

      const enrichedBookmark = {
        id: bookmark.id,
        teamId: bookmark.teamId,
        articleId: bookmark.articleId,
        addedBy: bookmark.addedBy,
        addedByUser: user || { id: userId, name: 'Unknown', avatarUrl: null },
        note: bookmark.note,
        createdAt: bookmark.createdAt,
      };

      // Broadcast via WebSocket
      const wsService = WebSocketService.getInstance();
      wsService.broadcastTeamBookmark(teamId, enrichedBookmark);

      res.status(201).json({
        success: true,
        data: enrichedBookmark,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add bookmark',
      });
    }
  }
);

/**
 * DELETE /api/teams/:teamId/bookmarks/:bookmarkId
 * Remove bookmark (D-06: adder or admin can remove)
 */
router.delete(
  '/:teamId/bookmarks/:bookmarkId',
  authMiddleware,
  teamMemberMiddleware,
  async (req: TeamRequest, res: Response) => {
    try {
      const { teamId, bookmarkId } = req.params;
      const userId = req.user!.userId;
      const userRole = req.teamMember!.role;

      const bookmark = await prisma.teamBookmark.findFirst({
        where: { id: bookmarkId, teamId },
      });

      if (!bookmark) {
        res.status(404).json({ success: false, error: 'Bookmark not found' });
        return;
      }

      // D-06: Original adder or admin+ can remove
      if (bookmark.addedBy !== userId && userRole === 'member') {
        res.status(403).json({ success: false, error: 'Not authorized to remove this bookmark' });
        return;
      }

      await prisma.teamBookmark.delete({
        where: { id: bookmarkId },
      });

      res.status(200).json({
        success: true,
        message: 'Bookmark removed',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to remove bookmark',
      });
    }
  }
);

export default router;
