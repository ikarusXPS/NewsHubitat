/**
 * TeamDashboard - Team view page with bookmarks and members
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Bookmark, UserPlus, Loader2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../hooks/useTeams';
import { useTeamBookmarks } from '../hooks/useTeamBookmarks';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { TeamBookmarkCard } from '../components/teams/TeamBookmarkCard';
import { TeamMemberList } from '../components/teams/TeamMemberList';
import { TeamRoleBadge } from '../components/teams/TeamRoleBadge';
import { InviteModal } from '../components/teams/InviteModal';

export function TeamDashboard() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('teams');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'members'>('bookmarks');

  const { team, isLoading: teamLoading } = useTeam(teamId);
  const { bookmarks, isLoading: bookmarksLoading } = useTeamBookmarks(teamId);
  const { members, isLoading: membersLoading } = useTeamMembers(teamId);

  const isLoading = teamLoading || authLoading;
  const canInvite = team?.role === 'owner' || team?.role === 'admin';

  // Not authenticated
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{t('signInRequired', 'Sign in required')}</h2>
          <p className="text-gray-400">{t('signInToViewTeam', 'Please sign in to view team content.')}</p>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
      </div>
    );
  }

  // Team not found
  if (!team) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{t('teamNotFound', 'Team not found')}</h2>
          <p className="text-gray-400 mb-4">{t('teamNotFoundDescription', "This team may have been deleted or you don't have access.")}</p>
          <button
            onClick={() => navigate('/')}
            className="text-[#00f0ff] hover:underline"
          >
            {t('goToDashboard', 'Go to Dashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">{t('back', 'Back')}</span>
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center">
            <Users className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono">{team.name}</h1>
              <TeamRoleBadge role={team.role} size="md" />
            </div>
            {team.description && (
              <p className="text-gray-400 mt-1">{team.description}</p>
            )}
          </div>
        </div>

        {canInvite && (
          <button
            onClick={() => setShowInviteModal(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              'bg-[#00f0ff] text-[#0a0a0f] hover:bg-[#00d4e0] font-medium'
            )}
          >
            <UserPlus className="h-4 w-4" />
            <span>{t('inviteMember', 'Invite Member')}</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel rounded-xl p-4 hover:border-[#00f0ff]/30 transition-colors">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#00f0ff]" />
            <div>
              <div className="text-2xl font-bold text-white">{members.length}</div>
              <div className="text-sm text-gray-400">{t('teamMembers', 'Team Members')}</div>
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-4 hover:border-[#00f0ff]/30 transition-colors">
          <div className="flex items-center gap-3">
            <Bookmark className="h-5 w-5 text-[#bf00ff]" />
            <div>
              <div className="text-2xl font-bold text-white">{bookmarks.length}</div>
              <div className="text-sm text-gray-400">{t('teamBookmarks', 'Team Bookmarks')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={cn(
            'pb-3 text-sm font-medium transition-colors relative',
            activeTab === 'bookmarks' ? 'text-[#00f0ff]' : 'text-gray-400 hover:text-white'
          )}
        >
          {t('teamBookmarks', 'Team Bookmarks')}
          {activeTab === 'bookmarks' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f0ff]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            'pb-3 text-sm font-medium transition-colors relative',
            activeTab === 'members' ? 'text-[#00f0ff]' : 'text-gray-400 hover:text-white'
          )}
        >
          {t('teamMembers', 'Team Members')}
          {activeTab === 'members' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f0ff]" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="glass-panel rounded-xl p-6">
        {activeTab === 'bookmarks' && (
          <>
            {bookmarksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-white mb-1">{t('empty.noBookmarks.title', 'No shared bookmarks')}</h3>
                <p className="text-gray-400 text-sm">{t('empty.noBookmarks.description', 'Save articles to this team to share with all members.')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarks.map((bookmark) => (
                  <TeamBookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    teamId={teamId!}
                    userRole={team.role}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'members' && (
          <>
            {membersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
              </div>
            ) : (
              <TeamMemberList
                members={members}
                teamId={teamId!}
                currentUserRole={team.role}
              />
            )}
          </>
        )}
      </div>

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        teamId={teamId!}
        teamName={team.name}
      />
    </div>
  );
}
