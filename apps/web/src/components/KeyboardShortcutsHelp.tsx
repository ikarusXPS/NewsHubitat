import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { getShortcutGroups } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const groups = getShortcutGroups();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg rounded-xl border border-[#00f0ff]/20 bg-[#0a0e1a] shadow-2xl shadow-[#00f0ff]/5 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                    <Keyboard className="h-5 w-5 text-[#00f0ff]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
                    <p className="text-xs text-gray-500 font-mono">Quick navigation & actions</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Navigation */}
                <div>
                  <h3 className="text-xs font-mono text-[#00f0ff] uppercase tracking-wider mb-3">
                    Navigation
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {groups.navigation.map((shortcut, index) => (
                      <ShortcutRow key={`nav-${index}`} shortcutKey={shortcut.key} description={shortcut.description} />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h3 className="text-xs font-mono text-[#00ff88] uppercase tracking-wider mb-3">
                    Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {groups.actions.map((shortcut, index) => (
                      <ShortcutRow key={`action-${index}`} shortcutKey={shortcut.key} description={shortcut.description} />
                    ))}
                  </div>
                </div>

                {/* Feed */}
                <div>
                  <h3 className="text-xs font-mono text-[#bf00ff] uppercase tracking-wider mb-3">
                    Feed Navigation
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {groups.feed.map((shortcut, index) => (
                      <ShortcutRow key={`feed-${index}`} shortcutKey={shortcut.key} description={shortcut.description} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-800 text-center">
                <p className="text-xs text-gray-500 font-mono">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-[#00f0ff] border border-gray-700 mx-1">Shift + ?</kbd> anytime to show this help
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ShortcutRow({ shortcutKey, description }: { shortcutKey: string; description: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50 border border-gray-800">
      <span className="text-sm text-gray-300">{description}</span>
      <kbd className="px-2 py-1 rounded bg-gray-800 text-[#00f0ff] text-xs font-mono border border-gray-700 min-w-[2rem] text-center">
        {shortcutKey}
      </kbd>
    </div>
  );
}
