import { Share2, Eye, MousePointer, ExternalLink, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserShares } from '../../hooks/useShare';
import { useAppStore } from '../../store';
import { formatDateTime } from '../../lib/formatters';

// Platform colors for click breakdown badges
const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  whatsapp: '#25D366',
  facebook: '#1877F2',
  native: '#00f0ff',
  copy: '#00ff88',
};

export function MyShares() {
  const { t } = useTranslation('share');
  const { language } = useAppStore();
  const { data: shares, isLoading, error } = useUserShares();

  // Graceful degradation per D-10: don't break page on error
  if (error) {
    console.error('Failed to load shares:', error);
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
      </div>
    );
  }

  // Empty state per UI-SPEC
  if (!shares || shares.length === 0) {
    return (
      <div className="text-center py-8">
        <Share2 className="h-10 w-10 text-gray-600 mx-auto mb-3" />
        <h4 className="text-sm font-medium text-gray-400 mb-1">
          {t('myShares.noShares')}
        </h4>
        <p className="text-xs text-gray-500">
          {t('myShares.noSharesBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {shares.map((share) => {
        const totalClicks = share.analytics?.clicks.reduce((sum, c) => sum + c.count, 0) || 0;

        return (
          <div
            key={share.id}
            className="glass-panel rounded-lg p-4 hover:border-[#00f0ff]/30 transition-colors"
          >
            {/* Title and date */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h4 className="text-sm font-medium text-white line-clamp-2 flex-1">
                {share.title.length > 60 ? `${share.title.slice(0, 60)}...` : share.title}
              </h4>
              <a
                href={`/s/${share.shareCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-gray-500 hover:text-[#00f0ff] transition-colors"
                title="Open share link"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs">
              {/* Views */}
              <div className="flex items-center gap-1.5 text-gray-400">
                <Eye className="h-3.5 w-3.5" />
                <span className="font-mono">
                  {share.analytics?.views || share.viewCount}
                </span>
                <span className="text-gray-500">
                  {language === 'de' ? 'Aufrufe' : 'views'}
                </span>
              </div>

              {/* Clicks */}
              <div className="flex items-center gap-1.5 text-gray-400">
                <MousePointer className="h-3.5 w-3.5" />
                <span className="font-mono">{totalClicks}</span>
                <span className="text-gray-500">
                  {language === 'de' ? 'Klicks' : 'clicks'}
                </span>
              </div>

              {/* Date */}
              <span className="text-gray-500 ml-auto">
                {formatDateTime(share.createdAt)}
              </span>
            </div>

            {/* Click breakdown badges */}
            {share.analytics && share.analytics.clicks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-700/50">
                {share.analytics.clicks.map(({ platform, count }) => (
                  <span
                    key={platform}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono"
                    style={{
                      backgroundColor: `${PLATFORM_COLORS[platform] || '#666'}20`,
                      color: PLATFORM_COLORS[platform] || '#999',
                    }}
                  >
                    {platform}
                    <span className="opacity-70">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
