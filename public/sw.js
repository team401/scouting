const VERSION = 'v10';
const SHELL_CACHE = `team401-shell-${VERSION}`;
const PAGE_CACHE = `team401-pages-${VERSION}`;
const ASSET_CACHE = `team401-assets-${VERSION}`;
const APP_CACHES = [SHELL_CACHE, PAGE_CACHE, ASSET_CACHE];

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
  await cache.addAll(SHELL);
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
        await cache.add(asset);
      } catch {
        // One optional asset should not prevent the rest of the app shell caching.
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheOfflineShell());
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

async function networkFirst(request, cacheName, fallbacks, timeoutMs = 4000) {
  const cache = await caches.open(cacheName);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (isCacheable(response)) await cache.put(request, response.clone());
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
    clearTimeout(timeout);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const update = fetch(request).then(async (response) => {
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(update.catch(() => undefined));
    return cached;
  }
  return update;
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
