/**
 * AIUsageCounter Component
 * Shows remaining AI queries for FREE tier users
 * Per CONTEXT.md: Usage counter in AI panel + profile dropdown
 */

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface AIUsageCounterProps {
  className?: string;
  compact?: boolean;
}

export function AIUsageCounter({ className, compact = false }: AIUsageCounterProps) {
  const { t } = useTranslation('common');
  const { user, isAuthenticated } = useAuth();
  const [usage, setUsage] = useState({ used: 0, limit: 10 });

  const tier = (user as { subscriptionTier?: string } | null)?.subscriptionTier || 'FREE';

  useEffect(() => {
    // Fetch current AI usage from API
    const fetchUsage = async () => {
      if (!isAuthenticated || tier !== 'FREE') return;

      try {
        const response = await fetch('/api/ai/usage', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setUsage({ used: data.data.used, limit: data.data.limit });
        }
      } catch {
        // Silently fail - usage display is not critical
      }
    };

    fetchUsage();
  }, [isAuthenticated, tier]);

  // Don't show for Premium/Enterprise users
  if (tier !== 'FREE') {
    return null;
  }

  const remaining = Math.max(0, usage.limit - usage.used);
  const percentage = (remaining / usage.limit) * 100;

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-md',
          'bg-gray-800 text-xs font-mono',
          remaining <= 2 ? 'text-[#ff0044]' : 'text-gray-400',
          className
        )}
      >
        <Sparkles className="h-3 w-3" />
        {remaining}/{usage.limit}
      </div>
    );
  }

  return (
    <div className={cn('p-3 rounded-lg bg-gray-800/50 border border-gray-700', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4" />
          {t('ai.dailyQueries')}
        </span>
        <span className={cn(
          'text-sm font-mono',
          remaining <= 2 ? 'text-[#ff0044]' : 'text-gray-300'
        )}>
          {remaining} {t('ai.remaining')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300 rounded-full',
            percentage > 50 ? 'bg-[#00ff88]' :
            percentage > 20 ? 'bg-[#ffee00]' : 'bg-[#ff0044]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {remaining <= 2 && (
        <a
          href="/pricing"
          className="block mt-2 text-xs text-[#00f0ff] hover:underline"
        >
          {t('ai.upgradeCta')}
        </a>
      )}
    </div>
  );
}
