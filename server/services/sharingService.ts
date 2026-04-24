/**
 * Social Sharing Service
 * Handles shareable links, social media integration, and analytics
 */

import { nanoid } from 'nanoid';
import logger from '../utils/logger';
import type { NewsArticle } from '../../src/types';

export type ContentType = 'article' | 'cluster' | 'comparison' | 'digest';
export type Platform = 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'telegram' | 'email' | 'copy';

export interface SharedContent {
  id: string;
  shareCode: string;
  contentType: ContentType;
  contentId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  createdBy?: string;
  viewCount: number;
  expiresAt?: Date;
  createdAt: Date;
}

export interface ShareClickData {
  sharedContentId: string;
  platform: Platform;
  referrer?: string;
  userAgent?: string;
  ipHash?: string;
}

export interface ShareUrls {
  direct: string;
  twitter: string;
  facebook: string;
  linkedin: string;
  whatsapp: string;
  telegram: string;
  email: string;
}

// In-memory storage (replace with DB in production)
const sharedContents = new Map<string, SharedContent>();
const shareClicks: ShareClickData[] = [];

export class SharingService {
  private static instance: SharingService;
  private readonly appUrl: string;
  private readonly shareCodeLength = 8;

  private constructor() {
    this.appUrl = process.env.APP_URL || 'http://localhost:5173';
    logger.info('✓ Sharing service initialized');
  }

  static getInstance(): SharingService {
    if (!SharingService.instance) {
      SharingService.instance = new SharingService();
    }
    return SharingService.instance;
  }

  /**
   * Generate a unique share code
   */
  private generateShareCode(): string {
    return nanoid(this.shareCodeLength);
  }

  /**
   * Create a shareable link for content
   */
  async createShare(
    contentType: ContentType,
    contentId: string,
    title: string,
    options: {
      description?: string;
      imageUrl?: string;
      createdBy?: string;
      expiresInDays?: number;
    } = {}
  ): Promise<SharedContent> {
    const shareCode = this.generateShareCode();
    const now = new Date();

    const shared: SharedContent = {
      id: nanoid(),
      shareCode,
      contentType,
      contentId,
      title,
      description: options.description,
      imageUrl: options.imageUrl,
      createdBy: options.createdBy,
      viewCount: 0,
      expiresAt: options.expiresInDays
        ? new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      createdAt: now,
    };

    sharedContents.set(shareCode, shared);
    logger.debug(`Created share: ${shareCode} for ${contentType}:${contentId}`);

    return shared;
  }

  /**
   * Get shared content by code
   */
  async getByCode(shareCode: string): Promise<SharedContent | null> {
    const shared = sharedContents.get(shareCode);

    if (!shared) return null;

    // Check expiration
    if (shared.expiresAt && shared.expiresAt < new Date()) {
      sharedContents.delete(shareCode);
      return null;
    }

    return shared;
  }

  /**
   * Increment view count
   */
  async incrementViews(shareCode: string): Promise<void> {
    const shared = sharedContents.get(shareCode);
    if (shared) {
      shared.viewCount++;
    }
  }

  /**
   * Track share click
   */
  async trackClick(data: ShareClickData): Promise<void> {
    shareClicks.push({
      ...data,
      // Hash IP for privacy
      ipHash: data.ipHash ? this.hashString(data.ipHash) : undefined,
    });
  }

  /**
   * Generate all share URLs for content
   */
  getShareUrls(shareCode: string, title: string, description?: string): ShareUrls {
    const shareUrl = `${this.appUrl}/s/${shareCode}`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedDesc = encodeURIComponent(description || title);

    return {
      direct: shareUrl,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
    };
  }

  /**
   * Create share for article
   */
  async shareArticle(article: NewsArticle, userId?: string): Promise<ShareUrls> {
    const shared = await this.createShare('article', article.id, article.title, {
      description: article.summary || article.content.slice(0, 200),
      imageUrl: article.imageUrl,
      createdBy: userId,
    });

    return this.getShareUrls(shared.shareCode, article.title, shared.description);
  }

