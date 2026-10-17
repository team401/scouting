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
let recoveringChunkLoad = false;

function chunkFailureDetails(event: Event | PromiseRejectionEvent) {
  if (event instanceof ErrorEvent) {
    const source =
      event.filename ||
      (event.target instanceof HTMLScriptElement ? event.target.src : '');
    return `${event.message} ${source}`;
  }
  const reason = 'reason' in event ? event.reason : null;
  return reason instanceof Error ? reason.message : String(reason ?? '');
}

async function recoverFromChunkFailure() {
  if (recoveringChunkLoad || !navigator.onLine) return;
  const lastRecovery = Number(
    sessionStorage.getItem('team401-chunk-recovery') ?? 0,
  );
  if (Date.now() - lastRecovery < 30_000) return;
  recoveringChunkLoad = true;
  sessionStorage.setItem('team401-chunk-recovery', String(Date.now()));
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  );
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter(
        (key) =>
          key.startsWith('team401-shell-') ||
          key.startsWith('team401-pages-') ||
          key.startsWith('team401-assets-'),
      )
      .map((key) => caches.delete(key)),
  );
  window.location.reload();
}

function isChunkFailure(event: Event | PromiseRejectionEvent) {
  const details = chunkFailureDetails(event);
  return (
    /\/_next\/static\/.*\.(?:js|css)/i.test(details) ||
    /failed to fetch dynamically imported module|loading chunk \d* failed|chunkloaderror/i.test(
      details,
    )
  );
}

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
          Promise.all(
            registrations.map((registration) => registration.unregister()),
          ),
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
          if (
            navigator.serviceWorker?.controller &&
            !sessionStorage.getItem('team401-dev-sw-cleaned')
          ) {
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
    const recoverChunk = (event: Event | PromiseRejectionEvent) => {
      if (isChunkFailure(event))
        void recoverFromChunkFailure().catch(() => {
          recoveringChunkLoad = false;
        });
    };

    prepare();
    window.addEventListener('online', prepare);
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', installed);
    window.addEventListener('error', recoverChunk, true);
    window.addEventListener('unhandledrejection', recoverChunk);
    return () => {
      window.removeEventListener('online', prepare);
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', installed);
      window.removeEventListener('error', recoverChunk, true);
      window.removeEventListener('unhandledrejection', recoverChunk);
    };
  }, []);
  return null;
}

export function PwaInstallButton({ className }: { className?: string }) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const update = () =>
      setAvailable(Boolean(installPrompt) && !isStandalone());
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
