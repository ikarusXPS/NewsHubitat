import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Clock,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  Share2,
  Eye,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { NewsArticle } from '../types';

interface NewsCardPremiumProps {
  article: NewsArticle;
  isBookmarked?: boolean;
  onBookmark?: (id: string) => void;
  onTranslate?: (id: string) => void;
  showTranslation?: boolean;
}

const PERSPECTIVE_COLORS: Record<string, { gradient: string; badge: string }> = {
  usa: {
    gradient: 'from-blue-500/20 via-transparent to-transparent',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  },
  europa: {
    gradient: 'from-purple-500/20 via-transparent to-transparent',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  },
  deutschland: {
    gradient: 'from-gray-500/20 via-transparent to-transparent',
    badge: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
  },
  nahost: {
    gradient: 'from-green-500/20 via-transparent to-transparent',
    badge: 'bg-green-500/20 text-green-300 border-green-400/30',
  },
  tuerkei: {
    gradient: 'from-red-500/20 via-transparent to-transparent',
    badge: 'bg-red-500/20 text-red-300 border-red-400/30',
  },
  russland: {
    gradient: 'from-red-600/20 via-transparent to-transparent',
    badge: 'bg-red-600/20 text-red-300 border-red-500/30',
  },
  china: {
    gradient: 'from-yellow-500/20 via-transparent to-transparent',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
  },
  asien: {
    gradient: 'from-cyan-500/20 via-transparent to-transparent',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
  },
  afrika: {
    gradient: 'from-lime-500/20 via-transparent to-transparent',
    badge: 'bg-lime-500/20 text-lime-300 border-lime-400/30',
  },
  lateinamerika: {
    gradient: 'from-amber-500/20 via-transparent to-transparent',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  },
  ozeanien: {
    gradient: 'from-teal-500/20 via-transparent to-transparent',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-400/30',
  },
  kanada: {
    gradient: 'from-red-500/20 via-transparent to-transparent',
    badge: 'bg-red-500/20 text-red-300 border-red-400/30',
  },
  alternative: {
    gradient: 'from-emerald-500/20 via-transparent to-transparent',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
};

const PERSPECTIVE_LABELS: Record<string, string> = {
  usa: 'USA',
  europa: 'Europa',
  deutschland: 'Deutschland',
  nahost: 'Nahost',
  tuerkei: 'Türkei',
  russland: 'Russland',
  china: 'China',
  asien: 'Asien',
  afrika: 'Afrika',
  lateinamerika: 'Lateinamerika',
  ozeanien: 'Ozeanien',
  kanada: 'Kanada',
  alternative: 'Alternative',
};

function formatTimeAgo(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
}

function SentimentIndicator({ sentiment }: { sentiment: string }) {
  if (sentiment === 'positive') {
    return (
      <div className="flex items-center gap-1 text-green-400">
        <TrendingUp className="h-3.5 w-3.5" />
        <span className="text-xs">Positiv</span>
      </div>
    );
  }
  if (sentiment === 'negative') {
    return (
      <div className="flex items-center gap-1 text-red-400">
        <TrendingDown className="h-3.5 w-3.5" />
        <span className="text-xs">Negativ</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-gray-400">
      <Minus className="h-3.5 w-3.5" />
      <span className="text-xs">Neutral</span>
    </div>
  );
}

export function NewsCardPremium({
  article,
  isBookmarked = false,
  onBookmark,
  onTranslate,
  showTranslation = false,
}: NewsCardPremiumProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const perspectiveStyle = PERSPECTIVE_COLORS[article.perspective] || PERSPECTIVE_COLORS.western;
  const perspectiveLabel = PERSPECTIVE_LABELS[article.perspective] || article.perspective;

  const displayTitle = showTranslation && article.titleTranslated?.de
    ? article.titleTranslated.de
    : article.title;
  const displaySummary = showTranslation && article.contentTranslated?.de
    ? article.contentTranslated.de.substring(0, 200) + '...'
    : article.summary || '';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        'group relative overflow-hidden rounded-2xl',
        'bg-gray-800/50 backdrop-blur-xl',
        'border border-gray-700/50',
        'transition-all duration-500',
        'hover:border-gray-600/50 hover:shadow-2xl hover:shadow-blue-500/10'
      )}
    >
      {/* Gradient overlay based on region */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500',
        perspectiveStyle.gradient,
        isHovered && 'opacity-100'
      )} />

      {/* Glow effect */}
      <div className={cn(
        'absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500',
        'bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50 blur-sm',
        isHovered && 'opacity-30'
      )} />

      <div className="relative z-10">
        {/* Image */}
        {article.imageUrl && !imageError && (
          <div className="relative h-48 overflow-hidden">
            <motion.img
              src={article.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover"
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.5 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />

            {/* Floating badges on image */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-medium border backdrop-blur-md',
                perspectiveStyle.badge
              )}>
                {perspectiveLabel}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onBookmark?.(article.id)}
                  className={cn(
                    'rounded-full p-2 backdrop-blur-md transition-all',
                    'hover:scale-110',
                    isBookmarked
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-gray-900/50 text-gray-300 hover:bg-gray-800/80'
                  )}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTimeAgo(article.publishedAt)}
            </span>
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{article.source.name}</span>
            </span>
            <SentimentIndicator sentiment={article.sentiment} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-300 transition-colors">
            {displayTitle}
          </h3>

          {/* Summary */}
          <p className="text-sm text-gray-400 line-clamp-3 mb-4">
            {displaySummary}
          </p>

          {/* Actions */}
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center justify-between pt-4 border-t border-gray-700/50"
            >
              <div className="flex items-center gap-2">
                {/* Translate button */}
                {onTranslate && (
                  <button
                    onClick={() => onTranslate(article.id)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                      'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50',
                      showTranslation && 'bg-blue-600/20 text-blue-300'
                    )}
                  >
                    {showTranslation ? 'Original' : 'Übersetzen'}
                  </button>
                )}

                {/* Share button */}
                <button
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({ url: article.url, title: article.title });
                      } catch (err) {
                        // User cancelled or share failed - ignore AbortError
                        if ((err as Error).name !== 'AbortError') {
                          // Fallback to clipboard on non-cancel errors
                          await navigator.clipboard.writeText(article.url);
                        }
                      }
                    } else {
                      // Fallback: copy to clipboard for unsupported browsers
                      await navigator.clipboard.writeText(article.url);
                    }
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2',
                  'bg-gradient-to-r from-blue-600 to-purple-600',
                  'text-sm font-medium text-white',
                  'hover:from-blue-500 hover:to-purple-500',
                  'transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25'
                )}
              >
                <Eye className="h-4 w-4" />
                Lesen
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
