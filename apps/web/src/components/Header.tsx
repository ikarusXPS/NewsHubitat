import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, LogOut, Wifi, Clock, Menu, Radio, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { FocusSelector } from './FocusSelector';
import { FeedManagerButton } from './FeedManagerButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { TeamSwitcher } from './teams/TeamSwitcher';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { filters, setSearchQuery } = useAppStore();
  const { user, isAuthenticated, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  // Live clock
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }));

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="header-cyber flex h-14 items-center gap-4 px-4 md:px-6 relative z-20">
        {/* Left: Search + Status. flex-1 + min-w-0 lets the search column shrink
            when the right-side controls need space (was overflowing at 1280px with
            sidebar open — clipping the Sign In button). */}
        <div className="flex flex-1 min-w-0 items-center gap-4">
          {/* Hamburger Menu - Mobile Only */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-white/5 rounded-md transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-[#00f0ff]" />
          </button>

          {/* Radio Logo - Mobile Only (D-18) */}
          <button
            onClick={() => navigate('/')}
            className="md:hidden p-1 hover:bg-white/5 rounded-md transition-colors"
            aria-label="Go to Dashboard"
          >
            <Radio className="h-5 w-5 text-[#00f0ff]" />
          </button>

          {/* Mobile Search Icon (D-19) */}
          <button
            onClick={() => setSearchExpanded(true)}
            className="md:hidden p-2 hover:bg-white/5 rounded-md transition-colors"
            aria-label="Open search"
          >
            <Search className="h-5 w-5 text-[#00f0ff]" />
          </button>

          {/* Mobile Search Expanded Overlay (D-19) */}
          {searchExpanded && (
            <div className="fixed inset-0 bg-gray-900 z-50 p-4 pt-[var(--safe-area-top)] md:hidden">
              <div className="flex items-center gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSearchExpanded(false);
                  }}
                  className="flex-1 relative"
                >
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00f0ff]/50" />
                  <input
                    type="search"
                    autoFocus
                    placeholder={t('search.placeholder', 'Search signals...')}
                    value={filters.searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pl-10 text-white placeholder-gray-500 focus:border-[#00f0ff] focus:outline-none"
                  />
                  {filters.searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#ff0044] transition-colors"
                    >
                      ×
                    </button>
                  )}
                </form>
                <button
                  onClick={() => setSearchExpanded(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Desktop Search — shrinks within the available column so right-side
              controls always fit on the same row. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Search is already live-filtering via setSearchQuery
              // This ensures Enter doesn't reload the page
            }}
            className="relative hidden md:block flex-1 min-w-0 max-w-80"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00f0ff]/50" />
            <input
              type="text"
              placeholder="Search signals..."
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-cyber w-full"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#ff0044] transition-colors"
                title="Clear search"
              >
                ×
              </button>
            )}
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[rgba(0,240,255,0.1)] px-1.5 py-0.5 text-[10px] font-mono text-[#00f0ff]/50 border border-[rgba(0,240,255,0.2)]">
              /
            </kbd>
          </form>

          {/* Status - moved left after search */}
          <div className="hidden md:flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-1.5">
              <Wifi className="h-3 w-3 text-[#00ff88]" />
              <span className="text-[9px] font-mono text-[#00ff88] uppercase tracking-wider">
                Connected
              </span>
            </div>

            {/* Time */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-[#00f0ff]/70" />
              <span className="text-xs font-mono text-[#00f0ff] tabular-nums">
                {time}
              </span>
              <span className="text-[9px] font-mono text-gray-500 uppercase">
                UTC
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls. flex-shrink-0 keeps these always visible — search
            column shrinks first when space is tight. */}
        <div className="flex shrink-0 items-center gap-3">
          {/* Desktop controls - hidden on mobile (D-20) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Feed Manager */}
            <FeedManagerButton />

            {/* Focus Selector */}
            <FocusSelector />

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Team Switcher - authenticated users only */}
            {isAuthenticated && <TeamSwitcher />}
          </div>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 glass-panel rounded-lg px-3 py-1.5 border border-[#00f0ff]/20">
                <div className="w-6 h-6 rounded-md bg-[#0a0e1a] border border-[#00f0ff]/30 flex items-center justify-center">
                  <User className="h-3 w-3 text-[#00f0ff]" />
                </div>
                <span className="text-xs font-mono text-[#00f0ff]">{user?.name}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-md border border-transparent hover:border-[#ff0044]/30 text-gray-500 hover:text-[#ff0044] transition-all"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="btn-cyber btn-cyber-primary py-1.5 px-4 rounded-md text-[10px]"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
