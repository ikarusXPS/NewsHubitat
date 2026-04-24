import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/i18n';
import { Command, Trash2, Save, Download, Upload, Plus, X, User, LogOut, ChevronRight, Mail, Shield, Loader2, Edit } from 'lucide-react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { cn, getRegionLabel } from '../lib/utils';
import type { PerspectiveRegion } from '../types';
import { FOCUS_PRESETS } from '../config/focusPresets';
import { PresetCard } from '../components/PresetCard';
import { Toast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AvatarPicker } from '../components/profile/AvatarPicker';
import { DataExportModal } from '../components/modals/DataExportModal';
import { DeleteAccountModal } from '../components/modals/DeleteAccountModal';
import { ConnectedAccounts } from '../components/settings/ConnectedAccounts';

const ALL_REGIONS: PerspectiveRegion[] = [
  'afrika', 'alternative', 'asien', 'china', 'deutschland',
  'europa', 'kanada', 'lateinamerika', 'nahost', 'ozeanien',
  'russland', 'tuerkei', 'usa'
];

export function Settings() {
  const { t } = useTranslation(['settings', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  // Check if we're in modal mode (has background location)
  const isModalMode = !!location.state?.backgroundLocation;
  const {
    theme,
    toggleTheme,
    // language and setLanguage REMOVED per D-04 - language switcher is in header only
    resetFilters,
    commandPaletteEnabled,
    setCommandPaletteEnabled,
    filters,
    setRegions,
    toggleRegion,
    setSortBy,
    setSortOrder,
    activeFocusPreset,
    customPresets,
    setActiveFocus,
    deleteCustomPreset,
    readingHistory,
    clearReadingHistory,
    isPersonalizationEnabled,
    togglePersonalization,
    isHistoryPaused,
    pauseHistory,
    resumeHistory,
  } = useAppStore();

  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<Record<string, PerspectiveRegion[]>>(() => {
    const stored = localStorage.getItem('newshub-filter-presets');
    return stored ? JSON.parse(stored) : {};
  });

  // Profile editing state per D-27
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newName, setNewName] = useState('');
  const [namePassword, setNamePassword] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false,
  });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isOpen: true });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const updated = { ...savedPresets, [presetName]: filters.regions };
    setSavedPresets(updated);
    localStorage.setItem('newshub-filter-presets', JSON.stringify(updated));
    setPresetName('');
  };

  const loadPreset = (regions: PerspectiveRegion[]) => {
    setRegions(regions);
  };

  const deletePreset = (name: string) => {
     
    const { [name]: _, ...rest } = savedPresets;
    setSavedPresets(rest);
    localStorage.setItem('newshub-filter-presets', JSON.stringify(rest));
  };

  const exportSettings = () => {
    const settings = {
      theme,
      language,
      commandPaletteEnabled,
      filters,
      presets: savedPresets,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newshub-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const settings = JSON.parse(event.target?.result as string);
        if (settings.theme && theme !== settings.theme) toggleTheme();
        if (settings.language) i18n.changeLanguage(settings.language);
        if (settings.commandPaletteEnabled !== undefined) setCommandPaletteEnabled(settings.commandPaletteEnabled);
        if (settings.presets) {
          setSavedPresets(settings.presets);
          localStorage.setItem('newshub-filter-presets', JSON.stringify(settings.presets));
        }
        showToast(t('settings:dataCache.importSuccess'), 'success');
      } catch {
        showToast(t('settings:dataCache.importError'), 'error');
      }
    };
    reader.readAsText(file);
  };

  const clearCache = () => {
    showConfirm(
      t('settings:dataCache.clearCacheTitle'),
      t('settings:dataCache.confirmClearCache'),
      () => {
        localStorage.removeItem('newshub-cache');
        showToast(t('settings:dataCache.cacheCleared'), 'success');
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      }
    );
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header with Close Button (hidden in modal mode since modal has its own close button) */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white font-mono">{t('settings:title')}</h1>
        {!isModalMode && (
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label={t('settings:close')}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Account Section */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-[#00f0ff]" />
          {t('settings:account.title')}
        </h2>

        {isAuthenticated && user ? (
          <div className="space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-700/50">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center text-white text-lg font-bold">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{user.name}</p>
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="p-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
              >
                <Shield className="h-4 w-4 text-[#00f0ff]" />
                <span className="text-sm text-white">{t('settings:account.security')}</span>
              </button>
              <button
                onClick={() => {
                  logout();
                  showToast(t('settings:toast.loggedOut'), 'success');
                }}
                className="flex items-center gap-2 p-3 rounded-lg bg-[#ff0044]/10 hover:bg-[#ff0044]/20 transition-colors"
              >
                <LogOut className="h-4 w-4 text-[#ff0044]" />
                <span className="text-sm text-[#ff0044]">{t('settings:account.logout')}</span>
              </button>
            </div>

            {/* Reading History Stats */}
            <div className="p-3 rounded-lg bg-gray-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('settings:account.readingHistory')}</p>
                  <p className="text-lg font-bold text-white font-mono">{t('settings:account.articleCount', { count: readingHistory?.length || 0 })}</p>
                </div>
                {readingHistory && readingHistory.length > 0 && (
                  <button
                    onClick={() => {
                      showConfirm(
                        t('settings:account.readingHistory'),
                        t('settings:account.confirmDeleteHistory'),
                        () => {
                          clearReadingHistory();
                          showToast(t('settings:account.historyDeleted'), 'success');
                          setConfirmDialog({ ...confirmDialog, isOpen: false });
                        }
                      );
                    }}
                    className="text-xs text-gray-500 hover:text-[#ff0044] transition-colors"
                  >
                    {t('settings:account.deleteHistory')}
                  </button>
                )}
              </div>
            </div>

            {/* Data Management */}
            <div className="pt-4 border-t border-gray-700 space-y-3">
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4 text-[#00f0ff]" />
                <span className="text-sm text-white">{t('settings:account.exportData')}</span>
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#ff0044]/10 hover:bg-[#ff0044]/20 transition-colors border border-[#ff0044]/30"
              >
                <Trash2 className="h-4 w-4 text-[#ff0044]" />
                <span className="text-sm text-[#ff0044]">{t('settings:account.deleteAccount')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <User className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">{t('settings:account.notLoggedIn')}</p>
            <p className="text-sm text-gray-500 mb-4">
              {t('settings:account.loginPrompt')}
            </p>
            <button
              onClick={() => {
                // TODO: Open auth modal
                showToast('Login dialog coming soon', 'info');
              }}
              className="btn-cyber btn-cyber-primary px-6 py-2 rounded-lg text-sm"
            >
              {t('common:buttons.signIn')}
            </button>
          </div>
        )}
      </div>

      {/* Connected Accounts Section - only show when authenticated */}
      {isAuthenticated && user && <ConnectedAccounts />}

      {/* Profile Editing per D-27 */}
      {isAuthenticated && user && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <h2 className="text-lg font-medium text-white mb-4 font-mono flex items-center gap-2">
            <Edit className="h-5 w-5 text-[#00f0ff]" />
            {t('settings:profile.title')}
          </h2>

          {/* Current Profile Display */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-white font-medium">{user?.name}</p>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
          </div>

          {/* Change Avatar Button */}
          <button
            onClick={() => setShowAvatarPicker(true)}
            className="w-full mb-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
          >
            {t('settings:profile.changeAvatar')}
          </button>

          {/* Name Change with Password per D-28 */}
          {!isEditingProfile ? (
            <button
              onClick={() => {
                setIsEditingProfile(true);
                setNewName(user?.name || '');
              }}
              className="btn-cyber px-4 py-2 rounded-lg text-sm"
            >
              {t('settings:profile.changeName')}
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {t('settings:profile.newName')}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white outline-none ring-1 ring-gray-600 focus:ring-[#00f0ff]"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {t('settings:profile.confirmPassword')}
                </label>
                <input
                  type="password"
                  value={namePassword}
                  onChange={(e) => setNamePassword(e.target.value)}
                  className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white outline-none ring-1 ring-gray-600 focus:ring-[#00f0ff]"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setIsUpdatingName(true);
                    try {
                      const response = await fetch('/api/profile/name', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
                        },
                        body: JSON.stringify({ name: newName, currentPassword: namePassword }),
                      });
                      if (!response.ok) throw new Error('Failed to update');
                      showToast(t('settings:profile.nameUpdated'), 'success');
                      setIsEditingProfile(false);
                      setNamePassword('');
                    } catch {
                      showToast(t('settings:profile.updateFailed'), 'error');
                    } finally {
                      setIsUpdatingName(false);
                    }
                  }}
                  disabled={isUpdatingName || !newName || !namePassword}
                  className={cn(
                    'btn-cyber btn-cyber-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                    (isUpdatingName || !newName || !namePassword) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isUpdatingName && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('common:buttons.save')}
                </button>
                <button
                  onClick={() => {
                    setIsEditingProfile(false);
                    setNamePassword('');
                  }}
                  className="btn-cyber px-4 py-2 rounded-lg text-sm"
                >
                  {t('common:buttons.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reading & Personalization Section per D-14, D-65 */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-medium text-white mb-4">
          {t('settings:reading.title')}
        </h2>

        <div className="space-y-4">
          {/* Personalization toggle per D-14 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">
                {t('settings:reading.personalization')}
              </p>
              <p className="text-gray-500 text-xs">
                {t('settings:reading.personalizationDesc')}
              </p>
            </div>
            <button
              onClick={togglePersonalization}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                isPersonalizationEnabled ? 'bg-[#00f0ff]' : 'bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  isPersonalizationEnabled ? 'left-7' : 'left-1'
                )}
              />
            </button>
          </div>

          {/* History pause toggle per D-65 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">
                {t('settings:reading.pauseTracking')}
              </p>
              <p className="text-gray-500 text-xs">
                {t('settings:reading.pauseTrackingDesc')}
              </p>
            </div>
            <button
              onClick={() => isHistoryPaused ? resumeHistory() : pauseHistory()}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                isHistoryPaused ? 'bg-[#ff6600]' : 'bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  isHistoryPaused ? 'left-7' : 'left-1'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-4">
        <div>
          <h2 className="text-base font-medium text-white mb-3">{t('settings:appearance.title')}</h2>
          <div className="flex gap-4">
            <button
              onClick={() => theme === 'light' && toggleTheme()}
              className={cn(
                'flex-1 rounded-lg border-2 p-4 transition-colors',
                theme === 'dark'
                  ? 'border-blue-500 bg-gray-700'
                  : 'border-gray-600 hover:border-gray-500'
              )}
            >
              <div className="mb-2 h-12 rounded bg-gray-900" />
              <p className="text-sm text-white">{t('settings:appearance.darkMode')}</p>
            </button>
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className={cn(
                'flex-1 rounded-lg border-2 p-4 transition-colors',
                theme === 'light'
                  ? 'border-blue-500 bg-gray-700'
                  : 'border-gray-600 hover:border-gray-500'
              )}
            >
              <div className="mb-2 h-12 rounded bg-gray-200" />
              <p className="text-sm text-white">{t('settings:appearance.lightMode')}</p>
            </button>
          </div>
        </div>

        {/* Language section REMOVED per D-04 - language switcher is in header only */}

        <div>
          <h2 className="text-base font-medium text-white mb-3">{t('settings:sorting.title')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('settings:sorting.sortBy')}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('date')}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm transition-colors',
                    filters.sortBy === 'date'
                      ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff]'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  )}
                >
                  {t('settings:sorting.date')}
                </button>
                <button
                  onClick={() => setSortBy('relevance')}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm transition-colors',
                    filters.sortBy === 'relevance'
                      ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff]'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  )}
                >
                  {t('settings:sorting.relevance')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('settings:sorting.order')}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder('desc')}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm transition-colors',
                    filters.sortOrder === 'desc'
                      ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff]'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  )}
                >
                  {t('settings:sorting.newestFirst')}
                </button>
                <button
                  onClick={() => setSortOrder('asc')}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm transition-colors',
                    filters.sortOrder === 'asc'
                      ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff]'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  )}
                >
                  {t('settings:sorting.oldestFirst')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium text-white mb-3">{t('settings:perspectives.title')}</h2>
          <p className="text-sm text-gray-400 mb-3">
            {t('settings:perspectives.description')}
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => toggleRegion(region)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all',
                  filters.regions.includes(region)
                    ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff]'
                    : 'border-gray-600 text-gray-400 hover:border-gray-500'
                )}
              >
                {getRegionLabel(region)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium text-white mb-3">{t('settings:presets.title')}</h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={t('settings:presets.namePlaceholder')}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-sm text-white placeholder-gray-500 outline-none ring-1 ring-gray-600 focus:ring-[#00f0ff]"
              />
              <button
                onClick={savePreset}
                disabled={!presetName.trim() || filters.regions.length === 0}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm flex items-center gap-2 transition-colors',
                  !presetName.trim() || filters.regions.length === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30 border border-[#00f0ff]/30'
                )}
              >
                <Save className="h-4 w-4" />
                {t('common:buttons.save')}
              </button>
            </div>

            {Object.keys(savedPresets).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">{t('settings:presets.saved')}</p>
                {Object.entries(savedPresets).map(([name, regions]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg bg-gray-700/50 px-4 py-2"
                  >
                    <div>
                      <p className="text-sm text-white font-medium">{name}</p>
                      <p className="text-xs text-gray-400">
                        {t('settings:perspectives.count', { count: regions.length })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadPreset(regions)}
                        className="rounded-lg bg-[#00f0ff]/20 px-3 py-1 text-xs text-[#00f0ff] hover:bg-[#00f0ff]/30 border border-[#00f0ff]/30"
                      >
                        {t('common:buttons.load')}
                      </button>
                      <button
                        onClick={() => deletePreset(name)}
                        className="rounded-lg bg-[#ff0044]/20 px-3 py-1 text-xs text-[#ff0044] hover:bg-[#ff0044]/30 border border-[#ff0044]/30"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium text-white mb-3">{t('settings:focusManagement.title')}</h2>
          <p className="text-sm text-gray-400 mb-4">
            {t('settings:focusManagement.description')}
          </p>

          {/* Built-in Presets */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-[#00f0ff]/20 to-transparent" />
              {t('settings:presets.builtIn')}
              <span className="h-px flex-1 bg-gradient-to-l from-[#00f0ff]/20 to-transparent" />
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {FOCUS_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isActive={activeFocusPreset?.id === preset.id}
                  onApply={() => setActiveFocus(preset)}
                />
              ))}
            </div>
          </div>

          {/* Custom Presets */}
          {customPresets.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-gradient-to-r from-[#00f0ff]/20 to-transparent" />
                {t('settings:presets.custom')}
                <span className="h-px flex-1 bg-gradient-to-l from-[#00f0ff]/20 to-transparent" />
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {customPresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isActive={activeFocusPreset?.id === preset.id}
                    onApply={() => setActiveFocus(preset)}
                    onDelete={() => {
                      showConfirm(
                        t('common:buttons.delete'),
                        t('settings:presets.confirmDelete', { name: preset.name }),
                        () => {
                          deleteCustomPreset(preset.id);
                          showToast(t('settings:presets.deleted'), 'success');
                          setConfirmDialog({ ...confirmDialog, isOpen: false });
                        }
                      );
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Create Custom Preset Button */}
          <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-700 hover:border-[#00f0ff]/30 transition-colors">
            <button
              className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-[#00f0ff] transition-colors"
              onClick={() => {
                showToast('Custom preset creation coming soon! Use onboarding to create custom focus.', 'info');
              }}
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-mono">{t('settings:presets.createCustom')}</span>
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              {t('settings:presets.createHint')}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium text-white mb-3">{t('settings:resetFilters.title')}</h2>
          <button
            onClick={resetFilters}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t('settings:resetFilters.button')}
          </button>
        </div>

        <div>
          <h2 className="text-base font-medium text-white mb-3">{t('settings:commandPalette.title')}</h2>
          <div className="flex items-center justify-between rounded-lg bg-gray-700/50 p-4">
            <div className="flex items-center gap-3">
              <Command className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-white">{t('settings:commandPalette.show')}</p>
                <p className="text-xs text-gray-400">
                  {t('settings:commandPalette.hint')}{' '}
                  <kbd className="rounded bg-gray-600 px-1.5 py-0.5 text-xs font-mono">⌘K</kbd> / {' '}
                  <kbd className="rounded bg-gray-600 px-1.5 py-0.5 text-xs font-mono">Ctrl+K</kbd>
                </p>
              </div>
            </div>
            <button
              onClick={() => setCommandPaletteEnabled(!commandPaletteEnabled)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                commandPaletteEnabled ? 'bg-blue-600' : 'bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  commandPaletteEnabled ? 'left-5' : 'left-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-medium text-white mb-4">{t('settings:api.title')}</h2>
        <p className="text-sm text-gray-400 mb-4">
          {t('settings:api.description')}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('settings:api.deeplKey')}</label>
            <input
              type="password"
              placeholder={t('settings:api.deeplPlaceholder')}
              className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white placeholder-gray-500 outline-none ring-1 ring-gray-600 focus:ring-[#00f0ff]"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('settings:api.deeplHint')}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-4">
        <h2 className="text-lg font-medium text-white mb-4">{t('settings:dataCache.title')}</h2>

        <div>
          <h3 className="text-sm font-medium text-white mb-2">{t('settings:dataCache.exportTitle')}</h3>
          <p className="text-xs text-gray-400 mb-3">
            {t('settings:dataCache.exportDesc')}
          </p>
          <button
            onClick={exportSettings}
            className="rounded-lg bg-[#00f0ff]/20 px-4 py-2 text-sm text-[#00f0ff] hover:bg-[#00f0ff]/30 border border-[#00f0ff]/30 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('settings:dataCache.exportButton')}
          </button>
        </div>

        <div>
          <h3 className="text-sm font-medium text-white mb-2">{t('settings:dataCache.importTitle')}</h3>
          <p className="text-xs text-gray-400 mb-3">
            {t('settings:dataCache.importDesc')}
          </p>
          <label className="inline-block cursor-pointer">
            <input
              type="file"
              accept="application/json"
              onChange={importSettings}
              className="hidden"
            />
            <span className="rounded-lg bg-[#00f0ff]/20 px-4 py-2 text-sm text-[#00f0ff] hover:bg-[#00f0ff]/30 border border-[#00f0ff]/30 flex items-center gap-2 w-fit">
              <Upload className="h-4 w-4" />
              {t('settings:dataCache.importButton')}
            </span>
          </label>
        </div>

        <div>
          <h3 className="text-sm font-medium text-white mb-2">{t('settings:dataCache.clearCacheTitle')}</h3>
          <p className="text-xs text-gray-400 mb-3">
            {t('settings:dataCache.clearCacheDesc')}
          </p>
          <button
            onClick={clearCache}
            className="rounded-lg bg-[#ff0044]/20 px-4 py-2 text-sm text-[#ff0044] hover:bg-[#ff0044]/30 border border-[#ff0044]/30 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t('settings:dataCache.clearCacheButton')}
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        variant="warning"
      />

      {/* Avatar Picker Modal */}
      <AvatarPicker
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onSave={async (presetId, file) => {
          const token = localStorage.getItem('newshub-auth-token');
          if (file) {
            const formData = new FormData();
            formData.append('avatar', file);
            const response = await fetch('/api/profile/avatar/upload', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });
            if (!response.ok) throw new Error('Upload failed');
          } else if (presetId) {
            const response = await fetch('/api/profile/avatar/preset', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ presetId }),
            });
            if (!response.ok) throw new Error('Update failed');
          }
          showToast(t('settings:profile.avatarUpdated', 'Avatar updated'), 'success');
        }}
        currentPresetId={null}
        articles={new Map()}
        isVerified={user?.emailVerified === true}
      />

      {/* Data Export Modal */}
      <DataExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        userEmail={user?.email || ''}
      />
    </div>
  );
}
