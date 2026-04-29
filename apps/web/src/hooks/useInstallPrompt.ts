import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      // Prevent browser's default mini-infobar (D-07)
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Check engagement threshold (D-08)
      const visitCount = Number(localStorage.getItem('visitCount') || 0) + 1;
      const articlesRead = Number(localStorage.getItem('articlesRead') || 0);
      const lastDismissed = localStorage.getItem('installPromptDismissed');

      localStorage.setItem('visitCount', String(visitCount));

      // Show banner if: 3+ visits OR 5+ articles, AND not dismissed in last 7 days (D-08, D-10)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const dismissedRecently = lastDismissed && Number(lastDismissed) > sevenDaysAgo;

      if ((visitCount >= 3 || articlesRead >= 5) && !dismissedRecently) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowBanner(false);
    }

    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem('installPromptDismissed', String(Date.now()));
  };

  return { showBanner, install, dismiss };
}
