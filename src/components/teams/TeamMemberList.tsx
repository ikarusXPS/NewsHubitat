/**
 * TeamMemberList - Display team members with role badges and actions
 */

import { Trash2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { TeamRoleBadge } from './TeamRoleBadge';
import { useRemoveMember, useUpdateMemberRole, type TeamMember } from '../../hooks/useTeamMembers';
import { useAuth } from '../../contexts/AuthContext';
import type { TeamRole } from '../../hooks/useTeams';

interface TeamMemberListProps {
  members: TeamMember[];
  teamId: string;
  currentUserRole: TeamRole;
}

export function TeamMemberList({ members, teamId, currentUserRole }: TeamMemberListProps) {
  const { t } = useTranslation('teams');
  const { user } = useAuth();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember(teamId);
  const { mutate: updateRole, isPending: isUpdating } = useUpdateMemberRole(teamId);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  const handleRemove = (member: TeamMember) => {
    const isSelf = member.userId === user?.id;
    const message = isSelf
      ? t('confirm.leaveTeam.message', 'You will lose access to shared bookmarks. This cannot be undone.')
      : t('confirm.removeMember.message', { name: member.name, defaultValue: 'Remove {{name}} from the team?' });

    if (!confirm(message)) return;
    removeMember(member.userId);
  };

  const handleRoleChange = (userId: string, newRole: 'admin' | 'member') => {
    updateRole({ userId, role: newRole });
    setOpenDropdown(null);
  };

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isSelf = member.userId === user?.id;
        const canRemove =
          (isSelf && member.role !== 'owner') ||
          (canManageMembers && member.role !== 'owner' && !isSelf);
        const canChangeRole = isOwner && member.role !== 'owner';

        return (
          <div
            key={member.userId}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            >
              {member.name[0]?.toUpperCase() || '?'}
            </div>

            {/* Name and join date */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white truncate">
                  {member.name}
                  {isSelf && <span className="text-gray-500 ml-1">{t('you', '(you)')}</span>}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {t('joined', 'Joined')} {new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(member.joinedAt))}
              </span>
            </div>

            {/* Role badge or dropdown */}
            {canChangeRole ? (
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === member.userId ? null : member.userId)}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  disabled={isUpdating}
                >
                  <TeamRoleBadge role={member.role} />
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </button>
                {openDropdown === member.userId && (
                  <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 py-1 min-w-[100px]">
                    <button
                      onClick={() => handleRoleChange(member.userId, 'admin')}
                      className={cn(
                        'block w-full px-3 py-2 text-left text-sm hover:bg-white/5',
                        member.role === 'admin' && 'text-[#00f0ff]'
                      )}
                    >
                      {t('roles.admin', 'Admin')}
                    </button>
                    <button
                      onClick={() => handleRoleChange(member.userId, 'member')}
                      className={cn(
                        'block w-full px-3 py-2 text-left text-sm hover:bg-white/5',
                        member.role === 'member' && 'text-[#00f0ff]'
                      )}
                    >
                      {t('roles.member', 'Member')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <TeamRoleBadge role={member.role} />
            )}

            {/* Remove button */}
            {canRemove && (
              <button
                onClick={() => handleRemove(member)}
                disabled={isRemoving}
                className={cn(
                  'p-2 rounded-lg text-gray-400 hover:text-[#ff0044] hover:bg-[rgba(255,0,68,0.1)] transition-colors touch-target',
                  isRemoving && 'opacity-50 cursor-not-allowed'
                )}
                aria-label={isSelf ? t('actions.leaveTeam', 'Leave team') : t('actions.removeMember', 'Remove member')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
