/**
 * Pricing Page
 * Public pricing comparison with subscription CTAs
 * Per CONTEXT.md: 3 Tiers, Premium highlighted, billing toggle, Calendly for Enterprise
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, Shield, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';
import { TierCard } from '../components/subscription/TierCard';
import { Toast } from '../components/Toast';

const STRIPE_PRICE_ID_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY;
const STRIPE_PRICE_ID_ANNUAL = import.meta.env.VITE_STRIPE_PRICE_ID_ANNUAL;
const CALENDLY_URL = import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com';

export function Pricing() {
  const { t } = useTranslation(['pricing', 'common']);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null); // tier name being loaded

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({
    message: '',
    type: 'info',
    isOpen: false,
  });

  const handleSubscribe = async (tier: 'free' | 'premium' | 'enterprise') => {
    if (tier === 'free') {
      // Already free, just navigate to dashboard
      navigate('/');
      return;
    }

    if (tier === 'enterprise') {
      // Open Calendly for enterprise demo
      window.open(CALENDLY_URL, '_blank');
      return;
    }

    if (!isAuthenticated) {
      // Store intent and redirect to login
      sessionStorage.setItem('checkout_intent', JSON.stringify({
        tier,
        billingCycle,
      }));
      navigate('/settings?login=true&redirect=/pricing');
      return;
    }

    setIsLoading(tier);

    try {
      const priceId = billingCycle === 'annual'
        ? STRIPE_PRICE_ID_ANNUAL
        : STRIPE_PRICE_ID_MONTHLY;

      const response = await apiFetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, billingCycle }),
      });

      const data = await response.json();

      if (data.success && data.data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Checkout failed',
        type: 'error',
        isOpen: true,
      });
    } finally {
      setIsLoading(null);
    }
  };

  // Feature definitions per CONTEXT.md Feature Gating table
  const freeFeatures = [
    { name: t('features.aiQueries'), included: true, limit: '10/day' },
    { name: t('features.readingHistory'), included: true, limit: '7 days' },
    { name: t('features.allRegions'), included: true },
    { name: t('features.eventMapGlobe'), included: true },
    { name: t('features.timeline'), included: true },
    { name: t('features.bookmarks'), included: true },
    { name: t('features.gamification'), included: true },
    { name: t('features.dataExport'), included: false },
    { name: t('features.comments'), included: false },
    { name: t('features.aiPersonas'), included: false },
    { name: t('features.realtimeUpdates'), included: false },
    { name: t('features.customPresets'), included: false },
  ];

  const premiumFeatures = [
    { name: t('features.aiQueries'), included: true, limit: 'unlimited' },
    { name: t('features.readingHistory'), included: true, limit: 'unlimited' },
    { name: t('features.allRegions'), included: true },
    { name: t('features.eventMapGlobe'), included: true },
    { name: t('features.timeline'), included: true },
    { name: t('features.bookmarks'), included: true },
    { name: t('features.gamification'), included: true },
    { name: t('features.dataExport'), included: true, limit: 'JSON/CSV' },
    { name: t('features.comments'), included: true },
    { name: t('features.aiPersonas'), included: true },
    { name: t('features.realtimeUpdates'), included: true },
    { name: t('features.customPresets'), included: true },
    { name: t('features.teamCreation'), included: true },
    { name: t('features.advancedFilters'), included: true },
    { name: t('features.adFree'), included: true },
  ];

  const enterpriseFeatures = [
    { name: t('features.aiQueries'), included: true, limit: 'unlimited' },
    { name: t('features.readingHistory'), included: true, limit: 'unlimited' },
    { name: t('features.allRegions'), included: true },
    { name: t('features.eventMapGlobe'), included: true },
    { name: t('features.timeline'), included: true },
    { name: t('features.bookmarks'), included: true },
    { name: t('features.gamification'), included: true },
    { name: t('features.dataExport'), included: true, limit: 'JSON/CSV/PDF' },
    { name: t('features.comments'), included: true },
    { name: t('features.aiPersonas'), included: true },
    { name: t('features.realtimeUpdates'), included: true },
    { name: t('features.customPresets'), included: true },
    { name: t('features.teamCreation'), included: true },
    { name: t('features.advancedFilters'), included: true },
    { name: t('features.teamBilling'), included: true },
    { name: t('features.enterpriseAnalytics'), included: true },
    { name: t('features.prioritySupport'), included: true },
    { name: t('features.sla'), included: true },
  ];

  const currentTier = (user as { subscriptionTier?: string } | null)?.subscriptionTier || 'FREE';

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white font-mono mb-4">
            {t('title')}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            {t('subtitle')}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-4 py-2 rounded-lg font-mono text-sm transition-colors',
              billingCycle === 'monthly'
                ? 'bg-[#00f0ff] text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            {t('monthly')}
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={cn(
              'px-4 py-2 rounded-lg font-mono text-sm transition-colors relative',
              billingCycle === 'annual'
                ? 'bg-[#00f0ff] text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            {t('annual')}
            <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#00ff88] text-black text-[10px] font-bold rounded-full">
              {t('save2Months')}
            </span>
          </button>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <TierCard
            name={t('tiers.free.name')}
            price={0}
            billingCycle={billingCycle}
            description={t('tiers.free.description')}
            features={freeFeatures}
            isCurrent={currentTier === 'FREE'}
            ctaLabel={t('tiers.free.cta')}
            onSubscribe={() => handleSubscribe('free')}
          />

          <TierCard
            name={t('tiers.premium.name')}
            price={9}
            annualPrice={90}
            billingCycle={billingCycle}
            description={t('tiers.premium.description')}
            features={premiumFeatures}
            isPopular
            isCurrent={currentTier === 'PREMIUM'}
            onSubscribe={() => handleSubscribe('premium')}
            isLoading={isLoading === 'premium'}
          />

          <TierCard
            name={t('tiers.enterprise.name')}
            price={0}
            billingCycle={billingCycle}
            description={t('tiers.enterprise.description')}
            features={enterpriseFeatures}
            isEnterprise
            isCurrent={currentTier === 'ENTERPRISE'}
            ctaLabel={t('tiers.enterprise.cta')}
            onSubscribe={() => handleSubscribe('enterprise')}
          />
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-8 text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#00ff88]" />
            <span>{t('badges.secure')}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#00f0ff]" />
            <span>{t('badges.paymentMethods')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#ffee00]" />
            <span>{t('badges.moneyBack')}</span>
          </div>
        </div>

        <Toast
          message={toast.message}
          type={toast.type}
          isOpen={toast.isOpen}
          onClose={() => setToast({ ...toast, isOpen: false })}
        />
      </div>
    </div>
  );
}
