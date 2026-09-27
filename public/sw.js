const CACHE = 'team401-scouting-shell-v4';
const SHELL = [
  '/',
  '/sign-in',
  '/forgot-password',
  '/manifest.webmanifest',
  '/favicon.svg',
];
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});
self.addEventListener('activate', (event) =>
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
    ]),
  ),
);
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/'))
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match('/')),
      ),
  );
});
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_OFFLINE_SHELL') return;
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => event.ports[0]?.postMessage({ ok: true, cache: CACHE }))
      .catch((error) =>
        event.ports[0]?.postMessage({ ok: false, error: String(error) }),
      ),
  );
});
