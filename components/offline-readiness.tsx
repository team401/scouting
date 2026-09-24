'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  CloudDownload,
  Download,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  deleteAllDrafts,
  getAllDrafts,
  getCachedValue,
  getPendingMutations,
  getRelayDevice,
  type PendingMutation,
} from '@/lib/offline-db';
import { ensureRelayDeviceRegistered } from '@/lib/qr-relay';

type CachedPack = {
  event?: { key?: string; name?: string; updatedAt?: number };
  matches?: unknown[];
};

async function cacheShell() {
  if (!('serviceWorker' in navigator))
    throw new Error('Service workers are not supported on this device.');
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) throw new Error('The offline service worker is not active yet.');
  return new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(
      () => reject(new Error('Offline cache preparation timed out.')),
      10_000,
    );
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      if (event.data?.ok) resolve();
      else
        reject(
          new Error(event.data?.error ?? 'Unable to cache the app shell.'),
        );
    };
    worker.postMessage({ type: 'CACHE_OFFLINE_SHELL' }, [channel.port2]);
  });
}

export function OfflineReadiness({
  eventKey,
  eventName,
  matchCount,
  teamCount,
  online,
  onRefresh,
}: {
  eventKey: string;
  eventName: string;
  matchCount: number;
  teamCount: number;
  online: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [pending, setPending] = useState<PendingMutation[]>([]);
  const [draftCount, setDraftCount] = useState(0);
  const [packReady, setPackReady] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const [relayReady, setRelayReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const inspect = useCallback(async () => {
    const [mutations, drafts, pack, relayDevice] = await Promise.all([
      getPendingMutations(),
      getAllDrafts(),
      getCachedValue<CachedPack>('current-event-pack'),
      getRelayDevice(),
    ]);
    setPending(mutations);
    setDraftCount(drafts.length);
    setPackReady(
      Boolean(
        eventKey && pack?.event?.key === eventKey && pack.matches?.length,
      ),
    );
    setShellReady(
      'caches' in window && (await caches.has('team401-scouting-shell-v3')),
    );
    setRelayReady(relayDevice.registered);
  }, [eventKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void inspect(), 0);
    return () => window.clearTimeout(timer);
  }, [inspect]);

  async function prepare() {
    if (!online) {
      setMessage('Connect to the internet before downloading event data.');
      return;
    }
    setBusy(true);
    setMessage('Refreshing the event and caching the app…');
    try {
      await onRefresh();
      await ensureRelayDeviceRegistered(true);
      await cacheShell();
      await inspect();
      setMessage('This device is ready for offline scouting.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Offline preparation failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function exportBackup() {
    const [mutations, drafts, pack] = await Promise.all([
      getPendingMutations(),
      getAllDrafts(),
      getCachedValue<CachedPack>('current-event-pack'),
    ]);
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            event: pack?.event ?? null,
            mutations,
            drafts,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `team401-offline-backup-${eventKey || 'no-event'}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function clearDrafts() {
    if (
      !window.confirm(
        `Delete ${draftCount} local drafts? Submitted entries waiting to sync will not be deleted.`,
      )
    )
      return;
    await deleteAllDrafts();
    setDraftCount(0);
    setMessage('Local drafts cleared. Pending submissions were preserved.');
  }

  const ready = packReady && shellReady && relayReady;
  const failures = pending.filter((item) => item.lastError);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <CloudDownload /> Offline readiness
        </CardTitle>
        <Badge variant={ready ? 'outline' : 'destructive'}>
          {ready ? 'Ready' : 'Not ready'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {eventName || 'No event selected'} · {matchCount} matches ·{' '}
          {teamCount} teams
        </p>
        <div className="mini-stats">
          <span>
            {packReady ? (
              <CheckCircle2 className="text-green-600" />
            ) : (
              <TriangleAlert className="text-amber-500" />
            )}
            <strong>{packReady ? 'Cached' : 'Missing'}</strong> event pack
          </span>
          <span>
            {shellReady ? (
              <CheckCircle2 className="text-green-600" />
            ) : (
              <TriangleAlert className="text-amber-500" />
            )}
            <strong>{shellReady ? 'Cached' : 'Missing'}</strong> app shell
          </span>
          <span>
            {relayReady ? (
              <CheckCircle2 className="text-green-600" />
            ) : (
              <TriangleAlert className="text-amber-500" />
            )}
            <strong>{relayReady ? 'Registered' : 'Missing'}</strong> match QR
            handoff
            key
          </span>
          <span>
            <strong>{pending.length}</strong> pending submissions
          </span>
          <span>
            <strong>{draftCount}</strong> local drafts
          </span>
        </div>
        <Button
          className="w-full"
          onClick={() => void prepare()}
          disabled={busy || !online}
        >
          <CloudDownload />{' '}
          {busy
            ? 'Preparing…'
            : ready
              ? 'Refresh offline data'
              : 'Prepare for offline use'}
        </Button>
        {failures.length > 0 && (
          <div className="rounded-lg border border-amber-400 p-3">
            <strong>
              {failures.length} synchronization issue
              {failures.length === 1 ? '' : 's'}
            </strong>
            {failures.map((item) => (
              <p className="mt-1 text-sm" key={item.id}>
                {item.entity} · {item.lastError} ·{' '}
                {item.retryable === false
                  ? 'manual action required'
                  : `retry ${item.attempts}`}
              </p>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => void exportBackup()}>
            <Download /> Export emergency backup
          </Button>
          <Button
            variant="outline"
            onClick={() => void clearDrafts()}
            disabled={!draftCount}
          >
            <Trash2 /> Clear local drafts
          </Button>
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
