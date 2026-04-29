import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Socket } from 'socket.io-client';
import { CommentCard } from './CommentCard';

interface Comment {
  id: string;
  text: string;
  userId: string;
  user: { id: string; name: string; avatarUrl: string | null };
  isDeleted: boolean;
  isEdited: boolean;
  isFlagged: boolean;
  createdAt: string;
}

interface ReplyThreadProps {
  replies: Comment[];
  articleId: string;
  socket: Socket | null;
  defaultCollapsed?: boolean;
}

export function ReplyThread({
  replies,
  articleId,
  socket,
  defaultCollapsed = true,
}: ReplyThreadProps) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (replies.length === 0) return null;

  return (
    <div className="mt-4 ml-6 border-l-2 border-gray-800 pl-4">
      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#00f0ff] mb-2 transition-colors"
      >
        {isCollapsed ? (
          <>
            <ChevronDown className="h-3 w-3" />
            <span>{t('comments.showReplies', { count: replies.length, defaultValue: `Show ${replies.length} replies` })}</span>
          </>
        ) : (
          <>
            <ChevronUp className="h-3 w-3" />
            <span>{t('comments.hideReplies', 'Hide replies')}</span>
          </>
        )}
      </button>

      {/* Replies */}
      {!isCollapsed && (
        <div className="space-y-3">
          {replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              articleId={articleId}
              socket={socket}
            />
          ))}
        </div>
      )}
    </div>
  );
}