  /**
   * Create share for cluster analysis
   */
  async shareCluster(
    topic: string,
    articleCount: number,
    summary: string,
    clusterId: string,
    userId?: string
  ): Promise<ShareUrls> {
    const title = `${topic} - ${articleCount} Perspektiven`;
    const shared = await this.createShare('cluster', clusterId, title, {
      description: summary,
      createdBy: userId,
    });

    return this.getShareUrls(shared.shareCode, title, summary);
  }

  /**
   * Create share for comparison
   */
  async shareComparison(
    topics: string[],
    regions: string[],
    comparisonId: string,
    userId?: string
  ): Promise<ShareUrls> {
    const title = `Vergleich: ${topics.join(', ')}`;
    const description = `Berichterstattung aus ${regions.length} Regionen`;
    const shared = await this.createShare('comparison', comparisonId, title, {
      description,
      createdBy: userId,
    });

    return this.getShareUrls(shared.shareCode, title, description);
  }

  /**
   * Generate Open Graph meta tags for shared content
   */
  getOpenGraphTags(shared: SharedContent): Record<string, string> {
    const shareUrl = `${this.appUrl}/s/${shared.shareCode}`;

    return {
      'og:title': shared.title,
      'og:description': shared.description || 'Multi-Perspektiven News Analyse',
      'og:url': shareUrl,
      'og:type': 'article',
      'og:image': shared.imageUrl || `${this.appUrl}/og-image.png`,
      'og:site_name': 'NewsHub',
      'twitter:card': 'summary_large_image',
      'twitter:title': shared.title,
      'twitter:description': shared.description || 'Multi-Perspektiven News Analyse',
      'twitter:image': shared.imageUrl || `${this.appUrl}/og-image.png`,
    };
  }

  /**
   * Get all shares created by a user
   */
  async getUserShares(userId: string): Promise<SharedContent[]> {
    const userShares: SharedContent[] = [];
    for (const shared of sharedContents.values()) {
      if (shared.createdBy === userId && (!shared.expiresAt || shared.expiresAt > new Date())) {
        userShares.push(shared);
      }
    }
    return userShares.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get share analytics
   */
  async getAnalytics(shareCode: string): Promise<{
    views: number;
    clicks: { platform: Platform; count: number }[];
    topReferrers: string[];
  } | null> {
    const shared = sharedContents.get(shareCode);
    if (!shared) return null;

    const clicks = shareClicks.filter((c) => c.sharedContentId === shared.id);

    // Count by platform
    const platformCounts = new Map<Platform, number>();
    const referrerCounts = new Map<string, number>();

    for (const click of clicks) {
      platformCounts.set(click.platform, (platformCounts.get(click.platform) || 0) + 1);
      if (click.referrer) {
        referrerCounts.set(click.referrer, (referrerCounts.get(click.referrer) || 0) + 1);
      }
    }

    return {
      views: shared.viewCount,
      clicks: Array.from(platformCounts.entries())
        .map(([platform, count]) => ({ platform, count }))
        .sort((a, b) => b.count - a.count),
      topReferrers: Array.from(referrerCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([referrer]) => referrer),
    };
  }

  /**
   * Get trending shares
   */
  async getTrendingShares(limit: number = 10): Promise<SharedContent[]> {
    const shares = Array.from(sharedContents.values())
      .filter((s) => !s.expiresAt || s.expiresAt > new Date())
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);

    return shares;
  }

  /**
   * Delete expired shares
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    let deleted = 0;

    for (const [code, shared] of sharedContents) {
      if (shared.expiresAt && shared.expiresAt < now) {
        sharedContents.delete(code);
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.debug(`Cleaned up ${deleted} expired shares`);
    }

    return deleted;
  }

  /**
   * Simple string hash for IP anonymization
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export default SharingService;
