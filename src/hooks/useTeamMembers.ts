/**
 * Team Member Hooks
 * TanStack Query hooks for team member management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import type { TeamRole } from './useTeams';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: TeamRole;
  createdAt: string;
  expiresAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchTeamMembers(teamId: string, token: string): Promise<TeamMember[]> {
  const response = await fetch(`/api/teams/${teamId}/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch members');
  const data: ApiResponse<TeamMember[]> = await response.json();
  return data.data || [];
}

async function fetchTeamInvites(teamId: string, token: string): Promise<TeamInvite[]> {
  const response = await fetch(`/api/teams/${teamId}/invites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    // 403 means not admin - return empty array
    if (response.status === 403) return [];
    throw new Error('Failed to fetch invites');
  }
  const data: ApiResponse<TeamInvite[]> = await response.json();
  return data.data || [];
}

async function inviteMember(
  teamId: string,
  email: string,
  role: 'admin' | 'member',
  token: string
): Promise<void> {
  const response = await fetch(`/api/teams/${teamId}/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send invite');
  }
}

async function cancelInvite(teamId: string, inviteId: string, token: string): Promise<void> {
  const response = await fetch(`/api/teams/${teamId}/invites/${inviteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel invite');
  }
}

async function removeMember(teamId: string, userId: string, token: string): Promise<void> {
  const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove member');
  }
}

async function updateMemberRole(
  teamId: string,
  userId: string,
  role: 'admin' | 'member',
  token: string
): Promise<void> {
  const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update role');
  }
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook: Fetch team members
 */
export function useTeamMembers(teamId: string | undefined) {
  const { token, isAuthenticated } = useAuth();

  const { data: members, isLoading, error } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: () => fetchTeamMembers(teamId!, token!),
    staleTime: 60_000,
    enabled: isAuthenticated && !!token && !!teamId,
  });

  return {
    members: members || [],
    isLoading,
    error,
  };
}

/**
 * Hook: Fetch pending invites (admin+ only)
 */
export function useTeamInvites(teamId: string | undefined) {
  const { token, isAuthenticated } = useAuth();

  const { data: invites, isLoading, error } = useQuery({
    queryKey: ['team-invites', teamId],
    queryFn: () => fetchTeamInvites(teamId!, token!),
    staleTime: 60_000,
    enabled: isAuthenticated && !!token && !!teamId,
  });

  return {
    invites: invites || [],
    isLoading,
    error,
  };
}

/**
 * Hook: Invite member (D-01: email invite)
 */
export function useInviteMember(teamId: string) {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'admin' | 'member' }) =>
      inviteMember(teamId, email, role, token!),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites', teamId] });
    },
  });
}

/**
 * Hook: Cancel pending invite
 */
export function useCancelInvite(teamId: string) {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (inviteId: string) => cancelInvite(teamId, inviteId, token!),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites', teamId] });
    },
  });
}

/**
 * Hook: Remove member (D-08: admin+ can remove non-owners)
 */
export function useRemoveMember(teamId: string) {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (userId: string) => removeMember(teamId, userId, token!),

    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['team-members', teamId] });

      const previousMembers = queryClient.getQueryData(['team-members', teamId]);

      // Optimistically remove
      queryClient.setQueryData(['team-members', teamId], (old: TeamMember[] | undefined) =>
        (old || []).filter((m) => m.userId !== userId)
      );

      return { previousMembers };
    },

    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['team-members', teamId], context?.previousMembers);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    },
  });
}

/**
 * Hook: Update member role (owner only)
 */
export function useUpdateMemberRole(teamId: string) {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'member' }) =>
      updateMemberRole(teamId, userId, role, token!),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
    },
  });
}
