/**
 * TeamService Unit Tests
 * Tests team CRUD, invites, and member management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies at top level
vi.mock('../db/prisma', () => ({
  prisma: {
    teamMember: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    team: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    teamInvite: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    teamBookmark: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('./websocketService', () => ({
  WebSocketService: {
    getInstance: () => ({
      broadcastTeamMemberJoined: vi.fn(),
      broadcastTeamMemberRemoved: vi.fn(),
      broadcastTeamBookmark: vi.fn(),
    }),
  },
}));

vi.mock('./emailService', () => ({
  EmailService: {
    getInstance: () => ({
      sendTeamInvite: vi.fn().mockResolvedValue(true),
    }),
  },
}));

vi.mock('../utils/tokenUtils', () => ({
  generateSecureToken: () => ({ token: 'test-token', hash: 'test-hash' }),
  hashToken: (token: string) => `hashed-${token}`,
  getTokenExpiry: (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000),
  isTokenExpired: (date: Date) => date < new Date(),
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Import after mocks
import { TeamService } from './teamService';
import { prisma } from '../db/prisma';

describe('TeamService', () => {
  let teamService: TeamService;

  beforeEach(() => {
    // Reset singleton for clean state
    (TeamService as unknown as { instance: TeamService | null }).instance = null;
    teamService = TeamService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset singleton
    (TeamService as unknown as { instance: TeamService | null }).instance = null;
  });

  describe('createTeam', () => {
    it('creates team with user as owner', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        description: null,
        createdAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(prisma.teamMember.count).mockResolvedValue(0);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
        const tx = {
          team: { create: vi.fn().mockResolvedValue(mockTeam) },
          teamMember: { create: vi.fn().mockResolvedValue({}) },
        };
        return (callback as (tx: typeof tx) => Promise<typeof mockTeam>)(tx);
      });

      const result = await teamService.createTeam('user-1', 'Test Team');

      expect(result.name).toBe('Test Team');
      expect(result.role).toBe('owner');
      expect(result.memberCount).toBe(1);
    });

    it('rejects name shorter than 3 characters', async () => {
      await expect(teamService.createTeam('user-1', 'AB')).rejects.toThrow(
        'Team name must be 3-50 characters'
      );
    });

    it('rejects name longer than 50 characters', async () => {
      const longName = 'A'.repeat(51);
      await expect(teamService.createTeam('user-1', longName)).rejects.toThrow(
        'Team name must be 3-50 characters'
      );
    });

    it('rejects when user has 10 teams', async () => {
      vi.mocked(prisma.teamMember.count).mockResolvedValue(10);

      await expect(teamService.createTeam('user-1', 'Test Team')).rejects.toThrow(
        'Maximum 10 teams per user'
      );
    });

    it('trims whitespace from name', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Trimmed Name',
        description: null,
        createdAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(prisma.teamMember.count).mockResolvedValue(0);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
        const tx = {
          team: { create: vi.fn().mockResolvedValue(mockTeam) },
          teamMember: { create: vi.fn().mockResolvedValue({}) },
        };
        return (callback as (tx: typeof tx) => Promise<typeof mockTeam>)(tx);
      });

      const result = await teamService.createTeam('user-1', '  Trimmed Name  ');
      expect(result.name).toBe('Trimmed Name');
    });
  });

  describe('getUserTeams', () => {
    it('returns user teams with roles', async () => {
      const mockMemberships = [
        {
          team: {
            id: 'team-1',
            name: 'Team One',
            description: null,
            createdAt: new Date(),
            deletedAt: null,
            _count: { members: 3 },
          },
          role: 'owner',
        },
        {
          team: {
            id: 'team-2',
            name: 'Team Two',
            description: 'Description',
            createdAt: new Date(),
            deletedAt: null,
            _count: { members: 5 },
          },
          role: 'member',
        },
      ];

      vi.mocked(prisma.teamMember.findMany).mockResolvedValue(mockMemberships as never);

      const result = await teamService.getUserTeams('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Team One');
      expect(result[0].role).toBe('owner');
      expect(result[1].memberCount).toBe(5);
    });

    it('filters out deleted teams', async () => {
      const mockMemberships = [
        {
          team: {
            id: 'team-1',
            name: 'Active Team',
            description: null,
            createdAt: new Date(),
            deletedAt: null,
            _count: { members: 3 },
          },
          role: 'member',
        },
        {
          team: {
            id: 'team-2',
            name: 'Deleted Team',
            description: null,
            createdAt: new Date(),
            deletedAt: new Date(),
            _count: { members: 5 },
          },
          role: 'member',
        },
      ];

      vi.mocked(prisma.teamMember.findMany).mockResolvedValue(mockMemberships as never);

      const result = await teamService.getUserTeams('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Active Team');
    });
  });

  describe('createInvite', () => {
    it('creates invite and returns token', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: 'owner',
        userId: 'owner-1'
      } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.teamInvite.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.teamInvite.create).mockResolvedValue({} as never);
      vi.mocked(prisma.team.findUnique).mockResolvedValue({ name: 'Test Team' } as never);

      const token = await teamService.createInvite('team-1', 'owner-1', 'new@example.com', 'member');

      expect(token).toBe('test-token');
      expect(prisma.teamInvite.create).toHaveBeenCalled();
    });

    it('rejects if user already a member', async () => {
      vi.mocked(prisma.teamMember.findUnique)
        .mockResolvedValueOnce({ role: 'owner', userId: 'owner-1' } as never) // inviter check
        .mockResolvedValueOnce({ id: 'member-1' } as never); // existing member check
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing-user' } as never);

      await expect(
        teamService.createInvite('team-1', 'owner-1', 'existing@example.com', 'member')
      ).rejects.toThrow('Invite could not be sent');
    });

    it('rejects if pending invite exists', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: 'owner',
        userId: 'owner-1'
      } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.teamInvite.findFirst).mockResolvedValue({ id: 'invite-1' } as never);

      await expect(
        teamService.createInvite('team-1', 'owner-1', 'pending@example.com', 'member')
      ).rejects.toThrow('Invite could not be sent');
    });

    it('rejects if inviter is not admin or owner', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: 'member',
        userId: 'member-1'
      } as never);

      await expect(
        teamService.createInvite('team-1', 'member-1', 'new@example.com', 'member')
      ).rejects.toThrow('Insufficient permissions to invite');
    });
  });

  describe('acceptInvite', () => {
    it('creates member and marks invite accepted', async () => {
      const mockInvite = {
        id: 'invite-1',
        teamId: 'team-1',
        role: 'member',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        team: {
          id: 'team-1',
          name: 'Test Team',
          description: null,
          createdAt: new Date(),
          deletedAt: null,
          _count: { members: 3 },
        },
      };

      vi.mocked(prisma.teamInvite.findUnique).mockResolvedValue(mockInvite as never);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        avatarUrl: null,
      } as never);

      const result = await teamService.acceptInvite('valid-token', 'user-1');

      expect(result.name).toBe('Test Team');
      expect(result.role).toBe('member');
    });

    it('rejects invalid token', async () => {
      vi.mocked(prisma.teamInvite.findUnique).mockResolvedValue(null);

      await expect(teamService.acceptInvite('invalid-token', 'user-1')).rejects.toThrow('Invalid invite');
    });

    it('rejects expired token', async () => {
      const mockInvite = {
        id: 'invite-1',
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
        team: { deletedAt: null },
      };

      vi.mocked(prisma.teamInvite.findUnique).mockResolvedValue(mockInvite as never);

      await expect(teamService.acceptInvite('expired-token', 'user-1')).rejects.toThrow('Invite expired');
    });

    it('rejects already used token', async () => {
      const mockInvite = {
        id: 'invite-1',
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        team: { deletedAt: null },
      };

      vi.mocked(prisma.teamInvite.findUnique).mockResolvedValue(mockInvite as never);

      await expect(teamService.acceptInvite('used-token', 'user-1')).rejects.toThrow('Invite already used');
    });

    it('rejects if team was deleted', async () => {
      const mockInvite = {
        id: 'invite-1',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        team: { deletedAt: new Date() },
      };

      vi.mocked(prisma.teamInvite.findUnique).mockResolvedValue(mockInvite as never);

      await expect(teamService.acceptInvite('deleted-team-token', 'user-1')).rejects.toThrow('Team no longer exists');
    });
  });

  describe('removeMember', () => {
    it('removes member when actor is admin', async () => {
      vi.mocked(prisma.teamMember.findUnique)
        .mockResolvedValueOnce({ role: 'admin', userId: 'admin-1' } as never) // Actor
        .mockResolvedValueOnce({ role: 'member', userId: 'target-1' } as never); // Target

      vi.mocked(prisma.teamMember.delete).mockResolvedValue({} as never);

      await expect(teamService.removeMember('team-1', 'target-1', 'admin-1')).resolves.not.toThrow();
      expect(prisma.teamMember.delete).toHaveBeenCalled();
    });

    it('rejects member trying to remove others', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: 'member',
        userId: 'member-1'
      } as never);

      await expect(teamService.removeMember('team-1', 'other-1', 'member-1')).rejects.toThrow(
        'Members cannot remove other members'
      );
    });

    it('rejects removing owner', async () => {
      vi.mocked(prisma.teamMember.findUnique)
        .mockResolvedValueOnce({ role: 'admin', userId: 'admin-1' } as never) // Actor
        .mockResolvedValueOnce({ role: 'owner', userId: 'owner-1' } as never); // Target

      await expect(teamService.removeMember('team-1', 'owner-1', 'admin-1')).rejects.toThrow(
        'Cannot remove team owner'
      );
    });

    it('allows member to leave (self-removal)', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: 'member',
        userId: 'member-1'
      } as never);
      vi.mocked(prisma.teamMember.delete).mockResolvedValue({} as never);

      await expect(teamService.removeMember('team-1', 'member-1', 'member-1')).resolves.not.toThrow();
    });

    it('rejects owner from leaving without transfer', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: 'owner',
        userId: 'owner-1'
      } as never);

      await expect(teamService.removeMember('team-1', 'owner-1', 'owner-1')).rejects.toThrow(
        'Owner cannot leave. Transfer ownership first.'
      );
    });
  });

  describe('getTeam', () => {
    it('returns team with membership info', async () => {
      const mockMembership = {
        team: {
          id: 'team-1',
          name: 'Test Team',
          description: 'A description',
          createdAt: new Date(),
          deletedAt: null,
          _count: { members: 5 },
        },
        role: 'admin',
      };

      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(mockMembership as never);

      const result = await teamService.getTeam('team-1', 'user-1');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Team');
      expect(result!.role).toBe('admin');
      expect(result!.memberCount).toBe(5);
    });

    it('returns null for deleted team', async () => {
      const mockMembership = {
        team: {
          id: 'team-1',
          name: 'Deleted Team',
          deletedAt: new Date(),
          _count: { members: 5 },
        },
        role: 'member',
      };

      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(mockMembership as never);

      const result = await teamService.getTeam('team-1', 'user-1');
      expect(result).toBeNull();
    });

    it('returns null if not a member', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null);

      const result = await teamService.getTeam('team-1', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('getTeamMembers', () => {
    it('returns members sorted by role then joinedAt', async () => {
      const mockMembers = [
        {
          user: { id: 'user-1', name: 'Owner', avatarUrl: null },
          role: 'owner',
          joinedAt: new Date('2024-01-01'),
        },
        {
          user: { id: 'user-2', name: 'Admin', avatarUrl: null },
          role: 'admin',
          joinedAt: new Date('2024-01-02'),
        },
        {
          user: { id: 'user-3', name: 'Member', avatarUrl: null },
          role: 'member',
          joinedAt: new Date('2024-01-03'),
        },
      ];

      vi.mocked(prisma.teamMember.findMany).mockResolvedValue(mockMembers as never);

      const result = await teamService.getTeamMembers('team-1');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Owner');
      expect(result[0].role).toBe('owner');
    });
  });
});
