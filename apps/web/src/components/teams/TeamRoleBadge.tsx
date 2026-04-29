/**
 * TeamRoleBadge - Displays team role with appropriate styling
 */

import { cn } from '../../lib/utils';
import type { TeamRole } from '../../hooks/useTeams';

interface TeamRoleBadgeProps {
  role: TeamRole;
  size?: 'sm' | 'md';
}

const roleConfig: Record<TeamRole, { bg: string; border: string; text: string; label: string }> = {
  owner: {
    bg: 'rgba(255, 238, 0, 0.15)',
    border: '#ffee00',
    text: '#ffee00',
    label: 'Owner',
  },
  admin: {
    bg: 'rgba(0, 240, 255, 0.15)',
    border: '#00f0ff',
    text: '#00f0ff',
    label: 'Admin',
  },
  member: {
    bg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.3)',
    text: 'rgba(255, 255, 255, 0.6)',
    label: 'Member',
  },
};

export function TeamRoleBadge({ role, size = 'sm' }: TeamRoleBadgeProps) {
  const config = roleConfig[role];

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
      style={{
        backgroundColor: config.bg,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: config.border,
        color: config.text,
      }}
    >
      {config.label}
    </span>
  );
}
