/**
 * BookmarkButton - Personal or Team bookmark with dropdown selection
 * D-05: Direct add to team from bookmark button
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, BookmarkCheck, Users, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTeams } from '../hooks/useTeams';
import { useAddTeamBookmark } from '../hooks/useTeamBookmarks';

interface BookmarkButtonProps {
  articleId: string;
  isBookmarked: boolean;
  onPersonalBookmark: () => void;
  className?: string;
}

/**
 * Team bookmark option component
 */
function TeamBookmarkOption({
  team,
  articleId,
  onSuccess,
}: {
  team: { id: string; name: string };
  articleId: string;
  onSuccess: () => void;
}) {
  const { t } = useTranslation('teams');
  const { mutate: addBookmark, isPending } = useAddTeamBookmark(team.id);

  const handleClick = () => {
    addBookmark(
      { articleId },
      {
        onSuccess: () => {
          toast.success(t('success.bookmarkAdded', { team: team.name, defaultValue: `Saved to ${team.name}` }));
          onSuccess();
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'w-full px-4 py-2 text-left hover:bg-white/5 text-sm text-white flex items-center gap-2 transition-colors',
        isPending && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Users className="h-4 w-4 text-[#00f0ff]" />
      <span className="truncate">{team.name}</span>
    </button>
  );
}

export function BookmarkButton({
  articleId,
  isBookmarked,
  onPersonalBookmark,
  className,
}: BookmarkButtonProps) {
  const { t } = useTranslation('teams');
  const { isAuthenticated } = useAuth();
  const { teams } = useTeams();
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Update dropdown position when shown
  useEffect(() => {
    if (showTeamDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.right - 192, // 192px = w-48
      });
    }
  }, [showTeamDropdown]);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowTeamDropdown(false);
      }
    };
    const handleScroll = () => setShowTeamDropdown(false);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true); // capture phase for nested scrolls
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const handleBookmarkClick = () => {
    // If user has teams and is authenticated, show dropdown
    if (teams.length > 0 && isAuthenticated) {
      setShowTeamDropdown(!showTeamDropdown);
    } else {
      // Original bookmark behavior (personal bookmark)
      onPersonalBookmark();
    }
  };

  const handlePersonalBookmarkSelect = () => {
    onPersonalBookmark();
    setShowTeamDropdown(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleBookmarkClick}
        className={cn(
          'p-2 rounded-md transition-colors flex items-center gap-1',
          isBookmarked
            ? 'text-[#00f0ff] bg-[#00f0ff]/10'
            : 'text-gray-500 hover:text-[#00f0ff] hover:bg-[#00f0ff]/5',
          className
        )}
        title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      >
        {isBookmarked ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
        {teams.length > 0 && isAuthenticated && (
          <ChevronDown className={cn('h-3 w-3 transition-transform', showTeamDropdown && 'rotate-180')} />
        )}
      </button>

      {/* Team Selection Dropdown - rendered via portal to escape overflow:hidden */}
      {showTeamDropdown && teams.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-2"
          style={{ top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
        >
          {/* Personal bookmark option */}
          <button
            onClick={handlePersonalBookmarkSelect}
            className="w-full px-4 py-2 text-left hover:bg-white/5 text-sm text-white flex items-center gap-2 transition-colors"
          >
            <Bookmark className="h-4 w-4" />
            {t('personal', 'Personal')}
          </button>

          {/* Divider */}
          <div className="border-t border-gray-700 my-1" />

          {/* Save to Team label */}
          <div className="px-4 py-1 text-xs font-mono text-gray-500 uppercase tracking-wider">
            {t('saveToTeam', 'Save to Team')}
          </div>

          {/* Team options */}
          {teams.map((team) => (
            <TeamBookmarkOption
              key={team.id}
              team={team}
              articleId={articleId}
              onSuccess={() => setShowTeamDropdown(false)}
            />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
