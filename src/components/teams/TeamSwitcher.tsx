/**
 * TeamSwitcher - Dropdown to switch between teams
 */

import { useState, useRef, useEffect } from 'react';
import { Users, Plus, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useTeams, type Team } from '../../hooks/useTeams';
import { useAppStore } from '../../store';
import { CreateTeamModal } from './CreateTeamModal';

export function TeamSwitcher() {
  const { t } = useTranslation('teams');
  const navigate = useNavigate();
  const { teams, isLoading } = useTeams();
  const { activeTeamId, setActiveTeamId } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTeam = teams.find((team) => team.id === activeTeamId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTeam = (team: Team) => {
    setActiveTeamId(team.id);
    setIsOpen(false);
    navigate(`/team/${team.id}`);
  };

  const handleCreateSuccess = (teamId: string) => {
    setActiveTeamId(teamId);
    navigate(`/team/${teamId}`);
  };

  if (isLoading || teams.length === 0) return null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
            'hover:bg-white/5 text-gray-300 hover:text-white',
            isOpen && 'bg-white/10'
          )}
        >
          <Users className="h-4 w-4 text-[#00f0ff]" />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {activeTeam?.name || t('myTeams', 'My Teams')}
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-2">
            {/* Team list */}
            <div className="max-h-64 overflow-y-auto">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/5 transition-colors',
                    team.id === activeTeamId && 'bg-[rgba(0,240,255,0.1)]'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{team.name}</div>
                    <div className="text-xs text-gray-500">
                      {t('memberCount', { count: team.memberCount, defaultValue: '{{count}} members' })}
                    </div>
                  </div>
                  {team.id === activeTeamId && (
                    <Check className="h-4 w-4 text-[#00f0ff] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-2" />

            {/* Create team button */}
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/5 transition-colors text-[#00f0ff]"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">{t('createTeam', 'Create Team')}</span>
            </button>
          </div>
        )}
      </div>

      <CreateTeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
