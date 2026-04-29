import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';

interface BulkReadActionsProps {
  articleIds: string[];
  className?: string;
}

export function BulkReadActions({ articleIds, className }: BulkReadActionsProps) {
  const { readState, markAllAsRead, toggleHideReadArticles, clearReadArticles } = useAppStore();

  const readCount = articleIds.filter((id) =>
    readState.readArticles.includes(id)
  ).length;

  const allRead = readCount === articleIds.length && articleIds.length > 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Mark all as read */}
      <button
        onClick={() => markAllAsRead(articleIds)}
        disabled={allRead}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors',
          allRead
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 hover:bg-[#00ff88]/20'
        )}
        title="Mark all visible articles as read"
      >
        <Eye className="h-3.5 w-3.5" />
        Mark All Read
        {readCount > 0 && (
          <span className="text-[9px] opacity-70">({readCount}/{articleIds.length})</span>
        )}
      </button>

      {/* Toggle hide read articles */}
      <button
        onClick={toggleHideReadArticles}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border transition-colors',
          readState.hideReadArticles
            ? 'bg-[#bf00ff]/10 text-[#bf00ff] border-[#bf00ff]/20 hover:bg-[#bf00ff]/20'
            : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
        )}
        title={readState.hideReadArticles ? 'Show read articles' : 'Hide read articles'}
      >
        {readState.hideReadArticles ? (
          <>
            <Eye className="h-3.5 w-3.5" />
            Show Read
          </>
        ) : (
          <>
            <EyeOff className="h-3.5 w-3.5" />
            Hide Read
          </>
        )}
      </button>

      {/* Clear read history */}
      {readState.readArticles.length > 0 && (
        <button
          onClick={clearReadArticles}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono bg-[#ff0044]/10 text-[#ff0044] border border-[#ff0044]/20 hover:bg-[#ff0044]/20 transition-colors"
          title="Clear read history"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear ({readState.readArticles.length})
        </button>
      )}
    </div>
  );
}
