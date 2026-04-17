import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

interface ShortcutHandler {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  description: string;
}

export const KEYBOARD_SHORTCUTS: ShortcutHandler[] = [
  // Navigation
  { key: '1', handler: () => {}, description: 'Go to Dashboard' },
  { key: '2', handler: () => {}, description: 'Go to Analysis' },
  { key: '3', handler: () => {}, description: 'Go to Monitor' },
  { key: '4', handler: () => {}, description: 'Go to Timeline' },
  { key: '5', handler: () => {}, description: 'Go to Event Map' },
  { key: '6', handler: () => {}, description: 'Go to Community' },

  // Actions
  { key: '/', handler: () => {}, description: 'Focus search' },
  { key: 'r', handler: () => {}, description: 'Refresh data' },
  { key: 'Escape', handler: () => {}, description: 'Close modal/panel' },
  { key: '?', shiftKey: true, handler: () => {}, description: 'Show keyboard shortcuts' },

  // Feed navigation
  { key: 'j', handler: () => {}, description: 'Next article' },
  { key: 'k', handler: () => {}, description: 'Previous article' },
  { key: 'o', handler: () => {}, description: 'Open article' },
  { key: 'b', handler: () => {}, description: 'Bookmark article' },
  { key: 'm', handler: () => {}, description: 'Mark as read' },
];

export function useKeyboardShortcuts(options?: {
  enabled?: boolean;
  onShowHelp?: () => void;
  onRefresh?: () => void;
  onFocusSearch?: () => void;
  onCloseModal?: () => void;
  onNextArticle?: () => void;
  onPrevArticle?: () => void;
  onOpenArticle?: () => void;
  onBookmark?: () => void;
  onMarkRead?: () => void;
}) {
  const navigate = useNavigate();
  const { commandPaletteEnabled } = useAppStore();
  const enabled = options?.enabled ?? true;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to close modals even when in input
        if (event.key !== 'Escape') {
          return;
        }
      }

      // Don't trigger if disabled
      if (!enabled) return;

      // Prevent triggering when using modifier keys for other purposes
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      switch (event.key) {
        // Navigation (number keys)
        case '1':
          if (!hasModifier) {
            event.preventDefault();
            navigate('/');
          }
          break;
        case '2':
          if (!hasModifier) {
            event.preventDefault();
            navigate('/analysis');
          }
          break;
        case '3':
          if (!hasModifier) {
            event.preventDefault();
            navigate('/monitor');
          }
          break;
        case '4':
          if (!hasModifier) {
            event.preventDefault();
            navigate('/timeline');
          }
          break;
        case '5':
          if (!hasModifier) {
            event.preventDefault();
            navigate('/event-map');
          }
          break;
        case '6':
          if (!hasModifier) {
            event.preventDefault();
            navigate('/community');
          }
          break;

        // Focus search
        case '/':
          if (!hasModifier) {
            event.preventDefault();
            options?.onFocusSearch?.();
            // Also try to focus the search input directly
            const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
          }
          break;

        // Refresh
        case 'r':
          if (!hasModifier) {
            event.preventDefault();
            options?.onRefresh?.();
          }
          break;

        // Close modal/panel
        case 'Escape':
          options?.onCloseModal?.();
          break;

        // Help modal
        case '?':
          if (event.shiftKey) {
            event.preventDefault();
            options?.onShowHelp?.();
          }
          break;

        // Article navigation
        case 'j':
          if (!hasModifier) {
            event.preventDefault();
            options?.onNextArticle?.();
          }
          break;
        case 'k':
          if (!hasModifier) {
            event.preventDefault();
            options?.onPrevArticle?.();
          }
          break;
        case 'o':
          if (!hasModifier) {
            event.preventDefault();
            options?.onOpenArticle?.();
          }
          break;
        case 'b':
          if (!hasModifier) {
            event.preventDefault();
            options?.onBookmark?.();
          }
          break;
        case 'm':
          if (!hasModifier) {
            event.preventDefault();
            options?.onMarkRead?.();
          }
          break;

        default:
          break;
      }
    },
    [navigate, enabled, options, commandPaletteEnabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Export shortcut descriptions for help modal
export function getShortcutGroups() {
  return {
    navigation: [
      { key: '1', description: 'Dashboard' },
      { key: '2', description: 'Analysis' },
      { key: '3', description: 'Monitor' },
      { key: '4', description: 'Timeline' },
      { key: '5', description: 'Event Map' },
      { key: '6', description: 'Community' },
    ],
    actions: [
      { key: '/', description: 'Focus search' },
      { key: 'r', description: 'Refresh data' },
      { key: 'Esc', description: 'Close modal/panel' },
      { key: 'Shift + ?', description: 'Show shortcuts' },
    ],
    feed: [
      { key: 'j', description: 'Next article' },
      { key: 'k', description: 'Previous article' },
      { key: 'o', description: 'Open article' },
      { key: 'b', description: 'Bookmark' },
      { key: 'm', description: 'Mark as read' },
    ],
  };
}
