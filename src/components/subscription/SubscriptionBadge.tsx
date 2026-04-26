/**
 * SubscriptionBadge Component
 * Shows user's subscription tier in header/profile
 * Per CONTEXT.md: Badge in header + Settings detail
 */

import { Crown, Building, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SubscriptionBadgeProps {
  tier: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const tierConfig = {
  FREE: {
    icon: Sparkles,
    label: 'Free',
    colors: 'text-gray-400 bg-gray-700/50 border-gray-600',
  },
  PREMIUM: {
    icon: Crown,
    label: 'Premium',
    colors: 'text-[#00f0ff] bg-[#00f0ff]/10 border-[#00f0ff]/30',
  },
  ENTERPRISE: {
    icon: Building,
    label: 'Enterprise',
    colors: 'text-[#bf00ff] bg-[#bf00ff]/10 border-[#bf00ff]/30',
  },
};

export function SubscriptionBadge({
  tier,
  showLabel = true,
  className,
  size = 'sm',
}: SubscriptionBadgeProps) {
  // Don't show badge for FREE tier unless explicitly requested
  if (tier === 'FREE' && !className?.includes('show-free')) {
    return null;
  }

  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-wider',
        config.colors,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        className
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {showLabel && config.label}
    </div>
  );
}
