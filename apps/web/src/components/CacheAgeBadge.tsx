import { Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface CacheAgeBadgeProps {
  cacheAge: number | null;
  isFromCache: boolean;
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

export function CacheAgeBadge({ cacheAge, isFromCache, className }: CacheAgeBadgeProps) {
  if (!isFromCache || cacheAge === null) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-mono text-gray-500',
        className
      )}
    >
      <Clock className="h-3 w-3" />
      <span>Cached {formatCacheAge(cacheAge)}</span>
    </div>
  );
}
