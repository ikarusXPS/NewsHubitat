import { useState, useEffect } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useComments } from '../../hooks/useComments';
import { useAuth } from '../../contexts/AuthContext';
import { CommentInput } from './CommentInput';
import { CommentCard } from './CommentCard';
import { TypingIndicator } from './TypingIndicator';
import { cn } from '../../lib/utils';

interface CommentSectionProps {
  articleId: string;
  className?: string;
}

export function CommentSection({ articleId, className }: CommentSectionProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { comments, isLoading, socket } = useComments(articleId);
  const [showTyping, setShowTyping] = useState(false);

  // Listen for typing indicators from other users
  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({ articleId: eventArticleId }: { articleId: string }) => {
      if (eventArticleId === articleId) {
        setShowTyping(true);
        // Auto-hide after 2.5s (2s typing timeout + 500ms buffer)
        setTimeout(() => setShowTyping(false), 2500);
      }
    };

    socket.on('comment:typing', handleTyping);

    return () => {
      socket.off('comment:typing', handleTyping);
    };
  }, [socket, articleId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
      </div>
    );
  }

  return (
    <div className={cn('mt-12', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-5 w-5 text-[#00f0ff]" />
        <h2 className="text-lg font-semibold font-mono">
          {t('comments.heading', 'Comments')}
        </h2>
        <span className="px-2 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff] text-xs font-mono">
          {comments.length}
        </span>
      </div>

      {/* Input at top per Claude's discretion */}
      {isAuthenticated ? (
        <div className="mb-8">
          <CommentInput articleId={articleId} socket={socket} />
          {showTyping && <TypingIndicator />}
        </div>
      ) : (
        <div className="glass-card p-6 rounded-lg mb-8 text-center">
          <p className="text-gray-400 font-mono text-sm">
            {t('comments.authRequired', 'Sign in to join the discussion')}
          </p>
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="glass-card p-12 rounded-lg text-center">
          <h3 className="text-lg font-semibold mb-2">
            {t('comments.emptyState.heading', 'No comments yet')}
          </h3>
          <p className="text-gray-400 text-sm">
            {t('comments.emptyState.body', 'Be the first to share your thoughts on this article.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              articleId={articleId}
              socket={socket}
            />
          ))}
        </div>
      )}
    </div>
  );
}
