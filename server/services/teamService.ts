/**
 * Team Service
 * Business logic for team CRUD, invites, and shared bookmarks
 */

import { prisma } from '../db/prisma';
import { WebSocketService } from './websocketService';
import { EmailService } from './emailService';
import {
  generateSecureToken,
  hashToken,
  getTokenExpiry,
  isTokenExpired,
} from '../utils/tokenUtils';
import logger from '../utils/logger';

export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamWithMemberCount {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  memberCount: number;
  role: TeamRole;
}

export interface TeamMemberInfo {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: TeamRole;
  joinedAt: Date;
}

export interface TeamBookmarkWithArticle {
  id: string;
  teamId: string;
  articleId: string;
  addedBy: string;
  addedByUser: { id: string; name: string; avatarUrl: string | null };
  note: string | null;
  createdAt: Date;
}

export class TeamService {
  private static instance: TeamService;

  private constructor() {}

  static getInstance(): TeamService {
    if (!TeamService.instance) {
      TeamService.instance = new TeamService();
    }
    return TeamService.instance;
  }

  /**
   * Create new team with creator as owner
   * Enforces: 3-50 char name, max 10 teams per user (Claude's discretion)
   */
  async createTeam(
    userId: string,
    name: string,
    description?: string
  ): Promise<TeamWithMemberCount> {
    // Validate name (Claude's discretion: 3-50 chars)
    const trimmedName = name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 50) {
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
        data: {
          name: trimmedName,
          description: description?.trim() || null,
        },
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

    logger.info(`Team created: ${team.id} by user ${userId}`);

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      createdAt: team.createdAt,
      memberCount: 1,
      role: 'owner',
    };
  }

  /**
   * Get teams for user
   */
  async getUserTeams(userId: string): Promise<TeamWithMemberCount[]> {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    });

    return memberships
      .filter((m) => m.team.deletedAt === null)
      .map((m) => ({
        id: m.team.id,
        name: m.team.name,
        description: m.team.description,
        createdAt: m.team.createdAt,
        memberCount: m.team._count.members,
        role: m.role as TeamRole,
      }));
  }

  /**
   * Get single team with membership info
   */
  async getTeam(
    teamId: string,
    userId: string
  ): Promise<TeamWithMemberCount | null> {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: {
        team: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    });

    if (!membership || membership.team.deletedAt) return null;

    return {
      id: membership.team.id,
      name: membership.team.name,
      description: membership.team.description,
      createdAt: membership.team.createdAt,
      memberCount: membership.team._count.members,
      role: membership.role as TeamRole,
    };
  }

  /**
   * Update team (admin+ only)
   */
  async updateTeam(
    teamId: string,
    updates: { name?: string; description?: string },
    actorUserId: string
  ): Promise<TeamWithMemberCount> {
    // Check actor permission
    const actorMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: actorUserId } },
    });

    if (!actorMembership) {
      throw new Error('Not a team member');
    }

    if (actorMembership.role === 'member') {
      throw new Error('Insufficient permissions');
    }

    // Validate name if provided
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (trimmedName.length < 3 || trimmedName.length > 50) {
        throw new Error('Team name must be 3-50 characters');
      }
      updates.name = trimmedName;
    }

    // Validate description if provided
    if (updates.description !== undefined) {
      const trimmedDesc = updates.description.trim();
      if (trimmedDesc.length > 500) {
        throw new Error('Description must be under 500 characters');
      }
      updates.description = trimmedDesc || null;
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && {
          description: updates.description,
        }),
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    logger.info(`Team updated: ${teamId} by user ${actorUserId}`);

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      createdAt: team.createdAt,
      memberCount: team._count.members,
      role: actorMembership.role as TeamRole,
    };
  }

  /**
   * Create team invite (D-01: email invite only, D-02: 7-day expiry)
   */
  async createInvite(
    teamId: string,
    invitedByUserId: string,
    email: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<string> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check inviter has permission
    const inviterMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: invitedByUserId } },
    });

    if (!inviterMembership) {
      throw new Error('Not a team member');
    }

    if (inviterMembership.role === 'member') {
      throw new Error('Insufficient permissions to invite');
    }

    // Check if already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      const existingMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: existingUser.id } },
      });
      if (existingMember) {
        // T-28-04: Same error message to prevent enumeration
        throw new Error('Invite could not be sent');
      }
    }

    // Check for pending invite
    const pendingInvite = await prisma.teamInvite.findFirst({
      where: {
        teamId,
        email: normalizedEmail,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pendingInvite) {
      // T-28-04: Same error message to prevent enumeration
      throw new Error('Invite could not be sent');
    }

    // Generate secure token
    const { token, hash } = generateSecureToken();

    // Create invite (7-day expiry per D-02)
    await prisma.teamInvite.create({
      data: {
        teamId,
        email: normalizedEmail,
        tokenHash: hash,
        invitedBy: invitedByUserId,
        role,
        expiresAt: getTokenExpiry(7 * 24), // 7 days
      },
    });

    // Get team and inviter info for email
    const [team, inviter] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamId } }),
      prisma.user.findUnique({ where: { id: invitedByUserId } }),
    ]);

    // Send invite email
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const inviteUrl = `${appUrl}/team/invite/${token}`;
    const emailService = EmailService.getInstance();
    await emailService.sendTeamInvite(
      normalizedEmail,
      team?.name || 'Team',
      inviter?.name || 'A team member',
      inviteUrl
    );

    logger.info(`Team invite sent: ${teamId} -> ${normalizedEmail}`);
    return token;
  }

  /**
   * Accept team invite
   */
  async acceptInvite(
    token: string,
    userId: string
  ): Promise<TeamWithMemberCount> {
    const tokenHash = hashToken(token);

    const invite = await prisma.teamInvite.findUnique({
      where: { tokenHash },
      include: {
        team: {
          include: { _count: { select: { members: true } } },
        },
      },
    });

    if (!invite) {
      throw new Error('Invalid invite');
    }

    if (invite.acceptedAt) {
      throw new Error('Invite already used');
    }

    if (isTokenExpired(invite.expiresAt)) {
      throw new Error('Invite expired');
    }

    if (invite.team.deletedAt) {
      throw new Error('Team no longer exists');
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: invite.teamId, userId } },
    });
    if (existingMember) {
      throw new Error('Already a team member');
    }

    // Check member limit (Claude's discretion: soft limit 50)
    if (invite.team._count.members >= 50) {
      logger.warn(`Team ${invite.teamId} at soft limit of 50 members`);
      // Allow but log warning
    }

    // Transaction: create member + mark invite accepted
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId,
          role: invite.role,
        },
      }),
      prisma.teamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    // Broadcast member joined via WebSocket
    const wsService = WebSocketService.getInstance();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true },
    });
    if (user) {
      wsService.broadcastTeamMemberJoined(invite.teamId, {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: invite.role as TeamRole,
      });
    }

    logger.info(`Invite accepted: ${invite.teamId} <- user ${userId}`);

    return {
      id: invite.team.id,
      name: invite.team.name,
      description: invite.team.description,
      createdAt: invite.team.createdAt,
      memberCount: invite.team._count.members + 1,
      role: invite.role as TeamRole,
    };
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMemberInfo[]> {
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: [
        { role: 'asc' }, // owner first, then admin, then member
        { joinedAt: 'asc' },
      ],
    });

    return members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role as TeamRole,
      joinedAt: m.joinedAt,
    }));
  }

  /**
   * Remove team member (D-08: admin can remove members except owner)
   */
  async removeMember(
    teamId: string,
    targetUserId: string,
    actorUserId: string
  ): Promise<void> {
    // Get actor's role
    const actorMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: actorUserId } },
    });

    if (!actorMembership) {
      throw new Error('Not a team member');
    }

    // Self-removal is always allowed (except owner - must transfer first)
    if (targetUserId === actorUserId) {
      if (actorMembership.role === 'owner') {
        throw new Error('Owner cannot leave. Transfer ownership first.');
      }
    } else {
      // Removing others requires admin+ role
      if (actorMembership.role === 'member') {
        throw new Error('Members cannot remove other members');
      }

      // Cannot remove owner
      const targetMembership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: targetUserId } },
      });
      if (!targetMembership) {
        throw new Error('User is not a team member');
      }
      if (targetMembership.role === 'owner') {
        throw new Error('Cannot remove team owner');
      }
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });

    // Broadcast member removed via WebSocket
    const wsService = WebSocketService.getInstance();
    wsService.broadcastTeamMemberRemoved(teamId, targetUserId);

    logger.info(`Member removed: ${teamId} - user ${targetUserId}`);
  }

  /**
   * Delete team (soft delete with 7-day grace per Claude's discretion)
   */
  async deleteTeam(teamId: string, ownerUserId: string): Promise<void> {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: ownerUserId } },
    });

    if (!membership || membership.role !== 'owner') {
      throw new Error('Only owner can delete team');
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { deletedAt: new Date() },
    });

    logger.info(`Team soft-deleted: ${teamId}`);
  }

  /**
   * Get team bookmarks
   */
  async getTeamBookmarks(teamId: string): Promise<TeamBookmarkWithArticle[]> {
    const bookmarks = await prisma.teamBookmark.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });

    // Get user info for each bookmark
    const userIds = [...new Set(bookmarks.map((b) => b.addedBy))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return bookmarks.map((b) => ({
      id: b.id,
      teamId: b.teamId,
      articleId: b.articleId,
      addedBy: b.addedBy,
      addedByUser: userMap.get(b.addedBy) || {
        id: b.addedBy,
        name: 'Unknown',
        avatarUrl: null,
      },
      note: b.note,
      createdAt: b.createdAt,
    }));
  }

  /**
   * Add bookmark to team (broadcasts via WebSocket)
   */
  async addBookmark(
    teamId: string,
    articleId: string,
    userId: string,
    note?: string
  ): Promise<TeamBookmarkWithArticle> {
    // Check user is team member
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      throw new Error('Not a team member');
    }

    // Check if already bookmarked
    const existing = await prisma.teamBookmark.findUnique({
      where: { teamId_articleId: { teamId, articleId } },
    });
    if (existing) {
      throw new Error('Article already bookmarked in this team');
    }

    const bookmark = await prisma.teamBookmark.create({
      data: {
        teamId,
        articleId,
        addedBy: userId,
        note: note?.trim() || null,
      },
    });

    // Get user info for response
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true },
    });

    const result: TeamBookmarkWithArticle = {
      id: bookmark.id,
      teamId: bookmark.teamId,
      articleId: bookmark.articleId,
      addedBy: bookmark.addedBy,
      addedByUser: user || { id: userId, name: 'Unknown', avatarUrl: null },
      note: bookmark.note,
      createdAt: bookmark.createdAt,
    };

    // Broadcast to team room via WebSocket
    const wsService = WebSocketService.getInstance();
    wsService.broadcastTeamBookmark(teamId, result);

    logger.info(`Team bookmark added: ${teamId} article ${articleId}`);

    return result;
  }

  /**
   * Remove bookmark from team (D-06: original adder + admins can remove)
   */
  async removeBookmark(
    teamId: string,
    bookmarkId: string,
    userId: string
  ): Promise<void> {
    const bookmark = await prisma.teamBookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark || bookmark.teamId !== teamId) {
      throw new Error('Bookmark not found');
    }

    // Check permission: original adder or admin+
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      throw new Error('Not a team member');
    }

    const canRemove =
      bookmark.addedBy === userId || membership.role !== 'member';

    if (!canRemove) {
      throw new Error('Insufficient permissions to remove bookmark');
    }

    await prisma.teamBookmark.delete({
      where: { id: bookmarkId },
    });

    logger.info(`Team bookmark removed: ${bookmarkId} from ${teamId}`);
  }
}

export default TeamService;
