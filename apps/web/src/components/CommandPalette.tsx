import { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Home,
  BarChart3,
  Clock,
  Map,
  Bookmark,
  Settings,
  Globe2,
  Sun,
  Moon,
  Filter,
  RefreshCw,
  Command as CommandIcon,
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  group: 'navigation' | 'actions' | 'filters' | 'settings';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const {
    theme,
    toggleTheme,
    language,
    setLanguage,
    setSearchQuery,
    commandPaletteEnabled,
    setCommandPaletteEnabled,
  } = useAppStore();

  // Toggle with CMD+K or CTRL+K
  useEffect(() => {
    if (!commandPaletteEnabled) return;

    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteEnabled]);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  // Don't render if disabled
  if (!commandPaletteEnabled) {
    return null;
  }

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'home',
      label: 'Dashboard',
      icon: <Home className="h-4 w-4" />,
      shortcut: 'G H',
      action: () => navigate('/'),
      group: 'navigation',
    },
    {
      id: 'analysis',
      label: 'Perspektiven-Analyse',
      icon: <BarChart3 className="h-4 w-4" />,
      shortcut: 'G A',
      action: () => navigate('/analysis'),
      group: 'navigation',
    },
    {
      id: 'timeline',
      label: 'Ereignis-Timeline',
      icon: <Clock className="h-4 w-4" />,
      shortcut: 'G T',
      action: () => navigate('/timeline'),
      group: 'navigation',
    },
    {
      id: 'map',
      label: 'Konflikt-Karte',
      icon: <Map className="h-4 w-4" />,
      shortcut: 'G M',
      action: () => navigate('/map'),
      group: 'navigation',
    },
    {
      id: 'bookmarks',
      label: 'Gespeicherte Artikel',
      icon: <Bookmark className="h-4 w-4" />,
      shortcut: 'G B',
      action: () => navigate('/bookmarks'),
      group: 'navigation',
    },
    {
      id: 'settings',
      label: 'Einstellungen',
      icon: <Settings className="h-4 w-4" />,
      shortcut: 'G S',
      action: () => navigate('/settings', { state: { backgroundLocation: location } }),
      group: 'navigation',
    },
    // Actions
    {
      id: 'refresh',
      label: 'Artikel aktualisieren',
      icon: <RefreshCw className="h-4 w-4" />,
      shortcut: 'R',
      action: () => window.location.reload(),
      group: 'actions',
    },
    {
      id: 'search-focus',
      label: 'Suche fokussieren',
      icon: <Search className="h-4 w-4" />,
      shortcut: '/',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="suchen"]') as HTMLInputElement;
        searchInput?.focus();
      },
      group: 'actions',
    },
    // Filters
    {
      id: 'filter-israel',
      label: 'Filter: Israel',
      icon: <Filter className="h-4 w-4" />,
      action: () => setSearchQuery('israel'),
      group: 'filters',
    },
    {
      id: 'filter-palestine',
      label: 'Filter: Palästina',
      icon: <Filter className="h-4 w-4" />,
      action: () => setSearchQuery('palestine'),
      group: 'filters',
    },
    {
      id: 'filter-clear',
      label: 'Filter zurücksetzen',
      icon: <Filter className="h-4 w-4" />,
      action: () => setSearchQuery(''),
      group: 'filters',
    },
    // Settings
    {
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren',
      icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      shortcut: 'T',
      action: toggleTheme,
      group: 'settings',
    },
    {
      id: 'toggle-language',
      label: language === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln',
      icon: <Globe2 className="h-4 w-4" />,
      shortcut: 'L',
      action: () => setLanguage(language === 'de' ? 'en' : 'de'),
      group: 'settings',
    },
    {
      id: 'hide-command-palette',
      label: 'Command Palette verstecken',
      icon: <CommandIcon className="h-4 w-4" />,
      action: () => {
        setCommandPaletteEnabled(false);
        navigate('/settings', { state: { backgroundLocation: location } });
      },
      group: 'settings',
    },
  ];

  const groupLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Aktionen',
    filters: 'Schnellfilter',
    settings: 'Einstellungen',
  };

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <>
      {/* Trigger hint */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-gray-700/50 border border-gray-600/50',
          'text-sm text-gray-400 hover:text-white hover:bg-gray-700',
          'transition-all'
        )}
      >
        <CommandIcon className="h-3.5 w-3.5" />
        <span>Kommandos</span>
        <kbd className="ml-2 rounded bg-gray-600/50 px-1.5 py-0.5 text-xs font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Command palette modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-x-4 top-[15%] z-50 mx-auto max-w-xl"
            >
              <Command
                className={cn(
                  'overflow-hidden rounded-2xl',
                  'bg-gray-800/95 backdrop-blur-xl',
                  'border border-gray-700/50',
                  'shadow-2xl shadow-black/50'
                )}
              >
                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-gray-700/50 px-4 py-3">
                  <Search className="h-5 w-5 text-gray-400" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Kommando eingeben oder suchen..."
                    className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
                  />
                  <kbd className="rounded bg-gray-700/50 px-2 py-1 text-xs text-gray-400 font-mono">
                    ESC
                  </kbd>
                </div>

                {/* Commands list */}
                <Command.List className="max-h-80 overflow-y-auto p-2">
                  <Command.Empty className="py-6 text-center text-sm text-gray-500">
                    Keine Ergebnisse gefunden.
                  </Command.Empty>

                  {Object.entries(groupedCommands).map(([group, items]) => (
                    <Command.Group
                      key={group}
                      heading={groupLabels[group]}
                      className="mb-2"
                    >
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {groupLabels[group]}
                      </div>
                      {items.map((cmd) => (
                        <Command.Item
                          key={cmd.id}
                          value={cmd.label}
                          onSelect={() => runCommand(cmd.action)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                            'text-gray-300 hover:bg-gray-700/50 hover:text-white',
                            'data-[selected=true]:bg-blue-600/20 data-[selected=true]:text-blue-300',
                            'transition-colors'
                          )}
                        >
                          <div className="flex-shrink-0 text-gray-400">
                            {cmd.icon}
                          </div>
                          <span className="flex-1">{cmd.label}</span>
                          {cmd.shortcut && (
                            <kbd className="rounded bg-gray-700/50 px-2 py-0.5 text-xs text-gray-500 font-mono">
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ))}
                </Command.List>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-700/50 px-4 py-2.5 text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-gray-700/50 px-1.5 py-0.5 font-mono">↑↓</kbd>
                      Navigieren
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-gray-700/50 px-1.5 py-0.5 font-mono">↵</kbd>
                      Ausführen
                    </span>
                  </div>
                  <span>NewsHub Command Palette</span>
                </div>
              </Command>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
