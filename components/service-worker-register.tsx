'use client';
import { useEffect } from 'react';
import { ensureRelayDeviceRegistered } from '@/lib/qr-relay';

async function prepareOfflineSupport() {
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.register('/sw.js');
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'CACHE_OFFLINE_SHELL' });
  }
  if (navigator.onLine) await ensureRelayDeviceRegistered(true);
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    const prepare = () => void prepareOfflineSupport().catch(() => undefined);
    prepare();
    window.addEventListener('online', prepare);
    return () => window.removeEventListener('online', prepare);
  }, []);
  return null;
}
