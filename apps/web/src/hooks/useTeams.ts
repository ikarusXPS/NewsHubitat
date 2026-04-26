/**
 * Team CRUD Hooks
 * TanStack Query hooks for team management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export type TeamRole = 'owner' | 'admin' | 'member';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
  role: TeamRole;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchTeams(token: string): Promise<Team[]> {
  const response = await fetch('/api/teams', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch teams');
  const data: ApiResponse<Team[]> = await response.json();
  return data.data || [];
}

async function fetchTeam(teamId: string, token: string): Promise<Team> {
  const response = await fetch(`/api/teams/${teamId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch team');
  }
  const data: ApiResponse<Team> = await response.json();
  return data.data!;
}

async function createTeam(
  name: string,
  description: string | undefined,
  token: string
): Promise<Team> {
  const response = await fetch('/api/teams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, description }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create team');
  }

  const data: ApiResponse<Team> = await response.json();
  return data.data!;
}

async function updateTeam(
  teamId: string,
  updates: { name?: string; description?: string | null },
  token: string
): Promise<Team> {
  const response = await fetch(`/api/teams/${teamId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update team');
  }

  const data: ApiResponse<Team> = await response.json();
  return data.data!;
}

async function deleteTeam(teamId: string, token: string): Promise<void> {
  const response = await fetch(`/api/teams/${teamId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete team');
  }
}

async function leaveTeam(teamId: string, userId: string, token: string): Promise<void> {
  const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to leave team');
  }
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook: Fetch user's teams
 */
export function useTeams() {
  const { token, isAuthenticated } = useAuth();

  const { data: teams, isLoading, error } = useQuery({
    queryKey: ['teams'],
    queryFn: () => fetchTeams(token!),
    staleTime: 60_000,
    enabled: isAuthenticated && !!token,
  });

  return {
    teams: teams || [],
    isLoading,
    error,
  };
}

/**
 * Hook: Fetch single team
 */
export function useTeam(teamId: string | undefined) {
  const { token, isAuthenticated } = useAuth();

  const { data: team, isLoading, error } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId!, token!),
    staleTime: 60_000,
    enabled: isAuthenticated && !!token && !!teamId,
  });

  return {
    team,
    isLoading,
    error,
  };
}

/**
 * Hook: Create team
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createTeam(name, description, token!),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

/**
 * Hook: Update team
 */
export function useUpdateTeam(teamId: string) {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (updates: { name?: string; description?: string | null }) =>
      updateTeam(teamId, updates, token!),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    },
  });
}

/**
 * Hook: Delete team (owner only)
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (teamId: string) => deleteTeam(teamId, token!),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

/**
 * Hook: Leave team
 */
export function useLeaveTeam() {
  const queryClient = useQueryClient();
  const { token, user } = useAuth();

  return useMutation({
    mutationFn: (teamId: string) => leaveTeam(teamId, user!.id, token!),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
