const VERSION = 'v12';
const SHELL_CACHE = `team401-shell-${VERSION}`;
const PAGE_CACHE = `team401-pages-${VERSION}`;
const ASSET_CACHE = `team401-assets-${VERSION}`;
const PHOTO_CACHE = `team401-photos-${VERSION}`;
const APP_CACHES = [SHELL_CACHE, PAGE_CACHE, ASSET_CACHE, PHOTO_CACHE];
const CACHE_LIMITS = {
  shell: 20,
  pages: 40,
  assets: 160,
  photos: 250,
};

const SHELL = [
  '/',
  '/sign-in',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
];

async function cacheOfflineShell() {
  const cache = await caches.open(SHELL_CACHE);
  const assetCache = await caches.open(ASSET_CACHE);
  await Promise.all(
    SHELL.map(async (path) => {
      try {
        const response = await fetch(path);
        if (isCacheable(response))
          await putBestEffort(
            cache,
            new Request(new URL(path, self.location.origin)),
            response,
            CACHE_LIMITS.shell,
          );
      } catch {
        // A failed optional shell resource must not block a service-worker update.
      }
    }),
  );
  const assets = new Set();
  await Promise.all(
    ['/', '/sign-in'].map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) return;
      const html = await response.text();
      for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
        const asset = new URL(match[1], self.location.origin);
        if (
          asset.origin === self.location.origin &&
          (asset.pathname.startsWith('/_next/static/') ||
            ['style', 'script', 'font', 'image'].includes(
              new Request(asset.href).destination,
            ))
        )
          assets.add(asset.href);
      }
    }),
  );
  await Promise.all(
    [...assets].map(async (asset) => {
      try {
        const request = new Request(asset);
        const response = await fetch(request);
        if (isCacheable(response))
          await putBestEffort(
            assetCache,
            request,
            response,
            CACHE_LIMITS.assets,
          );
      } catch {
        // One optional asset should not prevent the rest of the app shell caching.
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([cacheOfflineShell(), self.skipWaiting()]));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith('team401-') && !APP_CACHES.includes(key),
              )
              .map((key) => caches.delete(key)),
          ),
        ),
    ]),
  );
});

function isCacheable(response) {
  return response && response.ok && response.type !== 'opaque';
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  if (excess > 0)
    await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

async function putBestEffort(cache, request, response, maxEntries) {
  try {
    await cache.put(request, response.clone());
    await trimCache(cache, maxEntries);
  } catch {
    // Cache writes can fail under storage pressure. Never turn a successful
    // network response into a failed fetch because offline storage is full.
    try {
      const keys = await cache.keys();
      const removeCount = Math.max(1, Math.ceil(keys.length / 4));
      await Promise.all(
        keys.slice(0, removeCount).map((key) => cache.delete(key)),
      );
      await cache.put(request, response.clone());
      await trimCache(cache, maxEntries);
    } catch {
      // The live response remains usable even when it cannot be cached.
    }
  }
}

async function notifyVersionedAssetMissing(url) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  for (const client of clients)
    client.postMessage({ type: 'VERSIONED_ASSET_MISSING', url });
}

async function networkFirst(request, cacheName, fallbacks, timeoutMs = null) {
  const cache = await caches.open(cacheName);
  const controller = timeoutMs ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  try {
    const response = await fetch(
      request,
      controller ? { signal: controller.signal } : undefined,
    );
    if (isCacheable(response))
      await putBestEffort(cache, request, response, CACHE_LIMITS.pages);
    return response;
  } catch {
    const exact = await cache.match(request);
    if (exact) return exact;
    for (const fallback of fallbacks) {
      const cached = await caches.match(fallback);
      if (cached) return cached;
    }
    return Response.error();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    let response = await fetch(request);
    if (!isCacheable(response) && [404, 503].includes(response.status)) {
      const retry = await fetch(new Request(request, { cache: 'reload' }));
      if (isCacheable(retry)) response = retry;
    }
    if (!isCacheable(response) && [404, 503].includes(response.status))
      await notifyVersionedAssetMissing(request.url);
    if (isCacheable(response))
      await putBestEffort(cache, request, response, CACHE_LIMITS.assets);
    return response;
  } catch {
    return Response.error();
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(PHOTO_CACHE);
  const cached = await cache.match(request);
  const update = fetch(request).then(async (response) => {
    if (isCacheable(response))
      await putBestEffort(cache, request, response, CACHE_LIMITS.photos);
    return response;
  });
  if (cached) {
    event.waitUntil(update.catch(() => undefined));
    return cached;
  }
  return update.catch(() => Response.error());
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/api/team-photo' || url.pathname === '/api/pit-photo') {
    event.respondWith(staleWhileRevalidate(request, event));
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, PAGE_CACHE, ['/', '/offline.html']),
    );
    return;
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type !== 'CACHE_OFFLINE_SHELL') return;
  event.waitUntil(
    cacheOfflineShell()
      .then(() => event.ports[0]?.postMessage({ ok: true, cache: SHELL_CACHE }))
      .catch((error) =>
        event.ports[0]?.postMessage({ ok: false, error: String(error) }),
      ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((client) => 'focus' in client);
        return existing ? existing.focus() : self.clients.openWindow('/');
      }),
  );
});
