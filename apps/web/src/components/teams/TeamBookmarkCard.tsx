/**
 * TeamBookmarkCard - Bookmark card with "Added by" attribution
 */

import { Trash2, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useRemoveTeamBookmark, type TeamBookmark } from '../../hooks/useTeamBookmarks';
import { useAuth } from '../../contexts/AuthContext';
import type { TeamRole } from '../../hooks/useTeams';

interface TeamBookmarkCardProps {
  bookmark: TeamBookmark;
  teamId: string;
  userRole: TeamRole;
  articleTitle?: string;
  articleUrl?: string;
}

export function TeamBookmarkCard({
  bookmark,
  teamId,
  userRole,
  articleTitle,
  articleUrl,
}: TeamBookmarkCardProps) {
  const { t } = useTranslation('teams');
  const { user } = useAuth();
  const { mutate: removeBookmark, isPending } = useRemoveTeamBookmark(teamId);

  // D-06: Original adder or admin+ can remove
  const canRemove = bookmark.addedBy === user?.id || userRole !== 'member';

  const handleRemove = () => {
    if (!confirm(t('confirm.removeBookmark.message', 'Remove this article from team bookmarks?'))) return;
    removeBookmark(bookmark.id);
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(bookmark.createdAt));

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="glass-panel rounded-lg p-4 hover:border-[#00f0ff]/30 transition-colors"
    >
      {/* Header with user attribution */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        >
          {bookmark.addedByUser.name[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-gray-500">
            {t('addedBy', { name: bookmark.addedByUser.name, defaultValue: 'Added by {{name}}' })}
          </span>
          <span className="text-xs text-gray-600 ml-2">{formattedDate}</span>
        </div>
        {canRemove && (
          <button
            onClick={handleRemove}
            disabled={isPending}
            className={cn(
              'p-2 rounded-lg text-gray-400 hover:text-[#ff0044] hover:bg-[rgba(255,0,68,0.1)] transition-colors',
              'touch-target',
              isPending && 'opacity-50 cursor-not-allowed'
            )}
            aria-label={t('actions.removeBookmark', 'Remove bookmark')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Article content */}
      <div className="space-y-2">
        <a
          href={articleUrl || `/article/${bookmark.articleId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <h3 className="font-medium text-white group-hover:text-[#00f0ff] transition-colors line-clamp-2">
            {articleTitle || `Article ${bookmark.articleId}`}
          </h3>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <ExternalLink className="h-3 w-3" />
            <span>{t('openArticle', 'Open article')}</span>
          </div>
        </a>
        {bookmark.note && (
          <p className="text-sm text-gray-400 italic">"{bookmark.note}"</p>
        )}
      </div>
    </motion.div>
  );
}
