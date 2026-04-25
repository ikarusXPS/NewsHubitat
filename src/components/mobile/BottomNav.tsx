import { useMemo, useState, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Globe2,
  MapPin,
  Bookmark,
  User,
  Cpu,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge: 'events' | null;
}

interface EventStats {
  total: number;
}

/**
 * Bottom navigation bar for mobile devices.
 * Features:
 * - 5 primary navigation items (D-01)
 * - Auto-hide on scroll down, reappear on scroll up (D-03)
 * - Active state with filled icon + label + cyan glow (D-04)
 * - Event count badge on Events item (D-07)
 * - Double-tap Dashboard scrolls to top (D-08)
 * - Light haptic feedback on tap (D-14)
 * - Glass effect with cyan border (D-12, D-13)
 */
export function BottomNav() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const scrollDirection = useScrollDirection();
  const { lightTap, successPattern } = useHapticFeedback();

  // Double-tap detection for Dashboard
  const lastTapRef = useRef<number>(0);
  const [scrollY, setScrollY] = useState(window.scrollY);

  // Track scroll position for visibility at top
  useMemo(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Bottom nav is visible when scrolling up or near top (< 50px)
  const isVisible = scrollDirection === 'up' || scrollY < 50;

  // 5-item navigation per D-01
  const navItems: NavItem[] = useMemo(() => [
    { to: '/', icon: Activity, label: t('navigation.dashboard'), badge: null },
    { to: '/monitor', icon: Globe2, label: t('navigation.monitor'), badge: null },
    { to: '/events', icon: MapPin, label: t('navigation.events'), badge: 'events' },
    { to: '/bookmarks', icon: Bookmark, label: t('navigation.bookmarks'), badge: null },
    { to: '/profile', icon: User, label: t('navigation.profile'), badge: null },
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

  // Handle nav item click with haptic feedback and double-tap detection
  const handleNavClick = useCallback((to: string, e: React.MouseEvent) => {
    lightTap();

    // Double-tap Dashboard to scroll to top (D-08)
    if (to === '/' && location.pathname === '/') {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        successPattern();
      }
      lastTapRef.current = now;
    }
  }, [lightTap, successPattern, location.pathname]);

  return (
    <AnimatePresence>
      <motion.nav
        animate={{ y: isVisible ? 0 : 100 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        style={{
          height: 'var(--bottom-nav-height)',
          paddingBottom: 'var(--safe-area-bottom)',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="glass-panel h-14 border-t border-[#00f0ff]/20 flex items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={(e) => handleNavClick(item.to, e)}
                className={cn(
                  'flex flex-col items-center justify-center',
                  'min-w-[44px] min-h-[44px] py-1.5 px-2 rounded-lg',
                  'transition-colors touch-target',
                  isActive
                    ? 'text-[#00f0ff]'
                    : 'text-gray-400 hover:text-gray-300'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Icon with animation on active */}
                <motion.div
                  animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{
                    type: 'spring',
                    damping: 15,
                    stiffness: 300,
                  }}
                  className={cn(
                    'relative flex items-center justify-center',
                    isActive && 'drop-shadow-[0_0_8px_#00f0ff]'
                  )}
                >
                  <item.icon className="h-5 w-5" />

                  {/* Event badge (D-07) */}
                  {item.badge === 'events' && eventStats && eventStats.total > 0 && (
                    <span className="absolute -top-1 -right-2 text-[8px] font-mono px-1 py-0.5 rounded bg-[#bf00ff]/20 text-[#bf00ff] border border-[#bf00ff]/30 flex items-center gap-0.5 min-w-[16px] justify-center">
                      <Cpu className="h-2 w-2" />
                      {eventStats.total > 99 ? '99+' : eventStats.total}
                    </span>
                  )}
                </motion.div>

                {/* Label - only visible when active (D-04) */}
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="text-[10px] font-mono mt-0.5 tracking-wide"
                      style={{ letterSpacing: '0.1em' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </div>
      </motion.nav>
    </AnimatePresence>
  );
}
