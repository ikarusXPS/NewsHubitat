import { useState } from 'react';
import { motion } from 'framer-motion';
import { Languages, Link, ArrowRight, Send, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TranslateFormProps {
  onSubmit: (data: TranslationSubmission) => void;
  onCancel: () => void;
}

export interface TranslationSubmission {
  type: 'translation';
  articleUrl: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  notes: string;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
];

export function TranslateForm({ onSubmit, onCancel }: TranslateFormProps) {
  const [articleUrl, setArticleUrl] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('de');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!articleUrl || !originalText || !translatedText || !sourceLanguage || !targetLanguage) {
      setError('Please fill in all required fields');
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setError('Source and target languages must be different');
      return;
    }

    setIsLoading(true);
    try {
      onSubmit({
        type: 'translation',
        articleUrl,
        originalText,
        translatedText,
        sourceLanguage,
        targetLanguage,
        notes,
      });
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 pb-4 border-b border-gray-700">
        <div className="p-2 rounded-lg bg-[#bf00ff]/20 text-[#bf00ff]">
          <Languages className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-white">Translate Content</h3>
          <p className="text-xs text-gray-500">Improve or add translations</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#ff0044]/10 border border-[#ff0044]/30 text-[#ff0044] text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-2">
          <Link className="h-3 w-3 inline mr-1" />
          Article URL *
        </label>
        <input
          type="url"
          value={articleUrl}
          onChange={(e) => setArticleUrl(e.target.value)}
          placeholder="URL of the article to translate..."
          className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50"
          required
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-mono text-gray-400 mb-2">
            Source Language *
          </label>
          <select
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
            className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white outline-none focus:border-[#00f0ff]/50"
            required
          >
            <option value="">Select...</option>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <ArrowRight className="h-5 w-5 text-[#bf00ff] mt-6" />

        <div className="flex-1">
          <label className="block text-xs font-mono text-gray-400 mb-2">
            Target Language *
          </label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white outline-none focus:border-[#00f0ff]/50"
            required
          >
            <option value="">Select...</option>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-gray-400 mb-2">
            Original Text *
          </label>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            rows={5}
            placeholder="Paste the original text..."
            className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50 resize-none"
            required
          />
          <div className="text-right text-[10px] text-gray-500 mt-1">
            {originalText.length} characters
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-gray-400 mb-2">
            Translation *
          </label>
          <textarea
            value={translatedText}
            onChange={(e) => setTranslatedText(e.target.value)}
            rows={5}
            placeholder="Your translation..."
            className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#bf00ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#bf00ff]/50 resize-none"
            required
          />
          <div className="text-right text-[10px] text-gray-500 mt-1">
            {translatedText.length} characters
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-2">
          Notes (optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context or notes about the translation..."
          className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors font-mono text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'flex-1 btn-cyber btn-cyber-primary py-3 rounded-lg flex items-center justify-center gap-2',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Send className="h-4 w-4" />
          {isLoading ? 'Submitting...' : 'Submit (+40 XP)'}
        </button>
      </div>
    </motion.form>
  );
}
