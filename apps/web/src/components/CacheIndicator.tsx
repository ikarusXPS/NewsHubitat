import { Database, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface CacheIndicatorProps {
  isFromCache: boolean;
  cacheAge: number | null;
  className?: string;
}

function formatCacheAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return 'Just now';
}

export function CacheIndicator({ isFromCache, cacheAge, className }: CacheIndicatorProps) {
  if (!isFromCache) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-[#ffcc00]/10 border border-[#ffcc00]/30',
        'backdrop-blur-sm',
        className
      )}
    >
      <Database className="h-4 w-4 text-[#ffcc00]" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-[#ffcc00] uppercase tracking-wider">
          Cached Data
        </span>
        {cacheAge !== null && (
          <>
            <span className="text-gray-600">•</span>
            <div className="flex items-center gap-1 text-xs font-mono text-gray-400">
              <Clock className="h-3 w-3" />
              {formatCacheAge(cacheAge)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
