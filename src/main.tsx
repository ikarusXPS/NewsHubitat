import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register service worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('workbox-window').then(({ Workbox }) => {
    const wb = new Workbox('/sw.js');

    wb.addEventListener('waiting', () => {
      // Show update notification to user
      if (confirm('New version available! Reload to update?')) {
        wb.messageSkipWaiting();
        window.location.reload();
      }
    });

    wb.register();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
