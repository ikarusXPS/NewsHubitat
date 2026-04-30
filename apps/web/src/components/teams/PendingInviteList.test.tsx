/**
 * Unit tests for PendingInviteList component.
 *
 * Proves the invites tab wiring:
 * - Returns null when userRole is "member" (role gate)
 * - Renders empty state when no invites
 * - Renders both invite emails when 2 invites exist
 * - Cancel button triggers useCancelInvite.mutate with invite.id
 * - Expired invites show "Expired" text
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { PendingInviteList } from './PendingInviteList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) =>
      typeof opts === 'string'
        ? opts
        : (opts as { defaultValue?: string })?.defaultValue ?? key,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock TeamRoleBadge to avoid rendering complexity
vi.mock('./TeamRoleBadge', () => ({
  TeamRoleBadge: ({ role }: { role: string }) => <span data-testid="role-badge">{role}</span>,
}));

let mockInvites: Array<{
  id: string;
  teamId: string;
  email: string;
  role: 'admin' | 'member';
  expiresAt: string;
  createdAt: string;
}> = [];
let mockInvitesLoading = false;
const mockCancelInvite = vi.fn();

vi.mock('../../hooks/useTeamMembers', () => ({
  useTeamInvites: () => ({
    invites: mockInvites,
    isLoading: mockInvitesLoading,
    error: null,
  }),
  useCancelInvite: () => ({ mutate: mockCancelInvite, isPending: false }),
}));

const futureInvite = {
  id: 'inv-1',
  teamId: 't1',
  email: 'alice@example.com',
  role: 'member' as const,
  expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
  createdAt: '2026-04-30T00:00:00Z',
};

const expiredInvite = {
  id: 'inv-2',
  teamId: 't1',
  email: 'bob@example.com',
  role: 'admin' as const,
  expiresAt: new Date(Date.now() - 86400000).toISOString(),
  createdAt: '2026-04-29T00:00:00Z',
};

describe('PendingInviteList', () => {
  beforeEach(() => {
    mockInvites = [];
    mockInvitesLoading = false;
    mockCancelInvite.mockClear();
    vi.unstubAllGlobals();
    cleanup();
  });

  it('renders nothing (null) when userRole is "member"', () => {
    mockInvites = [futureInvite];
    const { container } = render(
      <PendingInviteList teamId="t1" userRole="member" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders empty state when admin and no invites', () => {
    mockInvites = [];
    const { container } = render(
      <PendingInviteList teamId="t1" userRole="admin" />
    );

    // Should show empty state — matches i18n key 'empty.noInvites.title' -> defaultValue 'No pending invites'
    expect(container.textContent).toContain('No pending invites');
  });

  it('renders both invite emails when 2 invites exist', () => {
    mockInvites = [futureInvite, expiredInvite];
    const { container } = render(
      <PendingInviteList teamId="t1" userRole="admin" />
    );

    expect(container.textContent).toContain('alice@example.com');
    expect(container.textContent).toContain('bob@example.com');
  });

  it('calls useCancelInvite mutate with invite.id when cancel confirmed', () => {
    vi.stubGlobal('confirm', () => true);
    mockInvites = [futureInvite];

    const { container } = render(
      <PendingInviteList teamId="t1" userRole="admin" />
    );

    const cancelBtn = container.querySelector('button');
    expect(cancelBtn).not.toBeNull();
    fireEvent.click(cancelBtn!);

    // useCancelInvite.mutate called with (inviteId, opts)
    expect(mockCancelInvite).toHaveBeenCalledWith(
      'inv-1',
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it('shows "Expired" text when invite expiresAt is in the past', () => {
    mockInvites = [expiredInvite];
    const { container } = render(
      <PendingInviteList teamId="t1" userRole="owner" />
    );

    expect(container.textContent).toContain('Expired');
  });
});
