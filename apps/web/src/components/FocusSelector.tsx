import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { FOCUS_PRESETS } from '../config/focusPresets';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function FocusSelector() {
  const { activeFocusPreset, setActiveFocus } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handlePresetClick = (preset: typeof FOCUS_PRESETS[0]) => {
    setActiveFocus(preset);
    setIsOpen(false);
  };

  const currentPreset = activeFocusPreset || {
    id: 'custom',
    name: 'Custom View',
    icon: '⚙️',
    color: '#6b7280',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-mono transition-all',
          'bg-[#0a0e1a]/90 backdrop-blur-sm',
          isOpen
            ? 'border-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.3)]'
            : 'border-[#00f0ff]/30 hover:border-[#00f0ff]/50'
        )}
        style={{
          borderColor: isOpen ? currentPreset.color : undefined,
        }}
      >
        <span className="text-base">{currentPreset.icon}</span>
        <span className="text-[#00f0ff] hidden sm:inline">{currentPreset.name}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[#00f0ff]/70 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-[#00f0ff]/20 bg-[#0a0e1a]/95 backdrop-blur-xl shadow-2xl z-50"
            style={{ boxShadow: '0 0 30px rgba(0,240,255,0.2)' }}
          >
            {/* Header */}
            <div className="border-b border-[#00f0ff]/10 px-4 py-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#00f0ff]/70">
                Focus Presets
              </h3>
            </div>

            {/* Preset Grid */}
            <div className="max-h-96 overflow-y-auto p-2">
              <div className="grid gap-1">
                {FOCUS_PRESETS.map((preset) => {
                  const isActive = activeFocusPreset?.id === preset.id;

                  return (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetClick(preset)}
                      className={cn(
                        'group relative flex items-start gap-3 rounded-md p-3 text-left transition-all',
                        isActive
                          ? 'bg-[rgba(0,240,255,0.1)] border border-[#00f0ff]/30'
                          : 'border border-transparent hover:bg-white/5 hover:border-[#00f0ff]/20'
                      )}
                      style={{
                        backgroundColor: isActive ? `${preset.color}10` : undefined,
                        borderColor: isActive ? `${preset.color}40` : undefined,
                      }}
                    >
                      {/* Icon */}
                      <span className="text-2xl">{preset.icon}</span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-mono text-sm font-medium text-white">
                            {preset.name}
                          </h4>
                          {isActive && (
                            <Check
                              className="h-4 w-4 flex-shrink-0"
                              style={{ color: preset.color }}
                            />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                          {preset.description}
                        </p>

                        {/* Regions Preview */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {preset.regions.slice(0, 3).map((region) => (
                            <span
                              key={region}
                              className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase"
                              style={{
                                backgroundColor: `${preset.color}20`,
                                color: preset.color,
                              }}
                            >
                              {region}
                            </span>
                          ))}
                          {preset.regions.length > 3 && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-mono text-gray-500"
                            >
                              +{preset.regions.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#00f0ff]/10 px-4 py-3">
              <p className="text-[10px] font-mono text-gray-500">
                Custom presets can be created in Settings
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
