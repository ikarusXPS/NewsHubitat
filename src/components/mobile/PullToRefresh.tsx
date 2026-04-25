import PullToRefreshLib from 'react-simple-pull-to-refresh';
import { Radio } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

/**
 * PullToRefresh - Custom pull-to-refresh with cyber-styled indicator
 *
 * Per D-60: Pull-to-refresh on news feed with custom cyber indicator
 * Per CONTEXT.md Specific Ideas: Radio icon (matches logo) with pulse/spin animation
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  return (
    <PullToRefreshLib
      onRefresh={onRefresh}
      pullingContent={
        <div className="flex justify-center py-4">
          <Radio className="h-6 w-6 text-[#00f0ff] animate-pulse" />
        </div>
      }
      refreshingContent={
        <div className="flex justify-center py-4">
          <Radio className="h-6 w-6 text-[#00f0ff] animate-spin" />
        </div>
      }
      pullDownThreshold={80}
      maxPullDownDistance={120}
      resistance={2}
    >
      {children}
    </PullToRefreshLib>
  );
}
