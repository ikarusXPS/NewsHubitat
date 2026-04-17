import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Command, Trash2, Save, Download, Upload, Plus, X, User, LogOut, ChevronRight, Mail, Shield } from 'lucide-react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { cn, getRegionLabel } from '../lib/utils';
import type { PerspectiveRegion } from '../types';
import { FOCUS_PRESETS } from '../config/focusPresets';
import { PresetCard } from '../components/PresetCard';
import { Toast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';

const ALL_REGIONS: PerspectiveRegion[] = [
  'afrika', 'alternative', 'asien', 'china', 'deutschland',
  'europa', 'kanada', 'lateinamerika', 'nahost', 'ozeanien',
  'russland', 'tuerkei', 'usa'
];

export function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  // Check if we're in modal mode (has background location)
  const isModalMode = !!location.state?.backgroundLocation;
  const {
    theme,
    toggleTheme,
    language,
    setLanguage,
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
  } = useAppStore();

  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<Record<string, PerspectiveRegion[]>>(() => {
    const stored = localStorage.getItem('newshub-filter-presets');
    return stored ? JSON.parse(stored) : {};
  });

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
        if (settings.theme) theme !== settings.theme && toggleTheme();
        if (settings.language) setLanguage(settings.language);
        if (settings.commandPaletteEnabled !== undefined) setCommandPaletteEnabled(settings.commandPaletteEnabled);
        if (settings.presets) {
          setSavedPresets(settings.presets);
          localStorage.setItem('newshub-filter-presets', JSON.stringify(settings.presets));
        }
        showToast('Einstellungen erfolgreich importiert', 'success');
      } catch (err) {
        showToast('Fehler beim Importieren der Einstellungen', 'error');
      }
    };
    reader.readAsText(file);
  };

  const clearCache = () => {
    showConfirm(
      'Cache leeren',
      'Möchten Sie wirklich den gesamten Cache leeren?',
      () => {
        localStorage.removeItem('newshub-cache');
        showToast('Cache erfolgreich geleert', 'success');
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      }
    );
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header with Close Button (hidden in modal mode since modal has its own close button) */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white font-mono">Einstellungen</h1>
        {!isModalMode && (
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Account Section */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-[#00f0ff]" />
          Konto
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
                <span className="text-sm text-white">Sicherheit</span>
              </button>
              <button
                onClick={() => {
                  logout();
                  showToast('Erfolgreich abgemeldet', 'success');
                }}
                className="flex items-center gap-2 p-3 rounded-lg bg-[#ff0044]/10 hover:bg-[#ff0044]/20 transition-colors"
              >
                <LogOut className="h-4 w-4 text-[#ff0044]" />
                <span className="text-sm text-[#ff0044]">Abmelden</span>
              </button>
            </div>

            {/* Reading History Stats */}
            <div className="p-3 rounded-lg bg-gray-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Lesehistorie</p>
                  <p className="text-lg font-bold text-white font-mono">{readingHistory?.length || 0} Artikel</p>
                </div>
                {readingHistory && readingHistory.length > 0 && (
                  <button
                    onClick={() => {
                      showConfirm(
                        'Lesehistorie löschen',
                        'Möchten Sie Ihre gesamte Lesehistorie löschen?',
                        () => {
                          clearReadingHistory();
                          showToast('Lesehistorie gelöscht', 'success');
                          setConfirmDialog({ ...confirmDialog, isOpen: false });
                        }
                      );
                    }}
                    className="text-xs text-gray-500 hover:text-[#ff0044] transition-colors"
                  >
                    Löschen
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <User className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">Nicht angemeldet</p>
            <p className="text-sm text-gray-500 mb-4">
              Melden Sie sich an, um Ihre Einstellungen zu synchronisieren und auf allen Geräten zu nutzen.
            </p>
            <button
              onClick={() => {
                // TODO: Open auth modal
                showToast('Login-Dialog kommt bald', 'info');
              }}
              className="btn-cyber btn-cyber-primary px-6 py-2 rounded-lg text-sm"
            >
              Anmelden
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-4">
        <div>
          <h2 className="text-base font-medium text-white mb-3">Erscheinungsbild</h2>
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
              <p className="text-sm text-white">Dark Mode</p>
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
              <p className="text-sm text-white">Light Mode</p>
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium text-white mb-3">Sprache</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setLanguage('de')}
              className={cn(
                'rounded-lg border-2 px-6 py-3 transition-colors',
                language === 'de'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              )}
            >
              Deutsch
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                'rounded-lg border-2 px-6 py-3 transition-colors',
                language === 'en'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              )}
            >
              English
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium text-white mb-3">Sortierung</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Sortieren nach</label>
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
                  Datum
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
                  Relevanz
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Reihenfolge</label>
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
                  Neueste zuerst
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
                  Älteste zuerst
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium text-white mb-3">Standard-Perspektiven</h2>
          <p className="text-sm text-gray-400 mb-3">
            Wählen Sie die Perspektiven, die beim Start automatisch geladen werden
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
          <h2 className="text-base font-medium text-white mb-3">Filter-Presets</h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset-Name..."
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
                Speichern
              </button>
            </div>

            {Object.keys(savedPresets).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Gespeicherte Presets:</p>
                {Object.entries(savedPresets).map(([name, regions]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg bg-gray-700/50 px-4 py-2"
                  >
                    <div>
                      <p className="text-sm text-white font-medium">{name}</p>
                      <p className="text-xs text-gray-400">
                        {regions.length} {regions.length === 1 ? 'Perspektive' : 'Perspektiven'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadPreset(regions)}
                        className="rounded-lg bg-[#00f0ff]/20 px-3 py-1 text-xs text-[#00f0ff] hover:bg-[#00f0ff]/30 border border-[#00f0ff]/30"
                      >
                        Laden
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
          <h2 className="text-base font-medium text-white mb-3">Focus Management</h2>
          <p className="text-sm text-gray-400 mb-4">
            Verwalte deine Focus Presets. Built-in Presets können nicht bearbeitet werden.
          </p>

          {/* Built-in Presets */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-[#00f0ff]/20 to-transparent" />
              Built-in Presets
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
                Custom Presets
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
                        'Preset löschen',
                        `Möchten Sie das Preset "${preset.name}" wirklich löschen?`,
                        () => {
                          deleteCustomPreset(preset.id);
                          showToast('Preset erfolgreich gelöscht', 'success');
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
              <span className="text-sm font-mono">Create Custom Preset</span>
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Complete onboarding to create custom focus presets
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium text-white mb-3">Filter zurücksetzen</h2>
          <button
            onClick={resetFilters}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Alle Filter zurücksetzen
          </button>
        </div>

        <div>
          <h2 className="text-base font-medium text-white mb-3">Command Palette</h2>
          <div className="flex items-center justify-between rounded-lg bg-gray-700/50 p-4">
            <div className="flex items-center gap-3">
              <Command className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-white">Command Palette anzeigen</p>
                <p className="text-xs text-gray-400">
                  Schnellzugriff mit{' '}
                  <kbd className="rounded bg-gray-600 px-1.5 py-0.5 text-xs font-mono">⌘K</kbd> oder{' '}
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
        <h2 className="text-lg font-medium text-white mb-4">API-Konfiguration</h2>
        <p className="text-sm text-gray-400 mb-4">
          Konfiguriere deine API-Keys für erweiterte Funktionen.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">DeepL API Key</label>
            <input
              type="password"
              placeholder="API-Key eingeben..."
              className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white placeholder-gray-500 outline-none ring-1 ring-gray-600 focus:ring-[#00f0ff]"
            />
            <p className="mt-1 text-xs text-gray-500">
              Für automatische Übersetzungen. Kostenlos unter deepl.com/pro-api
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-4">
        <h2 className="text-lg font-medium text-white mb-4">Daten & Cache</h2>

        <div>
          <h3 className="text-sm font-medium text-white mb-2">Einstellungen exportieren</h3>
          <p className="text-xs text-gray-400 mb-3">
            Exportiere alle Einstellungen, Presets und Präferenzen als JSON-Datei
          </p>
          <button
            onClick={exportSettings}
            className="rounded-lg bg-[#00f0ff]/20 px-4 py-2 text-sm text-[#00f0ff] hover:bg-[#00f0ff]/30 border border-[#00f0ff]/30 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Einstellungen exportieren
          </button>
        </div>

        <div>
          <h3 className="text-sm font-medium text-white mb-2">Einstellungen importieren</h3>
          <p className="text-xs text-gray-400 mb-3">
            Importiere zuvor exportierte Einstellungen
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
              Einstellungen importieren
            </span>
          </label>
        </div>

        <div>
          <h3 className="text-sm font-medium text-white mb-2">Cache leeren</h3>
          <p className="text-xs text-gray-400 mb-3">
            Entferne gecachte Artikel-Daten und erzwinge einen vollständigen Reload
          </p>
          <button
            onClick={clearCache}
            className="rounded-lg bg-[#ff0044]/20 px-4 py-2 text-sm text-[#ff0044] hover:bg-[#ff0044]/30 border border-[#ff0044]/30 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Cache leeren
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
    </div>
  );
}
