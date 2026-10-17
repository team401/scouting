let recoveringChunkLoad = false;

const CHUNK_FAILURE_PATTERN =
  /\/_next\/static\/.*\.(?:js|css)|failed to fetch dynamically imported module|error loading dynamically imported module|loading chunk \d* failed|chunkloaderror/i;

export function isChunkFailureDetails(details: string) {
  return CHUNK_FAILURE_PATTERN.test(details);
}

export function chunkFailureDetails(event: Event | PromiseRejectionEvent) {
  if (event instanceof ErrorEvent) {
    const source =
      event.filename ||
      (event.target instanceof HTMLScriptElement ? event.target.src : '');
    return `${event.message} ${source}`;
  }
  const reason = 'reason' in event ? event.reason : null;
  return reason instanceof Error ? reason.message : String(reason ?? '');
}

export async function recoverFromChunkFailure() {
  if (recoveringChunkLoad || !navigator.onLine) return false;
  const lastRecovery = Number(
    sessionStorage.getItem('team401-chunk-recovery') ?? 0,
  );
  if (Date.now() - lastRecovery < 30_000) return false;
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
  return true;
}

export function recoverChunkFailureEvent(event: Event | PromiseRejectionEvent) {
  if (!isChunkFailureDetails(chunkFailureDetails(event))) return;
  void recoverFromChunkFailure().catch(() => {
    recoveringChunkLoad = false;
  });
}

export async function importWithDeploymentRecovery<T>(
  importer: () => Promise<T>,
): Promise<T> {
  try {
    return await importer();
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    if (!isChunkFailureDetails(details)) throw error;
    const recoveryStarted = await recoverFromChunkFailure();
    if (!recoveryStarted) throw error;
    // Keep the lazy boundary suspended while the browser replaces this stale
    // document. Rejecting here lets React render a fatal error before reload.
    return await new Promise<T>(() => undefined);
  }
}
