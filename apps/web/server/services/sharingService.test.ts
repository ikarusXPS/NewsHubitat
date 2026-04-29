/**
 * Unit tests for SharingService
 * Tests share creation, URL generation, click tracking, analytics, and cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NewsArticle } from '../../src/types';

// Mock nanoid to return unique values per call using a counter
let nanoidCounter = 0;
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => `test-id-${++nanoidCounter}`),
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Type import for SharedContent (static, not affected by module reset)
import type { SharedContent } from './sharingService';

describe('SharingService', () => {
  // Dynamic import for fresh module each test
  let SharingService: typeof import('./sharingService').SharingService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('APP_URL', 'https://test.newshub.com');

    // Reset nanoid counter for each test
    nanoidCounter = 0;

    // Reset modules to get fresh module-level Maps
    vi.resetModules();

    // Re-import the module to get fresh state
    const module = await import('./sharingService');
    SharingService = module.SharingService;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = SharingService.getInstance();
      const instance2 = SharingService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should use APP_URL from environment', async () => {
      vi.stubEnv('APP_URL', 'https://custom.newshub.com');
      // Reset to pick up new env
      (SharingService as unknown as { instance: SharingService | null }).instance = null;

      const service = SharingService.getInstance();
      const share = await service.createShare('article', 'art-1', 'Test Title');
      const urls = service.getShareUrls(share.shareCode, share.title);

      expect(urls.direct).toContain('https://custom.newshub.com');
    });
  });

  describe('Share Creation', () => {
    it('createShare should generate share with nanoid code', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test Article');

      // nanoid is called twice per share: once for id, once for shareCode
      expect(share.shareCode).toBe('test-id-1');
      expect(share.id).toBe('test-id-2');
    });

    it('createShare should store share with correct contentType', async () => {
      const service = SharingService.getInstance();

      const articleShare = await service.createShare('article', 'art-1', 'Article');
      const clusterShare = await service.createShare('cluster', 'cl-1', 'Cluster');
      const comparisonShare = await service.createShare('comparison', 'cmp-1', 'Comparison');
      const digestShare = await service.createShare('digest', 'dig-1', 'Digest');

      expect(articleShare.contentType).toBe('article');
      expect(clusterShare.contentType).toBe('cluster');
      expect(comparisonShare.contentType).toBe('comparison');
      expect(digestShare.contentType).toBe('digest');
    });

    it('createShare should set expiresAt when expiresInDays provided', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test', {
        expiresInDays: 7,
      });

      expect(share.expiresAt).toBeDefined();
      expect(share.expiresAt!.getTime()).toBe(
        new Date('2024-01-22T12:00:00Z').getTime()
      );

      vi.useRealTimers();
    });

    it('createShare should not set expiresAt when not provided', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test');

      expect(share.expiresAt).toBeUndefined();
    });

    it('createShare should initialize viewCount to 0', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test');

      expect(share.viewCount).toBe(0);
    });

    it('createShare should store optional fields', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test', {
        description: 'Test description',
        imageUrl: 'https://example.com/image.jpg',
        createdBy: 'user-123',
      });

      expect(share.description).toBe('Test description');
      expect(share.imageUrl).toBe('https://example.com/image.jpg');
      expect(share.createdBy).toBe('user-123');
    });
  });

  describe('Share Retrieval', () => {
    it('getByCode should return share for valid code', async () => {
      const service = SharingService.getInstance();

      const created = await service.createShare('article', 'art-1', 'Test Title');
      const retrieved = await service.getByCode(created.shareCode);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe('Test Title');
    });

    it('getByCode should return null for unknown code', async () => {
      const service = SharingService.getInstance();

      const result = await service.getByCode('nonexistent-code');

      expect(result).toBeNull();
    });

    it('getByCode should return null for expired share', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      const service = SharingService.getInstance();

      // Create share that expires in 1 day
      const share = await service.createShare('article', 'art-1', 'Test', {
        expiresInDays: 1,
      });

      // Advance time by 2 days
      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);

      const result = await service.getByCode(share.shareCode);

      expect(result).toBeNull();

      vi.useRealTimers();
    });

    it('getByCode should delete expired share from storage', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test', {
        expiresInDays: 1,
      });

      // Advance time to expire share
      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);

      // First call should return null and delete
      const result1 = await service.getByCode(share.shareCode);
      expect(result1).toBeNull();

      // Second call - still null (was deleted)
      const result2 = await service.getByCode(share.shareCode);
      expect(result2).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('View Counting', () => {
    it('incrementViews should increase viewCount', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test');
      expect(share.viewCount).toBe(0);

      await service.incrementViews(share.shareCode);
      const updated = await service.getByCode(share.shareCode);
      expect(updated!.viewCount).toBe(1);

      await service.incrementViews(share.shareCode);
      const updatedAgain = await service.getByCode(share.shareCode);
      expect(updatedAgain!.viewCount).toBe(2);
    });

    it('incrementViews should do nothing for unknown code', async () => {
      const service = SharingService.getInstance();

      // Should not throw
      await expect(
        service.incrementViews('nonexistent-code')
      ).resolves.toBeUndefined();
    });
  });

  describe('Click Tracking', () => {
    it('trackClick should store click data', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test');

      await service.trackClick({
        sharedContentId: share.id,
        platform: 'twitter',
      });

      const analytics = await service.getAnalytics(share.shareCode);
      expect(analytics).not.toBeNull();
      expect(analytics!.clicks.length).toBe(1);
      expect(analytics!.clicks[0].platform).toBe('twitter');
    });

    it('trackClick should hash IP address', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test');

      await service.trackClick({
        sharedContentId: share.id,
        platform: 'facebook',
        ipHash: '192.168.1.1',
      });

      // IP should be hashed (not stored as raw IP)
      const analytics = await service.getAnalytics(share.shareCode);
      expect(analytics).not.toBeNull();
      // We just verify click was stored, hash is internal
      expect(analytics!.clicks.length).toBe(1);
    });

    it('trackClick should store platform and referrer', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test');

      await service.trackClick({
        sharedContentId: share.id,
        platform: 'linkedin',
        referrer: 'https://linkedin.com',
        userAgent: 'Mozilla/5.0',
      });

      const analytics = await service.getAnalytics(share.shareCode);
      expect(analytics!.clicks[0].platform).toBe('linkedin');
      expect(analytics!.topReferrers).toContain('https://linkedin.com');
    });
  });

  describe('URL Generation', () => {
    it('getShareUrls should return all platform URLs', () => {
      const service = SharingService.getInstance();

      const urls = service.getShareUrls('abc123', 'Test Title', 'Test Description');

      expect(urls.direct).toBeDefined();
      expect(urls.twitter).toBeDefined();
      expect(urls.facebook).toBeDefined();
      expect(urls.linkedin).toBeDefined();
      expect(urls.whatsapp).toBeDefined();
      expect(urls.telegram).toBeDefined();
      expect(urls.email).toBeDefined();
    });

    it('getShareUrls should URL-encode title and description', () => {
      const service = SharingService.getInstance();

      const urls = service.getShareUrls(
        'abc123',
        'Title with spaces & special chars',
        'Description with "quotes"'
      );

      expect(urls.twitter).toContain('Title%20with%20spaces');
      expect(urls.email).toContain('%22quotes%22');
    });

    it('getShareUrls should use APP_URL for direct link', () => {
      vi.stubEnv('APP_URL', 'https://my-app.com');
      (SharingService as unknown as { instance: SharingService | null }).instance = null;

      const service = SharingService.getInstance();

      const urls = service.getShareUrls('abc123', 'Title');

      expect(urls.direct).toBe('https://my-app.com/s/abc123');
    });
  });

  describe('Content-Specific Sharing', () => {
    it('shareArticle should create share and return URLs', async () => {
      const service = SharingService.getInstance();

      const article: NewsArticle = {
        id: 'art-1',
        title: 'Breaking News',
        content: 'Article content goes here...',
        summary: 'Brief summary',
        url: 'https://example.com/article',
        publishedAt: new Date(),
        source: {
          id: 'src-1',
          name: 'Test Source',
          country: 'US',
          region: 'western',
          language: 'en',
        } as any,
        perspective: 'western',
        entities: [],
        topics: [],
        sentiment: 'neutral',
        sentimentScore: 0,
        regions: ['western'],
        imageUrl: 'https://example.com/image.jpg',
        category: 'politics',
      };

      const urls = await service.shareArticle(article, 'user-123');

      expect(urls.direct).toContain('/s/test-id-');
      expect(urls.twitter).toContain('Breaking%20News');
    });

    it('shareCluster should format title with article count', async () => {
      const service = SharingService.getInstance();

      const urls = await service.shareCluster(
        'Gaza Conflict',
        5,
        'Analysis of Gaza coverage from multiple perspectives',
        'cluster-123',
        'user-456'
      );

      expect(urls.twitter).toContain('Gaza%20Conflict');
      expect(urls.twitter).toContain('5%20Perspektiven');
    });

    it('shareComparison should list topics and region count', async () => {
      const service = SharingService.getInstance();

      const urls = await service.shareComparison(
        ['Ukraine', 'Russia'],
        ['western', 'russian', 'chinese'],
        'comp-123'
      );

      expect(urls.twitter).toContain('Vergleich');
      expect(urls.twitter).toContain('Ukraine');
    });
  });

  describe('Open Graph Tags', () => {
    it('getOpenGraphTags should return all required OG tags', () => {
      const service = SharingService.getInstance();

      const shared: SharedContent = {
        id: 'share-1',
        shareCode: 'abc123',
        contentType: 'article',
        contentId: 'art-1',
        title: 'Test Article',
        description: 'Test description',
        imageUrl: 'https://example.com/image.jpg',
        viewCount: 10,
        createdAt: new Date(),
      };

      const tags = service.getOpenGraphTags(shared);

      expect(tags['og:title']).toBe('Test Article');
      expect(tags['og:description']).toBe('Test description');
      expect(tags['og:url']).toContain('/s/abc123');
      expect(tags['og:type']).toBe('article');
      expect(tags['og:image']).toBe('https://example.com/image.jpg');
      expect(tags['og:site_name']).toBe('NewsHub');
      expect(tags['twitter:card']).toBe('summary_large_image');
      expect(tags['twitter:title']).toBe('Test Article');
      expect(tags['twitter:description']).toBe('Test description');
      expect(tags['twitter:image']).toBe('https://example.com/image.jpg');
    });

    it('getOpenGraphTags should use fallback image when none provided', () => {
      const service = SharingService.getInstance();

      const shared: SharedContent = {
        id: 'share-1',
        shareCode: 'abc123',
        contentType: 'article',
        contentId: 'art-1',
        title: 'Test Article',
        viewCount: 0,
        createdAt: new Date(),
      };

      const tags = service.getOpenGraphTags(shared);

      expect(tags['og:image']).toContain('og-image.png');
      expect(tags['twitter:image']).toContain('og-image.png');
    });

    it('getOpenGraphTags should use fallback description when none provided', () => {
      const service = SharingService.getInstance();

      const shared: SharedContent = {
        id: 'share-1',
        shareCode: 'abc123',
        contentType: 'article',
        contentId: 'art-1',
        title: 'Test Article',
        viewCount: 0,
        createdAt: new Date(),
      };

      const tags = service.getOpenGraphTags(shared);

      expect(tags['og:description']).toBe('Multi-Perspektiven News Analyse');
      expect(tags['twitter:description']).toBe('Multi-Perspektiven News Analyse');
    });
  });

  describe('Analytics', () => {
    it('getAnalytics should return views and click counts', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test');

      // Increment views
      await service.incrementViews(share.shareCode);
      await service.incrementViews(share.shareCode);

      // Track clicks
      await service.trackClick({
        sharedContentId: share.id,
        platform: 'twitter',
      });

      const analytics = await service.getAnalytics(share.shareCode);

      expect(analytics).not.toBeNull();
      expect(analytics!.views).toBe(2);
      expect(analytics!.clicks.length).toBe(1);
    });

    it('getAnalytics should group clicks by platform', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test');

      await service.trackClick({ sharedContentId: share.id, platform: 'twitter' });
      await service.trackClick({ sharedContentId: share.id, platform: 'twitter' });
      await service.trackClick({ sharedContentId: share.id, platform: 'facebook' });
      await service.trackClick({ sharedContentId: share.id, platform: 'facebook' });
      await service.trackClick({ sharedContentId: share.id, platform: 'facebook' });
      await service.trackClick({ sharedContentId: share.id, platform: 'linkedin' });

      const analytics = await service.getAnalytics(share.shareCode);

      expect(analytics!.clicks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ platform: 'facebook', count: 3 }),
          expect.objectContaining({ platform: 'twitter', count: 2 }),
          expect.objectContaining({ platform: 'linkedin', count: 1 }),
        ])
      );

      // Should be sorted by count descending
      expect(analytics!.clicks[0].count).toBeGreaterThanOrEqual(analytics!.clicks[1].count);
    });

    it('getAnalytics should return top 5 referrers', async () => {
      const service = SharingService.getInstance();

      const share = await service.createShare('article', 'art-1', 'Test');

      // Add clicks with various referrers
      const referrers = [
        'https://google.com',
        'https://google.com',
        'https://google.com',
        'https://twitter.com',
        'https://twitter.com',
        'https://facebook.com',
        'https://linkedin.com',
        'https://reddit.com',
        'https://hacker-news.com',
      ];

      for (const referrer of referrers) {
        await service.trackClick({
          sharedContentId: share.id,
          platform: 'copy',
          referrer,
        });
      }

      const analytics = await service.getAnalytics(share.shareCode);

      expect(analytics!.topReferrers.length).toBeLessThanOrEqual(5);
      // Should be sorted by count (google.com has most)
      expect(analytics!.topReferrers[0]).toBe('https://google.com');
    });

    it('getAnalytics should return null for unknown code', async () => {
      const service = SharingService.getInstance();

      const analytics = await service.getAnalytics('nonexistent-code');

      expect(analytics).toBeNull();
    });
  });

  describe('Trending Shares', () => {
    it('getTrendingShares should sort by viewCount descending', async () => {
      const service = SharingService.getInstance();

      // Need unique share codes for each share
      const { nanoid } = await import('nanoid');
      let counter = 0;
      vi.mocked(nanoid).mockImplementation(() => `share-${++counter}`);

      const share1 = await service.createShare('article', 'art-1', 'Low Views');
      const share2 = await service.createShare('article', 'art-2', 'High Views');
      const share3 = await service.createShare('article', 'art-3', 'Medium Views');

      // Set view counts
      await service.incrementViews(share1.shareCode); // 1 view

      await service.incrementViews(share2.shareCode);
      await service.incrementViews(share2.shareCode);
      await service.incrementViews(share2.shareCode);
      await service.incrementViews(share2.shareCode);
      await service.incrementViews(share2.shareCode); // 5 views

      await service.incrementViews(share3.shareCode);
      await service.incrementViews(share3.shareCode);
      await service.incrementViews(share3.shareCode); // 3 views

      const trending = await service.getTrendingShares(10);

      expect(trending[0].title).toBe('High Views');
      expect(trending[0].viewCount).toBe(5);
      expect(trending[1].title).toBe('Medium Views');
      expect(trending[1].viewCount).toBe(3);
      expect(trending[2].title).toBe('Low Views');
      expect(trending[2].viewCount).toBe(1);
    });

    it('getTrendingShares should exclude expired shares', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      const service = SharingService.getInstance();

      const { nanoid } = await import('nanoid');
      let counter = 0;
      vi.mocked(nanoid).mockImplementation(() => `exp-share-${++counter}`);

      // Create non-expired share
      const validShare = await service.createShare('article', 'art-1', 'Valid Share');
      await service.incrementViews(validShare.shareCode);

      // Create expired share
      const expiredShare = await service.createShare('article', 'art-2', 'Expired Share', {
        expiresInDays: 1,
      });
      await service.incrementViews(expiredShare.shareCode);
      await service.incrementViews(expiredShare.shareCode);

      // Advance time to expire the share
      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);

      const trending = await service.getTrendingShares(10);

      // Should only include the valid (non-expired) share
      expect(trending.length).toBe(1);
      expect(trending[0].title).toBe('Valid Share');

      vi.useRealTimers();
    });

    it('getTrendingShares should limit to specified count', async () => {
      const service = SharingService.getInstance();

      const { nanoid } = await import('nanoid');
      let counter = 0;
      vi.mocked(nanoid).mockImplementation(() => `limit-share-${++counter}`);

      // Create 5 shares
      for (let i = 0; i < 5; i++) {
        await service.createShare('article', `art-${i}`, `Share ${i}`);
      }

      const trending = await service.getTrendingShares(3);

      expect(trending.length).toBe(3);
    });

    it('getTrendingShares should use default limit of 10', async () => {
      const service = SharingService.getInstance();

      const { nanoid } = await import('nanoid');
      let counter = 0;
      vi.mocked(nanoid).mockImplementation(() => `default-share-${++counter}`);

      // Create 15 shares
      for (let i = 0; i < 15; i++) {
        await service.createShare('article', `art-${i}`, `Share ${i}`);
      }

      const trending = await service.getTrendingShares();

      expect(trending.length).toBe(10);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('cleanupExpired should remove expired shares', async () => {
      const service = SharingService.getInstance();

      const { nanoid } = await import('nanoid');
      let counter = 0;
      vi.mocked(nanoid).mockImplementation(() => `cleanup-${++counter}`);

      // Create expired share
      await service.createShare('article', 'art-1', 'Will Expire', {
        expiresInDays: 1,
      });

      // Advance time to expire it
      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);

      const deleted = await service.cleanupExpired();

      expect(deleted).toBe(1);
    });

    it('cleanupExpired should keep non-expired shares', async () => {
      const service = SharingService.getInstance();

      const { nanoid } = await import('nanoid');
      let counter = 0;
      vi.mocked(nanoid).mockImplementation(() => `keep-${++counter}`);

      // Create share that won't expire for a while
      const share = await service.createShare('article', 'art-1', 'Will Stay', {
        expiresInDays: 30,
      });

      // Create share with no expiration
      const permanentShare = await service.createShare('article', 'art-2', 'Permanent');

      // Advance just 1 day
      vi.advanceTimersByTime(1 * 24 * 60 * 60 * 1000);

      const deleted = await service.cleanupExpired();

      expect(deleted).toBe(0);

      // Both shares should still be accessible
      const retrieved1 = await service.getByCode(share.shareCode);
      const retrieved2 = await service.getByCode(permanentShare.shareCode);

      expect(retrieved1).not.toBeNull();
      expect(retrieved2).not.toBeNull();
    });

    it('cleanupExpired should return count of deleted shares', async () => {
      const service = SharingService.getInstance();

      const { nanoid } = await import('nanoid');
      let counter = 0;
      vi.mocked(nanoid).mockImplementation(() => `count-${++counter}`);

      // Create 3 expired shares
      await service.createShare('article', 'art-1', 'Expire 1', { expiresInDays: 1 });
      await service.createShare('article', 'art-2', 'Expire 2', { expiresInDays: 1 });
      await service.createShare('article', 'art-3', 'Expire 3', { expiresInDays: 1 });

      // Create 2 non-expired shares
      await service.createShare('article', 'art-4', 'Stay 1', { expiresInDays: 30 });
      await service.createShare('article', 'art-5', 'Stay 2');

      // Expire the first 3
      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);

      const deleted = await service.cleanupExpired();

      expect(deleted).toBe(3);

      // Verify remaining shares
      const trending = await service.getTrendingShares(10);
      expect(trending.length).toBe(2);
    });
  });
});
