/**
 * Team Authorization Middleware
 * Verifies team membership and role permissions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamRequest extends Request {
  user?: { userId: string; email: string };
  teamMember?: { teamId: string; userId: string; role: TeamRole };
}

/**
 * Middleware: Verify user is a member of the team
 * Requires authMiddleware to run first (sets req.user)
 * Sets req.teamMember on success
 */
export async function teamMemberMiddleware(
  req: TeamRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { teamId } = req.params;

  if (!teamId) {
    res.status(400).json({ success: false, error: 'Team ID required' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const userId = req.user.userId;

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    include: { team: { select: { deletedAt: true } } },
  });

  if (!membership) {
    res.status(403).json({ success: false, error: 'Not a team member' });
    return;
  }

  if (membership.team.deletedAt) {
    res.status(404).json({ success: false, error: 'Team not found' });
    return;
  }

  req.teamMember = {
    teamId: membership.teamId,
    userId: membership.userId,
    role: membership.role as TeamRole,
  };

  next();
}

/**
 * Middleware factory: Require specific team role(s)
 * Must be used after teamMemberMiddleware
 */
export function requireTeamRole(
  ...roles: TeamRole[]
): (req: TeamRequest, res: Response, next: NextFunction) => void {
  return (req: TeamRequest, res: Response, next: NextFunction): void => {
    if (!req.teamMember) {
      res
        .status(500)
        .json({ success: false, error: 'teamMemberMiddleware must run first' });
      return;
    }

    if (!roles.includes(req.teamMember.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
