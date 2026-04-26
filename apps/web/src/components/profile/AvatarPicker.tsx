import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { AvatarGrid } from './AvatarGrid';
import { UnlockProgress } from './UnlockProgress';
import { AVATAR_PRESETS, type AvatarPreset } from '../../types/gamification';
import type { NewsArticle, PerspectiveRegion } from '../../types';
import { cn } from '../../lib/utils';

interface AvatarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (presetId: string | null, file?: File) => Promise<void>;
  currentPresetId: string | null;
  articles: Map<string, NewsArticle>;
  isVerified: boolean;
}

const REGIONS: { id: PerspectiveRegion; label: string }[] = [
  { id: 'usa', label: 'USA' },
  { id: 'europa', label: 'Europa' },
  { id: 'deutschland', label: 'Deutschland' },
  { id: 'nahost', label: 'Middle East' },
  { id: 'tuerkei', label: 'Turkey' },
  { id: 'russland', label: 'Russia' },
  { id: 'china', label: 'China' },
  { id: 'asien', label: 'Asia' },
  { id: 'afrika', label: 'Africa' },
  { id: 'lateinamerika', label: 'Latin America' },
  { id: 'ozeanien', label: 'Oceania' },
  { id: 'kanada', label: 'Canada' },
  { id: 'alternative', label: 'Alternative' },
];

const REQUIRED_ARTICLES = 5; // Per D-37

export function AvatarPicker({
  isOpen,
  onClose,
  onSave,
  currentPresetId,
  articles,
  isVerified,
}: AvatarPickerProps) {
  const { readingHistory, language } = useAppStore();
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(currentPresetId);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate region unlocks per D-37
  const regionUnlocks = useMemo(() => {
    const counts = new Map<PerspectiveRegion, number>();
    readingHistory.forEach((entry) => {
      const article = articles.get(entry.articleId);
      if (article) {
        const region = article.perspective as PerspectiveRegion;
        counts.set(region, (counts.get(region) || 0) + 1);
      }
    });

    return REGIONS.map((r) => ({
      region: r.id,
      label: r.label,
      articlesRead: counts.get(r.id) || 0,
      unlocked: (counts.get(r.id) || 0) >= REQUIRED_ARTICLES,
    }));
  }, [readingHistory, articles]);

  const unlockedRegions = regionUnlocks.filter((r) => r.unlocked).map((r) => r.region);
  const lockedRegions = regionUnlocks.filter((r) => !r.unlocked);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate per D-29
    if (file.size > 2 * 1024 * 1024) {
      setError(language === 'de' ? 'Bild muss unter 2MB sein' : 'Image must be under 2MB');
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError(language === 'de' ? 'Nur JPEG oder PNG' : 'Please use JPEG or PNG');
      return;
    }

    setError(null);
    setUploadFile(file);
    setSelectedPresetId(null);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(selectedPresetId, uploadFile || undefined);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePresetSelect = (preset: AvatarPreset) => {
    setSelectedPresetId(preset.id);
    setUploadFile(null);
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto glass-panel rounded-xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white font-mono">
                  {language === 'de' ? 'Avatar wahlen' : 'Choose Your Avatar'}
                </h2>
                <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Unlocked Regions per D-35 (only show unlocked) */}
              {unlockedRegions.map((region) => {
                const regionInfo = REGIONS.find((r) => r.id === region)!;
                return (
                  <AvatarGrid
                    key={region}
                    presets={AVATAR_PRESETS}
                    region={region}
                    regionLabel={regionInfo.label}
                    selectedId={selectedPresetId}
                    onSelect={handlePresetSelect}
                  />
                );
              })}

              {/* Locked Regions Progress per D-39, D-40 */}
              {lockedRegions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3">
                    {language === 'de' ? 'Noch gesperrt' : 'Locked'}
                  </h4>
                  <div className="space-y-2">
                    {lockedRegions.map((r) => (
                      <UnlockProgress
                        key={r.region}
                        region={r.region}
                        articlesRead={r.articlesRead}
                        required={REQUIRED_ARTICLES}
                        label={r.label}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Upload per D-24, D-49 */}
              <div className="mb-6">
                <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3">
                  {language === 'de' ? 'Eigenes Bild' : 'Custom Image'}
                </h4>
                {isVerified ? (
                  <label
                    className={cn(
                      'flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                      uploadFile
                        ? 'border-[#00f0ff] bg-[#00f0ff]/10'
                        : 'border-gray-700 hover:border-gray-500'
                    )}
                  >
                    <Upload className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-400">
                      {uploadFile?.name || (language === 'de' ? 'Max 2MB, JPEG/PNG' : 'Max 2MB, JPEG/PNG')}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-4 rounded-lg bg-gray-800/50 text-center">
                    <p className="text-sm text-gray-500">
                      {language === 'de'
                        ? 'E-Mail-Verifizierung erforderlich'
                        : 'Email verification required'}
                    </p>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
                >
                  {language === 'de' ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || (!selectedPresetId && !uploadFile)}
                  className={cn(
                    'flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                    selectedPresetId || uploadFile
                      ? 'bg-[#00f0ff] text-black hover:bg-[#00d4e6]'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  )}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {language === 'de' ? 'Speichern' : 'Save Selection'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
