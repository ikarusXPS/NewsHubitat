import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';

interface ReadToggleProps {
  articleId: string;
  className?: string;
}

export function ReadToggle({ articleId, className }: ReadToggleProps) {
  const { markAsRead, markAsUnread, isArticleRead } = useAppStore();
  const isRead = isArticleRead(articleId);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRead) {
      markAsUnread(articleId);
    } else {
      markAsRead(articleId);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'p-2 rounded-md transition-colors',
        isRead
          ? 'text-[#00ff88] bg-[#00ff88]/10 hover:bg-[#00ff88]/20'
          : 'text-gray-500 hover:text-[#00f0ff] hover:bg-[#00f0ff]/5',
        className
      )}
      title={isRead ? 'Mark as unread' : 'Mark as read'}
    >
      {isRead ? (
        <Eye className="h-4 w-4" />
      ) : (
        <EyeOff className="h-4 w-4" />
      )}
    </button>
  );
}
