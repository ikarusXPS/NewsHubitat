/**
 * TierCard Component
 * Displays subscription tier with features and CTA
 * Per CONTEXT.md: Premium highlighted with cyan accent, "Most Popular" badge
 */

import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

interface TierFeature {
  name: string;
  included: boolean;
  limit?: string;
}

interface TierCardProps {
  name: string;
  price: number;
  annualPrice?: number;
  billingCycle: 'monthly' | 'annual';
  description: string;
  features: TierFeature[];
  isPopular?: boolean;
  isCurrent?: boolean;
  isEnterprise?: boolean;
  ctaLabel?: string;
  onSubscribe: () => void;
  isLoading?: boolean;
}

export function TierCard({
  name,
  price,
  annualPrice,
  billingCycle,
  description,
  features,
  isPopular,
  isCurrent,
  isEnterprise,
  ctaLabel,
  onSubscribe,
  isLoading,
}: TierCardProps) {
  const { t } = useTranslation('pricing');

  const displayPrice = billingCycle === 'annual' && annualPrice ? annualPrice : price;
  const periodLabel = billingCycle === 'annual' ? t('perYear') : t('perMonth');

  return (
    <div
      className={cn(
        'relative rounded-xl border p-6 transition-all duration-300',
        isPopular
          ? 'border-[#00f0ff] bg-[#00f0ff]/5 scale-105 shadow-lg shadow-[#00f0ff]/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
      )}
    >
      {/* Most Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block px-3 py-1 rounded-full bg-[#00f0ff] text-black text-xs font-mono font-bold uppercase tracking-wider">
            {t('mostPopular')}
          </span>
        </div>
      )}

      {/* Tier Name */}
      <h3 className="text-xl font-bold text-white font-mono mb-2 mt-2">
        {name}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-400 mb-4 min-h-[40px]">
        {description}
      </p>

      {/* Price */}
      <div className="mb-6">
        {isEnterprise ? (
          <span className="text-2xl font-bold text-white">{t('customPricing')}</span>
        ) : (
          <>
            <span className="text-4xl font-bold text-white">EUR{displayPrice}</span>
            <span className="text-gray-400 ml-1">{periodLabel}</span>
            {billingCycle === 'annual' && annualPrice && (
              <div className="text-sm text-[#00ff88] mt-1">
                {t('save2Months')}
              </div>
            )}
          </>
        )}
      </div>

      {/* Features List */}
      <ul className="space-y-3 mb-8">
        {features.map((feature, idx) => (
          <li
            key={idx}
            className={cn(
              'flex items-start gap-2 text-sm',
              feature.included ? 'text-gray-300' : 'text-gray-500'
            )}
          >
            {feature.included ? (
              <Check className="h-4 w-4 text-[#00ff88] mt-0.5 flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
            )}
            <span>
              {feature.name}
              {feature.limit && (
                <span className="text-gray-500 ml-1">({feature.limit})</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={onSubscribe}
        disabled={isLoading || isCurrent}
        className={cn(
          'w-full py-3 rounded-lg font-medium font-mono transition-all duration-200',
          isCurrent
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : isPopular
            ? 'bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90 hover:shadow-lg hover:shadow-[#00f0ff]/20'
            : isEnterprise
            ? 'bg-[#bf00ff] text-white hover:bg-[#bf00ff]/90'
            : 'bg-gray-700 text-white hover:bg-gray-600',
          isLoading && 'opacity-50 cursor-wait'
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {t('loading')}
          </span>
        ) : isCurrent ? (
          t('currentPlan')
        ) : (
          ctaLabel || t('subscribe')
        )}
      </button>
    </div>
  );
}
