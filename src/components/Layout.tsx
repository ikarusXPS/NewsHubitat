import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { Toaster, type ToasterProps } from 'sonner';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { ReadingProgressBar } from './ReadingProgressBar';
import { OfflineBanner } from './OfflineBanner';
import { BreakingNewsTicker } from './BreakingNewsTicker';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { InstallPromptBanner } from './InstallPromptBanner';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { BottomNav } from './mobile/BottomNav';
import { MobileDrawer } from './mobile/MobileDrawer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const mainRef = useRef<HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Keyboard shortcuts handlers
  const handleShowHelp = useCallback(() => setShowKeyboardHelp(true), []);
  const handleCloseModal = useCallback(() => setShowKeyboardHelp(false), []);

  // Initialize global keyboard shortcuts
  useKeyboardShortcuts({
    onShowHelp: handleShowHelp,
    onCloseModal: handleCloseModal,
  });

  // Responsive toast position: top-center on mobile, bottom-right on desktop (D-29)
  const [toastPosition, setToastPosition] = useState<ToasterProps['position']>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'top-center' : 'bottom-right'
  );

  useEffect(() => {
    const handleResize = () => {
      setToastPosition(window.innerWidth < 768 ? 'top-center' : 'bottom-right');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Animated Background Layers */}
      <div className="app-background" />
      <div className="grid-pattern" />

      {/* Scan Line Effect */}
      <div className="scan-line" />

      {/* Reading Progress */}
      <ReadingProgressBar containerRef={mainRef} />

      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile Drawer - visible on mobile only */}
      <div className="md:hidden">
        <MobileDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <BreakingNewsTicker />
        <OfflineBanner />
        <InstallPromptBanner />
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 relative"
          style={{
            paddingLeft: 'max(1rem, var(--safe-area-left))',
            paddingRight: 'max(1rem, var(--safe-area-right))',
            paddingBottom: 'max(1rem, var(--safe-area-bottom))',
          }}
        >
          {/* Data Stream Effect (subtle) */}
          <div className="data-stream opacity-20" />

          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>

      {/* Command Palette - desktop only (D-22) */}
      <div className="hidden md:block">
        <CommandPalette />
      </div>

      {/* Bottom Nav - mobile only */}
      <BottomNav />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Toast Notifications - Cyber Style */}
      <Toaster
        position={toastPosition}
        theme="dark"
        toastOptions={{
          className: 'glass-panel font-mono',
          style: {
            background: 'rgba(10, 14, 26, 0.95)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            color: '#e2e8f0',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.8rem',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.1)',
          },
        }}
      />
    </div>
  );
}
