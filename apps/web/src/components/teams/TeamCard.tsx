/**
 * TeamCard - Team list item with member count and role
 */

import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { TeamRoleBadge } from './TeamRoleBadge';
import type { Team } from '../../hooks/useTeams';

interface TeamCardProps {
  team: Team;
  isActive?: boolean;
  onClick?: () => void;
}

export function TeamCard({ team, isActive, onClick }: TeamCardProps) {
  const { t } = useTranslation('teams');

  return (
    <Link
      to={`/team/${team.id}`}
      onClick={onClick}
      className={cn(
        'block p-4 rounded-lg transition-all duration-200',
        'hover:bg-[rgba(0,240,255,0.05)] hover:border-[#00f0ff]/30',
        'border border-transparent',
        isActive && 'bg-[rgba(0,240,255,0.1)] border-[#00f0ff]/50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{team.name}</h3>
          {team.description && (
            <p className="text-sm text-gray-400 truncate mt-1">{team.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            <span>{t('memberCount', { count: team.memberCount })}</span>
          </div>
        </div>
        <TeamRoleBadge role={team.role} />
      </div>
    </Link>
  );
}
