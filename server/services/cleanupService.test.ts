/**
 * Unit tests for CleanupService
 * Tests singleton pattern, start/stop lifecycle, deletion grace period (30 days),
 * reminder emails at 7 and 1 day before deletion, daily cleanup interval, and getStats
 */

import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Mock dependencies before importing CleanupService
vi.mock('../db/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Create a shared mock for EmailService
const mockEmailService = {
  sendVerificationReminder: vi.fn().mockResolvedValue(true),
};

vi.mock('./emailService', () => ({
  EmailService: {
    getInstance: vi.fn(() => mockEmailService),
  },
}));

vi.mock('../utils/tokenUtils', () => ({
  generateSecureToken: vi.fn(() => ({ token: 'new-token', hash: 'new-hash' })),
  getTokenExpiry: vi.fn((hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000)),
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { CleanupService } from './cleanupService';
import { EmailService } from './emailService';
import { prisma } from '../db/prisma';
import { generateSecureToken, getTokenExpiry } from '../utils/tokenUtils';
import logger from '../utils/logger';

describe('CleanupService', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    const service = CleanupService.getInstance();
    service.stop(); // Ensure no lingering intervals
    (CleanupService as unknown as { instance: CleanupService | null }).instance = null;
    vi.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = CleanupService.getInstance();
      const instance2 = CleanupService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('start', () => {
    it('sets isRunning to true', () => {
      const service = CleanupService.getInstance();
      (service as any).isRunning = false;
      service.start();
      expect((service as any).isRunning).toBe(true);
    });

    it('runs cleanup immediately on startup', async () => {
      // Mock prisma to avoid actual DB calls
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 });

      const service = CleanupService.getInstance();
      const runCleanupSpy = vi.spyOn(service, 'runCleanup');

      service.start();

      // Wait for the initial immediate call only (not the interval)
      await vi.advanceTimersByTimeAsync(100);

      expect(runCleanupSpy).toHaveBeenCalledTimes(1);
    });

    it('schedules daily cleanup interval', () => {
      const service = CleanupService.getInstance();
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      service.start();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        24 * 60 * 60 * 1000 // Daily interval
      );
    });

    it('warns and returns early if already running', () => {
      const service = CleanupService.getInstance();
      (service as any).isRunning = true;

      service.start();

      expect(logger.warn).toHaveBeenCalledWith('Cleanup service already running');
    });
  });

  describe('stop', () => {
    it('clears interval and sets isRunning to false', () => {
      const service = CleanupService.getInstance();
      service.start();
      service.stop();

      expect((service as any).isRunning).toBe(false);
      expect((service as any).intervalId).toBeNull();
    });
  });

  describe('runCleanup', () => {
    const DAY_IN_MS = 24 * 60 * 60 * 1000;

    beforeEach(() => {
      // Set a fixed "now" time for consistent test results
      vi.setSystemTime(new Date('2026-04-20T12:00:00Z'));
    });

    it('sends 7-day reminder for accounts created 23 days ago', async () => {
      // Account created 23 days ago = 7 days until deletion (30 - 23 = 7)
      const createdAt = new Date(Date.now() - 23 * DAY_IN_MS);
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test User',
        verificationTokenHash: 'old-hash',
        createdAt,
      };

      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([mockUser] as any).mockResolvedValue([]);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, verificationTokenHash: 'new-hash' } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 });

      const service = CleanupService.getInstance();
      await service.runCleanup();

      // Verify reminder sent
      const emailService = EmailService.getInstance();
      expect(emailService.sendVerificationReminder).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        7,
        'new-token'
      );
    });

    it('sends 1-day reminder for accounts created 29 days ago', async () => {
      const createdAt = new Date(Date.now() - 29 * DAY_IN_MS);
      const mockUser = {
        id: 'u2',
        email: 'urgent@example.com',
        name: 'Urgent User',
        verificationTokenHash: 'old-hash',
        createdAt,
      };

      // First call returns 7-day accounts (empty), second returns 1-day accounts
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([])  // 7-day check
        .mockResolvedValueOnce([mockUser] as any);  // 1-day check

      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, verificationTokenHash: 'new-hash' } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 });

      const service = CleanupService.getInstance();
      await service.runCleanup();

      const emailService = EmailService.getInstance();
      expect(emailService.sendVerificationReminder).toHaveBeenCalledWith(
        'urgent@example.com',
        'Urgent User',
        1,
        'new-token'
      );
    });

    it('deletes unverified accounts older than 30 days', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);  // No reminders needed
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 5 });

      const service = CleanupService.getInstance();
      await service.runCleanup();

      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: {
          emailVerified: false,
          createdAt: { lt: expect.any(Date) },
        },
      });
      expect(logger.info).toHaveBeenCalledWith('cleanup:deleted_unverified count=5');
    });

    it('does NOT delete verified accounts regardless of age', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 });

      const service = CleanupService.getInstance();
      await service.runCleanup();

      // Verify deleteMany was called with emailVerified: false
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: {
          emailVerified: false,
          createdAt: { lt: expect.any(Date) },
        },
      });
    });

    it('does NOT delete unverified accounts less than 30 days old', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 });

      const service = CleanupService.getInstance();
      await service.runCleanup();

      // Verify deleteMany cutoff date is 30 days ago
      const callArgs = vi.mocked(prisma.user.deleteMany).mock.calls[0][0];
      const cutoffDate = callArgs.where.createdAt.lt as Date;
      const expectedCutoff = new Date(Date.now() - 30 * DAY_IN_MS);

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(cutoffDate.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
    });

    it('generates new verification token for reminder emails', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        verificationTokenHash: 'old',
        createdAt: new Date(Date.now() - 23 * DAY_IN_MS),
      };

      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([mockUser] as any).mockResolvedValue([]);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, verificationTokenHash: 'new-hash' } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 });

      const service = CleanupService.getInstance();
      await service.runCleanup();

      expect(generateSecureToken).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          verificationTokenHash: 'new-hash',
          verificationTokenExpiry: expect.any(Date),
        },
      });
    });

    it('logs cleanup:start and cleanup:complete', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 });

      const service = CleanupService.getInstance();
      await service.runCleanup();

      expect(logger.info).toHaveBeenCalledWith('cleanup:start');
      expect(logger.info).toHaveBeenCalledWith('cleanup:complete');
    });

    it('logs individual reminder sent events', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test User',
        verificationTokenHash: 'old-hash',
        createdAt: new Date(Date.now() - 23 * DAY_IN_MS),
      };

      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([mockUser] as any).mockResolvedValue([]);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, verificationTokenHash: 'new-hash' } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 });

      const service = CleanupService.getInstance();
      await service.runCleanup();

      expect(logger.info).toHaveBeenCalledWith('cleanup:reminder_sent email=test@example.com days=7');
    });

    it('continues cleanup if reminder email fails', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test User',
        verificationTokenHash: 'old-hash',
        createdAt: new Date(Date.now() - 23 * DAY_IN_MS),
      };

      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([mockUser] as any).mockResolvedValue([]);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, verificationTokenHash: 'new-hash' } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 });

      const emailService = EmailService.getInstance();
      vi.mocked(emailService.sendVerificationReminder).mockRejectedValueOnce(new Error('SMTP error'));

      const service = CleanupService.getInstance();
      await service.runCleanup();

      // Should still complete cleanup
      expect(logger.error).toHaveBeenCalledWith(
        'cleanup:reminder_failed email=test@example.com',
        expect.any(Error)
      );
      expect(logger.info).toHaveBeenCalledWith('cleanup:complete');
    });
  });

  describe('getStats', () => {
    it('returns correct counts for unverified accounts', async () => {
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(10)  // unverifiedTotal
        .mockResolvedValueOnce(3)   // expiringIn7Days
        .mockResolvedValueOnce(1)   // expiringIn1Day
        .mockResolvedValueOnce(2);  // expiredCount

      const service = CleanupService.getInstance();
      const stats = await service.getStats();

      expect(stats).toEqual({
        unverifiedTotal: 10,
        expiringIn7Days: 3,
        expiringIn1Day: 1,
        expiredCount: 2,
      });
    });

    it('calculates expiringIn7Days correctly based on createdAt', async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const service = CleanupService.getInstance();
      await service.getStats();

      // Check that the second count call (expiringIn7Days) has correct date range
      const callArgs = vi.mocked(prisma.user.count).mock.calls[1][0];
      expect(callArgs.where.emailVerified).toBe(false);
      expect(callArgs.where.createdAt).toHaveProperty('lt');
      expect(callArgs.where.createdAt).toHaveProperty('gte');
    });

    it('calculates expiringIn1Day correctly based on createdAt', async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const service = CleanupService.getInstance();
      await service.getStats();

      // Check that the third count call (expiringIn1Day) has correct date range
      const callArgs = vi.mocked(prisma.user.count).mock.calls[2][0];
      expect(callArgs.where.emailVerified).toBe(false);
      expect(callArgs.where.createdAt).toHaveProperty('lt');
      expect(callArgs.where.createdAt).toHaveProperty('gte');
    });
  });
});
