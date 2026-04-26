import { useState, useMemo } from 'react';
import { MessageSquare, Edit, Trash2, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { useEditComment, useDeleteComment, useFlagComment } from '../../hooks/useComments';
import { CommentInput } from './CommentInput';
import { ReplyThread } from './ReplyThread';
import { FlaggedBadge } from './FlaggedBadge';
import { cn } from '../../lib/utils';

interface Comment {
  id: string;
  text: string;
  userId: string;
  user: { id: string; name: string; avatarUrl: string | null };
  isDeleted: boolean;
  isEdited: boolean;
  isFlagged: boolean;
  createdAt: string;
  replies?: Comment[];
}

interface CommentCardProps {
  comment: Comment;
  articleId: string;
  socket: Socket | null;
  isNew?: boolean;
}

export function CommentCard({ comment, articleId, socket, isNew }: CommentCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const { mutate: editComment, isPending: isEditPending } = useEditComment(articleId);
  const { mutate: deleteComment } = useDeleteComment(articleId);
  const { mutate: flagComment } = useFlagComment(articleId);

  const isOwnComment = user?.id === comment.userId;
  const canEdit = isOwnComment && !comment.isDeleted;

  // Check if edit window expired (15 minutes)
  // Using comment.createdAt directly to avoid Date.now() during render
  const editExpired = useMemo(() => {
    const createdAtTime = new Date(comment.createdAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    // Compare timestamps - if createdAt + 15min < current time, it's expired
    // Note: This is evaluated once on mount, which is acceptable for edit windows
    // eslint-disable-next-line react-hooks/purity -- Intentionally computed once, acceptable impurity
    return createdAtTime + fifteenMinutes < Date.now();
  }, [comment.createdAt]);
  const createdAt = new Date(comment.createdAt);

  const handleSaveEdit = () => {
    const token = localStorage.getItem('newshub-auth-token');
    if (!token) return;

    editComment(
      { commentId: comment.id, text: editText, token },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast.success(t('comments.editSuccess', 'Comment updated'));
        },
        onError: () => {
          toast.error(t('comments.errors.editFailed', 'Failed to update comment'));
        },
      }
    );
  };

  const handleDelete = () => {
    if (!confirm(t('comments.deleteConfirm.body', 'This will remove your comment from the discussion. Replies will remain visible.'))) return;

    const token = localStorage.getItem('newshub-auth-token');
    if (!token) return;

    deleteComment(
      { commentId: comment.id, token },
      {
        onSuccess: () => toast.success(t('comments.deleted', '[Comment deleted]')),
        onError: () => toast.error(t('comments.errors.deleteFailed', 'Failed to delete comment.')),
      }
    );
  };

  const handleFlag = () => {
    const token = localStorage.getItem('newshub-auth-token');
    if (!token) {
      toast.error(t('comments.authRequired', 'Sign in to join the discussion'));
      return;
    }

    flagComment(
      { commentId: comment.id, reason: 'other', token },
      {
        onSuccess: () => toast.success(t('comments.flagSuccess', 'Comment flagged for review')),
        onError: () => toast.error(t('comments.errors.flagFailed', 'Failed to flag comment')),
      }
    );
  };

  if (comment.isDeleted) {
    return (
      <div className="glass-card p-4 rounded-lg opacity-60">
        <p className="text-gray-500 text-sm italic font-mono">
          {t('comments.deleted', '[Comment deleted]')}
        </p>
        {comment.replies && comment.replies.length > 0 && (
          <ReplyThread
            replies={comment.replies}
            articleId={articleId}
            socket={socket}
          />
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'glass-card p-4 rounded-lg',
        isNew && 'border-l-2 border-l-[#00f0ff]'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center text-xs font-bold flex-shrink-0">
          {comment.user.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{comment.user.name}</span>
            <span className="text-xs text-gray-500 font-mono">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
              {comment.isEdited && ` ${t('comments.edited', '(edited)')}`}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="mb-4">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full bg-transparent resize-none outline-none text-sm border border-gray-700 rounded-lg p-3 min-h-[80px]"
            rows={3}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSaveEdit}
              disabled={isEditPending || !editText.trim()}
              className="px-3 py-1.5 rounded bg-[#00f0ff] text-black text-xs font-mono disabled:opacity-50"
            >
              {t('comments.save', 'Save')}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditText(comment.text);
              }}
              className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs font-mono"
            >
              {t('comments.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm mb-3 whitespace-pre-wrap">{comment.text}</p>
      )}

      {/* Flagged badge */}
      {comment.isFlagged && <FlaggedBadge />}

      {/* Actions */}
      <div className="flex items-center gap-4 text-xs">
        <button
          onClick={() => setIsReplying(!isReplying)}
          className="flex items-center gap-1 text-gray-400 hover:text-[#00f0ff] transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          <span>{t('comments.reply', 'Reply')}</span>
        </button>

        {canEdit && !editExpired && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-gray-400 hover:text-[#00f0ff] transition-colors"
          >
            <Edit className="h-3 w-3" />
            <span>{t('comments.edit', 'Edit')}</span>
          </button>
        )}

        {canEdit && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 text-gray-400 hover:text-[#ff0044] transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            <span>{t('comments.delete', 'Delete')}</span>
          </button>
        )}

        {!isOwnComment && (
          <button
            onClick={handleFlag}
            className="flex items-center gap-1 text-gray-400 hover:text-yellow-500 transition-colors"
          >
            <Flag className="h-3 w-3" />
            <span>{t('comments.flag', 'Flag')}</span>
          </button>
        )}
      </div>

      {/* Reply input */}
      {isReplying && (
        <div className="mt-4 ml-8">
          <CommentInput
            articleId={articleId}
            parentId={comment.id}
            socket={socket}
            onSuccess={() => setIsReplying(false)}
          />
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <ReplyThread
          replies={comment.replies}
          articleId={articleId}
          socket={socket}
          defaultCollapsed={true}
        />
      )}
    </motion.div>
  );
}
