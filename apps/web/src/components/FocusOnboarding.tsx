import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe2, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';
import { useAppStore } from '../store';
import { RegionSelector } from './RegionSelector';
import { TopicSelector } from './TopicSelector';
import { calculateOptimalMapView } from '../utils/mapCentering';
import type { PerspectiveRegion } from '../types';
import type { FocusPreset } from '../types/focus';
import { FOCUS_PRESETS } from '../config/focusPresets';

type Step = 'welcome' | 'regions' | 'topics';

export function FocusOnboarding() {
  const { setOnboardingComplete, createCustomPreset, setActiveFocus } = useAppStore();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedRegions, setSelectedRegions] = useState<PerspectiveRegion[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [usePreset, setUsePreset] = useState<string | null>(null);

  const handleToggleRegion = (region: PerspectiveRegion) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
    // Clear preset selection when customizing
    setUsePreset(null);
  };

  const handleToggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = FOCUS_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedRegions(preset.regions);
      setSelectedTopics(preset.topics);
      setUsePreset(presetId);
    }
  };

  const handleComplete = () => {
    if (selectedRegions.length === 0) return;

    let finalPreset: FocusPreset;

    if (usePreset) {
      // User selected a built-in preset
      finalPreset = FOCUS_PRESETS.find((p) => p.id === usePreset)!;
    } else {
      // User created custom selection
      const mapCenter = calculateOptimalMapView(selectedRegions);
      finalPreset = {
        id: `custom-${Date.now()}`,
        name: 'My Custom Focus',
        description: `Custom focus with ${selectedRegions.length} regions and ${selectedTopics.length} topics`,
        icon: '⚡',
        regions: selectedRegions,
        topics: selectedTopics,
        mapCenter,
        isCustom: true,
        color: '#00f0ff',
      };
      createCustomPreset(finalPreset);
    }

    setActiveFocus(finalPreset);
    setOnboardingComplete();
  };

  const canContinue = () => {
    if (step === 'regions') return selectedRegions.length > 0;
    if (step === 'topics') return selectedTopics.length > 0;
    return true;
  };

  return (
    // z-[90] keeps onboarding below ConsentBanner (z-[100]) — GDPR consent must be addressable first.
    <div className="fixed inset-0 z-[90] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Dismiss / skip onboarding so users can reach the app (Sign In, browse) without setup. */}
      <button
        onClick={setOnboardingComplete}
        aria-label="Skip onboarding"
        className="fixed top-4 right-4 z-10 p-2 rounded-md border border-slate-700 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        style={{ top: 'max(1rem, var(--safe-area-top))' }}
      >
        <X className="w-5 h-5" />
      </button>
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-2xl w-full"
          >
            <div className="glass-panel p-8 rounded-2xl border border-cyan-500/30 text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                className="inline-block mb-6"
              >
                <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center">
                  <Globe2 className="w-10 h-10 text-cyan-400" />
                </div>
              </motion.div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-white mb-4">
                Welcome to NewsHub
              </h1>

              {/* Description */}
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                Customize your global focus to see news from the regions and topics
                that matter most to you. Choose from curated presets or create your own.
              </p>

              {/* Presets */}
              <div className="mb-8">
                <h3 className="text-sm font-mono text-cyan-400 uppercase tracking-wider mb-4">
                  Quick Start Presets
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {FOCUS_PRESETS.filter((p) => !p.isCustom).slice(0, 6).map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`
                        px-4 py-3 rounded-lg border-2 transition-all text-left
                        ${
                          usePreset === preset.id
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{preset.icon}</span>
                        <span className={`font-semibold text-sm ${usePreset === preset.id ? 'text-cyan-400' : 'text-white'}`}>
                          {preset.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-tight">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setStep('regions')}
                className="btn-cyber btn-cyber-primary px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
              >
                {usePreset ? 'Continue with Preset' : 'Customize My Focus'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'regions' && (
          <motion.div
            key="regions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-5xl w-full"
          >
            <div className="glass-panel p-8 rounded-2xl border border-cyan-500/30">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Select Regions</h2>
                  <div className="text-sm font-mono text-slate-400">
                    Step 1 of 2
                  </div>
                </div>
                <p className="text-slate-300">
                  Choose the regions you want to follow. You can select multiple perspectives.
                </p>
              </div>

              {/* Region Grid */}
              <div className="mb-8">
                <RegionSelector
                  selectedRegions={selectedRegions}
                  onToggle={handleToggleRegion}
                />
              </div>

              {/* Selected Count */}
              <div className="mb-6 text-center">
                <span className="text-cyan-400 font-mono">
                  {selectedRegions.length} region{selectedRegions.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('welcome')}
                  className="btn-cyber px-4 py-2 rounded-lg inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep('topics')}
                  disabled={!canContinue()}
                  className={`
                    px-6 py-2 rounded-lg font-semibold inline-flex items-center gap-2
                    ${
                      canContinue()
                        ? 'btn-cyber btn-cyber-primary'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }
                  `}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'topics' && (
          <motion.div
            key="topics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-5xl w-full"
          >
            <div className="glass-panel p-8 rounded-2xl border border-cyan-500/30">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Topics of Interest</h2>
                  <div className="text-sm font-mono text-slate-400">
                    Step 2 of 2
                  </div>
                </div>
                <p className="text-slate-300">
                  Select the topics you're most interested in following.
                </p>
              </div>

              {/* Topic Grid */}
              <div className="mb-8">
                <TopicSelector
                  selectedTopics={selectedTopics}
                  onToggle={handleToggleTopic}
                />
              </div>

              {/* Selected Count */}
              <div className="mb-6 text-center">
                <span className="text-cyan-400 font-mono">
                  {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('regions')}
                  className="btn-cyber px-4 py-2 rounded-lg inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!canContinue()}
                  className={`
                    px-6 py-2 rounded-lg font-semibold inline-flex items-center gap-2
                    ${
                      canContinue()
                        ? 'btn-cyber btn-cyber-primary'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }
                  `}
                >
                  <Check className="w-4 h-4" />
                  Complete Setup
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
