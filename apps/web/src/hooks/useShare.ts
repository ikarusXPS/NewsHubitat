import { useMutation, useQuery } from '@tanstack/react-query';
import type { NewsArticle } from '../types';

// Types matching backend
export interface ShareUrls {
  direct: string;
  twitter: string;
  facebook: string;
  linkedin: string;
  whatsapp: string;
  telegram: string;
  email: string;
}

export interface SharedContent {
  id: string;
  shareCode: string;
  contentType: 'article' | 'cluster' | 'comparison' | 'digest';
  contentId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  viewCount: number;
  createdAt: string;
  analytics?: {
    views: number;
    clicks: { platform: string; count: number }[];
    topReferrers: string[];
  };
}

/**
 * Create a shareable link for an article
 */
export function useCreateShare() {
  return useMutation({
    mutationFn: async (article: NewsArticle): Promise<ShareUrls> => {
      const response = await fetch('/api/share/article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
        },
        body: JSON.stringify({
          article: {
            id: article.id,
            title: article.title,
            summary: article.summary || article.content?.slice(0, 200) || '',
            imageUrl: article.imageUrl,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const data = await response.json();
      return data.data as ShareUrls;
    },
  });
}

/**
 * Track share click (fire-and-forget per RESEARCH.md)
 */
export function useShareClick() {
  return useMutation({
    mutationFn: async ({
      shareCode,
      platform,
    }: {
      shareCode: string;
      platform: string;
    }) => {
      await fetch(`/api/share/${shareCode}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
    },
    // Fire and forget - don't block navigation
    onError: (err) => console.error('Share tracking failed:', err),
  });
}

/**
 * Fetch current user's shares (for My Shares section)
 */
export function useUserShares() {
  return useQuery({
    queryKey: ['user-shares'],
    queryFn: async (): Promise<SharedContent[]> => {
      const token = localStorage.getItem('newshub-auth-token');
      if (!token) return [];

      const response = await fetch('/api/share/my', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error('Failed to fetch shares');
      }

      const data = await response.json();
      return data.data as SharedContent[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
