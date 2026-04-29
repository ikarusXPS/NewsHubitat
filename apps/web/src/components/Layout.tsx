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
import { useIsMobile } from '../hooks/useMediaQuery';
import { BottomNav } from './mobile/BottomNav';
import { MobileDrawer } from './mobile/MobileDrawer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const mainRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();
  // Sidebar/drawer open state. Desktop opens by default (persistent rail);
  // mobile starts closed so the drawer doesn't cover content on first paint.
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
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

      {/* Single navigation tree: only one mounts per breakpoint to avoid
          duplicated links in the DOM (which broke strict-mode E2E locators). */}
      {isMobile ? (
        <MobileDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      ) : (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

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

      {/* CommandPalette is desktop-only (D-22); BottomNav is mobile-only.
          Mounted conditionally so they don't both contribute hidden DOM nodes
          to E2E locator results (homeLinks, etc.). */}
      {isMobile ? <BottomNav /> : <CommandPalette />}

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
