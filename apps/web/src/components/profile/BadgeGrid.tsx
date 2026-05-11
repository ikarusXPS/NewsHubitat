import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Loader2 } from 'lucide-react';
import { BadgeCard } from './BadgeCard';
import { FeaturedBadge } from './FeaturedBadge';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/api';
import type { BadgeTier, BadgeCategory } from '../../types/gamification';

interface Badge {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  category: BadgeCategory;
  iconType: string;
  threshold: number;
}

interface UserBadge {
  id: string;
  badgeId: string;
  badge: Badge;
  earnedAt: string;
  progress: number;
}

async function fetchBadges(): Promise<Badge[]> {
  const response = await fetch('/api/badges/definitions');
  if (!response.ok) throw new Error('Failed to fetch badges');
  const data = await response.json();
  return data.data;
}

async function fetchUserBadges(): Promise<UserBadge[]> {
  const response = await apiFetch('/api/badges/user');
  if (!response.ok) throw new Error('Failed to fetch user badges');
  const data = await response.json();
  return data.data;
}

async function setFeaturedBadge(badgeId: string | null): Promise<void> {
  const response = await apiFetch('/api/badges/featured', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badgeId }),
  });
  if (!response.ok) throw new Error('Failed to set featured badge');
}

interface BadgeGridProps {
  showFeatured?: boolean;
  selectable?: boolean;
  onSelect?: (badge: Badge) => void;
}

export function BadgeGrid({ showFeatured = true, selectable = false, onSelect }: BadgeGridProps) {
  const { user, isAuthenticated } = useAuth();
  const { language } = useAppStore();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>('all');

  const { data: badges, isLoading: loadingBadges } = useQuery({
    queryKey: ['badge-definitions'],
    queryFn: fetchBadges,
  });

  const { data: userBadges, isLoading: loadingUserBadges } = useQuery({
    queryKey: ['user-badges'],
    queryFn: () => fetchUserBadges(),
    enabled: isAuthenticated,
  });

  const featuredMutation = useMutation({
    mutationFn: (badgeId: string | null) => setFeaturedBadge(badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-badges'] });
    },
  });

  const earnedBadgeIds = new Set(userBadges?.map((ub) => ub.badgeId) || []);

  // Get featured badge ID from user object - Type-safe cast
  const featuredBadgeId = (user as { featuredBadgeId?: string } | null)?.featuredBadgeId;
  const featuredBadge = userBadges?.find((ub) => ub.badgeId === featuredBadgeId);

  const filteredBadges = badges?.filter(
    (b) => selectedCategory === 'all' || b.category === selectedCategory
  );

  // Group badges by base name
  const badgeGroups = new Map<string, Badge[]>();
  filteredBadges?.forEach((badge) => {
    const baseName = badge.name.replace(/-bronze|-silver|-gold|-platinum$/, '');
    const group = badgeGroups.get(baseName) || [];
    group.push(badge);
    badgeGroups.set(baseName, group);
  });

  if (loadingBadges || loadingUserBadges) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Featured Badge per D-43 */}
      {showFeatured && featuredBadge && (
        <FeaturedBadge
          name={featuredBadge.badge.name.replace(/-\w+$/, '')}
          description={featuredBadge.badge.description}
          tier={featuredBadge.badge.tier}
          iconType={featuredBadge.badge.iconType}
          onRemove={() => featuredMutation.mutate(null)}
        />
      )}

      {/* Category Filter */}
      <div className="flex gap-2">
        {(['all', 'volume', 'diversity', 'behavior'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-mono transition-colors',
              selectedCategory === cat
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                : 'text-gray-500 hover:text-white border border-transparent hover:border-gray-700'
            )}
          >
            {cat === 'all' ? (language === 'de' ? 'Alle' : 'All') : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from(badgeGroups.entries()).map(([baseName, groupBadges]) => {
          // Show highest earned tier, or first unearned
          const earnedInGroup = groupBadges.filter((b) => earnedBadgeIds.has(b.id));
          const displayBadge = earnedInGroup.length > 0
            ? earnedInGroup[earnedInGroup.length - 1] // Highest tier earned
            : groupBadges[0]; // First tier

          const isEarned = earnedBadgeIds.has(displayBadge.id);
          const userBadge = userBadges?.find((ub) => ub.badgeId === displayBadge.id);

          return (
            <BadgeCard
              key={displayBadge.id}
              name={baseName}
              description={displayBadge.description}
              tier={displayBadge.tier}
              iconType={displayBadge.iconType}
              isEarned={isEarned}
              progress={userBadge?.progress}
              target={displayBadge.threshold}
              isSelectable={selectable && isEarned}
              isSelected={featuredBadgeId === displayBadge.id}
              onClick={() => {
                if (selectable && isEarned) {
                  onSelect?.(displayBadge);
                  featuredMutation.mutate(displayBadge.id);
                }
              }}
            />
          );
        })}
      </div>

      {/* Empty state */}
      {(!badges || badges.length === 0) && (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            {language === 'de' ? 'Keine Badges gefunden' : 'No badges found'}
          </p>
        </div>
      )}
    </div>
  );
}
