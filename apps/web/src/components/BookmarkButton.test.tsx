/**
 * Unit tests for BookmarkButton component.
 *
 * Proves the team dropdown wiring:
 * - Falls back to personal toggle when no teams exist
 * - Shows ChevronDown + dropdown when teams exist
 * - Calls useAddTeamBookmark.mutate with correct articleId on team selection
 * - Personal option in dropdown calls onPersonalBookmark
 * - isBookmarked toggles between Bookmark and BookmarkCheck icon
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { BookmarkButton } from './BookmarkButton';

// Module mocks — declared before describe() per Vitest hoisting rules
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue?: string }) =>
      typeof fallback === 'string'
        ? fallback
        : (fallback as { defaultValue?: string })?.defaultValue ?? key,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockAddBookmark = vi.fn();
vi.mock('../hooks/useTeamBookmarks', () => ({
  useAddTeamBookmark: () => ({ mutate: mockAddBookmark, isPending: false }),
}));

let mockTeams: Array<{ id: string; name: string; role: string }> = [];
let mockIsAuthenticated = true;

vi.mock('../hooks/useTeams', () => ({
  useTeams: () => ({ teams: mockTeams, isLoading: false, error: null }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: { id: 'u1', name: 'Tester' },
    token: 'tok',
  }),
}));

describe('BookmarkButton', () => {
  beforeEach(() => {
    mockTeams = [];
    mockIsAuthenticated = true;
    mockAddBookmark.mockClear();
    cleanup();
  });

  it('calls onPersonalBookmark directly when no teams exist', () => {
    mockTeams = [];
    const onPersonalBookmark = vi.fn();
    const { container } = render(
      <BookmarkButton
        articleId="article-123"
        isBookmarked={false}
        onPersonalBookmark={onPersonalBookmark}
      />
    );

    fireEvent.click(container.querySelector('button')!);

    expect(onPersonalBookmark).toHaveBeenCalledOnce();
    // No dropdown should open
    expect(screen.queryByText('Save to Team')).toBeNull();
  });

  it('shows ChevronDown icon when teams exist and user is authenticated', () => {
    mockTeams = [{ id: 't1', name: 'Alpha', role: 'owner' }];
    const onPersonalBookmark = vi.fn();
    const { container } = render(
      <BookmarkButton
        articleId="article-123"
        isBookmarked={false}
        onPersonalBookmark={onPersonalBookmark}
      />
    );

    // ChevronDown svg must be present when teams exist
    const chevronDown = container.querySelector('svg.lucide-chevron-down');
    expect(chevronDown).not.toBeNull();
  });

  it('opens dropdown with Personal and Save to Team sections when teams exist', () => {
    mockTeams = [{ id: 't1', name: 'Alpha', role: 'owner' }];
    const onPersonalBookmark = vi.fn();
    const { container } = render(
      <BookmarkButton
        articleId="article-123"
        isBookmarked={false}
        onPersonalBookmark={onPersonalBookmark}
      />
    );

    fireEvent.click(container.querySelector('button')!);

    // Portal renders to document.body — screen queries search entire document
    expect(screen.getByText('Personal')).toBeTruthy();
    expect(screen.getByText('Save to Team')).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
  });

  it('calls useAddTeamBookmark mutate with articleId when team option clicked', () => {
    mockTeams = [{ id: 't1', name: 'Alpha', role: 'owner' }];
    const onPersonalBookmark = vi.fn();
    const { container } = render(
      <BookmarkButton
        articleId="article-123"
        isBookmarked={false}
        onPersonalBookmark={onPersonalBookmark}
      />
    );

    // Open the dropdown
    fireEvent.click(container.querySelector('button')!);

    // Click the "Alpha" team option
    const alphaButton = screen.getByText('Alpha');
    fireEvent.click(alphaButton);

    expect(mockAddBookmark).toHaveBeenCalledWith(
      { articleId: 'article-123' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it('calls onPersonalBookmark and closes dropdown when Personal option is clicked', () => {
    mockTeams = [{ id: 't1', name: 'Alpha', role: 'owner' }];
    const onPersonalBookmark = vi.fn();
    const { container } = render(
      <BookmarkButton
        articleId="article-123"
        isBookmarked={false}
        onPersonalBookmark={onPersonalBookmark}
      />
    );

    // Open the dropdown
    fireEvent.click(container.querySelector('button')!);
    expect(screen.getByText('Save to Team')).toBeTruthy();

    // Click Personal
    fireEvent.click(screen.getByText('Personal'));

    expect(onPersonalBookmark).toHaveBeenCalledOnce();
    // Dropdown should close
    expect(screen.queryByText('Save to Team')).toBeNull();
  });

  it('shows BookmarkCheck icon when isBookmarked is true', () => {
    mockTeams = [];
    const onPersonalBookmark = vi.fn();
    const { container } = render(
      <BookmarkButton
        articleId="article-123"
        isBookmarked={true}
        onPersonalBookmark={onPersonalBookmark}
      />
    );

    const bookmarkCheck = container.querySelector('svg.lucide-bookmark-check');
    expect(bookmarkCheck).not.toBeNull();
  });
});
