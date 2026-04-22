/**
 * Unit tests for useKeyboardShortcuts hook
 * Tests keyboard navigation, action keys, input bypass, and cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useKeyboardShortcuts, getShortcutGroups } from './useKeyboardShortcuts';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Wrapper for renderHook with router context
const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('navigation keys (1-6)', () => {
    it('navigates to / on key 1', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      fireEvent.keyDown(document, { key: '1' });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('navigates to /analysis on key 2', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      fireEvent.keyDown(document, { key: '2' });
      expect(mockNavigate).toHaveBeenCalledWith('/analysis');
    });

    it('navigates to /monitor on key 3', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      fireEvent.keyDown(document, { key: '3' });
      expect(mockNavigate).toHaveBeenCalledWith('/monitor');
    });

    it('navigates to /timeline on key 4', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      fireEvent.keyDown(document, { key: '4' });
      expect(mockNavigate).toHaveBeenCalledWith('/timeline');
    });

    it('navigates to /event-map on key 5', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      fireEvent.keyDown(document, { key: '5' });
      expect(mockNavigate).toHaveBeenCalledWith('/event-map');
    });

    it('navigates to /community on key 6', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      fireEvent.keyDown(document, { key: '6' });
      expect(mockNavigate).toHaveBeenCalledWith('/community');
    });
  });

  describe('action keys', () => {
    it('calls onFocusSearch on /', () => {
      const onFocusSearch = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onFocusSearch }), { wrapper });
      fireEvent.keyDown(document, { key: '/' });
      expect(onFocusSearch).toHaveBeenCalled();
    });

    it('calls onRefresh on r', () => {
      const onRefresh = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onRefresh }), { wrapper });
      fireEvent.keyDown(document, { key: 'r' });
      expect(onRefresh).toHaveBeenCalled();
    });

    it('calls onCloseModal on Escape', () => {
      const onCloseModal = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onCloseModal }), { wrapper });
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onCloseModal).toHaveBeenCalled();
    });

    it('calls onShowHelp on Shift+?', () => {
      const onShowHelp = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onShowHelp }), { wrapper });
      fireEvent.keyDown(document, { key: '?', shiftKey: true });
      expect(onShowHelp).toHaveBeenCalled();
    });

    it('does not call onShowHelp on ? without shift', () => {
      const onShowHelp = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onShowHelp }), { wrapper });
      fireEvent.keyDown(document, { key: '?' });
      expect(onShowHelp).not.toHaveBeenCalled();
    });
  });

  describe('feed navigation keys', () => {
    it('calls onNextArticle on j', () => {
      const onNextArticle = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onNextArticle }), { wrapper });
      fireEvent.keyDown(document, { key: 'j' });
      expect(onNextArticle).toHaveBeenCalled();
    });

    it('calls onPrevArticle on k', () => {
      const onPrevArticle = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPrevArticle }), { wrapper });
      fireEvent.keyDown(document, { key: 'k' });
      expect(onPrevArticle).toHaveBeenCalled();
    });

    it('calls onOpenArticle on o', () => {
      const onOpenArticle = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onOpenArticle }), { wrapper });
      fireEvent.keyDown(document, { key: 'o' });
      expect(onOpenArticle).toHaveBeenCalled();
    });

    it('calls onBookmark on b', () => {
      const onBookmark = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onBookmark }), { wrapper });
      fireEvent.keyDown(document, { key: 'b' });
      expect(onBookmark).toHaveBeenCalled();
    });

    it('calls onMarkRead on m', () => {
      const onMarkRead = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onMarkRead }), { wrapper });
      fireEvent.keyDown(document, { key: 'm' });
      expect(onMarkRead).toHaveBeenCalled();
    });
  });

  describe('input field bypass', () => {
    it('ignores shortcuts when target is INPUT', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      const input = document.createElement('input');
      document.body.appendChild(input);
      fireEvent.keyDown(input, { key: '1' });
      expect(mockNavigate).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it('ignores shortcuts when target is TEXTAREA', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      fireEvent.keyDown(textarea, { key: '2' });
      expect(mockNavigate).not.toHaveBeenCalled();
      document.body.removeChild(textarea);
    });

    it('ignores shortcuts when target is contentEditable', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      const div = document.createElement('div');
      div.contentEditable = 'true';
      document.body.appendChild(div);
      // In jsdom, we need to mock isContentEditable since the property may not
      // reflect correctly without full rendering
      Object.defineProperty(div, 'isContentEditable', {
        value: true,
        writable: false,
      });
      fireEvent.keyDown(div, { key: '3' });
      expect(mockNavigate).not.toHaveBeenCalled();
      document.body.removeChild(div);
    });

    it('allows Escape even in input fields', () => {
      const onCloseModal = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onCloseModal }), { wrapper });
      const input = document.createElement('input');
      document.body.appendChild(input);
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(onCloseModal).toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it('allows Escape in TEXTAREA', () => {
      const onCloseModal = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onCloseModal }), { wrapper });
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      fireEvent.keyDown(textarea, { key: 'Escape' });
      expect(onCloseModal).toHaveBeenCalled();
      document.body.removeChild(textarea);
    });
  });

  describe('modifier key bypass', () => {
    it('ignores shortcuts when ctrlKey is true', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      fireEvent.keyDown(document, { key: '1', ctrlKey: true });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('ignores shortcuts when metaKey is true', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      fireEvent.keyDown(document, { key: '2', metaKey: true });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('ignores shortcuts when altKey is true', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      fireEvent.keyDown(document, { key: '3', altKey: true });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('ignores action keys when ctrlKey is true', () => {
      const onRefresh = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onRefresh }), { wrapper });
      fireEvent.keyDown(document, { key: 'r', ctrlKey: true });
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('ignores feed navigation when metaKey is true', () => {
      const onNextArticle = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onNextArticle }), { wrapper });
      fireEvent.keyDown(document, { key: 'j', metaKey: true });
      expect(onNextArticle).not.toHaveBeenCalled();
    });
  });

  describe('enabled option', () => {
    it('disables all shortcuts when enabled=false', () => {
      const onRefresh = vi.fn();
      renderHook(() => useKeyboardShortcuts({ enabled: false, onRefresh }), {
        wrapper,
      });
      fireEvent.keyDown(document, { key: '1' });
      fireEvent.keyDown(document, { key: 'r' });
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('enables shortcuts by default (enabled=undefined)', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      fireEvent.keyDown(document, { key: '1' });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('enables shortcuts when enabled=true', () => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }), { wrapper });
      fireEvent.keyDown(document, { key: '2' });
      expect(mockNavigate).toHaveBeenCalledWith('/analysis');
    });
  });

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = renderHook(() => useKeyboardShortcuts(), { wrapper });
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
      removeEventListenerSpy.mockRestore();
    });

    it('adds event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
      addEventListenerSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('does not call handlers that are not provided', () => {
      // Should not throw when handlers are undefined
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      expect(() => {
        fireEvent.keyDown(document, { key: 'r' });
        fireEvent.keyDown(document, { key: '/' });
        fireEvent.keyDown(document, { key: 'j' });
      }).not.toThrow();
    });

    it('handles unknown keys gracefully', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      expect(() => {
        fireEvent.keyDown(document, { key: 'z' });
        fireEvent.keyDown(document, { key: 'F1' });
        fireEvent.keyDown(document, { key: 'Tab' });
      }).not.toThrow();
    });
  });
});

describe('getShortcutGroups', () => {
  it('returns navigation shortcuts', () => {
    const groups = getShortcutGroups();
    expect(groups.navigation).toBeDefined();
    expect(Array.isArray(groups.navigation)).toBe(true);
    expect(groups.navigation.length).toBe(6);
    expect(groups.navigation[0]).toEqual({ key: '1', description: 'Dashboard' });
    expect(groups.navigation[5]).toEqual({ key: '6', description: 'Community' });
  });

  it('returns actions shortcuts', () => {
    const groups = getShortcutGroups();
    expect(groups.actions).toBeDefined();
    expect(Array.isArray(groups.actions)).toBe(true);
    expect(groups.actions.length).toBe(4);
    expect(groups.actions).toContainEqual({ key: '/', description: 'Focus search' });
    expect(groups.actions).toContainEqual({ key: 'r', description: 'Refresh data' });
  });

  it('returns feed shortcuts', () => {
    const groups = getShortcutGroups();
    expect(groups.feed).toBeDefined();
    expect(Array.isArray(groups.feed)).toBe(true);
    expect(groups.feed.length).toBe(5);
    expect(groups.feed).toContainEqual({ key: 'j', description: 'Next article' });
    expect(groups.feed).toContainEqual({ key: 'k', description: 'Previous article' });
  });

  it('returns all three groups', () => {
    const groups = getShortcutGroups();
    expect(Object.keys(groups)).toHaveLength(3);
    expect(Object.keys(groups)).toContain('navigation');
    expect(Object.keys(groups)).toContain('actions');
    expect(Object.keys(groups)).toContain('feed');
  });
});

// KEYBOARD_SHORTCUTS constant was removed - getShortcutGroups() provides the same data
