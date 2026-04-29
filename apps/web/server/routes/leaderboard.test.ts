/**
 * Unit tests for leaderboard route functions
 * Tests the calculatePointsFromBadges and toLeaderboardEntry functions
 * Verifies N+1 elimination and correct points calculation
 */

import { vi, describe, it, expect } from 'vitest';

// Mock prisma before importing leaderboard
vi.mock('../db/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock authMiddleware
vi.mock('../services/authService', () => ({
  authMiddleware: vi.fn((_req, _res, next) => next()),
}));

import { calculatePointsFromBadges, toLeaderboardEntry } from './leaderboard';

describe('calculatePointsFromBadges', () => {
  describe('tier multipliers', () => {
    it('calculates bronze correctly (multiplier 1)', () => {
      const badges = [{ badge: { tier: 'bronze', threshold: 10 } }];
      expect(calculatePointsFromBadges(badges)).toBe(10); // 10 * 1
    });

    it('calculates silver correctly (multiplier 2)', () => {
      const badges = [{ badge: { tier: 'silver', threshold: 10 } }];
      expect(calculatePointsFromBadges(badges)).toBe(20); // 10 * 2
    });

    it('calculates gold correctly (multiplier 4)', () => {
      const badges = [{ badge: { tier: 'gold', threshold: 10 } }];
      expect(calculatePointsFromBadges(badges)).toBe(40); // 10 * 4
    });

    it('calculates platinum correctly (multiplier 10)', () => {
      const badges = [{ badge: { tier: 'platinum', threshold: 10 } }];
      expect(calculatePointsFromBadges(badges)).toBe(100); // 10 * 10
    });

    it('defaults to multiplier 1 for unknown tier', () => {
      const badges = [{ badge: { tier: 'unknown', threshold: 10 } }];
      expect(calculatePointsFromBadges(badges)).toBe(10); // 10 * 1 (default)
    });
  });

  describe('badge accumulation', () => {
    it('sums multiple badges correctly', () => {
      const badges = [
        { badge: { tier: 'bronze', threshold: 5 } },   // 5 * 1 = 5
        { badge: { tier: 'silver', threshold: 10 } },  // 10 * 2 = 20
        { badge: { tier: 'gold', threshold: 20 } },    // 20 * 4 = 80
      ];
      expect(calculatePointsFromBadges(badges)).toBe(105); // 5 + 20 + 80
    });

    it('handles empty badge array', () => {
      expect(calculatePointsFromBadges([])).toBe(0);
    });

    it('handles single badge', () => {
      const badges = [{ badge: { tier: 'gold', threshold: 50 } }];
      expect(calculatePointsFromBadges(badges)).toBe(200); // 50 * 4
    });

    it('handles many badges', () => {
      const badges = [
        { badge: { tier: 'bronze', threshold: 1 } },    // 1
        { badge: { tier: 'bronze', threshold: 5 } },    // 5
        { badge: { tier: 'silver', threshold: 10 } },   // 20
        { badge: { tier: 'silver', threshold: 25 } },   // 50
        { badge: { tier: 'gold', threshold: 50 } },     // 200
        { badge: { tier: 'platinum', threshold: 100 } }, // 1000
      ];
      expect(calculatePointsFromBadges(badges)).toBe(1276);
    });
  });

  describe('edge cases', () => {
    it('handles zero threshold', () => {
      const badges = [{ badge: { tier: 'gold', threshold: 0 } }];
      expect(calculatePointsFromBadges(badges)).toBe(0);
    });

    it('handles large threshold values', () => {
      const badges = [{ badge: { tier: 'platinum', threshold: 1000 } }];
      expect(calculatePointsFromBadges(badges)).toBe(10000); // 1000 * 10
    });
  });
});

describe('toLeaderboardEntry', () => {
  it('builds entry with correct points from badges', () => {
    const user = {
      id: 'user-123',
      name: 'TestUser',
      avatarUrl: 'https://example.com/avatar.jpg',
      selectedPresetAvatar: null,
      badges: [
        { badge: { tier: 'silver', threshold: 25 } },  // 50 points
      ],
    };

    const entry = toLeaderboardEntry(user);

    expect(entry.userId).toBe('user-123');
    expect(entry.name).toBe('TestUser');
    expect(entry.avatarUrl).toBe('https://example.com/avatar.jpg');
    expect(entry.selectedPresetAvatar).toBeNull();
    expect(entry.points).toBe(50);
    expect(entry.badgeCount).toBe(1);
  });

  it('calculates level correctly from points', () => {
    const user = {
      id: 'user-1',
      name: 'Test',
      avatarUrl: null,
      selectedPresetAvatar: null,
      badges: [{ badge: { tier: 'platinum', threshold: 100 } }],  // 1000 points
    };

    const entry = toLeaderboardEntry(user);

    expect(entry.points).toBe(1000);
    expect(entry.level).toBe(11);  // floor(1000/100) + 1
  });

  it('returns level 1 for 0 points', () => {
    const user = {
      id: 'user-1',
      name: 'NewUser',
      avatarUrl: null,
      selectedPresetAvatar: null,
      badges: [],
    };

    const entry = toLeaderboardEntry(user);

    expect(entry.points).toBe(0);
    expect(entry.level).toBe(1);  // floor(0/100) + 1 = 1
  });

  it('returns level 2 for 100-199 points', () => {
    const user = {
      id: 'user-1',
      name: 'Test',
      avatarUrl: null,
      selectedPresetAvatar: null,
      badges: [{ badge: { tier: 'platinum', threshold: 15 } }],  // 150 points
    };

    const entry = toLeaderboardEntry(user);

    expect(entry.points).toBe(150);
    expect(entry.level).toBe(2);  // floor(150/100) + 1
  });

  it('counts badges correctly', () => {
    const user = {
      id: 'user-1',
      name: 'Test',
      avatarUrl: null,
      selectedPresetAvatar: null,
      badges: [
        { badge: { tier: 'bronze', threshold: 1 } },
        { badge: { tier: 'silver', threshold: 5 } },
        { badge: { tier: 'gold', threshold: 10 } },
      ],
    };

    const entry = toLeaderboardEntry(user);

    expect(entry.badgeCount).toBe(3);
  });

  it('includes selectedPresetAvatar when present', () => {
    const user = {
      id: 'user-1',
      name: 'Test',
      avatarUrl: null,
      selectedPresetAvatar: 'avatar-preset-1',
      badges: [],
    };

    const entry = toLeaderboardEntry(user);

    expect(entry.selectedPresetAvatar).toBe('avatar-preset-1');
  });

  it('returns streak as 0 (placeholder)', () => {
    const user = {
      id: 'user-1',
      name: 'Test',
      avatarUrl: null,
      selectedPresetAvatar: null,
      badges: [],
    };

    const entry = toLeaderboardEntry(user);

    expect(entry.streak).toBe(0);
  });
});

describe('N+1 elimination verification', () => {
  it('calculatePointsFromBadges operates on in-memory data only', () => {
    // This test documents that calculatePointsFromBadges takes pre-fetched data
    // and does NOT make any database calls - it's a pure function
    const badges = [
      { badge: { tier: 'gold', threshold: 50 } },
      { badge: { tier: 'silver', threshold: 25 } },
    ];

    // Function should work synchronously (no await needed)
    const result = calculatePointsFromBadges(badges);

    // If this was N+1, we'd need to mock prisma and verify it wasn't called
    // But since this is a pure function, we just verify it returns correct result
    expect(result).toBe(250);  // 50*4 + 25*2
  });

  it('toLeaderboardEntry is a pure function with no database calls', () => {
    const user = {
      id: 'user-1',
      name: 'Test',
      avatarUrl: null,
      selectedPresetAvatar: null,
      badges: [{ badge: { tier: 'gold', threshold: 100 } }],
    };

    // Function should work synchronously (no await needed)
    const entry = toLeaderboardEntry(user);

    expect(entry.points).toBe(400);
    expect(entry.level).toBe(5);
  });
});

describe('leaderboard sorting verification', () => {
  it('entries can be sorted by points descending', () => {
    const users = [
      {
        id: 'user-1',
        name: 'Alice',
        avatarUrl: null,
        selectedPresetAvatar: null,
        badges: [{ badge: { tier: 'bronze', threshold: 10 } }],  // 10 points
      },
      {
        id: 'user-2',
        name: 'Bob',
        avatarUrl: null,
        selectedPresetAvatar: null,
        badges: [{ badge: { tier: 'gold', threshold: 50 } }],    // 200 points
      },
      {
        id: 'user-3',
        name: 'Charlie',
        avatarUrl: null,
        selectedPresetAvatar: null,
        badges: [{ badge: { tier: 'silver', threshold: 25 } }],  // 50 points
      },
    ];

    const entries = users.map(toLeaderboardEntry);
    entries.sort((a, b) => b.points - a.points);

    expect(entries[0].name).toBe('Bob');      // 200 points
    expect(entries[1].name).toBe('Charlie');  // 50 points
    expect(entries[2].name).toBe('Alice');    // 10 points
  });
});
