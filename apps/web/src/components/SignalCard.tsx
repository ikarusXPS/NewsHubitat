import { useState } from 'react';
import {
  ExternalLink,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Share2,
  Radio,
  Shield,
  Target,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';
import { ShareButtons } from './sharing';
import { BookmarkButton } from './BookmarkButton';
import { useCreateShare, type ShareUrls } from '../hooks/useShare';
import { ResponsiveImage } from './ResponsiveImage';
import type { NewsArticle } from '../types';
import { logger } from '../lib/logger';

interface SignalCardProps {
  article: NewsArticle;
  isBookmarked?: boolean;
  onBookmark?: (id: string) => void;
  index?: number;
  isRead?: boolean;
  onToggleRead?: (id: string) => void;
}

const PERSPECTIVE_STYLES: Record<string, { color: string; label: string }> = {
  afrika: { color: '#10b981', label: 'Afrika' },
  alternative: { color: '#8b5cf6', label: 'Alternative' },
  asien: { color: '#f97316', label: 'Asien' },
  china: { color: '#eab308', label: 'China' },
  deutschland: { color: '#06b6d4', label: 'Deutschland' },
  europa: { color: '#a855f7', label: 'Europa' },
  kanada: { color: '#dc2626', label: 'Kanada' },
  lateinamerika: { color: '#14b8a6', label: 'Lateinamerika' },
  nahost: { color: '#f59e0b', label: 'Nahost' },
  ozeanien: { color: '#0ea5e9', label: 'Ozeanien' },
  russland: { color: '#ef4444', label: 'Russland' },
  tuerkei: { color: '#ec4899', label: 'Türkei' },
  usa: { color: '#00f0ff', label: 'USA' },
};

// Calculate severity based on sentiment and content
function getSeverity(article: NewsArticle): 'critical' | 'high' | 'medium' | 'low' {
  if (article.sentiment === 'negative') return 'high';
  if (article.sentiment === 'positive') return 'low';
  return 'medium';
}

// Convert country code to flag emoji
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function SignalCard({ article, isBookmarked, onBookmark, index = 0, isRead = false, onToggleRead }: SignalCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [shareUrls, setShareUrls] = useState<ShareUrls | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const { setSearchQuery, setActiveSourceFilter, feedState } = useAppStore();
  const createShare = useCreateShare();

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (shareUrls || isCreatingShare) return;
    setIsCreatingShare(true);
    try {
      const urls = await createShare.mutateAsync(article);
      setShareUrls(urls);
      setShareCode(urls.direct.split('/s/')[1]);
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Failed to create share:', err);
      }
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleSourceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveSourceFilter(article.source.id);
  };

  const handleToggleRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleRead?.(article.id);
  };

  const isFilteredByThisSource = feedState.activeSourceFilter === article.source.id;
  const perspective = PERSPECTIVE_STYLES[article.perspective] || PERSPECTIVE_STYLES.usa;
  const severity = getSeverity(article);
  const hasValidImage = article.imageUrl && article.imageUrl.trim() !== '';

  const timeAgo = formatTimeAgo(new Date(article.publishedAt));

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'signal-card group animate-fade-in',
        severity === 'critical' && 'signal-card-critical',
        isRead && 'opacity-55 hover:opacity-80'
      )}
    >
      {/* Top Gradient Line */}
      <div
        className="h-0.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${perspective.color}, transparent)`,
          opacity: isHovered ? 1 : 0.5,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        {hasValidImage ? (
          <ResponsiveImage
            src={article.imageUrl}
            alt={article.title}
            priority={index < 6}
            aspectRatio="16:9"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          /* Enhanced fallback placeholder with perspective-colored gradient + pattern */
          <div
            className="h-full w-full flex items-center justify-center relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${perspective.color}20 0%, #0a0e1a 40%, #060912 60%, ${perspective.color}15 100%)`,
            }}
          >
            {/* Animated background pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(45deg, ${perspective.color}20 0px, transparent 2px, transparent 8px),
                  repeating-linear-gradient(-45deg, ${perspective.color}15 0px, transparent 2px, transparent 8px)
                `,
              }}
            />

            {/* Radial gradient accent */}
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
              style={{
                background: `radial-gradient(circle, ${perspective.color} 0%, transparent 70%)`,
              }}
            />

            {/* Content */}
            <div className="flex flex-col items-center gap-3 z-10">
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: `${perspective.color}10`,
                  border: `1px solid ${perspective.color}20`,
                }}
              >
                <Radio className="h-7 w-7" style={{ color: perspective.color }} />
              </div>
              <div className="text-center">
                <span
                  className="text-[11px] font-mono uppercase tracking-widest font-bold"
                  style={{ color: perspective.color, opacity: 0.7 }}
                >
                  {article.source.name}
                </span>
                <div className="text-[9px] font-mono text-gray-600 mt-1">
                  {perspective.label}
                </div>
              </div>
            </div>

            {/* Corner accent */}
            <div
              className="absolute bottom-0 left-0 w-0 h-0"
              style={{
                borderLeft: `60px solid ${perspective.color}15`,
                borderTop: '60px solid transparent',
              }}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent" />

        {/* Floating badges on image */}
        <div className="absolute top-3 left-3 flex gap-2">
          {/* Severity Badge */}
          <span
            className={cn(
              'badge-severity',
              severity === 'critical' && 'badge-critical',
              severity === 'high' && 'badge-high',
              severity === 'medium' && 'badge-medium',
              severity === 'low' && 'badge-low'
            )}
          >
            {severity === 'critical' && <AlertTriangle className="h-3 w-3" />}
            {severity}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Meta Row */}
        <div className="flex items-center justify-between">
          {/* Perspective Badge */}
          <span
            className="perspective-badge"
            style={{
              backgroundColor: `${perspective.color}15`,
              borderColor: `${perspective.color}30`,
              color: perspective.color,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: perspective.color }}
            />
            {perspective.label}
          </span>

          {/* Time */}
          <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>

        {/* Source - Clickable */}
        <div className="flex items-center gap-2">
          {article.source.country && (
            <span className="text-base" title={article.source.country}>
              {getCountryFlag(article.source.country)}
            </span>
          )}
          {article.source.icon && (
            <img
              src={article.source.icon}
              alt={article.source.name}
              loading="lazy"
              decoding="async"
              className="h-4 w-4 rounded"
            />
          )}
          <button
            onClick={handleSourceClick}
            className={cn(
              'flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider transition-colors',
              isFilteredByThisSource
                ? 'text-[#00f0ff]'
                : 'text-gray-400 hover:text-[#00f0ff]'
            )}
            title="Filter by this source"
          >
            {isFilteredByThisSource && <Target className="h-3 w-3" />}
            {article.source.name}
          </button>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-[#00f0ff] transition-colors">
          {article.title}
        </h3>

        {/* Summary */}
        {article.summary && (
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {article.summary}
          </p>
        )}

        {/* Sentiment & Confidence */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {article.sentiment === 'positive' && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#00ff88]">
                <TrendingUp className="h-3 w-3" />
                Positive
              </span>
            )}
            {article.sentiment === 'negative' && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#ff0044]">
                <TrendingDown className="h-3 w-3" />
                Negative
              </span>
            )}
            {article.sentiment === 'neutral' && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
                <Minus className="h-3 w-3" />
                Neutral
              </span>
            )}
          </div>

          {/* Confidence Score */}
          {article.confidence !== undefined && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border"
              style={{
                backgroundColor: `rgba(${article.confidence > 70 ? '0, 255, 136' : article.confidence > 40 ? '255, 204, 0' : '255, 102, 0'}, 0.1)`,
                borderColor: `rgba(${article.confidence > 70 ? '0, 255, 136' : article.confidence > 40 ? '255, 204, 0' : '255, 102, 0'}, 0.3)`,
              }}
              title={`Confidence: ${article.confidence}% (based on ${article.topics.length} topics, ${article.entities.length} entities, source reliability ${article.source.bias.reliability}/10)`}
            >
              <Shield
                className="h-3 w-3"
                style={{
                  color: article.confidence > 70 ? '#00ff88' : article.confidence > 40 ? '#ffcc00' : '#ff6600',
                }}
              />
              <span
                className="text-[10px] font-mono font-bold"
                style={{
                  color: article.confidence > 70 ? '#00ff88' : article.confidence > 40 ? '#ffcc00' : '#ff6600',
                }}
              >
                {article.confidence}%
              </span>
            </div>
          )}
        </div>

        {/* Topics */}
        {article.topics && article.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.topics.slice(0, 3).map((topic) => (
              <button
                key={topic}
                onClick={() => setSearchQuery(topic)}
                className="rounded bg-gray-800/50 px-2 py-0.5 text-[10px] font-mono text-gray-400 border border-gray-700/50 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff] hover:border-[#00f0ff]/30 transition-colors cursor-pointer"
              >
                #{topic}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
          <div className="flex items-center gap-1">
            {/* Read Toggle */}
            <button
              onClick={handleToggleRead}
              className={cn(
                'p-2 rounded-md transition-colors',
                isRead
                  ? 'text-[#00ff88] bg-[#00ff88]/10'
                  : 'text-gray-500 hover:text-[#00ff88] hover:bg-[#00ff88]/5'
              )}
              title={isRead ? 'Mark as unread' : 'Mark as read'}
            >
              {isRead ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>

            {/* Bookmark */}
            <BookmarkButton
              articleId={article.id}
              isBookmarked={isBookmarked ?? false}
              onPersonalBookmark={() => onBookmark?.(article.id)}
            />

            {/* Share */}
            {shareUrls && shareCode ? (
              <ShareButtons shareCode={shareCode} title={article.title} urls={shareUrls} />
            ) : (
              <button
                onClick={handleShare}
                disabled={isCreatingShare}
                className="p-2 rounded-md text-gray-500 hover:text-[#bf00ff] hover:bg-[#bf00ff]/5 transition-colors"
                title="Share article"
              >
                {isCreatingShare ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              </button>
            )}
          </div>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cyber py-1.5 px-3 rounded-md text-[10px] flex items-center gap-1.5"
          >
            Read More
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date | string | undefined | null): string {
  if (!date) return 'Unknown';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(dateObj.getTime())) {
    return 'Unknown';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();

  // Handle future dates (shouldn't happen, but safety check)
  if (diffMs < 0) return 'Just now';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return dateObj.toLocaleDateString();
}
