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
 * Export user data per DSGVO Art. 15 (Auskunft) + Art. 20 (Datenübertragbarkeit).
 *
 * Art. 12 Abs. 5: Auskunft + Datenübertragung MÜSSEN unentgeltlich sein. JSON + CSV
 * stehen daher jedem authentifizierten Nutzer (auch FREE) frei. PDF ist ein
 * Komfortformat und bleibt PREMIUM/ENTERPRISE-gated.
 *
 * Sensible Tokens (Passwort-Hash, Verifizierungs-/Reset-Token, OAuth-Provider-IDs,
 * Stripe-Customer-/Subscription-IDs, ApiKey-keyHash) werden bewusst NICHT
 * exportiert — Sicherheitsrisiko, kein DSGVO-Anspruch (Pseudonyme/Hashes nicht
 * "personenbezogen" im exportfähigen Sinn).
 */
const FREE_FORMATS = ['json', 'csv'] as const;
type ExportFormat = 'json' | 'csv' | 'pdf';

accountRoutes.get('/export', authMiddleware, attachUserTier, async (req: TierRequest, res: Response) => {
  const format = (req.query.format as string) || 'json';

  // Format-spezifisches Gating: JSON + CSV sind DSGVO-Pflicht (frei). Andere Formate
  // (z.B. PDF) bleiben Tier-gated, weil sie ein zusätzlicher Komfort sind und nicht
  // Pflicht für das Auskunftsrecht.
  if (!(FREE_FORMATS as readonly string[]).includes(format)) {
    const tier = (req.userTier || 'FREE') as SubscriptionTier;
    const allowedFormats = TIER_LIMITS[tier].dataExport;
    if (
      !allowedFormats ||
      allowedFormats === false ||
      !allowedFormats.includes(format as ExportFormat)
    ) {
      res.status(400).json({
        success: false,
        error: `Format '${format}' not available for your subscription tier`,
        allowedFormats: FREE_FORMATS,
        upgradeUrl: '/pricing',
      });
      return;
    }
  }

  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      // Profile fields
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      emailVerified: true,
      hasPassword: true,
      avatarUrl: true,
      selectedPresetAvatar: true,
      featuredBadgeId: true,
      customAccentColor: true,
      preferences: true,

      // Privacy / opt-out flags (Art. 18, 21)
      showOnLeaderboard: true,
      isHistoryPaused: true,
      emailBounced: true,
      emailBouncedAt: true,
      emailOptOut: true,
      emailOptOutAt: true,

      // Subscription state (Stripe IDs absichtlich ausgeschlossen — pseudonyme Identifier)
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      pausedUntil: true,
      isStudent: true,
      studentVerifiedUntil: true,
      freeMonthsEarned: true,
      referralCode: true,

      // Relations: vollständiger Datenbestand pro User
      badges: {
        include: {
          badge: { select: { name: true, description: true, tier: true, category: true, iconType: true } },
        },
      },
      bookmarks: { select: { articleId: true, createdAt: true } },
      readingHistory: { select: { articleId: true, title: true, source: true, readAt: true } },
      comments: {
        select: {
          id: true,
          articleId: true,
          text: true,
          parentId: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      teamMemberships: {
        select: {
          teamId: true,
          role: true,
          joinedAt: true,
          team: { select: { name: true, description: true } },
        },
      },
      apiKeys: {
        select: {
          id: true,
          name: true,
          tier: true,
          environment: true,
          createdAt: true,
          lastUsedAt: true,
          requestCount: true,
          revokedAt: true,
          revokedReason: true,
          // keyHash absichtlich ausgeschlossen (bcrypt-Hash, Sicherheitsrisiko)
        },
      },
      emailSubscription: {
        select: {
          email: true,
          frequency: true,
          regions: true,
          topics: true,
          minSeverity: true,
          isActive: true,
          lastSentAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      emailDigests: {
        // htmlContent absichtlich nicht exportiert: schon zugestellte E-Mails;
        // großer Speicherbedarf, kein Mehrwert für Auskunft.
        select: { id: true, subject: true, sentAt: true, status: true, createdAt: true },
      },
      userPersonas: {
        select: { id: true, personaId: true, isActive: true, lastUsedAt: true, createdAt: true },
      },
      referralRewardsAsReferrer: {
        select: { rewardType: true, rewardValue: true, appliedAt: true, createdAt: true },
      },
      referralRewardsAsReferred: {
        select: { rewardType: true, rewardValue: true, appliedAt: true, createdAt: true },
      },
      studentVerifications: {
        // documentUrl absichtlich ausgeschlossen — interner Speicherort.
        select: { id: true, status: true, reviewedAt: true, createdAt: true },
      },
      factChecks: {
        select: {
          id: true,
          articleId: true,
          claimText: true,
          claimLanguage: true,
          verdict: true,
          confidence: true,
          modelUsed: true,
          locale: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    exportFormat: format,
    notice:
      'Dieser Export enthält alle personenbezogenen Daten gemäß DSGVO Art. 15 + 20. ' +
      'Sensible Authentifizierungs-Tokens (Passwort-Hash, Reset-Token, OAuth-Provider-IDs, ' +
      'Stripe-Customer-/Subscription-IDs, API-Key-Hashes) sind aus Sicherheitsgründen ' +
      'ausgeschlossen — sie sind Pseudonyme bzw. interne Identifier. ' +
      'Für vollständige strukturierte Daten bitte JSON-Format wählen.',

    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      hasPassword: user.hasPassword,
      avatarUrl: user.avatarUrl,
      selectedPresetAvatar: user.selectedPresetAvatar,
      featuredBadgeId: user.featuredBadgeId,
      customAccentColor: user.customAccentColor,
      preferences: user.preferences,
    },

    privacy: {
      showOnLeaderboard: user.showOnLeaderboard,
      isHistoryPaused: user.isHistoryPaused,
      emailOptOut: user.emailOptOut,
      emailOptOutAt: user.emailOptOutAt,
      emailBounced: user.emailBounced,
      emailBouncedAt: user.emailBouncedAt,
    },

    subscription: {
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      endsAt: user.subscriptionEndsAt,
      pausedUntil: user.pausedUntil,
      isStudent: user.isStudent,
      studentVerifiedUntil: user.studentVerifiedUntil,
      freeMonthsEarned: user.freeMonthsEarned,
      referralCode: user.referralCode,
      note: 'Stripe-Customer-/Subscription-IDs sind aus Sicherheitsgründen ausgeschlossen. Für Zahlungsbelege bitte separat anfragen.',
    },

    badges: user.badges.map((ub) => ({
      name: ub.badge.name,
      description: ub.badge.description,
      tier: ub.badge.tier,
      category: ub.badge.category,
      iconType: ub.badge.iconType,
      earnedAt: ub.earnedAt,
      progress: ub.progress,
    })),

    bookmarks: user.bookmarks,
    readingHistory: user.readingHistory,
    comments: user.comments,
    teamMemberships: user.teamMemberships,
    apiKeys: user.apiKeys,
    emailSubscription: user.emailSubscription,
    emailDigests: user.emailDigests,
    customPersonas: user.userPersonas,
    referrals: {
      asReferrer: user.referralRewardsAsReferrer,
      asReferred: user.referralRewardsAsReferred,
    },
    studentVerifications: user.studentVerifications,
    factChecks: user.factChecks,
  };

  if (format === 'csv') {
    // CSV is a flat tabular format. JSON is the canonical structure; CSV is a
    // convenience for opening in spreadsheets. Each row: Type, Identifier, Detail, Date.
    const rows: string[] = ['Type,Identifier,Detail,Date'];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const emit = (type: string, identifier: unknown, detail: unknown, date: unknown) => {
      rows.push([type, escape(identifier), escape(detail), escape(date)].join(','));
    };

    emit('Profile', user.id, `${user.name} <${user.email}>`, user.createdAt);
    emit('Subscription', user.subscriptionTier, user.subscriptionStatus, user.subscriptionEndsAt ?? '');
    exportData.badges.forEach((b) => emit('Badge', b.name, b.tier, b.earnedAt));
    exportData.bookmarks.forEach((b) => emit('Bookmark', b.articleId, '', b.createdAt));
    exportData.readingHistory.forEach((h) => emit('ReadingHistory', h.articleId, h.title ?? '', h.readAt));
    exportData.comments.forEach((c) => emit('Comment', c.articleId, c.text, c.createdAt));
    exportData.teamMemberships.forEach((tm) =>
      emit('TeamMembership', tm.teamId, `${tm.team?.name ?? ''} (${tm.role})`, tm.joinedAt),
    );
    exportData.apiKeys.forEach((k) => emit('ApiKey', k.id, `${k.name} (${k.tier}/${k.environment})`, k.createdAt));
    exportData.emailDigests.forEach((d) => emit('EmailDigest', d.id, d.subject, d.sentAt ?? d.createdAt));
    exportData.customPersonas.forEach((p) => emit('CustomPersona', p.id, p.personaId, p.createdAt));
    exportData.referrals.asReferrer.forEach((r) => emit('ReferralReward(referrer)', r.rewardType, String(r.rewardValue), r.createdAt));
    exportData.referrals.asReferred.forEach((r) => emit('ReferralReward(referred)', r.rewardType, String(r.rewardValue), r.createdAt));
    exportData.studentVerifications.forEach((s) => emit('StudentVerification', s.id, s.status, s.createdAt));
    exportData.factChecks.forEach((f) => emit('FactCheck', f.id, `${f.verdict} (${f.confidence}%)`, f.createdAt));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=newshub-export.csv');
    res.send(rows.join('\n'));
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=newshub-export.json');
    res.json(exportData);
  }
});
