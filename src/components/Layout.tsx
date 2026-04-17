import { useRef, useState, useCallback, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { ReadingProgressBar } from './ReadingProgressBar';
import { OfflineBanner } from './OfflineBanner';
import { BreakingNewsTicker } from './BreakingNewsTicker';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Animated Background Layers */}
      <div className="app-background" />
      <div className="grid-pattern" />

      {/* Scan Line Effect */}
      <div className="scan-line" />

      {/* Reading Progress */}
      <ReadingProgressBar containerRef={mainRef} />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <BreakingNewsTicker />
        <OfflineBanner />
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto p-6 relative"
        >
          {/* Data Stream Effect (subtle) */}
          <div className="data-stream opacity-20" />

          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Toast Notifications - Cyber Style */}
      <Toaster
        position="bottom-right"
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
