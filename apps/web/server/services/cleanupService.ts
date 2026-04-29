/**
 * Cleanup Service
 * Manages unverified account lifecycle:
 * - Sends reminder emails at 7 days and 1 day before deletion (D-19)
 * - Auto-deletes unverified accounts after 30 days (D-17)
 * - Runs on server startup and daily interval (D-18)
 */

import { prisma } from '../db/prisma';
import { EmailService } from './emailService';
import { generateSecureToken, getTokenExpiry } from '../utils/tokenUtils';
import logger from '../utils/logger';

const ACCOUNT_RETENTION_DAYS = 30;  // D-17
const ANALYTICS_RETENTION_DAYS = 90; // GDPR: ShareClick analytics retention
const REMINDER_DAYS = [7, 1];       // D-19: Send reminders at 7 days and 1 day before deletion
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = DAY_IN_MS;  // D-18: Daily interval

export class CleanupService {
  private static instance: CleanupService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {
    logger.info('Cleanup service initialized');
  }

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  /**
   * Start the cleanup service (D-18: runs on startup + daily)
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Cleanup service already running');
      return;
    }

    this.isRunning = true;

    // Run immediately on startup (D-18)
    this.runCleanup().catch(err => {
      logger.error('Initial cleanup failed:', err);
    });

    // Schedule daily cleanup (D-18)
    this.intervalId = setInterval(() => {
      this.runCleanup().catch(err => {
        logger.error('Scheduled cleanup failed:', err);
      });
    }, CLEANUP_INTERVAL_MS);

    logger.info('Cleanup service started - runs daily');
  }

  /**
   * Stop the cleanup service (for graceful shutdown)
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Cleanup service stopped');
  }

  /**
   * Run the full cleanup cycle
   */
  async runCleanup(): Promise<void> {
    logger.info('cleanup:start');

    try {
      // 1. Send reminder emails for accounts approaching deletion
      await this.sendReminderEmails();

      // 2. Delete expired unverified accounts
      await this.deleteExpiredAccounts();

      // 3. Delete old analytics data (GDPR compliance)
      await this.deleteExpiredAnalytics();

      // 4. Delete expired shared content
      await this.deleteExpiredShares();

      logger.info('cleanup:complete');
    } catch (err) {
      logger.error('cleanup:error', err);
      throw err;
    }
  }

  /**
   * Send reminder emails for accounts approaching deletion (D-19)
   */
  private async sendReminderEmails(): Promise<void> {
    const emailService = EmailService.getInstance();

    for (const daysUntilDeletion of REMINDER_DAYS) {
      // Find accounts that will be deleted in exactly `daysUntilDeletion` days
      // Account is deleted when createdAt + 30 days < now
      // So we want: createdAt + 30 days - daysUntilDeletion days = today
      // => createdAt = today - (30 - daysUntilDeletion) days
      const targetCreationDate = new Date(Date.now() - (ACCOUNT_RETENTION_DAYS - daysUntilDeletion) * DAY_IN_MS);
      const nextDay = new Date(targetCreationDate.getTime() + DAY_IN_MS);

      const accountsToRemind = await prisma.user.findMany({
        where: {
          emailVerified: false,
          createdAt: {
            gte: targetCreationDate,
            lt: nextDay,
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          verificationTokenHash: true,
        },
      });

      if (accountsToRemind.length === 0) {
        continue;
      }

      logger.info(`cleanup:sending_reminders days=${daysUntilDeletion} count=${accountsToRemind.length}`);

      for (const account of accountsToRemind) {
        try {
          // Generate fresh verification token for the reminder email
          // We always need a new token since we can't recover plaintext from hash
          const { token: newToken, hash } = generateSecureToken();
          await prisma.user.update({
            where: { id: account.id },
            data: {
              verificationTokenHash: hash,
              verificationTokenExpiry: getTokenExpiry(24),
            },
          });

          await emailService.sendVerificationReminder(
            account.email,
            account.name,
            daysUntilDeletion,
            newToken
          );

          logger.info(`cleanup:reminder_sent email=${account.email} days=${daysUntilDeletion}`);
        } catch (err) {
          logger.error(`cleanup:reminder_failed email=${account.email}`, err);
        }
      }
    }
  }

  /**
   * Delete unverified accounts older than 30 days (D-17, D-54)
   */
  private async deleteExpiredAccounts(): Promise<void> {
    const cutoffDate = new Date(Date.now() - ACCOUNT_RETENTION_DAYS * DAY_IN_MS);

    // D-54: Hard delete using Prisma deleteMany
    const result = await prisma.user.deleteMany({
      where: {
        emailVerified: false,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      logger.info(`cleanup:deleted_unverified count=${result.count}`);
    }
  }

  /**
   * Delete ShareClick analytics older than 90 days (GDPR compliance)
   */
  private async deleteExpiredAnalytics(): Promise<void> {
    const cutoffDate = new Date(Date.now() - ANALYTICS_RETENTION_DAYS * DAY_IN_MS);

    const result = await prisma.shareClick.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      logger.info(`cleanup:deleted_analytics count=${result.count} retention=${ANALYTICS_RETENTION_DAYS}d`);
    }
  }

  /**
   * Delete expired SharedContent records
   */
  private async deleteExpiredShares(): Promise<void> {
    const now = new Date();

    const result = await prisma.sharedContent.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    if (result.count > 0) {
      logger.info(`cleanup:deleted_expired_shares count=${result.count}`);
    }
  }

  /**
   * Get statistics about pending cleanups (for monitoring)
   */
  async getStats(): Promise<{
    unverifiedTotal: number;
    expiringIn7Days: number;
    expiringIn1Day: number;
    expiredCount: number;
    analyticsTotal: number;
    analyticsExpiring: number;
    expiredShares: number;
  }> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - ACCOUNT_RETENTION_DAYS * DAY_IN_MS);
    const sevenDaysFromExpiry = new Date(now.getTime() - (ACCOUNT_RETENTION_DAYS - 7) * DAY_IN_MS);
    const oneDayFromExpiry = new Date(now.getTime() - (ACCOUNT_RETENTION_DAYS - 1) * DAY_IN_MS);
    const analyticsCutoff = new Date(now.getTime() - ANALYTICS_RETENTION_DAYS * DAY_IN_MS);

    const [
      unverifiedTotal,
      expiringIn7Days,
      expiringIn1Day,
      expiredCount,
      analyticsTotal,
      analyticsExpiring,
      expiredShares,
    ] = await Promise.all([
      prisma.user.count({ where: { emailVerified: false } }),
      prisma.user.count({
        where: {
          emailVerified: false,
          createdAt: { lt: sevenDaysFromExpiry, gte: cutoffDate },
        },
      }),
      prisma.user.count({
        where: {
          emailVerified: false,
          createdAt: { lt: oneDayFromExpiry, gte: cutoffDate },
        },
      }),
      prisma.user.count({
        where: {
          emailVerified: false,
          createdAt: { lt: cutoffDate },
        },
      }),
      prisma.shareClick.count(),
      prisma.shareClick.count({
        where: { createdAt: { lt: analyticsCutoff } },
      }),
      prisma.sharedContent.count({
        where: { expiresAt: { lt: now } },
      }),
    ]);

    return {
      unverifiedTotal,
      expiringIn7Days,
      expiringIn1Day,
      expiredCount,
      analyticsTotal,
      analyticsExpiring,
      expiredShares,
    };
  }
}

export default CleanupService;
