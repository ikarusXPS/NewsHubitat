import { useMemo, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Bookmark,
  Clock,
  Cpu,
  Globe2,
  History,
  MapPin,
  Radio,
  Settings,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { FocusSelector } from '../FocusSelector';
import { FeedManagerButton } from '../FeedManagerButton';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { TeamSwitcher } from '../teams/TeamSwitcher';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EventStats {
  total: number;
}

/**
 * Mobile navigation drawer with full navigation.
 * Features:
 * - Left slide-in from edge (D-23)
 * - Edge swipe opens drawer (D-24)
 * - Swipe-right-to-close (D-25)
 * - Back button closes drawer (D-26)
 * - NO event stats panel (D-27) - navigation focus only
 * - User info at top (D-05)
 * - All nav items (D-06)
 * - Controls section with FocusSelector, FeedManager, LanguageSwitcher (D-20)
 */
export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { t } = useTranslation('common');
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // All navigation items (D-06 - full duplication, not just bottom 5)
  const navItems = useMemo(() => [
    { to: '/', icon: Activity, label: t('navigation.dashboard'), badge: 'live' as const },
    { to: '/monitor', icon: Globe2, label: t('navigation.monitor'), badge: null },
    { to: '/events', icon: MapPin, label: t('navigation.events'), badge: 'events' as const },
    { to: '/community', icon: Users, label: t('navigation.community'), badge: 'new' as const },
    { to: '/analysis', icon: BarChart3, label: t('navigation.analysis') },
    { to: '/timeline', icon: Clock, label: t('navigation.timeline') },
    { to: '/history', icon: History, label: t('navigation.history') },
    { to: '/bookmarks', icon: Bookmark, label: t('navigation.bookmarks') },
  ], [t]);

  // Event count for badge (same query key as EventMap)
  const { data: eventStats } = useQuery<EventStats>({
    queryKey: ['geo-events'],
    queryFn: async () => {
      const res = await fetch('/api/events/geo');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      return { total: data.data?.length || 0 };
    },
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });

  // Back button handling (D-26)
  useEffect(() => {
    if (!isOpen) return;

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  // Close drawer when route changes
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="x"
            dragConstraints={{ left: -280, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              // Swipe-right-to-close (D-25)
              if (info.offset.x < -50 || info.velocity.x < -500) {
                onClose();
              }
            }}
            className="fixed inset-y-0 left-0 w-64 glass-panel z-50 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            style={{
              paddingTop: 'var(--safe-area-top)',
              paddingBottom: 'var(--safe-area-bottom)',
            }}
          >
            {/* Header with Logo and Close Button */}
            <div className="flex h-14 items-center gap-3 px-4 border-b border-[rgba(0,240,255,0.1)]">
              <div className="relative flex-shrink-0">
                <Radio className="h-6 w-6 text-[#00f0ff]" />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-base font-bold text-white font-mono tracking-wider">
                  NEWS<span className="text-[#00f0ff]">HUB</span>
                </span>
                <div className="live-indicator">
                  <span className="live-dot" />
                  <span>Live</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-md transition-colors touch-target"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* User Info Section (D-05) - at top */}
            {isAuthenticated && user && (
              <div className="px-4 py-3 border-b border-[rgba(0,240,255,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Items (D-06 - all items) */}
            <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
              <div className="signal-label px-3 mb-2">{t('navigation.title', 'Navigation')}</div>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'sidebar-link rounded-lg touch-target',
                      isActive && 'active'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge === 'live' && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff0044] animate-pulse" />
                    </span>
                  )}
                  {item.badge === 'new' && (
                    <span className="badge-severity badge-low text-[10px] py-0.5 px-1.5">
                      <Zap className="h-2.5 w-2.5" />
                      New
                    </span>
                  )}
                  {item.badge === 'events' && eventStats && eventStats.total > 0 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#bf00ff]/20 text-[#bf00ff] border border-[#bf00ff]/30 flex items-center gap-1">
                      <Cpu className="h-2.5 w-2.5" />
                      {eventStats.total}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Teams Section - authenticated users only */}
            {isAuthenticated && (
              <div className="border-t border-gray-700 pt-4 mt-4 px-4">
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3">
                  Teams
                </h3>
                <TeamSwitcher />
              </div>
            )}

            {/* Controls Section (D-20) - FocusSelector, FeedManager, LanguageSwitcher */}
            <div className="border-t border-[#00f0ff]/20 px-4 py-3 space-y-3">
              <div className="signal-label">{t('drawer.controls', 'Controls')}</div>
              <div className="space-y-2">
                <FocusSelector />
                <FeedManagerButton />
                <LanguageSwitcher />
              </div>
            </div>

            {/* Footer with Profile and Settings */}
            <div className="border-t border-[rgba(0,240,255,0.1)] p-3 space-y-1">
              {/* Profile Link */}
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  cn(
                    'sidebar-link rounded-lg touch-target',
                    isActive && 'active'
                  )
                }
              >
                {isAuthenticated && user ? (
                  <>
                    <div className="h-5 w-5 rounded-md bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center text-white text-[10px] font-bold">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="flex-1 truncate">{user.name}</span>
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4" />
                    <span>{t('navigation.profile')}</span>
                  </>
                )}
              </NavLink>

              {/* Settings Button */}
              <button
                onClick={() => {
                  navigate('/settings', {
                    state: { backgroundLocation: location },
                  });
                  onClose();
                }}
                className={cn(
                  'sidebar-link rounded-lg w-full touch-target',
                  location.pathname === '/settings' && 'active'
                )}
              >
                <Settings className="h-4 w-4" />
                <span>{t('navigation.settings')}</span>
              </button>

              {/* Version & Legal */}
              <div className="mt-3 px-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">
                    v2.0.0
                  </span>
                  <span className="text-[10px] font-mono text-[#00f0ff]/50 uppercase tracking-wider">
                    Premium
                  </span>
                </div>
                <NavLink
                  to="/privacy"
                  className="text-[10px] font-mono text-gray-600 hover:text-[#00f0ff] transition-colors"
                >
                  Datenschutz / Privacy
                </NavLink>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
