'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ensureRelayDeviceRegistered } from '@/lib/qr-relay';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let installPrompt: InstallPromptEvent | null = null;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

async function prepareOfflineSupport() {
  if ('storage' in navigator && 'persist' in navigator.storage)
    await navigator.storage.persist().catch(() => false);
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'CACHE_OFFLINE_SHELL' });
    if (navigator.onLine) await registration.update();
  }
  if (navigator.onLine) await ensureRelayDeviceRegistered(true);
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // A service worker caching Vite's transformed development modules can
      // leave two React instances active after dependency optimization. PWA
      // behavior belongs in preview/production, never the dev server.
      void navigator.serviceWorker
        ?.getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .then(() => caches.keys())
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith('team401-'))
              .map((key) => caches.delete(key)),
          ),
        )
        .then(() => {
          if (navigator.serviceWorker?.controller && !sessionStorage.getItem('team401-dev-sw-cleaned')) {
            sessionStorage.setItem('team401-dev-sw-cleaned', '1');
            window.location.reload();
          }
        })
        .catch(() => undefined);
      return;
    }
    const prepare = () => void prepareOfflineSupport().catch(() => undefined);
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPrompt = event as InstallPromptEvent;
      window.dispatchEvent(new Event('team401-install-available'));
    };
    const installed = () => {
      installPrompt = null;
      window.dispatchEvent(new Event('team401-install-changed'));
    };

    prepare();
    window.addEventListener('online', prepare);
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('online', prepare);
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  return null;
}

export function PwaInstallButton({ className }: { className?: string }) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const update = () => setAvailable(Boolean(installPrompt) && !isStandalone());
    update();
    window.addEventListener('team401-install-available', update);
    window.addEventListener('team401-install-changed', update);
    return () => {
      window.removeEventListener('team401-install-available', update);
      window.removeEventListener('team401-install-changed', update);
    };
  }, []);

  if (!available) return null;
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={async () => {
        const prompt = installPrompt;
        if (!prompt) return;
        await prompt.prompt();
        await prompt.userChoice;
        installPrompt = null;
        setAvailable(false);
      }}
    >
      <Download />
      Install app
    </Button>
  );
}
