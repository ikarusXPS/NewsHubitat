import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function DeleteAccountModal({ isOpen, onClose, userEmail }: DeleteAccountModalProps) {
  const { language } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (email !== userEmail) {
      setError(language === 'de' ? 'E-Mail stimmt nicht überein' : 'Email does not match');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/account/delete-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request deletion');
      }

      // Redirect to logout
      localStorage.removeItem('newshub-auth-token');
      window.location.href = '/';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel rounded-xl p-6 max-w-md w-full border-[#ff0044]/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-[#ff0044]/20">
                  <Trash2 className="h-6 w-6 text-[#ff0044]" />
                </div>
                <h2 className="text-lg font-bold text-white font-mono">
                  {language === 'de' ? 'Konto löschen?' : 'Delete Account?'}
                </h2>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#ff0044]/10 border border-[#ff0044]/30">
                  <AlertTriangle className="h-5 w-5 text-[#ff0044] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300">
                    {language === 'de'
                      ? 'Diese Aktion kann nicht rückgängig gemacht werden. Sie haben 7 Tage Zeit, die Löschung abzubrechen, indem Sie sich erneut anmelden.'
                      : 'This action cannot be undone. You have 7 days to cancel by logging back in.'}
                  </p>
                </div>

                <p className="text-gray-400 text-sm">
                  {language === 'de'
                    ? 'Geben Sie Ihr Passwort und Ihre E-Mail-Adresse ein, um zu bestätigen.'
                    : 'Enter your password and email to confirm.'}
                </p>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {language === 'de' ? 'E-Mail-Adresse' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={userEmail}
                    className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white outline-none ring-1 ring-gray-600 focus:ring-[#ff0044]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {language === 'de' ? 'Passwort' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white outline-none ring-1 ring-gray-600 focus:ring-[#ff0044]"
                  />
                </div>

                {error && (
                  <p className="text-sm text-[#ff0044]">{error}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
                >
                  {language === 'de' ? 'Konto behalten' : 'Keep Account'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !email || !password}
                  className={cn(
                    'flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                    email && password
                      ? 'bg-[#ff0044] text-white hover:bg-[#e60040]'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  )}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {language === 'de' ? 'Konto löschen' : 'Delete My Account'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
