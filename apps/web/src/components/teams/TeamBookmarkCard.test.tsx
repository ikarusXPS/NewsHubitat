/**
 * Unit tests for TeamBookmarkCard component.
 *
 * Proves the anchor href + target wiring:
 * - articleUrl prop is used as href when present
 * - Falls back to /article/${articleId} when articleUrl is undefined
 * - target="_blank" and rel="noopener noreferrer" are always set
 * - articleTitle prop displayed; fallback is "Article {articleId}"
 * - Remove button role gating: hidden for member (other adder), visible for admin
 * - useRemoveTeamBookmark mutate called with bookmark.id on confirm
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { TeamBookmarkCard } from './TeamBookmarkCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) =>
      typeof opts === 'string'
        ? opts
        : (opts as { defaultValue?: string })?.defaultValue ?? key,
  }),
}));

const mockRemoveBookmark = vi.fn();
vi.mock('../../hooks/useTeamBookmarks', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../hooks/useTeamBookmarks');
  return {
    ...actual,
    useRemoveTeamBookmark: () => ({ mutate: mockRemoveBookmark, isPending: false }),
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'current-user', name: 'Tester' },
    token: 'tok',
    isAuthenticated: true,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const baseBookmark = {
  id: 'bm-1',
  teamId: 'team-1',
  articleId: 'article-xyz',
  addedBy: 'other-user',
  addedByUser: { id: 'other-user', name: 'Alice', avatarUrl: null },
  note: null,
  createdAt: '2026-04-30T10:00:00Z',
  article: null,
};

describe('TeamBookmarkCard', () => {
  beforeEach(() => {
    mockRemoveBookmark.mockClear();
    vi.unstubAllGlobals();
    cleanup();
  });

  it('uses articleUrl as href when provided', () => {
    const { container } = render(
      <TeamBookmarkCard
        bookmark={baseBookmark}
        teamId="team-1"
        userRole="admin"
        articleUrl="https://example.com/news/123"
      />
    );

    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('https://example.com/news/123');
  });

  it('falls back to /article/${articleId} when articleUrl is undefined', () => {
    const { container } = render(
      <TeamBookmarkCard
        bookmark={baseBookmark}
        teamId="team-1"
        userRole="admin"
      />
    );

    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('/article/article-xyz');
  });

  it('always sets target="_blank" and rel="noopener noreferrer"', () => {
    const { container } = render(
      <TeamBookmarkCard
        bookmark={baseBookmark}
        teamId="team-1"
        userRole="admin"
        articleUrl="https://example.com/news/123"
      />
    );

    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('displays articleTitle when provided', () => {
    const { container } = render(
      <TeamBookmarkCard
        bookmark={baseBookmark}
        teamId="team-1"
        userRole="admin"
        articleTitle="Real Title"
      />
    );

    const heading = container.querySelector('h3');
    expect(heading?.textContent).toContain('Real Title');
  });

  it('displays fallback title "Article {articleId}" when articleTitle is undefined', () => {
    const { container } = render(
      <TeamBookmarkCard
        bookmark={baseBookmark}
        teamId="team-1"
        userRole="admin"
      />
    );

    const heading = container.querySelector('h3');
    expect(heading?.textContent).toContain('Article article-xyz');
  });

  it('hides remove button for member role when addedBy is not current user', () => {
    const { container } = render(
      <TeamBookmarkCard
        bookmark={baseBookmark}
        teamId="team-1"
        userRole="member"
      />
    );

    // canRemove = addedBy === currentUser || role !== 'member'
    // 'other-user' !== 'current-user' AND role IS 'member' → canRemove = false
    const removeButton = container.querySelector('button[aria-label]');
    expect(removeButton).toBeNull();
  });

  it('shows remove button for admin role regardless of addedBy', () => {
    const { container } = render(
      <TeamBookmarkCard
        bookmark={baseBookmark}
        teamId="team-1"
        userRole="admin"
      />
    );

    const removeButton = container.querySelector('button[aria-label]');
    expect(removeButton).not.toBeNull();
  });

  it('calls useRemoveTeamBookmark mutate with bookmark.id when confirm returns true', () => {
    vi.stubGlobal('confirm', () => true);

    const { container } = render(
      <TeamBookmarkCard
        bookmark={baseBookmark}
        teamId="team-1"
        userRole="admin"
      />
    );

    const removeButton = container.querySelector('button[aria-label]');
    expect(removeButton).not.toBeNull();
    fireEvent.click(removeButton!);

    expect(mockRemoveBookmark).toHaveBeenCalledWith('bm-1');
  });
});
