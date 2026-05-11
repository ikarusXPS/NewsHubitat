import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';
import { usePostComment, useTypingIndicator } from '../../hooks/useComments';
import { cn } from '../../lib/utils';

interface CommentInputProps {
  articleId: string;
  parentId?: string;
  socket: Socket | null;
  onSuccess?: () => void;
  placeholder?: string;
}

const MAX_CHARS = 5000;

export function CommentInput({
  articleId,
  parentId,
  socket,
  onSuccess,
  placeholder,
}: CommentInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const { mutate: postComment, isPending } = usePostComment(articleId);
  const { startTyping, stopTyping } = useTypingIndicator(articleId, socket);

  const charCount = input.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit = input.trim().length > 0 && !isOverLimit && !isPending;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Emit typing indicator (debounce handled in useTypingIndicator)
    if (e.target.value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    postComment(
      { text: input, parentId },
      {
        onSuccess: () => {
          setInput('');
          stopTyping();
          toast.success(t('comments.posted', 'Comment posted'));
          onSuccess?.();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : t('comments.errors.postFailed', 'Failed to post comment. Please try again.');

          if (message.includes('Too many')) {
            toast.error(t('comments.errors.rateLimit', 'Too many comments. Please wait a moment.'));
          } else if (message.includes('flagged')) {
            toast.error(t('comments.errors.flagged', 'Your comment was flagged for review.'));
          } else {
            toast.error(message);
          }
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSubmit) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="glass-card p-4 rounded-lg">
      <textarea
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={stopTyping}
        placeholder={placeholder || t('comments.placeholder', 'Share your thoughts...')}
        className="w-full bg-transparent resize-none outline-none text-sm min-h-[80px] max-h-[200px]"
        rows={3}
        maxLength={MAX_CHARS + 100} // Allow typing over limit to show error
        disabled={isPending}
      />

      <div className="flex items-center justify-between mt-2">
        {/* Character counter */}
        <div
          className={cn(
            'text-xs font-mono',
            isOverLimit ? 'text-[#ff0044]' : charCount > 4500 ? 'text-yellow-500' : 'text-gray-500'
          )}
        >
          {charCount} / {MAX_CHARS}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            'px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2',
            'transition-all duration-200',
            canSubmit
              ? 'bg-[#00f0ff] text-black hover:bg-[#00d4e0]'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('comments.posting', 'Posting...')}</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>{t('comments.post', 'Post Comment')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
