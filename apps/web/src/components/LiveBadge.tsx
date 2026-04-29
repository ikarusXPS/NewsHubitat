import { cn } from '../lib/utils';

interface LiveBadgeProps {
  isConnected: boolean;
  className?: string;
  showLabel?: boolean;
}

/**
 * LiveBadge - Real-time connection status indicator
 *
 * Visual states per UI-SPEC.md:
 * - LIVE: Green (#00ff88), pulsing animation
 * - OFFLINE: Gray (#6b7280), static
 */
export function LiveBadge({
  isConnected,
  className,
  showLabel = true,
}: LiveBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider backdrop-blur-sm border transition-all duration-300',
        isConnected
          ? 'bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]'
          : 'bg-gray-800/80 border-gray-700 text-gray-500',
        className
      )}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff88] opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            isConnected ? 'bg-[#00ff88]' : 'bg-gray-500'
          )}
        />
      </span>

      {/* Label */}
      {showLabel && (
        <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
      )}
    </div>
  );
}

export default LiveBadge;
