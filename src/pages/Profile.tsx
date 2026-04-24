import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Bookmark,
  Clock,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { Toast } from '../components/Toast';
import { ReadingInsights } from '../components/profile/ReadingInsights';
import { MyShares } from '../components/profile/MyShares';
import type { NewsArticle } from '../types';

export function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { bookmarkedArticles, readingHistory, language } = useAppStore();

  // Fetch history articles for ReadingInsights
  const historyIds = readingHistory.map((e) => e.articleId);
  const { data: historyArticles } = useQuery({
    queryKey: ['profile-history-articles', historyIds.slice(0, 50)],
    queryFn: async () => {
      const map = new Map<string, NewsArticle>();
      const results = await Promise.all(
        historyIds.slice(0, 50).map(async (id) => {
          try {
            const response = await fetch(`/api/news/${id}`);
            if (response.ok) {
              const data = await response.json();
              return { id, article: data.data as NewsArticle };
            }
          } catch {
            // Ignore fetch errors
          }
          return null;
        })
      );
      results.forEach((r) => {
        if (r) map.set(r.id, r.article);
      });
      return map;
    },
    enabled: historyIds.length > 0 && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false,
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isOpen: true });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }

      showToast('Password changed successfully', 'success');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to change password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Not authenticated - show login prompt with benefits
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="glass-panel rounded-xl p-8 text-center border border-[#00f0ff]/20">
            {/* Avatar Placeholder */}
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mx-auto mb-6 border-2 border-gray-600">
              <User className="h-10 w-10 text-gray-500" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2 font-mono">
              Welcome to <span className="text-[#00f0ff]">NewsHub</span>
            </h1>
            <p className="text-gray-400 mb-6">
              Sign in to unlock your personalized news experience
            </p>

            {/* Benefits List */}
            <div className="text-left space-y-3 mb-8 px-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-[#ffee00]/20 flex items-center justify-center flex-shrink-0">
                  <Bookmark className="h-4 w-4 text-[#ffee00]" />
                </div>
                <span className="text-gray-300">Save articles and build your collection</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-[#00ff88]/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-[#00ff88]" />
                </div>
                <span className="text-gray-300">Track your reading history</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-[#bf00ff]/20 flex items-center justify-center flex-shrink-0">
                  <Settings className="h-4 w-4 text-[#bf00ff]" />
                </div>
                <span className="text-gray-300">Customize your news preferences</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/settings', { state: { backgroundLocation: location } })}
                className="btn-cyber btn-cyber-primary w-full px-6 py-3 rounded-lg font-mono"
              >
                Sign In / Register
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-cyber w-full px-6 py-3 rounded-lg text-sm"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
      </div>
    );
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white font-mono flex items-center gap-3">
          <User className="h-6 w-6 text-[#00f0ff]" />
          <span className="gradient-text-cyber">PROFILE</span>
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User Info Card */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{user?.name || 'User'}</h2>
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
              <Mail className="h-4 w-4" />
              {user?.email || 'No email'}
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs mt-2">
              <Calendar className="h-3 w-3" />
              Member since {memberSince}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel rounded-xl p-4 hover:border-[#00f0ff]/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#ffee00]/20 flex items-center justify-center">
              <Bookmark className="h-5 w-5 text-[#ffee00]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-mono">{bookmarkedArticles.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Bookmarks</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 hover:border-[#00f0ff]/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#00ff88]/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-[#00ff88]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-mono">{readingHistory?.length || 0}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Articles Read</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reading Insights per D-31 */}
      {historyArticles && historyArticles.size > 0 && (
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">
            {language === 'de' ? 'Leseeinblicke' : 'Reading Insights'}
          </h3>
          <ReadingInsights articles={historyArticles} />
        </div>
      )}

      {/* My Shares per D-11 */}
      <div className="glass-panel rounded-xl p-6">
        <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">
          {language === 'de' ? 'Meine Shares' : 'My Shares'}
        </h3>
        <MyShares />
      </div>

      {/* Quick Actions */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider px-4 pt-4 pb-2">
          Quick Actions
        </h3>
        <div className="divide-y divide-gray-800">
          <button
            onClick={() => navigate('/history')}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-[#00ff88]" />
              <span className="text-white">
                {language === 'de' ? 'Verlauf anzeigen' : 'View Reading History'}
              </span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>

          <button
            onClick={() => navigate('/bookmarks')}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bookmark className="h-5 w-5 text-[#ffee00]" />
              <span className="text-white">View Bookmarks</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>

          <button
            onClick={() => navigate('/settings', { state: { backgroundLocation: location } })}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-[#00f0ff]" />
              <span className="text-white">Settings</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#ff0044]/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-[#ff0044]" />
              <span className="text-[#ff0044]">Logout</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Security Section */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-[#00f0ff]" />
          <h3 className="text-lg font-medium text-white">Security</h3>
        </div>

        {!isChangingPassword ? (
          <button
            onClick={() => setIsChangingPassword(true)}
            className="btn-cyber px-4 py-2 rounded-lg text-sm"
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white outline-none ring-1 ring-gray-600 focus:ring-[#00f0ff]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white outline-none ring-1 ring-gray-600 focus:ring-[#00f0ff]"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white outline-none ring-1 ring-gray-600 focus:ring-[#00f0ff]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'btn-cyber btn-cyber-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="btn-cyber px-4 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
