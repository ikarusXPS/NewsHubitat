import { useMemo } from 'react';
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
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

interface EventStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

async function fetchEventStats(): Promise<EventStats> {
  try {
    // Use same endpoint as EventMap for consistent data
    const response = await fetch('/api/events/geo');
    if (!response.ok) throw new Error('Failed to fetch');

    const data = await response.json();
    const events = data.data ?? [];

    // Count by severity string (matching EventMap's GeoEvent type)
    return {
      total: events.length,
      critical: events.filter((e: { severity: string }) => e.severity === 'critical').length,
      high: events.filter((e: { severity: string }) => e.severity === 'high').length,
      medium: events.filter((e: { severity: string }) => e.severity === 'medium').length,
      low: events.filter((e: { severity: string }) => e.severity === 'low').length,
    };
  } catch {
    return { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
  }
}

// navItems moved inside component to use useTranslation

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { t } = useTranslation('common');
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const { data: eventStats, dataUpdatedAt } = useQuery({
    queryKey: ['geo-events-stats'], // Separate stats query but same source
    queryFn: fetchEventStats,
    staleTime: 60_000, // 1 minute (same as EventMap)
    refetchInterval: 2 * 60_000, // Refresh every 2 minutes (same as EventMap)
    gcTime: 10 * 60_000, // Keep cache for 10 minutes
    placeholderData: (previousData) => previousData, // Keep showing previous data while fetching
  });

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -280,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'sidebar-cyber flex w-64 flex-col relative z-50',
          'fixed md:relative inset-y-0 left-0',
          'md:translate-x-0'
        )}
      >
      {/* Logo - same height as header (h-14) */}
      <div className="flex h-14 items-center gap-3 px-5 border-b border-[rgba(0,240,255,0.1)]">
        <div className="relative flex-shrink-0">
          <Radio className="h-7 w-7 text-[#00f0ff]" />
          <div className="absolute inset-0 animate-ping">
            <Radio className="h-7 w-7 text-[#00f0ff] opacity-20" />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-lg font-bold text-white font-mono tracking-wider">
            NEWS<span className="text-[#00f0ff]">HUB</span>
          </span>
          <div className="live-indicator">
            <span className="live-dot" />
            <span>Live</span>
          </div>
        </div>
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="md:hidden p-2 hover:bg-white/5 rounded-md transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5 text-gray-400 hover:text-white" />
        </button>
      </div>

      {/* Event Stats */}
      <div className="px-5 py-4 border-b border-[rgba(0,240,255,0.1)]">
        {/* Last Updated Time */}
        {dataUpdatedAt > 0 && (
          <div className="flex items-center justify-end gap-1 mb-2 text-[9px] font-mono text-gray-600">
            <Clock className="h-2.5 w-2.5" />
            <span>Updated {formatTimeAgo(dataUpdatedAt)}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="stat-box py-2">
            <div className="signal-counter text-lg">{eventStats?.total ?? 0}</div>
            <div className="signal-label text-[9px]">Total Events</div>
          </div>
          <div className="stat-box py-2" style={{ borderColor: 'rgba(255, 0, 68, 0.3)' }}>
            <div
              className="signal-counter text-lg"
              style={{ color: '#ff0044', textShadow: '0 0 15px #ff0044' }}
            >
              {eventStats?.critical ?? 0}
            </div>
            <div className="signal-label text-[9px]">Critical</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="stat-box py-1.5" style={{ borderColor: 'rgba(255, 102, 0, 0.25)' }}>
            <div
              className="text-sm font-mono font-bold"
              style={{ color: '#ff6600', textShadow: '0 0 10px #ff6600' }}
            >
              {eventStats?.high ?? 0}
            </div>
            <div className="signal-label text-[8px]">High</div>
          </div>
          <div className="stat-box py-1.5" style={{ borderColor: 'rgba(255, 238, 0, 0.25)' }}>
            <div
              className="text-sm font-mono font-bold"
              style={{ color: '#ffee00', textShadow: '0 0 10px #ffee00' }}
            >
              {eventStats?.medium ?? 0}
            </div>
            <div className="signal-label text-[8px]">Medium</div>
          </div>
          <div className="stat-box py-1.5" style={{ borderColor: 'rgba(0, 255, 136, 0.25)' }}>
            <div
              className="text-sm font-mono font-bold"
              style={{ color: '#00ff88', textShadow: '0 0 10px #00ff88' }}
            >
              {eventStats?.low ?? 0}
            </div>
            <div className="signal-label text-[8px]">Low</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        <div className="signal-label px-3 mb-3">Navigation</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'sidebar-link rounded-lg',
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

      {/* Footer */}
      <div className="border-t border-[rgba(0,240,255,0.1)] p-3 space-y-1">
        {/* Profile Link */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'sidebar-link rounded-lg',
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

        <button
          onClick={() => {
            navigate('/settings', {
              state: { backgroundLocation: location },
            });
            onClose?.(); // Close mobile sidebar
          }}
          className={cn(
            'sidebar-link rounded-lg w-full',
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
  );
}
