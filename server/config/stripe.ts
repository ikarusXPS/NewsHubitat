/**
 * Stripe Configuration
 * Externalizes all Stripe-related configuration for subscription management
 */

export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

// Environment-based price IDs
export const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  priceIds: {
    monthly: process.env.STRIPE_PRICE_ID_MONTHLY!,
    annual: process.env.STRIPE_PRICE_ID_ANNUAL!,
  },
  apiVersion: '2024-12-18.acacia' as const, // Pin API version
} as const;

// Price ID to tier mapping
export const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_PRICE_ID_MONTHLY || 'price_monthly']: 'PREMIUM',
  [process.env.STRIPE_PRICE_ID_ANNUAL || 'price_annual']: 'PREMIUM',
  // Enterprise Price IDs added as needed
};

// Feature limits by tier (per CONTEXT.md Feature Gating table)
export const TIER_LIMITS = {
  FREE: {
    aiQueriesPerDay: 10,              // Claude's discretion: 10/day
    historyDays: 7,                   // D-06: 7 days limit
    dataExport: false,                // No export
    comments: false,                  // No comments
    aiPersonas: false,                // No personas
    emailDigestFrequency: ['weekly'], // Weekly only
    teamCreation: false,              // No team creation
    shareAnalytics: false,            // No share analytics
    forceTranslation: false,          // Auto-only translation
    clusterSummaries: false,          // No AI summaries
    realtimeUpdates: false,           // Polling (30s)
    advancedFilters: false,           // Basic filters only
    customPresets: false,             // No custom focus presets
    customFeeds: false,               // Feed Manager: no custom feeds
  },
  PREMIUM: {
    aiQueriesPerDay: Infinity,        // Unlimited
    historyDays: Infinity,            // Unlimited
    dataExport: ['json', 'csv'] as const,
    comments: true,
    aiPersonas: true,
    emailDigestFrequency: ['daily', 'realtime'] as const,
    teamCreation: true,
    shareAnalytics: true,
    forceTranslation: true,
    clusterSummaries: true,
    realtimeUpdates: true,
    advancedFilters: true,
    customPresets: true,
    customFeeds: true,
  },
  ENTERPRISE: {
    aiQueriesPerDay: Infinity,
    historyDays: Infinity,
    dataExport: ['json', 'csv', 'pdf'] as const,
    comments: true,
    aiPersonas: true,
    emailDigestFrequency: ['daily', 'realtime'] as const,
    teamCreation: true,
    shareAnalytics: true,
    forceTranslation: true,
    clusterSummaries: true,
    realtimeUpdates: true,
    advancedFilters: true,
    customPresets: true,
    customFeeds: true,
    teamBilling: true,
    enterpriseAnalytics: true,
  },
} as const;

// Pricing display (for frontend)
export const PRICING = {
  premium: {
    monthly: 9,    // EUR 9/month
    annual: 90,    // EUR 90/year (2 months free)
  },
  currency: 'EUR',
} as const;

/**
 * Get tier limits for a given subscription tier
 */
export function getTierLimits(tier: SubscriptionTier) {
  return TIER_LIMITS[tier];
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: SubscriptionTier, feature: keyof typeof TIER_LIMITS.FREE): boolean {
  const limits = TIER_LIMITS[tier];
  const value = limits[feature as keyof typeof limits];

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}
