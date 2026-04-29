/**
 * UpgradePrompt Component
 * Contextual upsell overlay for Premium features
 * Per CONTEXT.md: Visible but locked UI for Premium features
 */

import { Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

interface UpgradePromptProps {
  feature: string;
  requiredTier?: 'PREMIUM' | 'ENTERPRISE';
  children?: React.ReactNode;
  className?: string;
  inline?: boolean;
}

export function UpgradePrompt({
  feature,
  requiredTier = 'PREMIUM',
  children,
  className,
  inline = false,
}: UpgradePromptProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  if (inline) {
    return (
      <button
        onClick={() => navigate('/pricing')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
          'bg-[#00f0ff]/10 border border-[#00f0ff]/30',
          'text-[#00f0ff] text-sm font-mono',
          'hover:bg-[#00f0ff]/20 transition-colors',
          className
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t('upgrade.unlockFeature', { feature })}
      </button>
    );
  }

  return (
    <div className={cn('relative group', className)}>
      {/* Content (blurred/dimmed) */}
      <div className="pointer-events-none opacity-50 blur-[1px]">
        {children}
      </div>

      {/* Overlay */}
      <div
        onClick={() => navigate('/pricing')}
        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-lg cursor-pointer transition-all group-hover:bg-black/70"
      >
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <Lock className="h-8 w-8 text-[#00f0ff]" />
          <div className="text-sm font-mono">
            <p className="text-gray-300">
              {t('upgrade.required', { tier: requiredTier })}
            </p>
            <p className="text-[#00f0ff] mt-1 font-medium">
              {t('upgrade.clickToUnlock')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
