import { useState, useEffect } from 'react';
import { Search, Globe, User, LogOut, Wifi, Clock, Menu } from 'lucide-react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { FocusSelector } from './FocusSelector';
import { FeedManagerButton } from './FeedManagerButton';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { language, setLanguage, filters, setSearchQuery } = useAppStore();
  const { user, isAuthenticated, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

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
      <header className="header-cyber flex h-14 items-center justify-between px-6 relative z-20">
        {/* Left: Search + Status */}
        <div className="flex items-center gap-4">
          {/* Hamburger Menu - Mobile Only */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-white/5 rounded-md transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-[#00f0ff]" />
          </button>

          {/* Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Search is already live-filtering via setSearchQuery
              // This ensures Enter doesn't reload the page
            }}
            className="relative w-48 sm:w-64 lg:w-80"
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

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          {/* Feed Manager */}
          <FeedManagerButton />

          {/* Focus Selector */}
          <FocusSelector />

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
            className="btn-cyber py-1.5 px-3 rounded-md text-[10px]"
          >
            <Globe className="h-3.5 w-3.5 inline mr-1.5" />
            {language.toUpperCase()}
          </button>

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
