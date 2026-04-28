import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authMiddleware, AuthService } from '../services/authService';
import { attachUserTier, TierRequest } from '../middleware/requireTier';
import { TIER_LIMITS, SubscriptionTier } from '../config/stripe';

export const accountRoutes = Router();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// Request account deletion per D-67, D-68, D-69
const deleteRequestSchema = z.object({
  password: z.string().min(1),
  email: z.string().email(),
});

accountRoutes.post('/delete-request', authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = deleteRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid input' });
    return;
  }

  const { password, email } = parsed.data;
  const authService = AuthService.getInstance();

  // Verify user
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { email: true, passwordHash: true },
  });

  if (!user || user.email !== email) {
    res.status(401).json({ success: false, error: 'Email does not match' });
    return;
  }

  const isValid = await authService.verifyPassword(password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ success: false, error: 'Invalid password' });
    return;
  }

  // Set deletion request with 7-day grace period per D-70
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 7);

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      deletionRequestedAt: new Date(),
      // Could generate a confirmation token here
    },
  });

  res.json({
    success: true,
    message: 'Account scheduled for deletion',
    deleteAt: deletionDate.toISOString(),
  });
});

// Cancel deletion request per D-70
accountRoutes.post('/cancel-deletion', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      deletionRequestedAt: null,
      deletionConfirmToken: null,
    },
  });

  res.json({ success: true, message: 'Deletion cancelled' });
});

/**
 * GET /api/account/export
 * Export user data in JSON or CSV format
 * Per CONTEXT.md: FREE = none, PREMIUM = json/csv, ENTERPRISE = json/csv/pdf
 */
accountRoutes.get('/export', authMiddleware, attachUserTier, async (req: TierRequest, res: Response) => {
  const tier = (req.userTier || 'FREE') as SubscriptionTier;
  const allowedFormats = TIER_LIMITS[tier].dataExport;

  // Check if export is allowed for this tier
  if (!allowedFormats || allowedFormats === false) {
    res.status(403).json({
      success: false,
      error: 'Data export requires Premium subscription',
      upgradeUrl: '/pricing',
    });
    return;
  }

  const format = (req.query.format as string) || 'json';

  // Validate format is allowed for tier
  if (!allowedFormats.includes(format as 'json' | 'csv' | 'pdf')) {
    res.status(400).json({
      success: false,
      error: `Format '${format}' not available for your subscription tier`,
      allowedFormats,
    });
    return;
  }

  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      emailVerified: true,
      badges: {
        include: { badge: true },
      },
      bookmarks: true,
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const exportData = {
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
    },
    badges: user.badges.map((ub) => ({
      name: ub.badge.name,
      tier: ub.badge.tier,
      earnedAt: ub.earnedAt,
    })),
    bookmarks: user.bookmarks.map((b) => ({
      articleId: b.articleId,
      createdAt: b.createdAt,
    })),
    exportedAt: new Date().toISOString(),
  };

  if (format === 'csv') {
    // Simple CSV for badges
    let csv = 'Type,Name,Date\n';
    exportData.badges.forEach((b) => {
      csv += `Badge,"${b.name} (${b.tier})",${b.earnedAt}\n`;
    });
    exportData.bookmarks.forEach((b) => {
      csv += `Bookmark,${b.articleId},${b.createdAt}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=newshub-export.csv');
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=newshub-export.json');
    res.json(exportData);
  }
});
